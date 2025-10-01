import { boolean, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  // Basic user info
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  isAdmin: boolean('is_admin').notNull().default(false),

  // Revolutionary authentication fields
  username: text('username').unique(),
  phoneNumber: text('phone_number'),
  recoveryWord: text('recovery_word'), // Encrypted
  connectionWords: text('connection_words'), // Encrypted passphrase

  // Identity verification
  cinNumber: text('cin_number'),
  cinPhotoUrl: text('cin_photo_url'),
  isVerified: boolean('is_verified').notNull().default(false),
  verifiedAt: timestamp('verified_at'),

  // Location
  district: text('district'),
  city: text('city'),

  // Professional profile
  isProfessional: boolean('is_professional').notNull().default(false),
  activityCategory: text('activity_category'),
  serviceDescription: text('service_description'),
  address: text('address'),
  gpsCoordinates: text('gps_coordinates'),
  openingHours: jsonb('opening_hours'), // Store as JSON object
  contactNumbers: jsonb('contact_numbers'), // Array of phone numbers

  // Portfolio
  portfolioPhotos: jsonb('portfolio_photos'), // Array of photo URLs (max 20)
  portfolioVideos: jsonb('portfolio_videos'), // Array of video URLs (max 2 mins each)
  certificates: jsonb('certificates'), // Array of certificate URLs

  // Real-time status
  status: text('status').default('offline'), // available, busy, closed, online, offline
  autoStatus: boolean('auto_status').notNull().default(true),

  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id)
})

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
})

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at')
})
