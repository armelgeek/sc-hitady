import { boolean, integer, jsonb, pgTable, real, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './auth'

/**
 * Tenders table - Service requests from clients (Appels d'Offres)
 */
export const tenders = pgTable('tenders', {
  id: text('id').primaryKey(),

  // Client information
  clientId: text('client_id')
    .notNull()
    .references(() => users.id),

  // Service request details
  title: text('title').notNull(), // Descriptive title
  category: text('category').notNull(), // Service category
  description: text('description').notNull(), // Detailed description

  // Location
  location: text('location').notNull(), // Address or zone
  city: text('city'),
  district: text('district'),
  gpsCoordinates: text('gps_coordinates'), // For proximity matching

  // Urgency level
  urgency: text('urgency').notNull(), // 'today', 'this-week', 'flexible'

  // Optional details
  photos: jsonb('photos'), // Array of photo URLs
  maxBudget: integer('max_budget'), // Maximum budget in local currency
  preferredSchedule: text('preferred_schedule'), // Preferred time/schedule
  specialConstraints: text('special_constraints'), // Special requirements

  // Status tracking
  status: text('status').notNull().default('open'), // 'open', 'in-progress', 'completed', 'cancelled'

  // Selected bid
  selectedBidId: text('selected_bid_id'),
  selectedAt: timestamp('selected_at'),

  // Timestamps
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  expiresAt: timestamp('expires_at') // Optional expiration date
})

/**
 * Tender bids table - Professional responses to tenders
 */
export const tenderBids = pgTable('tender_bids', {
  id: text('id').primaryKey(),

  // Relationship
  tenderId: text('tender_id')
    .notNull()
    .references(() => tenders.id),
  professionalId: text('professional_id')
    .notNull()
    .references(() => users.id),

  // Bid details
  price: integer('price').notNull(), // Offered price
  estimatedDuration: text('estimated_duration').notNull(), // e.g., "1 jour", "3 jours"

  // Optional details
  guaranteePeriod: text('guarantee_period'), // Warranty period (e.g., "1 mois")
  availability: text('availability'), // When can start
  description: text('description'), // Additional details or personal message
  photos: jsonb('photos'), // Optional supporting photos

  // Quick response options
  hasGuarantee: boolean('has_guarantee').notNull().default(false),
  canStartToday: boolean('can_start_today').notNull().default(false),

  // Professional info (cached for comparison)
  professionalRating: real('professional_rating'),
  professionalDistance: real('professional_distance'), // Distance in km from tender location

  // Status
  status: text('status').notNull().default('pending'), // 'pending', 'selected', 'rejected', 'withdrawn'

  // Timestamps
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
})

/**
 * Tender notifications table - Track notifications sent to professionals
 */
export const tenderNotifications = pgTable('tender_notifications', {
  id: text('id').primaryKey(),

  // Relationship
  tenderId: text('tender_id')
    .notNull()
    .references(() => tenders.id),
  professionalId: text('professional_id')
    .notNull()
    .references(() => users.id),

  // Notification details
  notificationType: text('notification_type').notNull(), // 'push', 'sms', 'email'
  status: text('status').notNull().default('sent'), // 'sent', 'delivered', 'read', 'failed'

  // Matching score (how well professional matches the tender)
  matchingScore: real('matching_score'),
  matchingReasons: jsonb('matching_reasons'), // Array of reasons (category, location, rating, etc.)

  // Timestamps
  sentAt: timestamp('sent_at').notNull(),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),

  createdAt: timestamp('created_at').notNull()
})
