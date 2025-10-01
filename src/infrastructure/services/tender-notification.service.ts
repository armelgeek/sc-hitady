import { randomUUID } from 'node:crypto'
import { parseGpsCoordinates } from '@/infrastructure/utils/geo.util'
import type { NotificationMatchingCriteria, NotificationResult, NotificationType } from '@/domain/types/tender.types'
import { Neo4jAdapter } from '../adapters/neo4j-adapter'
import { db } from '../database/db'
import { tenderNotifications } from '../database/schema'

/**
 * Tender Notification Service
 * Handles intelligent notification delivery to matching professionals
 */
export class TenderNotificationService {
  private neo4jAdapter: Neo4jAdapter

  constructor() {
    this.neo4jAdapter = new Neo4jAdapter()
  }

  /**
   * Find and notify matching professionals for a tender
   */
  async notifyMatchingProfessionals(
    tenderId: string,
    criteria: NotificationMatchingCriteria
  ): Promise<NotificationResult[]> {
    try {
      const { category, gpsCoordinates, radius = 10, minRating = 0 } = criteria

      // Parse GPS coordinates
      let latitude: number | undefined
      let longitude: number | undefined

      if (gpsCoordinates) {
        const coords = parseGpsCoordinates(gpsCoordinates)
        if (coords) {
          latitude = coords.latitude
          longitude = coords.longitude
        }
      }

      // If no GPS coordinates, we'll need to use a different approach
      // For now, we'll require GPS coordinates for proximity matching
      if (!latitude || !longitude) {
        console.warn('No GPS coordinates provided for tender notification')
        return []
      }

      // Find matching professionals using Neo4j
      const matchingProfessionals = await this.findMatchingProfessionals(
        category,
        latitude,
        longitude,
        radius,
        minRating
      )

      console.log(`Found ${matchingProfessionals.length} matching professionals for tender ${tenderId}`)

      // Send notifications to each matching professional
      const results: NotificationResult[] = []

      for (const professional of matchingProfessionals) {
        // Determine notification type based on professional's status and preferences
        const notificationType = this.determineNotificationType(professional.status)

        // Create notification record
        const notificationResult = await this.createNotification(
          tenderId,
          professional.professionalId,
          notificationType,
          professional.matchingScore,
          this.getMatchingReasons(professional)
        )

        results.push(notificationResult)
      }

      return results
    } catch (error) {
      console.error('Error notifying matching professionals:', error)
      throw error
    }
  }

  /**
   * Find matching professionals using Neo4j proximity query
   */
  private async findMatchingProfessionals(
    category: string,
    latitude: number,
    longitude: number,
    radiusKm: number,
    minRating: number
  ): Promise<any[]> {
    const query = `
      MATCH (provider:User)
      WHERE provider.isProfessional = true
        AND provider.activityCategory = $category
        AND provider.status IN ['available', 'online']
        AND provider.gpsCoordinates IS NOT NULL

      WITH provider,
           point({latitude: toFloat(split(provider.gpsCoordinates, ',')[0]), 
                  longitude: toFloat(split(provider.gpsCoordinates, ',')[1])}) as providerLocation,
           point({latitude: $latitude, longitude: $longitude}) as tenderLocation

      WITH provider,
           providerLocation,
           tenderLocation,
           round(distance(providerLocation, tenderLocation) / 1000, 2) as distanceKm

      WHERE distanceKm <= $radiusKm

      OPTIONAL MATCH (client:User)-[r:RATED]->(provider)
      WITH provider,
           distanceKm,
           count(r) as totalRatings,
           avg(r.overallScore) as avgScore

      WHERE ($minRating IS NULL OR avgScore >= $minRating OR avgScore IS NULL)

      WITH provider,
           distanceKm,
           totalRatings,
           avgScore,
           toInteger(
             (1 - (distanceKm / $radiusKm)) * 50 +
             CASE WHEN avgScore IS NOT NULL THEN (avgScore / 100) * 30 ELSE 0 END +
             CASE WHEN totalRatings > 0 THEN least(totalRatings / 10.0, 1.0) * 20 ELSE 0 END
           ) as matchingScore

      RETURN provider.id as professionalId,
             provider.name as professionalName,
             provider.status as status,
             provider.activityCategory as category,
             distanceKm,
             totalRatings,
             avgScore,
             matchingScore

      ORDER BY matchingScore DESC, distanceKm ASC
      LIMIT 50
    `

    const parameters = {
      category,
      latitude,
      longitude,
      radiusKm,
      minRating
    }

    const result = await this.neo4jAdapter.executeQuery(query, parameters)
    return result.records.map((record: any) => ({
      professionalId: record.get('professionalId'),
      professionalName: record.get('professionalName'),
      status: record.get('status'),
      category: record.get('category'),
      distanceKm: record.get('distanceKm'),
      totalRatings: record.get('totalRatings'),
      avgScore: record.get('avgScore'),
      matchingScore: record.get('matchingScore')
    }))
  }

