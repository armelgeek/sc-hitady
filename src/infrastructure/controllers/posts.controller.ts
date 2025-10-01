import { randomBytes } from 'node:crypto'
import { OpenAPIHono } from '@hono/zod-openapi'
import { and, desc, eq, gt, inArray, lt, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../database/db'
import { comments, follows, likes, posts, savedPosts, users } from '../database/schema'

// Helper function to generate unique IDs
function generateId(length: number = 16): string {
  return randomBytes(length).toString('hex')
}

type UserType = {
  id: string
  name: string
  email: string
  username?: string | null
  isAdmin: boolean
  isVerified: boolean
  isProfessional: boolean
} | null

const router = new OpenAPIHono<{
  Variables: {
    user: UserType
  }
}>()

// =====================
// POST ENDPOINTS
// =====================

/**
 * Create a new post
 * POST /api/posts/create
 */
router.post('/create', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  // Only professionals can create posts
  if (!user.isProfessional) {
    return c.json(
      { success: false, message: 'Only professionals can create posts' },
      403
    )
  }

  const body = await c.req.json()

  const schema = z.object({
    type: z.enum(['photo', 'video', 'promo', 'announcement', 'testimonial']),
    caption: z.string().optional(),
    mediaUrls: z.array(z.string()).min(1),
    videoDuration: z.number().max(120).optional(),
    promoEndDate: z.string().optional(),
    originalPrice: z.number().optional(),
    discountedPrice: z.number().optional(),
    location: z.string().optional(),
    gpsCoordinates: z.string().optional()
  })

  const validation = schema.safeParse(body)
  if (!validation.success) {
    return c.json(
      { success: false, message: 'Invalid input', errors: validation.error.errors },
      400
    )
  }

  const data = validation.data

  // Validate video duration
  if (data.type === 'video' && (!data.videoDuration || data.videoDuration > 120)) {
    return c.json(
      { success: false, message: 'Video duration must be between 1 and 120 seconds' },
      400
    )
  }

  const now = new Date()
  const postId = generateId()

  const newPost = {
    id: postId,
    authorId: user.id,
    type: data.type,
    caption: data.caption || null,
    mediaUrls: data.mediaUrls,
    videoDuration: data.videoDuration || null,
    promoEndDate: data.promoEndDate ? new Date(data.promoEndDate) : null,
    originalPrice: data.originalPrice || null,
    discountedPrice: data.discountedPrice || null,
    location: data.location || null,
    gpsCoordinates: data.gpsCoordinates || null,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    savesCount: 0,
    isPublic: true,
    isSponsored: false,
    isReported: false,
    isHidden: false,
    createdAt: now,
    updatedAt: now
  }

  await db.insert(posts).values(newPost)

  // Sync post to Neo4j
  try {
    const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
    const loader = new CypherQueryLoader()
    
    await loader.run('social', 'sync-post', {
      postId,
      authorId: user.id,
      createdAt: now.toISOString(),
      isHidden: false,
      isPublic: true
    })
  } catch (error) {
    console.error('Error syncing post to Neo4j:', error)
  }

  return c.json({
    success: true,
    message: 'Post created successfully',
    data: newPost
  })
})

/**
 * Get feed (personalized algorithm)
 * GET /api/posts/feed
 */
router.get('/feed', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  // Get user's followed professionals
  const followedUsers = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, user.id))

  const followedIds = followedUsers.map((f) => f.followingId)

  // Feed algorithm:
  // 1. Posts from followed professionals (priority)
  // 2. Popular posts from nearby (based on location)
  // 3. Sponsored content
  // 4. Discovery recommendations

  let feedPosts

  if (followedIds.length > 0) {
    // Show posts from followed users + popular content
    feedPosts = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          name: users.name,
          username: users.username,
          image: users.image,
          isVerified: users.isVerified,
          isProfessional: users.isProfessional,
          activityCategory: users.activityCategory,
          city: users.city,
          district: users.district
        }
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          eq(posts.isHidden, false),
          or(
            inArray(posts.authorId, followedIds),
            eq(posts.isSponsored, true),
            gt(posts.likesCount, 10) // Popular posts
          )
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset)
  } else {
    // Show all public posts for new users
    feedPosts = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          name: users.name,
          username: users.username,
          image: users.image,
          isVerified: users.isVerified,
          isProfessional: users.isProfessional,
          activityCategory: users.activityCategory,
          city: users.city,
          district: users.district
        }
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.isHidden, false))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset)
  }

  return c.json({
    success: true,
    data: {
      posts: feedPosts,
      page,
      limit,
      hasMore: feedPosts.length === limit
    }
  })
})

