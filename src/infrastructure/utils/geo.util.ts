/**
 * Geolocation utility functions
 * Fonctions utilitaires de géolocalisation
 */

export interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180
  const φ2 = (point2.latitude * Math.PI) / 180
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

/**
 * Calculate distance in kilometers
 */
export function calculateDistanceKm(point1: Coordinates, point2: Coordinates): number {
  return calculateDistance(point1, point2) / 1000
}

/**
 * Parse GPS coordinates string (format: "latitude,longitude")
 */
export function parseGpsCoordinates(gpsString: string): Coordinates | null {
  try {
    const parts = gpsString.split(',').map((s) => s.trim())
    if (parts.length !== 2) return null

    const latitude = Number.parseFloat(parts[0])
    const longitude = Number.parseFloat(parts[1])

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null
    if (latitude < -90 || latitude > 90) return null
    if (longitude < -180 || longitude > 180) return null

    return { latitude, longitude }
  } catch {
    return null
  }
}

/**
 * Format coordinates to string
 */
export function formatGpsCoordinates(coords: Coordinates): string {
  return `${coords.latitude},${coords.longitude}`
}

/**
 * Check if coordinates are valid
 */
export function isValidCoordinates(coords: Coordinates): boolean {
  return (
    typeof coords.latitude === 'number' &&
    typeof coords.longitude === 'number' &&
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  )
}

/**
 * Calculate bounding box for a given point and radius
 * Returns { minLat, maxLat, minLon, maxLon }
 */
export function getBoundingBox(center: Coordinates, radiusMeters: number) {
  const R = 6371e3 // Earth's radius in meters

  // Convert radius to angular distance
  const lat = (center.latitude * Math.PI) / 180
  const lon = (center.longitude * Math.PI) / 180

  // Angular distance
  const angularDistance = radiusMeters / R

  // Calculate bounds
  const minLat = lat - angularDistance
  const maxLat = lat + angularDistance

  // Longitude adjustment for latitude
  const Δlon = Math.asin(Math.sin(angularDistance) / Math.cos(lat))
  const minLon = lon - Δlon
  const maxLon = lon + Δlon

  return {
    minLat: (minLat * 180) / Math.PI,
    maxLat: (maxLat * 180) / Math.PI,
    minLon: (minLon * 180) / Math.PI,
    maxLon: (maxLon * 180) / Math.PI
  }
}

/**
 * Sort results by distance from a reference point
 */
export function sortByDistance<T extends { gpsCoordinates?: string | null }>(
  results: T[],
  referencePoint: Coordinates
): Array<T & { distance: number }> {
  return results
    .map((item) => {
      if (!item.gpsCoordinates) {
        return { ...item, distance: Number.POSITIVE_INFINITY }
      }

      const coords = parseGpsCoordinates(item.gpsCoordinates)
      if (!coords) {
        return { ...item, distance: Number.POSITIVE_INFINITY }
      }

      const distance = calculateDistance(referencePoint, coords)
      return { ...item, distance }
    })
    .sort((a, b) => a.distance - b.distance)
}

/**
 * Filter results by maximum distance
 */
export function filterByDistance<T extends { gpsCoordinates?: string | null }>(
  results: T[],
  referencePoint: Coordinates,
  maxDistanceMeters: number
): T[] {
  return results.filter((item) => {
    if (!item.gpsCoordinates) return false

    const coords = parseGpsCoordinates(item.gpsCoordinates)
    if (!coords) return false

    const distance = calculateDistance(referencePoint, coords)
    return distance <= maxDistanceMeters
  })
}