  /**
   * Create notification record in database
   */
  private async createNotification(
    tenderId: string,
    professionalId: string,
    notificationType: NotificationType,
    matchingScore: number,
    matchingReasons: string[]
  ): Promise<NotificationResult> {
    try {
      const notificationId = randomUUID()

      await db.insert(tenderNotifications).values({
        id: notificationId,
        tenderId,
        professionalId,
        notificationType,
        status: 'sent',
        matchingScore,
        matchingReasons,
        sentAt: new Date(),
        createdAt: new Date()
      })

      // TODO: Integrate with actual notification service (push, SMS, email)
      // For now, we just create the record
      console.log(`Notification ${notificationId} sent to professional ${professionalId} for tender ${tenderId}`)

      return {
        professionalId,
        notificationType,
        matchingScore,
        matchingReasons,
        success: true
      }
    } catch (error: any) {
      console.error(`Error creating notification for professional ${professionalId}:`, error)
      return {
        professionalId,
        notificationType,
        matchingScore,
        matchingReasons,
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Determine notification type based on professional's status
   */
  private determineNotificationType(status: string): NotificationType {
    // If professional is online, use push notification
    if (status === 'online' || status === 'available') {
      return 'push'
    }
    // Otherwise, send SMS as backup
    return 'sms'
  }

  /**
   * Get matching reasons for display
   */
  private getMatchingReasons(professional: any): string[] {
    const reasons: string[] = []

    reasons.push(`Catégorie: ${professional.category}`)

    if (professional.distanceKm) {
      reasons.push(`Distance: ${professional.distanceKm} km`)
    }

    if (professional.avgScore) {
      reasons.push(`Note: ${professional.avgScore.toFixed(1)}/100`)
    }

    if (professional.totalRatings > 0) {
      reasons.push(`${professional.totalRatings} évaluation(s)`)
    }

    if (professional.status === 'available' || professional.status === 'online') {
      reasons.push('Disponible')
    }

    return reasons
  }

  /**
   * Sync user location to Neo4j
   * Should be called when user profile is updated
   */
  async syncUserLocationToNeo4j(userId: string, userData: any): Promise<void> {
    try {
      const query = `
        MERGE (user:User {id: $userId})
        SET user.name = $name,
            user.username = $username,
            user.isProfessional = $isProfessional,
            user.activityCategory = $activityCategory,
            user.gpsCoordinates = $gpsCoordinates,
            user.city = $city,
            user.district = $district,
            user.status = $status,
            user.updatedAt = datetime()

        WITH user
        WHERE $gpsCoordinates IS NOT NULL
        WITH user, split($gpsCoordinates, ',') as coords
        WHERE size(coords) = 2
        SET user.location = point({
          latitude: toFloat(coords[0]),
          longitude: toFloat(coords[1])
        })

        RETURN user.id as userId
      `

      const parameters = {
        userId,
        name: userData.name || '',
        username: userData.username || '',
        isProfessional: userData.isProfessional || false,
        activityCategory: userData.activityCategory || '',
        gpsCoordinates: userData.gpsCoordinates || null,
        city: userData.city || '',
        district: userData.district || '',
        status: userData.status || 'offline'
      }

      await this.neo4jAdapter.executeQuery(query, parameters)
      console.log(`Synced location for user ${userId} to Neo4j`)
    } catch (error) {
      console.error(`Error syncing user location to Neo4j:`, error)
      // Don't throw - location sync is not critical
    }
  }
}
