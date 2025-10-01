import { randomBytes } from 'node:crypto'
import { OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../database/db'
import {
  personalityTraits,
  ratings,
  ratingStatistics,
  ratingValidations,
  specializedCriteria,
  users
} from '../database/schema'

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

// Rating submission schema
const SubmitRatingSchema = z.object({
  providerId: z.string(),
  // Universal criteria (0-100)
  qualityScore: z.number().min(0).max(100),
  punctualityScore: z.number().min(0).max(100),
  honestyScore: z.number().min(0).max(100),
  communicationScore: z.number().min(0).max(100),
  cleanlinessScore: z.number().min(0).max(100),
  // Optional comment
  comment: z.string().optional(),
  // Contact verification
  contactPhone: z.string(),
  // Personality traits (-100 to 100)
  personalityTraits: z.object({
    rapidityMeticulousness: z.number().min(-100).max(100),
    flexibilityRigor: z.number().min(-100).max(100),
    communicativeDiscreet: z.number().min(-100).max(100),
    innovativeTraditional: z.number().min(-100).max(100)
  }),
  // Optional specialized criteria
  specializedCriteria: z
    .object({
      profession: z.string(),
      criteriaScores: z.record(z.number().min(0).max(100))
    })
    .optional()
})

/**
 * Submit a new rating
 * POST /api/ratings/submit
 */
router.post('/submit', async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const body = await c.req.json()
    const validatedData = SubmitRatingSchema.parse(body)

    // Verify provider exists and is a professional
    const providerResults = await db.select().from(users).where(eq(users.id, validatedData.providerId)).limit(1)

    if (providerResults.length === 0) {
      return c.json({ error: 'Provider not found' }, 404)
    }

    const provider = providerResults[0]
    if (!provider.isProfessional) {
      return c.json({ error: 'User is not a professional service provider' }, 400)
    }

    // Check if user already rated this provider
    const existingRating = await db
      .select()
      .from(ratings)
      .where(and(eq(ratings.clientId, user.id), eq(ratings.providerId, validatedData.providerId)))
      .limit(1)

    if (existingRating.length > 0) {
      return c.json({ error: 'You have already rated this provider' }, 400)
    }

    // Calculate overall score
    const overallScore =
      (validatedData.qualityScore +
        validatedData.punctualityScore +
        validatedData.honestyScore +
        validatedData.communicationScore +
        validatedData.cleanlinessScore) /
      5

    // Create rating
    const ratingId = generateId()
    const now = new Date()

    const newRating = await db
      .insert(ratings)
      .values({
        id: ratingId,
        providerId: validatedData.providerId,
        clientId: user.id,
        qualityScore: validatedData.qualityScore,
        punctualityScore: validatedData.punctualityScore,
        honestyScore: validatedData.honestyScore,
        communicationScore: validatedData.communicationScore,
        cleanlinessScore: validatedData.cleanlinessScore,
        overallScore,
        comment: validatedData.comment || null,
        contactPhone: validatedData.contactPhone,
        isValidated: true,
        isSuspicious: false,
        validatedAt: now,
        createdAt: now,
        updatedAt: now
      })
      .returning()

    // Create personality traits
    await db.insert(personalityTraits).values({
      id: generateId(),
      ratingId,
      rapidityMeticulousness: validatedData.personalityTraits.rapidityMeticulousness,
      flexibilityRigor: validatedData.personalityTraits.flexibilityRigor,
      communicativeDiscreet: validatedData.personalityTraits.communicativeDiscreet,
      innovativeTraditional: validatedData.personalityTraits.innovativeTraditional,
      createdAt: now,
      updatedAt: now
    })

    // Create specialized criteria if provided
    if (validatedData.specializedCriteria) {
      await db.insert(specializedCriteria).values({
        id: generateId(),
        ratingId,
        profession: validatedData.specializedCriteria.profession,
        criteriaScores: validatedData.specializedCriteria.criteriaScores,
        createdAt: now,
        updatedAt: now
      })
    }

    // Update rating statistics
    await updateRatingStatistics(validatedData.providerId)

    // Create Neo4j relationship
    try {
      const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
      const loader = new CypherQueryLoader()
      await loader.run('rating', 'create-rating', {
        clientId: user.id,
        providerId: validatedData.providerId,
        ratingId,
        qualityScore: validatedData.qualityScore,
        punctualityScore: validatedData.punctualityScore,
        honestyScore: validatedData.honestyScore,
        communicationScore: validatedData.communicationScore,
        cleanlinessScore: validatedData.cleanlinessScore,
        overallScore,
        rapidityMeticulousness: validatedData.personalityTraits.rapidityMeticulousness,
        flexibilityRigor: validatedData.personalityTraits.flexibilityRigor,
        communicativeDiscreet: validatedData.personalityTraits.communicativeDiscreet,
        innovativeTraditional: validatedData.personalityTraits.innovativeTraditional,
        createdAt: now.toISOString()
      })
    } catch (error) {
      console.error('Error creating Neo4j rating relationship:', error)
    }

    return c.json(
      {
        success: true,
        message: 'Rating submitted successfully',
        data: {
          ratingId: newRating[0].id,
          overallScore
        }
      },
      201
    )
  } catch (error: any) {
    console.error('Submit rating error:', error)
    return c.json({ error: error.message || 'Failed to submit rating' }, 400)
  }
})

