import { boolean, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './auth'

/**
 * Posts table - Main feed content (photos, videos, promos, etc.)
 */
export const posts = pgTable('posts', {
  id: text('id').primaryKey(),

  // Author
  authorId: text('author_id')
    .notNull()
    .references(() => users.id),

  // Post type
  type: text('type').notNull(), // 'photo', 'video', 'promo', 'announcement', 'testimonial'

  // Content
  caption: text('caption'), // Description/text content
  mediaUrls: jsonb('media_urls').notNull(), // Array of photo/video URLs

  // Video specific (max 2 minutes)
  videoDuration: integer('video_duration'), // Duration in seconds

  // Promotion specific
  promoEndDate: timestamp('promo_end_date'), // When promotion expires
  originalPrice: integer('original_price'),
  discountedPrice: integer('discounted_price'),

  // Location (for geolocation features)
  location: text('location'),
  gpsCoordinates: text('gps_coordinates'),

  // Engagement metrics (cached for performance)
  likesCount: integer('likes_count').notNull().default(0),
  commentsCount: integer('comments_count').notNull().default(0),
  sharesCount: integer('shares_count').notNull().default(0),
  savesCount: integer('saves_count').notNull().default(0),

  // Visibility
  isPublic: boolean('is_public').notNull().default(true),
  isSponsored: boolean('is_sponsored').notNull().default(false),

  // Moderation
  isReported: boolean('is_reported').notNull().default(false),
  isHidden: boolean('is_hidden').notNull().default(false),

  // Timestamps
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
})

/**
 * Stories table - Ephemeral 24h content
 */
export const stories = pgTable('stories', {
  id: text('id').primaryKey(),

  // Author
  authorId: text('author_id')
    .notNull()
    .references(() => users.id),

  // Story type
  type: text('type').notNull(), // 'photo', 'video', 'text'

  // Content
  mediaUrl: text('media_url'), // Photo or video URL
  text: text('text'), // Text content for text stories
  backgroundColor: text('background_color'), // For text stories

  // Video specific
  videoDuration: integer('video_duration'), // Duration in seconds

  // Engagement metrics
  viewsCount: integer('views_count').notNull().default(0),

  // Auto-deletion
  expiresAt: timestamp('expires_at').notNull(), // Auto-delete after 24h

  // Timestamps
  createdAt: timestamp('created_at').notNull()
})

/**
 * Story views table - Track who viewed stories
 */
export const storyViews = pgTable('story_views', {
  id: text('id').primaryKey(),

  storyId: text('story_id')
    .notNull()
    .references(() => stories.id),
  viewerId: text('viewer_id')
    .notNull()
    .references(() => users.id),

  viewedAt: timestamp('viewed_at').notNull()
})

/**
 * Likes table - Post and comment likes
 */
export const likes = pgTable('likes', {
  id: text('id').primaryKey(),

  // User who liked
  userId: text('user_id')
    .notNull()
    .references(() => users.id),

  // Target (either post or comment)
  postId: text('post_id').references(() => posts.id),
  commentId: text('comment_id'), // References comments table

  createdAt: timestamp('created_at').notNull()
})

/**
 * Comments table - Post comments with replies
 */
export const comments = pgTable('comments', {
  id: text('id').primaryKey(),

  // Author
  authorId: text('author_id')
    .notNull()
    .references(() => users.id),

  // Target post
  postId: text('post_id')
    .notNull()
    .references(() => posts.id),

  // Comment content
  text: text('text').notNull(),

  // Reply system
  parentCommentId: text('parent_comment_id'), // For threaded replies

  // Engagement
  likesCount: integer('likes_count').notNull().default(0),
  repliesCount: integer('replies_count').notNull().default(0),

  // Moderation
  isReported: boolean('is_reported').notNull().default(false),
  isHidden: boolean('is_hidden').notNull().default(false),

  // Timestamps
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
})

/**
 * Follows table - User follows professionals
 */
export const follows = pgTable('follows', {
  id: text('id').primaryKey(),

  // Follower (user who follows)
  followerId: text('follower_id')
    .notNull()
    .references(() => users.id),

  // Following (professional being followed)
  followingId: text('following_id')
    .notNull()
    .references(() => users.id),

  // Notifications
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),

  createdAt: timestamp('created_at').notNull()
})

/**
 * Saved posts table - User bookmarks
 */
export const savedPosts = pgTable('saved_posts', {
  id: text('id').primaryKey(),

  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  postId: text('post_id')
    .notNull()
    .references(() => posts.id),

  // Optional organization
  collectionName: text('collection_name'), // e.g., "Home ideas", "Mechanics"

  savedAt: timestamp('saved_at').notNull()
})

/**
 * Content reports table - Moderation system
 */
export const contentReports = pgTable('content_reports', {
  id: text('id').primaryKey(),

  // Reporter
  reporterId: text('reporter_id')
    .notNull()
    .references(() => users.id),

  // Target content
  postId: text('post_id').references(() => posts.id),
  commentId: text('comment_id').references(() => comments.id),

  // Report details
  reason: text('reason').notNull(), // 'spam', 'inappropriate', 'fake', 'harassment', 'other'
  description: text('description'),

  // Moderation status
  status: text('status').notNull().default('pending'), // 'pending', 'reviewed', 'action_taken', 'dismissed'
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  actionTaken: text('action_taken'), // 'removed', 'warning', 'no_action'

  createdAt: timestamp('created_at').notNull()
})

/**
 * Feed preferences table - User feed algorithm preferences
 */
export const feedPreferences = pgTable('feed_preferences', {
  id: text('id').primaryKey(),

  userId: text('user_id')
    .notNull()
    .references(() => users.id)
    .unique(),

  // Preferred categories (for personalization)
  preferredCategories: jsonb('preferred_categories'), // Array of category IDs

  // Feed settings
  showSponsoredContent: boolean('show_sponsored_content').notNull().default(true),
  showNearbyContent: boolean('show_nearby_content').notNull().default(true),
  showFollowedOnly: boolean('show_followed_only').notNull().default(false),

  updatedAt: timestamp('updated_at').notNull()
})
