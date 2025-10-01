import { OpenAPIHono } from '@hono/zod-openapi'
import { and, eq, ilike, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getAllCategories, getAllSubcategories, searchCategories } from '@/domain/constants/service-categories'
import { db } from '../database/db'
import { users } from '../database/schema/auth'
import { ratingStatistics } from '../database/schema/ratings'
import { calculateDistance, filterByDistance, sortByDistance, type Coordinates } from '../utils/geo.util'

const router = new OpenAPIHono()

// Search schema
const SearchSchema = z.object({
  // Location parameters
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius: z.number().min(500).max(50000).default(5000), // 500m to 50km, default 5km

  // Search parameters
  query: z.string().optional(), // Search by name, category, keyword
  category: z.string().optional(),
  subcategory: z.string().optional(),

  // Advanced filters
  minRating: z.number().min(0).max(100).optional(), // Minimum rating score
  availability: z.enum(['open-now', 'available-today', 'any']).optional(),
  status: z.enum(['available', 'busy', 'online', 'any']).optional(),

  // Special services filters
  delivery: z.boolean().optional(),
  emergency: z.boolean().optional(),
  warranty: z.boolean().optional(),

  // Sorting
  sortBy: z.enum(['distance', 'rating', 'name']).default('distance'),

  // Pagination
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
})

/**
 * Search for professionals by proximity
 * POST /api/discovery/search
 */
router.post('/search', async (c) => {
  try {
    const body = await c.req.json()
    const params = SearchSchema.parse(body)

    const { page, limit } = params
    const offset = (page - 1) * limit

    // Build base query for professionals only
    const conditions = [eq(users.isProfessional, true)]

    // Text search (name, category, service description)
    if (params.query) {
      conditions.push(
        or(
          ilike(users.name, `%${params.query}%`),
          ilike(users.username, `%${params.query}%`),
          ilike(users.activityCategory, `%${params.query}%`),
          ilike(users.serviceDescription, `%${params.query}%`)
        )!
      )
    }

    // Category filter
    if (params.category) {
      conditions.push(ilike(users.activityCategory, `%${params.category}%`))
    }

    // Subcategory filter
    if (params.subcategory) {
      conditions.push(ilike(users.activityCategory, `%${params.subcategory}%`))
    }

    // Status filter
    if (params.status && params.status !== 'any') {
      conditions.push(eq(users.status, params.status))
    }

    // Availability filter - open now or available today
    if (
      params.availability &&
      params.availability !== 'any' &&
      (params.availability === 'available-today' || params.availability === 'open-now')
    ) {
      conditions.push(or(eq(users.status, 'available'), eq(users.status, 'online'))!)
    }

    // Query database
    const query = db
      .select({
        user: users,
        stats: ratingStatistics
      })
      .from(users)
      .leftJoin(ratingStatistics, eq(users.id, ratingStatistics.userId))
      .where(and(...conditions))

    // Note: Rating filter will be applied post-query since we can't use having() with leftJoin
    const results = await query.limit(limit * 2).offset(offset) // Get more for filtering

    // Extract user data and combine with stats
    let providers = results.map((r) => ({
      id: r.user.id,
      username: r.user.username,
      name: r.user.name,
      image: r.user.image,
      isVerified: r.user.isVerified,
      district: r.user.district,
      city: r.user.city,
      activityCategory: r.user.activityCategory,
      serviceDescription: r.user.serviceDescription,
      address: r.user.address,
      gpsCoordinates: r.user.gpsCoordinates,
      openingHours: r.user.openingHours,
      contactNumbers: r.user.contactNumbers,
      portfolioPhotos: r.user.portfolioPhotos,
      status: r.user.status,
      // Rating stats
      averageScore: r.stats?.avgOverall || 0,
      totalRatings: r.stats?.totalClients || 0,
      recommendationRate: r.stats?.recommendationRate || 0
    }))

    // Apply rating filter if specified
    if (params.minRating !== undefined) {
      providers = providers.filter((p) => p.averageScore >= params.minRating!)
    }

    // Apply geolocation filtering and sorting
    let finalResults = providers

    if (params.latitude && params.longitude) {
      const referencePoint: Coordinates = {
        latitude: params.latitude,
        longitude: params.longitude
      }

      // Filter by distance
      finalResults = filterByDistance(finalResults, referencePoint, params.radius)

      // Sort by distance or add distance information
      if (params.sortBy === 'distance') {
        const withDistance = sortByDistance(finalResults, referencePoint)
        finalResults = withDistance.slice(0, limit)
      } else {
        // Add distance info but sort by other criteria
        finalResults = sortByDistance(finalResults, referencePoint).map((item) => item)
      }
    }

    // Sort by other criteria if not distance
    if (params.sortBy === 'rating') {
      finalResults.sort((a, b) => b.averageScore - a.averageScore)
    } else if (params.sortBy === 'name') {
      finalResults.sort((a, b) => a.name.localeCompare(b.name))
    }

    // Apply final limit
    finalResults = finalResults.slice(0, limit)

    return c.json({
      success: true,
      data: {
        providers: finalResults,
        pagination: {
          page,
          limit,
          total: finalResults.length,
          hasMore: results.length > limit
        }
      }
    })
  } catch (error: any) {
    console.error('Search error:', error)
    return c.json({ error: error.message || 'Search failed' }, 400)
  }
})

