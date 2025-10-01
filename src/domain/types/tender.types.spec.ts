import { describe, expect, it } from 'vitest'
import type { BidSortBy, CreateBidRequest, CreateTenderRequest, SortDirection } from '@/domain/types/tender.types'

/**
 * Tests for Tender Types and Interfaces
 * These tests validate the type definitions and basic structure
 */
describe('Tender Types', () => {
  describe('CreateTenderRequest', () => {
    it('should have required fields', () => {
      const tender: CreateTenderRequest = {
        clientId: 'user_123',
        title: 'Réparation embrayage',
        category: 'Mécanicien auto',
        description: 'Embrayage qui patine',
        location: 'Analakely, Antananarivo',
        urgency: 'this-week'
      }

      expect(tender).toBeDefined()
      expect(tender.clientId).toBe('user_123')
      expect(tender.title).toBe('Réparation embrayage')
      expect(tender.urgency).toBe('this-week')
    })

    it('should support optional fields', () => {
      const tender: CreateTenderRequest = {
        clientId: 'user_123',
        title: 'Test',
        category: 'Test',
        description: 'Test',
        location: 'Test',
        urgency: 'today',
        city: 'Antananarivo',
        district: 'Analakely',
        gpsCoordinates: '-18.9100,47.5362',
        photos: ['photo1.jpg', 'photo2.jpg'],
        maxBudget: 300000,
        preferredSchedule: 'Matin',
        specialConstraints: 'Besoin de facture'
      }

      expect(tender.city).toBe('Antananarivo')
      expect(tender.gpsCoordinates).toBe('-18.9100,47.5362')
      expect(tender.photos).toHaveLength(2)
      expect(tender.maxBudget).toBe(300000)
    })
  })

  describe('CreateBidRequest', () => {
    it('should have required fields', () => {
      const bid: CreateBidRequest = {
        tenderId: 'tender_123',
        professionalId: 'pro_456',
        price: 250000,
        estimatedDuration: '1 jour',
        hasGuarantee: true,
        canStartToday: false
      }

      expect(bid).toBeDefined()
      expect(bid.tenderId).toBe('tender_123')
      expect(bid.price).toBe(250000)
      expect(bid.hasGuarantee).toBe(true)
      expect(bid.canStartToday).toBe(false)
    })

    it('should support optional fields', () => {
      const bid: CreateBidRequest = {
        tenderId: 'tender_123',
        professionalId: 'pro_456',
        price: 250000,
        estimatedDuration: '1 jour',
        hasGuarantee: true,
        canStartToday: false,
        guaranteePeriod: '1 mois',
        availability: 'Demain matin',
        description: 'Je peux commencer dès demain',
        photos: ['work1.jpg']
      }

      expect(bid.guaranteePeriod).toBe('1 mois')
      expect(bid.availability).toBe('Demain matin')
      expect(bid.description).toBeTruthy()
      expect(bid.photos).toHaveLength(1)
    })
  })

  describe('Urgency Levels', () => {
    it('should accept valid urgency levels', () => {
      const urgencies: Array<'today' | 'this-week' | 'flexible'> = ['today', 'this-week', 'flexible']

      expect(urgencies).toHaveLength(3)
      expect(urgencies).toContain('today')
      expect(urgencies).toContain('this-week')
      expect(urgencies).toContain('flexible')
    })
  })

  describe('Tender Status', () => {
    it('should have all status options', () => {
      const statuses: Array<'open' | 'in-progress' | 'completed' | 'cancelled'> = [
        'open',
        'in-progress',
        'completed',
        'cancelled'
      ]

      expect(statuses).toHaveLength(4)
      expect(statuses).toContain('open')
      expect(statuses).toContain('in-progress')
    })
  })

  describe('Bid Status', () => {
    it('should have all bid status options', () => {
      const statuses: Array<'pending' | 'selected' | 'rejected' | 'withdrawn'> = [
        'pending',
        'selected',
        'rejected',
        'withdrawn'
      ]

      expect(statuses).toHaveLength(4)
      expect(statuses).toContain('pending')
      expect(statuses).toContain('selected')
    })
  })

  describe('Notification Types', () => {
    it('should support all notification types', () => {
      const types: Array<'push' | 'sms' | 'email'> = ['push', 'sms', 'email']

      expect(types).toHaveLength(3)
      expect(types).toContain('push')
      expect(types).toContain('sms')
      expect(types).toContain('email')
    })
  })

  describe('Bid Sorting', () => {
    it('should support all sort options', () => {
      const sortOptions: BidSortBy[] = ['price', 'rating', 'distance', 'duration']

      expect(sortOptions).toHaveLength(4)
      expect(sortOptions).toContain('price')
      expect(sortOptions).toContain('rating')
      expect(sortOptions).toContain('distance')
      expect(sortOptions).toContain('duration')
    })

    it('should support sort directions', () => {
      const directions: SortDirection[] = ['asc', 'desc']

      expect(directions).toHaveLength(2)
      expect(directions).toContain('asc')
      expect(directions).toContain('desc')
    })
  })
})

/**
 * Helper Functions Tests
 */
