import { randomBytes } from 'node:crypto'
import { OpenAPIHono } from '@hono/zod-openapi'
import { and, desc, eq, gt, inArray, lt } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../database/db'
import { follows, stories, storyViews, users } from '../database/schema'

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
 * Create a story
 * POST /api/stories/create
 */
router.post('/create', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  // Only professionals can create stories
  if (!user.isProfessional) {
    return c.json(
      { success: false, message: 'Only professionals can create stories' },
      403
    )
  }

  const body = await c.req.json()

  const schema = z.object({
    type: z.enum(['photo', 'video', 'text']),
    mediaUrl: z.string().optional(),
    text: z.string().optional(),
    backgroundColor: z.string().optional(),
    videoDuration: z.number().max(60).optional() // Max 60 seconds for stories
  })

  const validation = schema.safeParse(body)
  if (!validation.success) {
    return c.json(
      { success: false, message: 'Invalid input', errors: validation.error.errors },
      400
    )
  }

  const data = validation.data

  // Validate content based on type
  if (data.type === 'photo' && !data.mediaUrl) {
    return c.json(
      { success: false, message: 'Photo URL is required for photo stories' },
      400
    )
  }

  if (data.type === 'video' && (!data.mediaUrl || !data.videoDuration)) {
    return c.json(
      { success: false, message: 'Video URL and duration are required for video stories' },
      400
    )
  }

  if (data.type === 'text' && !data.text) {
    return c.json(
      { success: false, message: 'Text is required for text stories' },
      400
    )
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now

  const storyId = generateId()

  const newStory = {
    id: storyId,
    authorId: user.id,
    type: data.type,
    mediaUrl: data.mediaUrl || null,
    text: data.text || null,
    backgroundColor: data.backgroundColor || null,
    videoDuration: data.videoDuration || null,
    viewsCount: 0,
    expiresAt,
    createdAt: now
  }

  await db.insert(stories).values(newStory)

  return c.json({
    success: true,
    message: 'Story created successfully',
    data: newStory
  })
})

/**
 * Get stories feed (from followed users)
 * GET /api/stories/feed
 */