/**
 * Get ratings for a provider
 * GET /api/ratings/provider/:providerId
 */
router.get('/provider/:providerId', async (c) => {
  try {
    const providerId = c.req.param('providerId')

    // Get all ratings with personality traits
    const providerRatings = await db
      .select({
        rating: ratings,
        traits: personalityTraits,
        client: {
          id: users.id,
          name: users.name,
          username: users.username
        }
      })
      .from(ratings)
      .leftJoin(personalityTraits, eq(ratings.id, personalityTraits.ratingId))
      .leftJoin(users, eq(ratings.clientId, users.id))
      .where(eq(ratings.providerId, providerId))

    return c.json({
      success: true,
      data: {
        ratings: providerRatings,
        total: providerRatings.length
      }
    })
  } catch (error: any) {
    console.error('Get ratings error:', error)
    return c.json({ error: error.message || 'Failed to get ratings' }, 400)
  }
})

/**
 * Get rating statistics for a provider
 * GET /api/ratings/statistics/:providerId
 */
router.get('/statistics/:providerId', async (c) => {
  try {
    const providerId = c.req.param('providerId')

    // Get statistics
    const stats = await db.select().from(ratingStatistics).where(eq(ratingStatistics.userId, providerId)).limit(1)

    if (stats.length === 0) {
      // Create initial statistics if they don't exist
      await updateRatingStatistics(providerId)
      const newStats = await db.select().from(ratingStatistics).where(eq(ratingStatistics.userId, providerId)).limit(1)

      return c.json({
        success: true,
        data: newStats[0] || null
      })
    }

    return c.json({
      success: true,
      data: stats[0]
    })
  } catch (error: any) {
    console.error('Get statistics error:', error)
    return c.json({ error: error.message || 'Failed to get statistics' }, 400)
  }
})

/**
 * Report a suspicious rating
 * POST /api/ratings/report/:ratingId
 */
router.post('/report/:ratingId', async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const ratingId = c.req.param('ratingId')
    const body = await c.req.json()
    const reportReason = body.reason

    if (!reportReason) {
      return c.json({ error: 'Report reason is required' }, 400)
    }

    // Check if rating exists
    const ratingResults = await db.select().from(ratings).where(eq(ratings.id, ratingId)).limit(1)

    if (ratingResults.length === 0) {
      return c.json({ error: 'Rating not found' }, 404)
    }

    // Create validation record
    const validationId = generateId()
    const now = new Date()

    await db.insert(ratingValidations).values({
      id: validationId,
      ratingId,
      status: 'under_review',
      fraudFlags: null,
      reportedBy: user.id,
      reportReason,
      reportedAt: now,
      createdAt: now,
      updatedAt: now
    })

    // Mark rating as suspicious
    await db
      .update(ratings)
      .set({
        isSuspicious: true,
        updatedAt: now
      })
      .where(eq(ratings.id, ratingId))

    return c.json({
      success: true,
      message: 'Rating reported successfully'
    })
  } catch (error: any) {
    console.error('Report rating error:', error)
    return c.json({ error: error.message || 'Failed to report rating' }, 400)
  }
})

/**
 * Get recommended providers based on user's rating history
 * GET /api/ratings/recommendations
 */
router.get('/recommendations', async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const limit = Number.parseInt(c.req.query('limit') || '10', 10)

    try {
      const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
      const loader = new CypherQueryLoader()
      const result = await loader.run('rating', 'get-recommendations', {
        userId: user.id,
        limit
      })

      const recommendations = result.records.map((record) => ({
        providerId: record.get('providerId'),
        providerName: record.get('providerName'),
        providerUsername: record.get('providerUsername'),
        category: record.get('category'),
        recommendations: record.get('recommendations'),
        avgScore: record.get('avgScore'),
        recommendedBy: record.get('recommendedBy')
      }))

      return c.json({
        success: true,
        data: recommendations
      })
    } catch (error) {
      console.error('Error getting recommendations from Neo4j:', error)
      return c.json({
        success: true,
        data: [],
        message: 'Recommendations not available at this time'
      })
    }
  } catch (error: any) {
    console.error('Get recommendations error:', error)
    return c.json({ error: error.message || 'Failed to get recommendations' }, 400)
  }
})

/**
 * Find similar providers based on rating patterns
 * GET /api/ratings/similar/:providerId
 */