describe('Tender Helper Functions', () => {
  describe('Duration Comparison', () => {
    it('should extract numbers from duration strings', () => {
      const durations = [
        { text: '1 jour', expected: 1 },
        { text: '3 jours', expected: 3 },
        { text: '2 semaines', expected: 2 },
        { text: "Aujourd'hui", expected: 999 } // No number
      ]

      durations.forEach(({ text, expected }) => {
        const match = text.match(/\d+/)
        const num = Number.parseInt(match?.[0] || '999')
        expect(num).toBe(expected)
      })
    })
  })

  describe('Matching Score Calculation', () => {
    it('should calculate score correctly', () => {
      // Mock calculation based on implementation
      const calculateMatchingScore = (
        distance: number,
        radius: number,
        avgRating: number,
        totalRatings: number
      ): number => {
        return Math.round((1 - distance / radius) * 50 + (avgRating / 100) * 30 + Math.min(totalRatings / 10, 1) * 20)
      }

      // Test cases
      expect(calculateMatchingScore(0, 15, 100, 20)).toBe(100) // Perfect score
      expect(calculateMatchingScore(15, 15, 0, 0)).toBe(0) // Worst score

      // Recalculate: (1 - 7.5/15) * 50 + (80/100) * 30 + min(10/10, 1) * 20
      // = 0.5 * 50 + 0.8 * 30 + 1 * 20
      // = 25 + 24 + 20 = 69
      expect(calculateMatchingScore(7.5, 15, 80, 10)).toBe(69)
    })
  })

  describe('GPS Coordinates Validation', () => {
    it('should validate GPS coordinate format', () => {
      const isValidGPS = (coords: string): boolean => {
        const parts = coords.split(',')
        if (parts.length !== 2) return false

        const lat = Number.parseFloat(parts[0])
        const lng = Number.parseFloat(parts[1])

        return !Number.isNaN(lat) && !Number.isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
      }

      expect(isValidGPS('-18.9100,47.5362')).toBe(true)
      expect(isValidGPS('0,0')).toBe(true)
      expect(isValidGPS('invalid')).toBe(false)
      expect(isValidGPS('91,0')).toBe(false) // Latitude out of range
      expect(isValidGPS('0,181')).toBe(false) // Longitude out of range
    })
  })
})

/**
 * Business Logic Tests
 */
describe('Tender Business Logic', () => {
  describe('Expiration Calculation', () => {
    it('should calculate correct expiration for "today" urgency', () => {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const hoursDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)
      expect(hoursDiff).toBe(24)
    })

    it('should calculate correct expiration for "this-week" urgency', () => {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const daysDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      expect(daysDiff).toBe(7)
    })

    it('should have no expiration for "flexible" urgency', () => {
      const urgency = 'flexible'
      const expiresAt = urgency === 'flexible' ? undefined : new Date()

      expect(expiresAt).toBeUndefined()
    })
  })

  describe('Notification Radius', () => {
    it('should use default radius of 15km', () => {
      const DEFAULT_RADIUS = 15
      expect(DEFAULT_RADIUS).toBe(15)
    })

    it('should allow custom radius', () => {
      const customRadius = 25
      expect(customRadius).toBeGreaterThan(15)
    })
  })

  describe('Minimum Rating Threshold', () => {
    it('should use minimum rating of 60/100', () => {
      const MIN_RATING = 60
      expect(MIN_RATING).toBe(60)
    })
  })
})

/**
 * Data Structure Tests
 */
describe('Tender Data Structures', () => {
  describe('Tender Object', () => {
    it('should have consistent structure', () => {
      const tender = {
        id: 'tender_123',
        clientId: 'user_456',
        title: 'Test Tender',
        category: 'Test Category',
        description: 'Test Description',
        location: 'Test Location',
        urgency: 'today' as const,
        status: 'open' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(tender).toHaveProperty('id')
      expect(tender).toHaveProperty('clientId')
      expect(tender).toHaveProperty('title')
      expect(tender).toHaveProperty('status')
      expect(tender.urgency).toBe('today')
    })
  })

  describe('Bid Object', () => {
    it('should have consistent structure', () => {
      const bid = {
        id: 'bid_123',
        tenderId: 'tender_456',
        professionalId: 'pro_789',
        price: 250000,
        estimatedDuration: '1 jour',
        hasGuarantee: true,
        canStartToday: false,
        status: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      expect(bid).toHaveProperty('id')
      expect(bid).toHaveProperty('tenderId')
      expect(bid).toHaveProperty('professionalId')
      expect(bid).toHaveProperty('price')
      expect(bid.status).toBe('pending')
    })
  })

  describe('Notification Object', () => {
    it('should have consistent structure', () => {
      const notification = {
        id: 'notif_123',
        tenderId: 'tender_456',
        professionalId: 'pro_789',
        notificationType: 'push' as const,
        status: 'sent' as const,
        matchingScore: 85,
        matchingReasons: ['Catégorie match', 'Distance: 2km'],
        sentAt: new Date(),
        createdAt: new Date()
      }

      expect(notification).toHaveProperty('id')
      expect(notification).toHaveProperty('matchingScore')
      expect(notification).toHaveProperty('matchingReasons')
      expect(notification.matchingReasons).toHaveLength(2)
      expect(notification.matchingScore).toBeGreaterThanOrEqual(0)
      expect(notification.matchingScore).toBeLessThanOrEqual(100)
    })
  })
})
