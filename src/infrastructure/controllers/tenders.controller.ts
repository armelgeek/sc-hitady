import { randomUUID } from 'node:crypto'
import { OpenAPIHono } from '@hono/zod-openapi'
import { and, desc, eq } from 'drizzle-orm'
import type {
  BidSortBy,
  CreateBidRequest,
  CreateTenderRequest,
  SortDirection,
  TenderSearchFilters
} from '@/domain/types/tender.types'
import { db } from '../database/db'
import { ratingStatistics, tenderBids, tenderNotifications, tenders, users } from '../database/schema'
import { TenderNotificationService } from '../services/tender-notification.service'
import { calculateDistance, parseGpsCoordinates } from '../utils/geo.util'

const router = new OpenAPIHono<{
  Variables: {
    user: {
      id: string
      name: string
      email: string
      username?: string | null
      isAdmin: boolean
      isVerified: boolean
      isProfessional: boolean
    } | null
    session: {
      id: string
      token: string
      expiresAt: Date
      userId: string
    } | null
  }
}>()
const notificationService = new TenderNotificationService()

/**
 * Create a new tender (service request)
 * POST /api/tenders
 */
router.post('/', async (c) => {
  try {
    const body = await c.req.json<CreateTenderRequest>()

    // Validate user is authenticated
    const currentUser = c.get('user')
    if (!currentUser) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    // Ensure clientId matches authenticated user or is admin
    if (body.clientId !== currentUser.id && !currentUser.isAdmin) {
      return c.json({ error: 'Unauthorized' }, 403)
    }

    const tenderId = randomUUID()
    const now = new Date()

    // Calculate expiration based on urgency
    let expiresAt: Date | undefined
    if (body.urgency === 'today') {
      expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
    } else if (body.urgency === 'this-week') {
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }

    // Create tender
    await db.insert(tenders).values({
      id: tenderId,
      clientId: body.clientId,
      title: body.title,
      category: body.category,
      description: body.description,
      location: body.location,
      city: body.city,
      district: body.district,
      gpsCoordinates: body.gpsCoordinates,
      urgency: body.urgency,
      photos: body.photos,
      maxBudget: body.maxBudget,
      preferredSchedule: body.preferredSchedule,
      specialConstraints: body.specialConstraints,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      expiresAt
    })

    // Send notifications to matching professionals
    try {
      const notificationResults = await notificationService.notifyMatchingProfessionals(tenderId, {
        category: body.category,
        gpsCoordinates: body.gpsCoordinates,
        radius: 15, // 15km radius by default
        minRating: 60, // Minimum rating of 60/100
        requiredAvailability: body.urgency === 'today'
      })

      console.log(`Sent ${notificationResults.length} notifications for tender ${tenderId}`)
    } catch (notifError) {
      console.error('Error sending notifications:', notifError)
      // Don't fail the tender creation if notifications fail
    }

    // Fetch the created tender
    const [createdTender] = await db.select().from(tenders).where(eq(tenders.id, tenderId)).limit(1)

    return c.json({
      success: true,
      data: createdTender
    })
  } catch (error: any) {
    console.error('Error creating tender:', error)
    return c.json({ error: error.message || 'Failed to create tender' }, 400)
  }
})

/**
 * Get tender details with bids
 * GET /api/tenders/:id
 */
router.get('/:id', async (c) => {
  try {
    const tenderId = c.req.param('id')

    // Fetch tender
    const [tender] = await db.select().from(tenders).where(eq(tenders.id, tenderId)).limit(1)

    if (!tender) {
      return c.json({ error: 'Tender not found' }, 404)
    }

    // Fetch client info
    const [client] = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image
      })
      .from(users)
      .where(eq(users.id, tender.clientId))
      .limit(1)

    // Fetch bids count
    const bidsResult = await db.select().from(tenderBids).where(eq(tenderBids.tenderId, tenderId))

    return c.json({
      success: true,
      data: {
        ...tender,
        clientName: client?.name,
        clientUsername: client?.username,
        clientImage: client?.image,
        bidsCount: bidsResult.length
      }
    })
  } catch (error: any) {
    console.error('Error fetching tender:', error)
    return c.json({ error: error.message || 'Failed to fetch tender' }, 400)
  }
})

