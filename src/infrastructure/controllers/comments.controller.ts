import { randomBytes } from 'node:crypto'
import { OpenAPIHono } from '@hono/zod-openapi'
import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../database/db'
import { comments, likes, posts, users } from '../database/schema'

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

/**
 * Create a comment
 * POST /api/comments/create
 */
router.post('/create', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const body = await c.req.json()

  const schema = z.object({
    postId: z.string(),
    text: z.string().min(1).max(500),
    parentCommentId: z.string().optional()
  })

  const validation = schema.safeParse(body)
  if (!validation.success) {
    return c.json({ success: false, message: 'Invalid input', errors: validation.error.errors }, 400)
  }

  const data = validation.data

  // Check if post exists
  const existingPost = await db.select().from(posts).where(eq(posts.id, data.postId)).limit(1)

  if (existingPost.length === 0) {
    return c.json({ success: false, message: 'Post not found' }, 404)
  }

  // If replying to a comment, check if parent exists
  if (data.parentCommentId) {
    const parentComment = await db.select().from(comments).where(eq(comments.id, data.parentCommentId)).limit(1)

    if (parentComment.length === 0) {
      return c.json({ success: false, message: 'Parent comment not found' }, 404)
    }
  }

  const now = new Date()
  const commentId = generateId()

  const newComment = {
    id: commentId,
    authorId: user.id,
    postId: data.postId,
    text: data.text,
    parentCommentId: data.parentCommentId || null,
    likesCount: 0,
    repliesCount: 0,
    isReported: false,
    isHidden: false,
    createdAt: now,
    updatedAt: now
  }

  await db.insert(comments).values(newComment)

  // Increment post comments count
  await db
    .update(posts)
    .set({
      commentsCount: sql`${posts.commentsCount} + 1`
    })
    .where(eq(posts.id, data.postId))

  // If replying to a comment, increment parent's replies count
  if (data.parentCommentId) {
    await db
      .update(comments)
      .set({
        repliesCount: sql`${comments.repliesCount} + 1`
      })
      .where(eq(comments.id, data.parentCommentId))
  }

  // Create comment relationship in Neo4j
  try {
    const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
    const loader = new CypherQueryLoader()
    
    if (data.parentCommentId) {
      // This is a reply
      await loader.run('social', 'create-comment-reply', {
        authorId: user.id,
        commentId,
        parentCommentId: data.parentCommentId,
        createdAt: now.toISOString()
      })
    } else {
      // This is a top-level comment
      await loader.run('social', 'create-comment', {
        authorId: user.id,
        postId: data.postId,
        commentId,
        createdAt: now.toISOString()
      })
    }

    // Sync comment node
    await loader.run('social', 'sync-comment', {
      commentId,
      authorId: user.id,
      postId: data.postId,
      createdAt: now.toISOString(),
      isHidden: false
    })
  } catch (error) {
    console.error('Error creating comment in Neo4j:', error)
  }

  return c.json({
    success: true,
    message: 'Comment created successfully',
    data: newComment
  })
})

/**
 * Get comments for a post
 * GET /api/comments/post/:postId
 */
