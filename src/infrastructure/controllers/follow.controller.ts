import { randomBytes } from 'node:crypto'
import { OpenAPIHono } from '@hono/zod-openapi'
import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../database/db'
import { follows, users } from '../database/schema'

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
 * Follow a professional
 * POST /api/follow/:userId
 */
router.post('/:userId', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const targetUserId = c.req.param('userId')

  // Can't follow yourself
  if (targetUserId === user.id) {
    return c.json({ success: false, message: 'You cannot follow yourself' }, 400)
  }

  // Check if target user exists and is a professional
  const targetUser = await db
    .select({
      id: users.id,
      isProfessional: users.isProfessional
    })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1)

  if (targetUser.length === 0) {
    return c.json({ success: false, message: 'User not found' }, 404)
  }

  if (!targetUser[0].isProfessional) {
    return c.json({ success: false, message: 'You can only follow professionals' }, 400)
  }

  // Check if already following
  const existingFollow = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, user.id), eq(follows.followingId, targetUserId)))
    .limit(1)

  if (existingFollow.length > 0) {
    return c.json({ success: false, message: 'Already following this user' }, 400)
  }

  // Create follow relationship
  await db.insert(follows).values({
    id: generateId(),
    followerId: user.id,
    followingId: targetUserId,
    notificationsEnabled: true,
    createdAt: new Date()
  })

  return c.json({
    success: true,
    message: 'Successfully followed user',
    following: true
  })
})

/**
 * Unfollow a professional
 * DELETE /api/follow/:userId
 */
router.delete('/:userId', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const targetUserId = c.req.param('userId')

  // Check if following
  const existingFollow = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, user.id), eq(follows.followingId, targetUserId)))
    .limit(1)

  if (existingFollow.length === 0) {
    return c.json({ success: false, message: 'Not following this user' }, 400)
  }

  // Remove follow relationship
  await db.delete(follows).where(eq(follows.id, existingFollow[0].id))

  return c.json({
    success: true,
    message: 'Successfully unfollowed user',
    following: false
  })
})

/**
 * Get following list
 * GET /api/follow/following
 */
router.get('/following', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const userId = c.req.query('userId') || user.id
  const page = Number.parseInt(c.req.query('page') || '1')
  const limit = Number.parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  const following = await db
    .select({
      follow: follows,
      professional: {
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
    .from(follows)
    .innerJoin(users, eq(follows.followingId, users.id))
    .where(eq(follows.followerId, userId))
    .orderBy(desc(follows.createdAt))
    .limit(limit)
    .offset(offset)

  return c.json({
    success: true,
    data: {
      following,
      page,
      limit,
      hasMore: following.length === limit
    }
  })
})

/**
 * Get followers list
 * GET /api/follow/followers
 */
router.get('/followers', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const userId = c.req.query('userId') || user.id
  const page = Number.parseInt(c.req.query('page') || '1')
  const limit = Number.parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  const followers = await db
    .select({
      follow: follows,
      follower: {
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image,
        isVerified: users.isVerified,
        isProfessional: users.isProfessional
      }
    })
    .from(follows)
    .innerJoin(users, eq(follows.followerId, users.id))
    .where(eq(follows.followingId, userId))
    .orderBy(desc(follows.createdAt))
    .limit(limit)
    .offset(offset)

  return c.json({
    success: true,
    data: {
      followers,
      page,
      limit,
      hasMore: followers.length === limit
    }
  })
})

/**
 * Get follow statistics
 * GET /api/follow/stats/:userId
 */
router.get('/stats/:userId', async (c) => {
  const userId = c.req.param('userId')

  // Count followers
  const followersResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(follows)
    .where(eq(follows.followingId, userId))

  // Count following
  const followingResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(follows)
    .where(eq(follows.followerId, userId))

  return c.json({
    success: true,
    data: {
      followersCount: Number(followersResult[0]?.count || 0),
      followingCount: Number(followingResult[0]?.count || 0)
    }
  })
})

/**
 * Check if following a user
 * GET /api/follow/check/:userId
 */
router.get('/check/:userId', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const targetUserId = c.req.param('userId')

  const existingFollow = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, user.id), eq(follows.followingId, targetUserId)))
    .limit(1)

  return c.json({
    success: true,
    data: {
      isFollowing: existingFollow.length > 0
    }
  })
})

/**
 * Toggle follow notifications
 * PUT /api/follow/:userId/notifications
 */
router.put('/:userId/notifications', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const targetUserId = c.req.param('userId')

  const body = await c.req.json()

  const schema = z.object({
    enabled: z.boolean()
  })

  const validation = schema.safeParse(body)
  if (!validation.success) {
    return c.json({ success: false, message: 'Invalid input', errors: validation.error.errors }, 400)
  }

  const data = validation.data

  // Check if following
  const existingFollow = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, user.id), eq(follows.followingId, targetUserId)))
    .limit(1)

  if (existingFollow.length === 0) {
    return c.json({ success: false, message: 'Not following this user' }, 400)
  }

  // Update notifications setting
  await db
    .update(follows)
    .set({
      notificationsEnabled: data.enabled
    })
    .where(eq(follows.id, existingFollow[0].id))

  return c.json({
    success: true,
    message: `Notifications ${data.enabled ? 'enabled' : 'disabled'}`,
    data: {
      notificationsEnabled: data.enabled
    }
  })
})

/**
 * Get recommended professionals to follow
 * GET /api/follow/recommendations
 */
router.get('/recommendations', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const limit = Number.parseInt(c.req.query('limit') || '10')

  // Get users already following
  const alreadyFollowing = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, user.id))

  const followingIds = alreadyFollowing.map((f) => f.followingId)
  followingIds.push(user.id) // Don't recommend yourself

  // Find verified professionals
  const whereConditions = [eq(users.isProfessional, true), eq(users.isVerified, true)]

  // Build the query
  const recommendations = await db
    .select({
      professional: {
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image,
        isVerified: users.isVerified,
        isProfessional: users.isProfessional,
        activityCategory: users.activityCategory,
        serviceDescription: users.serviceDescription,
        city: users.city,
        district: users.district
      }
    })
    .from(users)
    .where(and(...whereConditions))
    .limit(limit * 2) // Get more to filter out followed users

  // Filter out already following in JavaScript
  const filtered = recommendations.filter((r) => !followingIds.includes(r.professional.id)).slice(0, limit)

  return c.json({
    success: true,
    data: filtered
  })
})

export default router