/**
 * Get posts by user
 * GET /api/posts/user/:userId
 */
router.get('/user/:userId', async (c) => {
  const userId = c.req.param('userId')
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  const userPosts = await db
    .select({
      post: posts,
      author: {
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image,
        isVerified: users.isVerified,
        isProfessional: users.isProfessional,
        activityCategory: users.activityCategory
      }
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(eq(posts.authorId, userId), eq(posts.isHidden, false)))
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset)

  return c.json({
    success: true,
    data: {
      posts: userPosts,
      page,
      limit,
      hasMore: userPosts.length === limit
    }
  })
})

/**
 * Get single post
 * GET /api/posts/:postId
 */
router.get('/:postId', async (c) => {
  const postId = c.req.param('postId')

  const result = await db
    .select({
      post: posts,
      author: {
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image,
        isVerified: users.isVerified,
        isProfessional: users.isProfessional,
        activityCategory: users.activityCategory,
        city: users.city,
        district: users.district
      }
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.id, postId))
    .limit(1)

  if (result.length === 0) {
    return c.json({ success: false, message: 'Post not found' }, 404)
  }

  return c.json({
    success: true,
    data: result[0]
  })
})

/**
 * Update post
 * PUT /api/posts/:postId
 */
router.put('/:postId', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const postId = c.req.param('postId')

  // Check if post exists and user owns it
  const existingPost = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)

  if (existingPost.length === 0) {
    return c.json({ success: false, message: 'Post not found' }, 404)
  }

  if (existingPost[0].authorId !== user.id) {
    return c.json(
      { success: false, message: 'You can only edit your own posts' },
      403
    )
  }

  const body = await c.req.json()

  const schema = z.object({
    caption: z.string().optional(),
    location: z.string().optional(),
    gpsCoordinates: z.string().optional()
  })

  const validation = schema.safeParse(body)
  if (!validation.success) {
    return c.json(
      { success: false, message: 'Invalid input', errors: validation.error.errors },
      400
    )
  }

  const data = validation.data

  await db
    .update(posts)
    .set({
      caption: data.caption,
      location: data.location,
      gpsCoordinates: data.gpsCoordinates,
      updatedAt: new Date()
    })
    .where(eq(posts.id, postId))

  return c.json({
    success: true,
    message: 'Post updated successfully'
  })
})

/**
 * Delete post
 * DELETE /api/posts/:postId
 */
router.delete('/:postId', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const postId = c.req.param('postId')

  // Check if post exists and user owns it
  const existingPost = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)

  if (existingPost.length === 0) {
    return c.json({ success: false, message: 'Post not found' }, 404)
  }

  if (existingPost[0].authorId !== user.id && !user.isAdmin) {
    return c.json(
      { success: false, message: 'You can only delete your own posts' },
      403
    )
  }

  // Soft delete by hiding the post
  await db
    .update(posts)
    .set({
      isHidden: true,
      updatedAt: new Date()
    })
    .where(eq(posts.id, postId))

  // Delete from Neo4j
  try {
    const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
    const loader = new CypherQueryLoader()
    
    await loader.run('social', 'delete-post', {
      postId
    })
  } catch (error) {
    console.error('Error deleting post from Neo4j:', error)
  }

  return c.json({
    success: true,
    message: 'Post deleted successfully'
  })
})

/**
 * Like a post
 * POST /api/posts/:postId/like
 */