/**
 * Get search suggestions/autocomplete
 * GET /api/discovery/suggestions
 */
router.get('/suggestions', async (c) => {
  try {
    const query = c.req.query('q') || ''

    if (query.length < 2) {
      return c.json({
        success: true,
        data: {
          suggestions: []
        }
      })
    }

    // Search in categories
    const categoryMatches = searchCategories(query)

    // Search in professional names and usernames
    const professionals = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        activityCategory: users.activityCategory,
        image: users.image
      })
      .from(users)
      .where(
        and(
          eq(users.isProfessional, true),
          or(
            ilike(users.name, `%${query}%`),
            ilike(users.username, `%${query}%`),
            ilike(users.activityCategory, `%${query}%`)
          )
        )
      )
      .limit(10)

    const suggestions = [
      ...categoryMatches.slice(0, 5).map((cat) => ({
        type: cat.type,
        value: cat.code,
        label: cat.name,
        category: cat.categoryName
      })),
      ...professionals.map((prof) => ({
        type: 'professional',
        value: prof.id,
        label: prof.name,
        username: prof.username,
        category: prof.activityCategory,
        image: prof.image
      }))
    ].slice(0, 15)

    return c.json({
      success: true,
      data: {
        suggestions
      }
    })
  } catch (error: any) {
    console.error('Suggestions error:', error)
    return c.json({ error: error.message || 'Failed to get suggestions' }, 400)
  }
})

/**
 * Get all available categories
 * GET /api/discovery/categories
 */
router.get('/categories', (c) => {
  try {
    const categories = getAllCategories()

    return c.json({
      success: true,
      data: {
        categories
      }
    })
  } catch (error: any) {
    console.error('Categories error:', error)
    return c.json({ error: error.message || 'Failed to get categories' }, 400)
  }
})

/**
 * Get subcategories for a category
 * GET /api/discovery/categories/:categoryCode/subcategories
 */
router.get('/categories/:categoryCode/subcategories', (c) => {
  try {
    const categoryCode = c.req.param('categoryCode')
    const subcategories = getAllSubcategories().filter((sub) => sub.categoryCode === categoryCode)

    return c.json({
      success: true,
      data: {
        subcategories
      }
    })
  } catch (error: any) {
    console.error('Subcategories error:', error)
    return c.json({ error: error.message || 'Failed to get subcategories' }, 400)
  }
})

/**
 * Get all subcategories
 * GET /api/discovery/subcategories
 */
