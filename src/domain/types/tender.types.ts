/**
 * Domain types for the Call for Tenders (Appels d'Offres) system
 */

/**
 * Urgency levels for tender requests
 */
export type TenderUrgency = 'today' | 'this-week' | 'flexible'

/**
 * Status of a tender request
 */
export type TenderStatus = 'open' | 'in-progress' | 'completed' | 'cancelled'

/**
 * Status of a bid
 */
export type BidStatus = 'pending' | 'selected' | 'rejected' | 'withdrawn'

/**
 * Notification types
 */
export type NotificationType = 'push' | 'sms' | 'email'

/**
 * Notification status
 */
export type NotificationStatus = 'sent' | 'delivered' | 'read' | 'failed'

/**
 * Tender creation request
 */
export interface CreateTenderRequest {
  clientId: string
  title: string
  category: string
  description: string
  location: string
  city?: string
  district?: string
  gpsCoordinates?: string
  urgency: TenderUrgency
  photos?: string[]
  maxBudget?: number
  preferredSchedule?: string
  specialConstraints?: string
}

/**
 * Tender response
 */
export interface TenderResponse {
  id: string
  clientId: string
  clientName?: string
  title: string
  category: string
  description: string
  location: string
  city?: string
  district?: string
  gpsCoordinates?: string
  urgency: TenderUrgency
  photos?: string[]
  maxBudget?: number
  preferredSchedule?: string
  specialConstraints?: string
  status: TenderStatus
  selectedBidId?: string
  selectedAt?: Date
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
  bidsCount?: number
}

/**
 * Bid creation request
 */
export interface CreateBidRequest {
  tenderId: string
  professionalId: string
  price: number
  estimatedDuration: string
  guaranteePeriod?: string
  availability?: string
  description?: string
  photos?: string[]
  hasGuarantee: boolean
  canStartToday: boolean
}

/**
 * Bid response
 */
export interface BidResponse {
  id: string
  tenderId: string
  professionalId: string
  professionalName?: string
  professionalUsername?: string
  professionalImage?: string
  professionalRating?: number
  professionalDistance?: number
  price: number
  estimatedDuration: string
  guaranteePeriod?: string
  availability?: string
  description?: string
  photos?: string[]
  hasGuarantee: boolean
  canStartToday: boolean
  status: BidStatus
  createdAt: Date
  updatedAt: Date
}

/**
 * Bid comparison data for client view
 */
export interface BidComparison {
  professional: string
  professionalId: string
  price: number
  duration: string
  rating: number
  distance: number
  guarantee: string
  canStartToday: boolean
  profileUrl?: string
}

/**
 * Notification matching criteria
 */
export interface NotificationMatchingCriteria {
  category: string
  gpsCoordinates?: string
  radius?: number // in km
  minRating?: number
  requiredAvailability?: boolean
}

/**
 * Notification result
 */
export interface NotificationResult {
  professionalId: string
  notificationType: NotificationType
  matchingScore: number
  matchingReasons: string[]
  success: boolean
  error?: string
}

/**
 * Tender search filters
 */
export interface TenderSearchFilters {
  category?: string
  status?: TenderStatus
  urgency?: TenderUrgency
  city?: string
  district?: string
  clientId?: string
  professionalId?: string // For professionals to see tenders they can bid on
  page?: number
  limit?: number
}

/**
 * Bid sort options
 */
export type BidSortBy = 'price' | 'rating' | 'distance' | 'duration'

/**
 * Bid sort direction
 */
export type SortDirection = 'asc' | 'desc'