/**
 * List tenders with filters
 * GET /api/tenders
 */
router.get('/', async (c) => {
  try {
    const query = c.req.query()
    const filters: TenderSearchFilters = {
      category: query.category,
      status: query.status as any,
      urgency: query.urgency as any,
      city: query.city,
      district: query.district,
      clientId: query.clientId,
      professionalId: query.professionalId,
      page: Number.parseInt(query.page || '1'),
      limit: Number.parseInt(query.limit || '20')
    }

    const page = filters.page || 1
    const limit = Math.min(filters.limit || 20, 100)
    const offset = (page - 1) * limit

    // Build conditions
    const conditions: any[] = []

    if (filters.category) {
      conditions.push(eq(tenders.category, filters.category))
    }

    if (filters.status) {
      conditions.push(eq(tenders.status, filters.status))
    } else {
      // By default, show only open tenders
      conditions.push(eq(tenders.status, 'open'))
    }

    if (filters.urgency) {
      conditions.push(eq(tenders.urgency, filters.urgency))
    }

    if (filters.city) {
      conditions.push(eq(tenders.city, filters.city))
    }

    if (filters.district) {
      conditions.push(eq(tenders.district, filters.district))
    }

    if (filters.clientId) {
      conditions.push(eq(tenders.clientId, filters.clientId))
    }

    // Query tenders
    const query_builder = db
      .select({
        tender: tenders,
        client: {
          id: users.id,
          name: users.name,
          username: users.username,
          image: users.image
        }
      })
      .from(tenders)
      .leftJoin(users, eq(tenders.clientId, users.id))
      .where(and(...conditions))
      .orderBy(desc(tenders.createdAt))
      .limit(limit)
      .offset(offset)

    const results = await query_builder

    // Get bids count for each tender
    const tendersWithBids = await Promise.all(
      results.map(async (result) => {
        const bidsResult = await db.select().from(tenderBids).where(eq(tenderBids.tenderId, result.tender.id))

        return {
          ...result.tender,
          clientName: result.client?.name,
          clientUsername: result.client?.username,
          clientImage: result.client?.image,
          bidsCount: bidsResult.length
        }
      })
    )

    return c.json({
      success: true,
      data: {
        tenders: tendersWithBids,
        page,
        limit,
        total: tendersWithBids.length
      }
    })
  } catch (error: any) {
    console.error('Error listing tenders:', error)
    return c.json({ error: error.message || 'Failed to list tenders' }, 400)
  }
})

/**
 * Submit a bid for a tender (professional)
 * POST /api/tenders/:id/bids
 */
router.post('/:id/bids', async (c) => {
  try {
    const tenderId = c.req.param('id')
    const body = await c.req.json<CreateBidRequest>()

    // Validate user is authenticated
    const currentUser = c.get('user')
    if (!currentUser) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    // Ensure user is a professional
    if (!currentUser.isProfessional) {
      return c.json({ error: 'Only professionals can submit bids' }, 403)
    }

    // Ensure professionalId matches authenticated user
    if (body.professionalId !== currentUser.id) {
      return c.json({ error: 'Unauthorized' }, 403)
    }

    // Check if tender exists and is open
    const [tender] = await db.select().from(tenders).where(eq(tenders.id, tenderId)).limit(1)

    if (!tender) {
      return c.json({ error: 'Tender not found' }, 404)
    }

    if (tender.status !== 'open') {
      return c.json({ error: 'Tender is not open for bidding' }, 400)
    }

    // Check if professional already submitted a bid
    const existingBid = await db
      .select()
      .from(tenderBids)
      .where(and(eq(tenderBids.tenderId, tenderId), eq(tenderBids.professionalId, body.professionalId)))
      .limit(1)

    if (existingBid.length > 0) {
      return c.json({ error: 'You have already submitted a bid for this tender' }, 400)
    }

    // Get professional rating
    const [stats] = await db
      .select()
      .from(ratingStatistics)
      .where(eq(ratingStatistics.userId, body.professionalId))
      .limit(1)

    // Calculate distance if both have GPS coordinates
    let distance: number | undefined
    if (tender.gpsCoordinates && currentUser.id) {
      const [professional] = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1)

      if (professional?.gpsCoordinates) {
        const tenderCoords = parseGpsCoordinates(tender.gpsCoordinates)
        const profCoords = parseGpsCoordinates(professional.gpsCoordinates)

        if (tenderCoords && profCoords) {
          distance = calculateDistance(tenderCoords, profCoords)
        }
      }
    }

    // Create bid
    const bidId = randomUUID()
    const now = new Date()

    await db.insert(tenderBids).values({
      id: bidId,
      tenderId,
      professionalId: body.professionalId,
      price: body.price,
      estimatedDuration: body.estimatedDuration,
      guaranteePeriod: body.guaranteePeriod,
      availability: body.availability,
      description: body.description,
      photos: body.photos,
      hasGuarantee: body.hasGuarantee,
      canStartToday: body.canStartToday,
      professionalRating: stats?.avgOverall || undefined,
      professionalDistance: distance,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    })

    // Fetch created bid
    const [createdBid] = await db.select().from(tenderBids).where(eq(tenderBids.id, bidId)).limit(1)

    return c.json({
      success: true,
      data: createdBid
    })
  } catch (error: any) {
    console.error('Error creating bid:', error)
    return c.json({ error: error.message || 'Failed to create bid' }, 400)
  }
})