router.get('/similar/:providerId', async (c) => {
  try {
    const providerId = c.req.param('providerId')
    const limit = Number.parseInt(c.req.query('limit') || '10', 10)
    const scoreThreshold = Number.parseInt(c.req.query('scoreThreshold') || '15', 10)
    const minCommonClients = Number.parseInt(c.req.query('minCommonClients') || '3', 10)

    try {
      const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
      const loader = new CypherQueryLoader()
      const result = await loader.run('rating', 'find-similar-providers', {
        providerId,
        scoreThreshold,
        minCommonClients,
        limit
      })

      const similarProviders = result.records.map((record) => ({
        providerId: record.get('providerId'),
        providerName: record.get('providerName'),
        providerUsername: record.get('providerUsername'),
        category: record.get('category'),
        commonClients: record.get('commonClients'),
        avgScore: record.get('avgScore')
      }))

      return c.json({
        success: true,
        data: similarProviders
      })
    } catch (error) {
      console.error('Error finding similar providers from Neo4j:', error)
      return c.json({
        success: true,
        data: [],
        message: 'Similar providers not available at this time'
      })
    }
  } catch (error: any) {
    console.error('Find similar providers error:', error)
    return c.json({ error: error.message || 'Failed to find similar providers' }, 400)
  }
})

/**
 * Helper function to update rating statistics
 */
async function updateRatingStatistics(providerId: string) {
  // Get all ratings for provider
  const providerRatings = await db
    .select({
      rating: ratings,
      traits: personalityTraits
    })
    .from(ratings)
    .leftJoin(personalityTraits, eq(ratings.id, personalityTraits.ratingId))
    .where(and(eq(ratings.providerId, providerId), eq(ratings.isValidated, true)))

  if (providerRatings.length === 0) {
    // Create empty statistics
    const provider = await db.select().from(users).where(eq(users.id, providerId)).limit(1)
    if (provider.length > 0) {
      await db
        .insert(ratingStatistics)
        .values({
          id: generateId(),
          userId: providerId,
          avgQuality: 0,
          avgPunctuality: 0,
          avgHonesty: 0,
          avgCommunication: 0,
          avgCleanliness: 0,
          avgOverall: 0,
          avgRapidityMeticulousness: 0,
          avgFlexibilityRigor: 0,
          avgCommunicativeDiscreet: 0,
          avgInnovativeTraditional: 0,
          totalClients: 0,
          satisfiedClients: 0,
          recommendationRate: 0,
          memberSince: provider[0].createdAt,
          updatedAt: new Date()
        })
        .onConflictDoNothing()
    }
    return
  }

  // Calculate averages
  const totalRatings = providerRatings.length
  let sumQuality = 0,
    sumPunctuality = 0,
    sumHonesty = 0,
    sumCommunication = 0,
    sumCleanliness = 0,
    sumOverall = 0
  let sumRapidity = 0,
    sumFlexibility = 0,
    sumCommunicative = 0,
    sumInnovative = 0
  let satisfiedCount = 0

  for (const item of providerRatings) {
    const r = item.rating
    sumQuality += r.qualityScore
    sumPunctuality += r.punctualityScore
    sumHonesty += r.honestyScore
    sumCommunication += r.communicationScore
    sumCleanliness += r.cleanlinessScore
    sumOverall += r.overallScore

    if (r.overallScore >= 60) {
      satisfiedCount++
    }

    if (item.traits) {
      sumRapidity += item.traits.rapidityMeticulousness
      sumFlexibility += item.traits.flexibilityRigor
      sumCommunicative += item.traits.communicativeDiscreet
      sumInnovative += item.traits.innovativeTraditional
    }
  }

  const avgQuality = sumQuality / totalRatings
  const avgPunctuality = sumPunctuality / totalRatings
  const avgHonesty = sumHonesty / totalRatings
  const avgCommunication = sumCommunication / totalRatings
  const avgCleanliness = sumCleanliness / totalRatings
  const avgOverall = sumOverall / totalRatings
  const recommendationRate = (satisfiedCount / totalRatings) * 100

  const avgRapidity = sumRapidity / totalRatings
  const avgFlexibility = sumFlexibility / totalRatings
  const avgCommunicative = sumCommunicative / totalRatings
  const avgInnovative = sumInnovative / totalRatings

  // Get provider info
  const provider = await db.select().from(users).where(eq(users.id, providerId)).limit(1)

  // Upsert statistics
  await db
    .insert(ratingStatistics)
    .values({
      id: generateId(),
      userId: providerId,
      avgQuality,
      avgPunctuality,
      avgHonesty,
      avgCommunication,
      avgCleanliness,
      avgOverall,
      avgRapidityMeticulousness: avgRapidity,
      avgFlexibilityRigor: avgFlexibility,
      avgCommunicativeDiscreet: avgCommunicative,
      avgInnovativeTraditional: avgInnovative,
      totalClients: totalRatings,
      satisfiedClients: satisfiedCount,
      recommendationRate,
      memberSince: provider[0]?.createdAt || new Date(),
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: ratingStatistics.userId,
      set: {
        avgQuality,
        avgPunctuality,
        avgHonesty,
        avgCommunication,
        avgCleanliness,
        avgOverall,
        avgRapidityMeticulousness: avgRapidity,
        avgFlexibilityRigor: avgFlexibility,
        avgCommunicativeDiscreet: avgCommunicative,
        avgInnovativeTraditional: avgInnovative,
        totalClients: totalRatings,
        satisfiedClients: satisfiedCount,
        recommendationRate,
        updatedAt: new Date()
      }
    })
}

export default router