router.get('/feed', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const now = new Date()

  // Get user's followed professionals
  const followedUsers = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, user.id))

  const followedIds = followedUsers.map((f) => f.followingId)

  let activeStories

  if (followedIds.length > 0) {
    // Get active stories from followed users (not expired)
    activeStories = await db
      .select({
        story: stories,
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
      .from(stories)
      .innerJoin(users, eq(stories.authorId, users.id))
      .where(
        and(
          inArray(stories.authorId, followedIds),
          gt(stories.expiresAt, now)
        )
      )
      .orderBy(desc(stories.createdAt))
  } else {
    // For new users, show popular stories
    activeStories = await db
      .select({
        story: stories,
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
      .from(stories)
      .innerJoin(users, eq(stories.authorId, users.id))
      .where(gt(stories.expiresAt, now))
      .orderBy(desc(stories.viewsCount))
      .limit(20)
  }

  // Group stories by author
  const storiesByAuthor: Record<string, any> = {}

  for (const item of activeStories) {
    const authorId = item.author.id
    if (!storiesByAuthor[authorId]) {
      storiesByAuthor[authorId] = {
        author: item.author,
        stories: []
      }
    }
    storiesByAuthor[authorId].stories.push(item.story)
  }

  return c.json({
    success: true,
    data: Object.values(storiesByAuthor)
  })
})

/**
 * Get stories by user
 * GET /api/stories/user/:userId
 */
router.get('/user/:userId', async (c) => {
  const userId = c.req.param('userId')
  const now = new Date()

  const userStories = await db
    .select({
      story: stories,
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
    .from(stories)
    .innerJoin(users, eq(stories.authorId, users.id))
    .where(
      and(
        eq(stories.authorId, userId),
        gt(stories.expiresAt, now)
      )
    )
    .orderBy(desc(stories.createdAt))

  return c.json({
    success: true,
    data: userStories
  })
})

/**
 * View a story (track view)
 * POST /api/stories/:storyId/view
 */
router.post('/:storyId/view', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const storyId = c.req.param('storyId')

  // Check if story exists and is not expired
  const existingStory = await db
    .select()
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1)

  if (existingStory.length === 0) {
    return c.json({ success: false, message: 'Story not found' }, 404)
  }

  const story = existingStory[0]

  if (story.expiresAt < new Date()) {
    return c.json({ success: false, message: 'Story has expired' }, 410)
  }

  // Check if user has already viewed this story
  const existingView = await db
    .select()
    .from(storyViews)
    .where(
      and(
        eq(storyViews.storyId, storyId),
        eq(storyViews.viewerId, user.id)
      )
    )
    .limit(1)

  if (existingView.length === 0) {
    // Record new view
    await db.insert(storyViews).values({
      id: generateId(),
      storyId,
      viewerId: user.id,
      viewedAt: new Date()
    })

    // Increment views count
    await db
      .update(stories)
      .set({
        viewsCount: story.viewsCount + 1
      })
      .where(eq(stories.id, storyId))
  }

  return c.json({
    success: true,
    message: 'Story viewed',
    data: {
      viewsCount: story.viewsCount + (existingView.length === 0 ? 1 : 0)
    }
  })
})

/**
 * Get story views (for story author)
 * GET /api/stories/:storyId/views
 */
router.get('/:storyId/views', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const storyId = c.req.param('storyId')

  // Check if story exists and user owns it
  const existingStory = await db
    .select()
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1)

  if (existingStory.length === 0) {
    return c.json({ success: false, message: 'Story not found' }, 404)
  }

  if (existingStory[0].authorId !== user.id) {
    return c.json(
      { success: false, message: 'You can only view your own story analytics' },
      403
    )
  }

  // Get list of viewers
  const viewers = await db
    .select({
      viewer: {
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image,
        isVerified: users.isVerified
      },
      viewedAt: storyViews.viewedAt
    })
    .from(storyViews)
    .innerJoin(users, eq(storyViews.viewerId, users.id))
    .where(eq(storyViews.storyId, storyId))
    .orderBy(desc(storyViews.viewedAt))

  return c.json({
    success: true,
    data: {
      totalViews: viewers.length,
      viewers
    }
  })
})

/**
 * Delete a story
 * DELETE /api/stories/:storyId
 */
router.delete('/:storyId', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const storyId = c.req.param('storyId')

  // Check if story exists and user owns it
  const existingStory = await db
    .select()
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1)

  if (existingStory.length === 0) {
    return c.json({ success: false, message: 'Story not found' }, 404)
  }

  if (existingStory[0].authorId !== user.id && !user.isAdmin) {
    return c.json(
      { success: false, message: 'You can only delete your own stories' },
      403
    )
  }

  // Delete story and related views
  await db.delete(storyViews).where(eq(storyViews.storyId, storyId))
  await db.delete(stories).where(eq(stories.id, storyId))

  return c.json({
    success: true,
    message: 'Story deleted successfully'
  })
})

/**
 * Cleanup expired stories (cron job endpoint)
 * DELETE /api/stories/cleanup/expired
 */
router.delete('/cleanup/expired', async (c) => {
  const user = c.get('user')
  
  // Only admins can trigger cleanup
  if (!user || !user.isAdmin) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const now = new Date()

  // Get expired stories
  const expiredStories = await db
    .select({ id: stories.id })
    .from(stories)
    .where(lt(stories.expiresAt, now))

  const expiredIds = expiredStories.map((s) => s.id)

  if (expiredIds.length > 0) {
    // Delete views for expired stories
    await db.delete(storyViews).where(inArray(storyViews.storyId, expiredIds))
    
    // Delete expired stories
    await db.delete(stories).where(lt(stories.expiresAt, now))
  }

  return c.json({
    success: true,
    message: `Cleaned up ${expiredIds.length} expired stories`
  })
})

export default router