router.get('/post/:postId', async (c) => {
  const postId = c.req.param('postId')
  const page = Number.parseInt(c.req.query('page') || '1')
  const limit = Number.parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  // Get top-level comments (no parent)
  const postComments = await db
    .select({
      comment: comments,
      author: {
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image,
        isVerified: users.isVerified,
        isProfessional: users.isProfessional
      }
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(and(eq(comments.postId, postId), eq(comments.isHidden, false), sql`${comments.parentCommentId} IS NULL`))
    .orderBy(desc(comments.createdAt))
    .limit(limit)
    .offset(offset)

  return c.json({
    success: true,
    data: {
      comments: postComments,
      page,
      limit,
      hasMore: postComments.length === limit
    }
  })
})

/**
 * Get replies to a comment
 * GET /api/comments/:commentId/replies
 */
router.get('/:commentId/replies', async (c) => {
  const commentId = c.req.param('commentId')
  const page = Number.parseInt(c.req.query('page') || '1')
  const limit = Number.parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  const replies = await db
    .select({
      comment: comments,
      author: {
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image,
        isVerified: users.isVerified,
        isProfessional: users.isProfessional
      }
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(and(eq(comments.parentCommentId, commentId), eq(comments.isHidden, false)))
    .orderBy(desc(comments.createdAt))
    .limit(limit)
    .offset(offset)

  return c.json({
    success: true,
    data: {
      replies,
      page,
      limit,
      hasMore: replies.length === limit
    }
  })
})

/**
 * Update a comment
 * PUT /api/comments/:commentId
 */
router.put('/:commentId', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const commentId = c.req.param('commentId')

  // Check if comment exists and user owns it
  const existingComment = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1)

  if (existingComment.length === 0) {
    return c.json({ success: false, message: 'Comment not found' }, 404)
  }

  if (existingComment[0].authorId !== user.id) {
    return c.json({ success: false, message: 'You can only edit your own comments' }, 403)
  }

  const body = await c.req.json()

  const schema = z.object({
    text: z.string().min(1).max(500)
  })

  const validation = schema.safeParse(body)
  if (!validation.success) {
    return c.json({ success: false, message: 'Invalid input', errors: validation.error.errors }, 400)
  }

  const data = validation.data

  await db
    .update(comments)
    .set({
      text: data.text,
      updatedAt: new Date()
    })
    .where(eq(comments.id, commentId))

  return c.json({
    success: true,
    message: 'Comment updated successfully'
  })
})

/**
 * Delete a comment
 * DELETE /api/comments/:commentId
 */
router.delete('/:commentId', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const commentId = c.req.param('commentId')

  // Check if comment exists and user owns it
  const existingComment = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1)

  if (existingComment.length === 0) {
    return c.json({ success: false, message: 'Comment not found' }, 404)
  }

  if (existingComment[0].authorId !== user.id && !user.isAdmin) {
    return c.json({ success: false, message: 'You can only delete your own comments' }, 403)
  }

  // Soft delete by hiding the comment
  await db
    .update(comments)
    .set({
      isHidden: true,
      updatedAt: new Date()
    })
    .where(eq(comments.id, commentId))

  // Decrement post comments count
  await db
    .update(posts)
    .set({
      commentsCount: sql`${posts.commentsCount} - 1`
    })
    .where(eq(posts.id, existingComment[0].postId))

  // If it was a reply, decrement parent's replies count
  if (existingComment[0].parentCommentId) {
    await db
      .update(comments)
      .set({
        repliesCount: sql`${comments.repliesCount} - 1`
      })
      .where(eq(comments.id, existingComment[0].parentCommentId))
  }

  // Delete comment from Neo4j
  try {
    const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
    const loader = new CypherQueryLoader()
    
    await loader.run('social', 'delete-comment', {
      commentId
    })
  } catch (error) {
    console.error('Error deleting comment from Neo4j:', error)
  }

  return c.json({
    success: true,
    message: 'Comment deleted successfully'
  })
})

/**
 * Like a comment
 * POST /api/comments/:commentId/like
 */
router.post('/:commentId/like', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const commentId = c.req.param('commentId')

  // Check if comment exists
  const existingComment = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1)

  if (existingComment.length === 0) {
    return c.json({ success: false, message: 'Comment not found' }, 404)
  }

  // Check if already liked
  const existingLike = await db
    .select()
    .from(likes)
    .where(and(eq(likes.commentId, commentId), eq(likes.userId, user.id)))
    .limit(1)

  if (existingLike.length > 0) {
    // Unlike
    await db.delete(likes).where(eq(likes.id, existingLike[0].id))

    // Decrement likes count
    await db
      .update(comments)
      .set({
        likesCount: sql`${comments.likesCount} - 1`
      })
      .where(eq(comments.id, commentId))

    // Remove like from Neo4j
    try {
      const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
      const loader = new CypherQueryLoader()
      
      await loader.run('social', 'remove-comment-like', {
        userId: user.id,
        commentId
      })
    } catch (error) {
      console.error('Error removing comment like from Neo4j:', error)
    }

    return c.json({
      success: true,
      message: 'Comment unliked',
      liked: false
    })
  } else {
    // Like
    const likeId = generateId()
    await db.insert(likes).values({
      id: likeId,
      userId: user.id,
      postId: null,
      commentId,
      createdAt: new Date()
    })

    // Increment likes count
    await db
      .update(comments)
      .set({
        likesCount: sql`${comments.likesCount} + 1`
      })
      .where(eq(comments.id, commentId))

    // Create like in Neo4j
    try {
      const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
      const loader = new CypherQueryLoader()
      
      await loader.run('social', 'create-comment-like', {
        userId: user.id,
        commentId,
        likeId,
        createdAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error creating comment like in Neo4j:', error)
    }

    return c.json({
      success: true,
      message: 'Comment liked',
      liked: true
    })
  }
})

export default router