router.get('/subcategories', (c) => {
  try {
    const subcategories = getAllSubcategories()

    return c.json({
      success: true,
      data: {
        subcategories
      }
    })
  } catch (error: any) {
    console.error('Subcategories error:', error)
    return c.json({ error: error.message || 'Failed to get subcategories' }, 400)
  }
})

/**
 * Get professionals near a location (simplified endpoint)
 * GET /api/discovery/nearby
 */
router.get('/nearby', async (c) => {
  try {
    const lat = c.req.query('lat')
    const lon = c.req.query('lon')
    const radius = Number.parseInt(c.req.query('radius') || '5000', 10)
    const limit = Number.parseInt(c.req.query('limit') || '20', 10)

    if (!lat || !lon) {
      return c.json({ error: 'Latitude and longitude are required' }, 400)
    }

    const latitude = Number.parseFloat(lat)
    const longitude = Number.parseFloat(lon)

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return c.json({ error: 'Invalid coordinates' }, 400)
    }

    // Get all professionals with GPS coordinates
    const professionals = await db
      .select({
        user: users,
        stats: ratingStatistics
      })
      .from(users)
      .leftJoin(ratingStatistics, eq(users.id, ratingStatistics.userId))
      .where(and(eq(users.isProfessional, true), sql`${users.gpsCoordinates} IS NOT NULL`))
      .limit(500) // Get a large set to filter

    const referencePoint: Coordinates = { latitude, longitude }

    // Extract and filter by distance
    const providers = professionals.map((r) => ({
      id: r.user.id,
      username: r.user.username,
      name: r.user.name,
      image: r.user.image,
      isVerified: r.user.isVerified,
      district: r.user.district,
      city: r.user.city,
      activityCategory: r.user.activityCategory,
      serviceDescription: r.user.serviceDescription,
      address: r.user.address,
      gpsCoordinates: r.user.gpsCoordinates,
      status: r.user.status,
      averageScore: r.stats?.avgOverall || 0,
      totalRatings: r.stats?.totalClients || 0
    }))

    const filtered = filterByDistance(providers, referencePoint, radius)
    const sorted = sortByDistance(filtered, referencePoint)
    const results = sorted.slice(0, limit)

    return c.json({
      success: true,
      data: {
        providers: results,
        count: results.length
      }
    })
  } catch (error: any) {
    console.error('Nearby search error:', error)
    return c.json({ error: error.message || 'Nearby search failed' }, 400)
  }
})

/**
 * Calculate distance between two points
 * GET /api/discovery/distance
 */
router.get('/distance', (c) => {
  try {
    const lat1 = c.req.query('lat1')
    const lon1 = c.req.query('lon1')
    const lat2 = c.req.query('lat2')
    const lon2 = c.req.query('lon2')

    if (!lat1 || !lon1 || !lat2 || !lon2) {
      return c.json({ error: 'All coordinates are required' }, 400)
    }

    const point1: Coordinates = {
      latitude: Number.parseFloat(lat1),
      longitude: Number.parseFloat(lon1)
    }

    const point2: Coordinates = {
      latitude: Number.parseFloat(lat2),
      longitude: Number.parseFloat(lon2)
    }

    if (
      Number.isNaN(point1.latitude) ||
      Number.isNaN(point1.longitude) ||
      Number.isNaN(point2.latitude) ||
      Number.isNaN(point2.longitude)
    ) {
      return c.json({ error: 'Invalid coordinates' }, 400)
    }

    const distanceMeters = calculateDistance(point1, point2)
    const distanceKm = distanceMeters / 1000

    return c.json({
      success: true,
      data: {
        distanceMeters: Math.round(distanceMeters),
        distanceKm: Math.round(distanceKm * 100) / 100,
        formatted: distanceKm < 1 ? `${Math.round(distanceMeters)}m` : `${Math.round(distanceKm * 10) / 10}km`
      }
    })
  } catch (error: any) {
    console.error('Distance calculation error:', error)
    return c.json({ error: error.message || 'Distance calculation failed' }, 400)
  }
})

export default router
