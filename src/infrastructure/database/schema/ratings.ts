import { boolean, integer, jsonb, pgTable, real, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './auth'

/**
 * Ratings table - Universal criteria ratings for service providers
 */
export const ratings = pgTable('ratings', {
  id: text('id').primaryKey(),

  // Relationship
  providerId: text('provider_id')
    .notNull()
    .references(() => users.id),
  clientId: text('client_id')
    .notNull()
    .references(() => users.id),

  // Universal criteria (0-100)
  qualityScore: integer('quality_score').notNull(), // Quality of work
  punctualityScore: integer('punctuality_score').notNull(), // Respect of schedules
  honestyScore: integer('honesty_score').notNull(), // Honesty/Price transparency
  communicationScore: integer('communication_score').notNull(), // Communication quality
  cleanlinessScore: integer('cleanliness_score').notNull(), // Cleanliness/Care

  // Overall score (calculated average)
  overallScore: real('overall_score').notNull(),

  // Written review (optional)
  comment: text('comment'),

  // Validation and fraud detection
  isValidated: boolean('is_validated').notNull().default(true),
  isSuspicious: boolean('is_suspicious').notNull().default(false),
  validatedAt: timestamp('validated_at'),

  // Contact verification
  contactPhone: text('contact_phone').notNull(), // Phone used to contact provider

  // Timestamps
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
})

/**
 * Personality traits - Slider-based personality assessment
 */
export const personalityTraits = pgTable('personality_traits', {
  id: text('id').primaryKey(),

  ratingId: text('rating_id')
    .notNull()
    .references(() => ratings.id),

  // Traits on a scale from -100 to 100
  // Negative = left trait, Positive = right trait
  rapidityMeticulousness: integer('rapidity_meticulousness').notNull(), // -100 (rapid) to 100 (meticulous)
  flexibilityRigor: integer('flexibility_rigor').notNull(), // -100 (flexible) to 100 (rigorous)
  communicativeDiscreet: integer('communicative_discreet').notNull(), // -100 (communicative) to 100 (discreet)
  innovativeTraditional: integer('innovative_traditional').notNull(), // -100 (innovative) to 100 (traditional)

  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
})

/**
 * Specialized criteria - Profession-specific bonus criteria
 */
export const specializedCriteria = pgTable('specialized_criteria', {
  id: text('id').primaryKey(),

  ratingId: text('rating_id')
    .notNull()
    .references(() => ratings.id),

  // Profession category
  profession: text('profession').notNull(), // mechanic, hotely_gasy, coiffeur, electricite, etc.

  // Dynamic criteria stored as JSON
  // Example: { "diagnostic_precision": 85, "work_guarantee": 90 }
  criteriaScores: jsonb('criteria_scores').notNull(),

  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
})

/**
 * Badges - Standardized achievement badges
 */
export const badges = pgTable('badges', {
  id: text('id').primaryKey(),

  // Badge information
  name: text('name').notNull(), // e.g., "Expert", "Verified", "Fast Response"
  category: text('category').notNull(), // competence, service, fidelity, identity_verified
  description: text('description').notNull(),
  iconUrl: text('icon_url'),
  color: text('color'), // Hex color code

  // Requirements to earn this badge
  requirements: jsonb('requirements').notNull(), // Dynamic requirements

  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
})

/**
 * User badges - Many-to-many relationship between users and badges
 */
export const userBadges = pgTable('user_badges', {
  id: text('id').primaryKey(),

  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  badgeId: text('badge_id')
    .notNull()
    .references(() => badges.id),

  earnedAt: timestamp('earned_at').notNull(),

  createdAt: timestamp('created_at').notNull()
})

/**
 * Rating statistics - Cached statistics for providers
 */
export const ratingStatistics = pgTable('rating_statistics', {
  id: text('id').primaryKey(),

  userId: text('user_id')
    .notNull()
    .references(() => users.id)
    .unique(),

  // Universal criteria averages
  avgQuality: real('avg_quality').notNull().default(0),
  avgPunctuality: real('avg_punctuality').notNull().default(0),
  avgHonesty: real('avg_honesty').notNull().default(0),
  avgCommunication: real('avg_communication').notNull().default(0),
  avgCleanliness: real('avg_cleanliness').notNull().default(0),

  // Overall average
  avgOverall: real('avg_overall').notNull().default(0),

  // Personality trait averages
  avgRapidityMeticulousness: real('avg_rapidity_meticulousness').notNull().default(0),
  avgFlexibilityRigor: real('avg_flexibility_rigor').notNull().default(0),
  avgCommunicativeDiscreet: real('avg_communicative_discreet').notNull().default(0),
  avgInnovativeTraditional: real('avg_innovative_traditional').notNull().default(0),

  // Client statistics
  totalClients: integer('total_clients').notNull().default(0),
  satisfiedClients: integer('satisfied_clients').notNull().default(0), // Clients with rating >= 60
  recommendationRate: real('recommendation_rate').notNull().default(0), // Percentage

  // Response time
  avgResponseTimeHours: real('avg_response_time_hours'),

  // Professional info
  professionalSince: timestamp('professional_since'),
  memberSince: timestamp('member_since').notNull(),

  // Last update
  updatedAt: timestamp('updated_at').notNull()
})

/**
 * Rating validations - For fraud detection and reporting
 */
export const ratingValidations = pgTable('rating_validations', {
  id: text('id').primaryKey(),

  ratingId: text('rating_id')
    .notNull()
    .references(() => ratings.id),

  // Validation status
  status: text('status').notNull(), // pending, approved, rejected, under_review

  // Fraud detection flags
  fraudFlags: jsonb('fraud_flags'), // Array of detected issues

  // Manual review
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),

  // Reporter information (for community reports)
  reportedBy: text('reported_by').references(() => users.id),
  reportReason: text('report_reason'),
  reportedAt: timestamp('reported_at'),

  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
})