/**
 * Get all bids for a tender with sorting
 * GET /api/tenders/:id/bids
 */
router.get('/:id/bids', async (c) => {
  try {
    const tenderId = c.req.param('id')
    const sortBy = (c.req.query('sortBy') || 'price') as BidSortBy
    const sortDirection = (c.req.query('direction') || 'asc') as SortDirection

    // Verify tender exists
    const [tender] = await db.select().from(tenders).where(eq(tenders.id, tenderId)).limit(1)

    if (!tender) {
      return c.json({ error: 'Tender not found' }, 404)
    }

    // Fetch bids with professional info
    const results = await db
      .select({
        bid: tenderBids,
        professional: {
          id: users.id,
          name: users.name,
          username: users.username,
          image: users.image,
          activityCategory: users.activityCategory,
          isVerified: users.isVerified
        }
      })
      .from(tenderBids)
      .leftJoin(users, eq(tenderBids.professionalId, users.id))
      .where(eq(tenderBids.tenderId, tenderId))

    let bids = results.map((r) => ({
      ...r.bid,
      professionalName: r.professional?.name,
      professionalUsername: r.professional?.username,
      professionalImage: r.professional?.image,
      professionalCategory: r.professional?.activityCategory,
      professionalIsVerified: r.professional?.isVerified
    }))

    // Sort bids
    bids = sortBids(bids, sortBy, sortDirection)

    return c.json({
      success: true,
      data: {
        bids,
        count: bids.length
      }
    })
  } catch (error: any) {
    console.error('Error fetching bids:', error)
    return c.json({ error: error.message || 'Failed to fetch bids' }, 400)
  }
})

/**
 * Select a winning bid (client)
 * POST /api/tenders/:id/select
 */
router.post('/:id/select', async (c) => {
  try {
    const tenderId = c.req.param('id')
    const { bidId } = await c.req.json<{ bidId: string }>()

    // Validate user is authenticated
    const currentUser = c.get('user')
    if (!currentUser) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    // Verify tender exists and belongs to user
    const [tender] = await db.select().from(tenders).where(eq(tenders.id, tenderId)).limit(1)

    if (!tender) {
      return c.json({ error: 'Tender not found' }, 404)
    }

    if (tender.clientId !== currentUser.id && !currentUser.isAdmin) {
      return c.json({ error: 'Unauthorized' }, 403)
    }

    if (tender.status !== 'open') {
      return c.json({ error: 'Tender is not open' }, 400)
    }

    // Verify bid exists and belongs to this tender
    const [bid] = await db
      .select()
      .from(tenderBids)
      .where(and(eq(tenderBids.id, bidId), eq(tenderBids.tenderId, tenderId)))
      .limit(1)

    if (!bid) {
      return c.json({ error: 'Bid not found' }, 404)
    }

    // Update tender status and selected bid
    await db
      .update(tenders)
      .set({
        status: 'in-progress',
        selectedBidId: bidId,
        selectedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tenders.id, tenderId))

    // Update selected bid status
    await db
      .update(tenderBids)
      .set({
        status: 'selected',
        updatedAt: new Date()
      })
      .where(eq(tenderBids.id, bidId))

    // Update other bids to rejected
    await db
      .update(tenderBids)
      .set({
        status: 'rejected',
        updatedAt: new Date()
      })
      .where(and(eq(tenderBids.tenderId, tenderId), eq(tenderBids.status, 'pending')))

    return c.json({
      success: true,
      message: 'Bid selected successfully'
    })
  } catch (error: any) {
    console.error('Error selecting bid:', error)
    return c.json({ error: error.message || 'Failed to select bid' }, 400)
  }
})

