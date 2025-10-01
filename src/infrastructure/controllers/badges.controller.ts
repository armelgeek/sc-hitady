import { randomBytes } from 'node:crypto'
import { OpenAPIHono } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../database/db'
import { badges, ratingStatistics, userBadges } from '../database/schema'

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

// Badge creation schema
const CreateBadgeSchema = z.object({
  name: z.string(),
  category: z.enum(['competence', 'service', 'fidelity', 'identity_verified']),
  description: z.string(),
  iconUrl: z.string().optional(),
  color: z.string().optional(),
  requirements: z.record(z.any())
})

/**
 * Create a new badge (admin only)
 * POST /api/badges/create
 */
router.post('/create', async (c) => {
  try {
    const user = c.get('user')
    if (!user || !user.isAdmin) {
      return c.json({ error: 'Admin access required' }, 403)
    }

    const body = await c.req.json()
    const validatedData = CreateBadgeSchema.parse(body)

    const badgeId = generateId()
    const now = new Date()

    const newBadge = await db
      .insert(badges)
      .values({
        id: badgeId,
        name: validatedData.name,
        category: validatedData.category,
        description: validatedData.description,
        iconUrl: validatedData.iconUrl || null,
        color: validatedData.color || null,
        requirements: validatedData.requirements,
        createdAt: now,
        updatedAt: now
      })
      .returning()

    return c.json(
      {
        success: true,
        message: 'Badge created successfully',
        data: newBadge[0]
      },
      201
    )
  } catch (error: any) {
    console.error('Create badge error:', error)
    return c.json({ error: error.message || 'Failed to create badge' }, 400)
  }
})

/**
 * Get all badges
 * GET /api/badges/list
 */
router.get('/list', async (c) => {
  try {
    const allBadges = await db.select().from(badges)

    return c.json({
      success: true,
      data: allBadges
    })
  } catch (error: any) {
    console.error('List badges error:', error)
    return c.json({ error: error.message || 'Failed to list badges' }, 400)
  }
})

/**
 * Get badges for a specific user
 * GET /api/badges/user/:userId
 */
router.get('/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')

    const userBadgesList = await db
      .select({
        badge: badges,
        earnedAt: userBadges.earnedAt
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId))

    return c.json({
      success: true,
      data: userBadgesList
    })
  } catch (error: any) {
    console.error('Get user badges error:', error)
    return c.json({ error: error.message || 'Failed to get user badges' }, 400)
  }
})

/**
 * Auto-assign badges to a user based on their statistics
 * POST /api/badges/auto-assign/:userId
 */
router.post('/auto-assign/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')

    // Get user statistics
    const stats = await db.select().from(ratingStatistics).where(eq(ratingStatistics.userId, userId)).limit(1)

    if (stats.length === 0) {
      return c.json({ error: 'User has no rating statistics' }, 404)
    }

    const userStats = stats[0]

    // Get all badges
    const allBadges = await db.select().from(badges)

    // Get user's existing badges
    const existingBadges = await db.select().from(userBadges).where(eq(userBadges.userId, userId))

    const existingBadgeIds = new Set(existingBadges.map((ub) => ub.badgeId))

    const newBadges: string[] = []
    const now = new Date()

    // Check each badge's requirements
    for (const badge of allBadges) {
      if (existingBadgeIds.has(badge.id)) {
        continue
      }

      if (checkBadgeRequirements(badge, userStats)) {
        await db.insert(userBadges).values({
          id: generateId(),
          userId,
          badgeId: badge.id,
          earnedAt: now,
          createdAt: now
        })
        newBadges.push(badge.name)
      }
    }

    return c.json({
      success: true,
      message: `Auto-assigned ${newBadges.length} new badges`,
      data: {
        newBadges
      }
    })
  } catch (error: any) {
    console.error('Auto-assign badges error:', error)
    return c.json({ error: error.message || 'Failed to auto-assign badges' }, 400)
  }
})

/**
 * Helper function to check if user meets badge requirements
 */
function checkBadgeRequirements(
  badge: typeof badges.$inferSelect,
  stats: typeof ratingStatistics.$inferSelect
): boolean {
  const requirements = badge.requirements as Record<string, any>

  // Example requirements checking logic
  if (requirements.minOverallScore && stats.avgOverall < requirements.minOverallScore) {
    return false
  }

  if (requirements.minTotalClients && stats.totalClients < requirements.minTotalClients) {
    return false
  }

  if (requirements.minRecommendationRate && stats.recommendationRate < requirements.minRecommendationRate) {
    return false
  }

  if (requirements.minQuality && stats.avgQuality < requirements.minQuality) {
    return false
  }

  if (requirements.minPunctuality && stats.avgPunctuality < requirements.minPunctuality) {
    return false
  }

  if (requirements.minCommunication && stats.avgCommunication < requirements.minCommunication) {
    return false
  }

  // All requirements met
  return true
}

/**
 * Seed initial badges (admin only)
 * POST /api/badges/seed
 */
router.post('/seed', async (c) => {
  try {
    const user = c.get('user')
    if (!user || !user.isAdmin) {
      return c.json({ error: 'Admin access required' }, 403)
    }

    const now = new Date()

    const initialBadges = [
      {
        id: generateId(),
        name: 'Expert',
        category: 'competence',
        description: 'Earned by professionals with exceptional ratings',
        color: '#FFD700',
        requirements: { minOverallScore: 90, minTotalClients: 50 },
        createdAt: now,
        updatedAt: now
      },
      {
        id: generateId(),
        name: 'Fast Response',
        category: 'service',
        description: 'Quick to respond to client requests',
        color: '#00CED1',
        requirements: { maxAvgResponseTime: 2 },
        createdAt: now,
        updatedAt: now
      },
      {
        id: generateId(),
        name: 'Highly Recommended',
        category: 'fidelity',
        description: 'High recommendation rate from satisfied clients',
        color: '#32CD32',
        requirements: { minRecommendationRate: 85, minTotalClients: 20 },
        createdAt: now,
        updatedAt: now
      },
      {
        id: generateId(),
        name: 'Identity Verified',
        category: 'identity_verified',
        description: 'Identity verified with official documents',
        color: '#4169E1',
        requirements: { isVerified: true },
        createdAt: now,
        updatedAt: now
      },
      {
        id: generateId(),
        name: 'Top Quality',
        category: 'competence',
        description: 'Consistently delivers top quality work',
        color: '#FF6347',
        requirements: { minQuality: 90, minTotalClients: 30 },
        createdAt: now,
        updatedAt: now
      },
      {
        id: generateId(),
        name: 'Punctual Professional',
        category: 'service',
        description: 'Always on time',
        color: '#9370DB',
        requirements: { minPunctuality: 90, minTotalClients: 20 },
        createdAt: now,
        updatedAt: now
      }
    ]

    await db.insert(badges).values(initialBadges).onConflictDoNothing()

    return c.json({
      success: true,
      message: 'Initial badges seeded successfully',
      data: {
        count: initialBadges.length
      }
    })
  } catch (error: any) {
    console.error('Seed badges error:', error)
    return c.json({ error: error.message || 'Failed to seed badges' }, 400)
  }
})

export default router