router.post('/:postId/like', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const postId = c.req.param('postId')

  // Check if post exists
  const existingPost = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)

  if (existingPost.length === 0) {
    return c.json({ success: false, message: 'Post not found' }, 404)
  }

  // Check if already liked
  const existingLike = await db
    .select()
    .from(likes)
    .where(and(eq(likes.postId, postId), eq(likes.userId, user.id)))
    .limit(1)

  if (existingLike.length > 0) {
    // Unlike
    await db.delete(likes).where(eq(likes.id, existingLike[0].id))

    // Decrement likes count
    await db
      .update(posts)
      .set({
        likesCount: sql`${posts.likesCount} - 1`
      })
      .where(eq(posts.id, postId))

    // Remove like from Neo4j
    try {
      const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
      const loader = new CypherQueryLoader()
      
      await loader.run('social', 'remove-post-like', {
        userId: user.id,
        postId
      })
    } catch (error) {
      console.error('Error removing like from Neo4j:', error)
    }

    return c.json({
      success: true,
      message: 'Post unliked',
      liked: false
    })
  } else {
    // Like
    const likeId = generateId()
    await db.insert(likes).values({
      id: likeId,
      userId: user.id,
      postId,
      commentId: null,
      createdAt: new Date()
    })

    // Increment likes count
    await db
      .update(posts)
      .set({
        likesCount: sql`${posts.likesCount} + 1`
      })
      .where(eq(posts.id, postId))

    // Create like in Neo4j
    try {
      const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
      const loader = new CypherQueryLoader()
      
      await loader.run('social', 'create-post-like', {
        userId: user.id,
        postId,
        likeId,
        createdAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error creating like in Neo4j:', error)
    }

    return c.json({
      success: true,
      message: 'Post liked',
      liked: true
    })
  }
})

/**
 * Save a post
 * POST /api/posts/:postId/save
 */
router.post('/:postId/save', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const postId = c.req.param('postId')
  const body = await c.req.json()

  const schema = z.object({
    collectionName: z.string().optional()
  })

  const validation = schema.safeParse(body)
  if (!validation.success) {
    return c.json(
      { success: false, message: 'Invalid input', errors: validation.error.errors },
      400
    )
  }

  const data = validation.data

  // Check if post exists
  const existingPost = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)

  if (existingPost.length === 0) {
    return c.json({ success: false, message: 'Post not found' }, 404)
  }

  // Check if already saved
  const existingSave = await db
    .select()
    .from(savedPosts)
    .where(and(eq(savedPosts.postId, postId), eq(savedPosts.userId, user.id)))
    .limit(1)

  if (existingSave.length > 0) {
    // Unsave
    await db.delete(savedPosts).where(eq(savedPosts.id, existingSave[0].id))

    // Decrement saves count
    await db
      .update(posts)
      .set({
        savesCount: sql`${posts.savesCount} - 1`
      })
      .where(eq(posts.id, postId))

    // Remove save from Neo4j
    try {
      const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
      const loader = new CypherQueryLoader()
      
      await loader.run('social', 'remove-post-save', {
        userId: user.id,
        postId
      })
    } catch (error) {
      console.error('Error removing save from Neo4j:', error)
    }

    return c.json({
      success: true,
      message: 'Post unsaved',
      saved: false
    })
  } else {
    // Save
    const saveId = generateId()
    const now = new Date()
    await db.insert(savedPosts).values({
      id: saveId,
      userId: user.id,
      postId,
      collectionName: data.collectionName || null,
      savedAt: now
    })

    // Increment saves count
    await db
      .update(posts)
      .set({
        savesCount: sql`${posts.savesCount} + 1`
      })
      .where(eq(posts.id, postId))

    // Create save in Neo4j
    try {
      const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
      const loader = new CypherQueryLoader()
      
      await loader.run('social', 'create-post-save', {
        userId: user.id,
        postId,
        saveId,
        collectionName: data.collectionName || null,
        savedAt: now.toISOString()
      })
    } catch (error) {
      console.error('Error creating save in Neo4j:', error)
    }

    return c.json({
      success: true,
      message: 'Post saved',
      saved: true
    })
  }
})

/**
 * Get saved posts
 * GET /api/posts/saved
 */
router.get('/saved/list', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  const saved = await db
    .select({
      savedPost: savedPosts,
      post: posts,
      author: {
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image,
        isVerified: users.isVerified,
        isProfessional: users.isProfessional,
        activityCategory: users.activityCategory
      }
    })
    .from(savedPosts)
    .innerJoin(posts, eq(savedPosts.postId, posts.id))
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(savedPosts.userId, user.id))
    .orderBy(desc(savedPosts.savedAt))
    .limit(limit)
    .offset(offset)

  return c.json({
    success: true,
    data: {
      savedPosts: saved,
      page,
      limit,
      hasMore: saved.length === limit
    }
  })
})

export default router