/**
 * Cancel a tender (client)
 * POST /api/tenders/:id/cancel
 */
router.post('/:id/cancel', async (c) => {
  try {
    const tenderId = c.req.param('id')

    // Validate user is authenticated
    const currentUser = c.get('user')
    if (!currentUser) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    // Verify tender exists and belongs to user
    const [tender] = await db.select().from(tenders).where(eq(tenders.id, tenderId)).limit(1)

    if (!tender) {
      return c.json({ error: 'Tender not found' }, 404)
    }

    if (tender.clientId !== currentUser.id && !currentUser.isAdmin) {
      return c.json({ error: 'Unauthorized' }, 403)
    }

    if (tender.status === 'cancelled' || tender.status === 'completed') {
      return c.json({ error: 'Tender cannot be cancelled' }, 400)
    }

    // Update tender status
    await db
      .update(tenders)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(tenders.id, tenderId))

    return c.json({
      success: true,
      message: 'Tender cancelled successfully'
    })
  } catch (error: any) {
    console.error('Error cancelling tender:', error)
    return c.json({ error: error.message || 'Failed to cancel tender' }, 400)
  }
})

/**
 * Get notifications for a professional
 * GET /api/tenders/notifications
 */
router.get('/notifications/my', async (c) => {
  try {
    // Validate user is authenticated
    const currentUser = c.get('user')
    if (!currentUser) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    if (!currentUser.isProfessional) {
      return c.json({ error: 'Only professionals can view notifications' }, 403)
    }

    const page = Number.parseInt(c.req.query('page') || '1')
    const limit = Math.min(Number.parseInt(c.req.query('limit') || '20'), 100)
    const offset = (page - 1) * limit

    // Fetch notifications with tender info
    const results = await db
      .select({
        notification: tenderNotifications,
        tender: tenders
      })
      .from(tenderNotifications)
      .leftJoin(tenders, eq(tenderNotifications.tenderId, tenders.id))
      .where(eq(tenderNotifications.professionalId, currentUser.id))
      .orderBy(desc(tenderNotifications.sentAt))
      .limit(limit)
      .offset(offset)

    const notifications = results.map((r) => ({
      ...r.notification,
      tender: r.tender
    }))

    return c.json({
      success: true,
      data: {
        notifications,
        page,
        limit,
        total: notifications.length
      }
    })
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return c.json({ error: error.message || 'Failed to fetch notifications' }, 400)
  }
})

/**
 * Helper function to sort bids
 */
function sortBids(bids: any[], sortBy: BidSortBy, direction: SortDirection): any[] {
  return bids.sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'price':
        comparison = (a.price || 0) - (b.price || 0)
        break
      case 'rating':
        comparison = (b.professionalRating || 0) - (a.professionalRating || 0) // Higher rating first
        break
      case 'distance':
        comparison = (a.professionalDistance || Infinity) - (b.professionalDistance || Infinity)
        break
      case 'duration':
        // Simple duration comparison (might need more sophisticated parsing)
        comparison = compareDuration(a.estimatedDuration, b.estimatedDuration)
        break
    }

    return direction === 'asc' ? comparison : -comparison
  })
}

/**
 * Helper function to compare durations
 */
function compareDuration(a: string, b: string): number {
  // Extract numbers from duration strings
  const numA = Number.parseInt(a.match(/\d+/)?.[0] || '999')
  const numB = Number.parseInt(b.match(/\d+/)?.[0] || '999')
  return numA - numB
}

export default router
