import { describe, expect, it } from 'vitest'
import {
  calculateDistance,
  calculateDistanceKm,
  filterByDistance,
  formatGpsCoordinates,
  getBoundingBox,
  isValidCoordinates,
  parseGpsCoordinates,
  sortByDistance,
  type Coordinates
} from './geo.util'

describe('Geolocation Utilities', () => {
  describe('parseGpsCoordinates', () => {
    it('should parse valid GPS coordinates string', () => {
      const result = parseGpsCoordinates('-18.8792,47.5079')
      expect(result).toEqual({ latitude: -18.8792, longitude: 47.5079 })
    })

    it('should parse GPS coordinates with spaces', () => {
      const result = parseGpsCoordinates('-18.8792, 47.5079')
      expect(result).toEqual({ latitude: -18.8792, longitude: 47.5079 })
    })

    it('should return null for invalid format', () => {
      expect(parseGpsCoordinates('invalid')).toBeNull()
      expect(parseGpsCoordinates('18.8792')).toBeNull()
      expect(parseGpsCoordinates('18.8792,47.5079,extra')).toBeNull()
    })

    it('should return null for out of range coordinates', () => {
      expect(parseGpsCoordinates('91,47.5079')).toBeNull()
      expect(parseGpsCoordinates('-18.8792,181')).toBeNull()
    })
  })

  describe('formatGpsCoordinates', () => {
    it('should format coordinates to string', () => {
      const coords: Coordinates = { latitude: -18.8792, longitude: 47.5079 }
      expect(formatGpsCoordinates(coords)).toBe('-18.8792,47.5079')
    })
  })

  describe('isValidCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(isValidCoordinates({ latitude: -18.8792, longitude: 47.5079 })).toBe(true)
      expect(isValidCoordinates({ latitude: 0, longitude: 0 })).toBe(true)
    })

    it('should reject invalid coordinates', () => {
      expect(isValidCoordinates({ latitude: 91, longitude: 47.5079 })).toBe(false)
      expect(isValidCoordinates({ latitude: -18.8792, longitude: 181 })).toBe(false)
    })
  })

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const point1: Coordinates = { latitude: -18.8792, longitude: 47.5079 }
      const point2: Coordinates = { latitude: -18.88, longitude: 47.51 }

      const distance = calculateDistance(point1, point2)

      expect(distance).toBeGreaterThan(0)
      expect(distance).toBeLessThan(1000) // Less than 1km
    })

    it('should return 0 for same coordinates', () => {
      const point: Coordinates = { latitude: -18.8792, longitude: 47.5079 }
      const distance = calculateDistance(point, point)

      expect(distance).toBe(0)
    })
  })

  describe('calculateDistanceKm', () => {
    it('should calculate distance in kilometers', () => {
      const point1: Coordinates = { latitude: -18.8792, longitude: 47.5079 }
      const point2: Coordinates = { latitude: -18.9, longitude: 47.52 }

      const distance = calculateDistanceKm(point1, point2)

      expect(distance).toBeGreaterThan(0)
      expect(distance).toBeGreaterThan(1) // More than 1km
    })
  })

  describe('getBoundingBox', () => {
    it('should calculate bounding box for search radius', () => {
      const center: Coordinates = { latitude: -18.8792, longitude: 47.5079 }
      const radius = 5000 // 5km

      const box = getBoundingBox(center, radius)

      expect(box.minLat).toBeLessThan(center.latitude)
      expect(box.maxLat).toBeGreaterThan(center.latitude)
      expect(box.minLon).toBeLessThan(center.longitude)
      expect(box.maxLon).toBeGreaterThan(center.longitude)
    })
  })

  describe('sortByDistance', () => {
    it('should sort results by distance', () => {
      const reference: Coordinates = { latitude: -18.8792, longitude: 47.5079 }

      const results = [
        { id: '1', name: 'Far', gpsCoordinates: '-18.9,47.52' },
        { id: '2', name: 'Close', gpsCoordinates: '-18.88,47.51' },
        { id: '3', name: 'Medium', gpsCoordinates: '-18.89,47.515' }
      ]

      const sorted = sortByDistance(results, reference)

      expect(sorted[0].name).toBe('Close')
      expect(sorted[0].distance).toBeLessThan(sorted[1].distance)
      expect(sorted[1].distance).toBeLessThan(sorted[2].distance)
    })

    it('should handle items without coordinates', () => {
      const reference: Coordinates = { latitude: -18.8792, longitude: 47.5079 }

      const results = [
        { id: '1', name: 'No coords', gpsCoordinates: null },
        { id: '2', name: 'With coords', gpsCoordinates: '-18.88,47.51' }
      ]

      const sorted = sortByDistance(results, reference)

      expect(sorted[0].name).toBe('With coords')
      expect(sorted[1].distance).toBe(Number.POSITIVE_INFINITY)
    })
  })

  describe('filterByDistance', () => {
    it('should filter results within radius', () => {
      const reference: Coordinates = { latitude: -18.8792, longitude: 47.5079 }
      const maxDistance = 2000 // 2km

      const results = [
        { id: '1', name: 'Far', gpsCoordinates: '-18.9,47.52' },
        { id: '2', name: 'Close', gpsCoordinates: '-18.88,47.51' }
      ]

      const filtered = filterByDistance(results, reference, maxDistance)

      expect(filtered.length).toBe(1)
      expect(filtered[0].name).toBe('Close')
    })

    it('should exclude items without coordinates', () => {
      const reference: Coordinates = { latitude: -18.8792, longitude: 47.5079 }
      const maxDistance = 5000

      const results = [
        { id: '1', name: 'No coords', gpsCoordinates: null },
        { id: '2', name: 'With coords', gpsCoordinates: '-18.88,47.51' }
      ]

      const filtered = filterByDistance(results, reference, maxDistance)

      expect(filtered.length).toBe(1)
      expect(filtered[0].name).toBe('With coords')
    })
  })
})
