import { OpenAPIHono } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../database/db'
import { users } from '../database/schema/auth'

const router = new OpenAPIHono()

// Identity verification schema
const VerifyIdentitySchema = z.object({
  userId: z.string(),
  cinNumber: z.string().min(12).max(12),
  cinPhotoUrl: z.string().url()
})

// Professional profile schema
const ProfessionalProfileSchema = z.object({
  userId: z.string(),
  isProfessional: z.boolean(),
  activityCategory: z.string().optional(),
  serviceDescription: z.string().optional(),
  address: z.string().optional(),
  gpsCoordinates: z.string().optional(),
  openingHours: z.record(z.any()).optional(),
  contactNumbers: z.array(z.string()).optional()
})

// Portfolio update schema
const PortfolioSchema = z.object({
  userId: z.string(),
  portfolioPhotos: z.array(z.string().url()).max(20).optional(),
  portfolioVideos: z.array(z.string().url()).optional(),
  certificates: z.array(z.string().url()).optional()
})

// Status update schema
const StatusSchema = z.object({
  userId: z.string(),
  status: z.enum(['available', 'busy', 'closed', 'online', 'offline']),
  autoStatus: z.boolean().optional()
})

/**
 * Submit identity verification (CIN)
 * POST /api/verification/submit
 */
router.post('/submit', async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = VerifyIdentitySchema.parse(body)

    // Update user with CIN information
    const result = await db
      .update(users)
      .set({
        cinNumber: validatedData.cinNumber,
        cinPhotoUrl: validatedData.cinPhotoUrl,
        isVerified: false, // Pending verification
        updatedAt: new Date()
      })
      .where(eq(users.id, validatedData.userId))
      .returning()

    if (result.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({
      success: true,
      message: 'Identity verification submitted. Please wait for admin approval.',
      data: {
        userId: result[0].id,
        isVerified: result[0].isVerified
      }
    })
  } catch (error: any) {
    console.error('Identity verification error:', error)
    return c.json({ error: error.message || 'Verification submission failed' }, 400)
  }
})

/**
 * Approve identity verification (Admin only)
 * POST /api/verification/approve/:userId
 */
router.post('/approve/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')

    // TODO: Add admin authorization check here

    const result = await db
      .update(users)
      .set({
        isVerified: true,
        verifiedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning()

    if (result.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({
      success: true,
      message: 'Identity verified successfully',
      data: {
        userId: result[0].id,
        isVerified: result[0].isVerified,
        verifiedAt: result[0].verifiedAt
      }
    })
  } catch (error: any) {
    console.error('Identity approval error:', error)
    return c.json({ error: error.message || 'Verification approval failed' }, 400)
  }
})

/**
 * Get verification status
 * GET /api/verification/status/:userId
 */
router.get('/status/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')

    const result = await db
      .select({
        id: users.id,
        username: users.username,
        isVerified: users.isVerified,
        verifiedAt: users.verifiedAt,
        cinNumber: users.cinNumber
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (result.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({
      success: true,
      data: result[0]
    })
  } catch (error: any) {
    console.error('Get verification status error:', error)
    return c.json({ error: error.message || 'Failed to get verification status' }, 400)
  }
})

/**
 * Update professional profile
 * POST /api/profile/professional
 */
router.post('/professional', async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = ProfessionalProfileSchema.parse(body)

    const updateData: any = {
      isProfessional: validatedData.isProfessional,
      updatedAt: new Date()
    }

    if (validatedData.activityCategory) updateData.activityCategory = validatedData.activityCategory
    if (validatedData.serviceDescription) updateData.serviceDescription = validatedData.serviceDescription
    if (validatedData.address) updateData.address = validatedData.address
    if (validatedData.gpsCoordinates) updateData.gpsCoordinates = validatedData.gpsCoordinates
    if (validatedData.openingHours) updateData.openingHours = validatedData.openingHours
    if (validatedData.contactNumbers) updateData.contactNumbers = validatedData.contactNumbers

    const result = await db.update(users).set(updateData).where(eq(users.id, validatedData.userId)).returning()

    if (result.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({
      success: true,
      message: 'Professional profile updated',
      data: result[0]
    })
  } catch (error: any) {
    console.error('Professional profile update error:', error)
    return c.json({ error: error.message || 'Profile update failed' }, 400)
  }
})

/**
 * Update portfolio
 * POST /api/profile/portfolio
 */
router.post('/portfolio', async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = PortfolioSchema.parse(body)

    const updateData: any = {
      updatedAt: new Date()
    }

    if (validatedData.portfolioPhotos) updateData.portfolioPhotos = validatedData.portfolioPhotos
    if (validatedData.portfolioVideos) updateData.portfolioVideos = validatedData.portfolioVideos
    if (validatedData.certificates) updateData.certificates = validatedData.certificates

    const result = await db.update(users).set(updateData).where(eq(users.id, validatedData.userId)).returning()

    if (result.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({
      success: true,
      message: 'Portfolio updated',
      data: {
        userId: result[0].id,
        portfolioPhotos: result[0].portfolioPhotos,
        portfolioVideos: result[0].portfolioVideos,
        certificates: result[0].certificates
      }
    })
  } catch (error: any) {
    console.error('Portfolio update error:', error)
    return c.json({ error: error.message || 'Portfolio update failed' }, 400)
  }
})

/**
 * Update user status
 * POST /api/profile/status
 */
router.post('/status', async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = StatusSchema.parse(body)

    const updateData: any = {
      status: validatedData.status,
      updatedAt: new Date()
    }

    if (validatedData.autoStatus !== undefined) {
      updateData.autoStatus = validatedData.autoStatus
    }

    const result = await db.update(users).set(updateData).where(eq(users.id, validatedData.userId)).returning()

    if (result.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({
      success: true,
      message: 'Status updated',
      data: {
        userId: result[0].id,
        status: result[0].status,
        autoStatus: result[0].autoStatus
      }
    })
  } catch (error: any) {
    console.error('Status update error:', error)
    return c.json({ error: error.message || 'Status update failed' }, 400)
  }
})

/**
 * Get user profile
 * GET /api/profile/:userId
 */
router.get('/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')

    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1)

    if (result.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }

    const user = result[0]

    // Don't return sensitive data
    const publicProfile = {
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      isVerified: user.isVerified,
      district: user.district,
      city: user.city,
      isProfessional: user.isProfessional,
      activityCategory: user.activityCategory,
      serviceDescription: user.serviceDescription,
      address: user.address,
      gpsCoordinates: user.gpsCoordinates,
      openingHours: user.openingHours,
      contactNumbers: user.contactNumbers,
      portfolioPhotos: user.portfolioPhotos,
      portfolioVideos: user.portfolioVideos,
      certificates: user.certificates,
      status: user.status,
      createdAt: user.createdAt
    }

    return c.json({
      success: true,
      data: publicProfile
    })
  } catch (error: any) {
    console.error('Get profile error:', error)
    return c.json({ error: error.message || 'Failed to get profile' }, 400)
  }
})

export default router
