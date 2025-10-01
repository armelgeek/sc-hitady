import { z } from 'zod'

// Post model
export const Post = z.object({
  id: z.string(),
  authorId: z.string(),
  type: z.enum(['photo', 'video', 'promo', 'announcement', 'testimonial']),
  caption: z.string().optional(),
  mediaUrls: z.array(z.string()),
  videoDuration: z.number().max(120).optional(), // Max 2 minutes
  promoEndDate: z.date().optional(),
  originalPrice: z.number().optional(),
  discountedPrice: z.number().optional(),
  location: z.string().optional(),
  gpsCoordinates: z.string().optional(),
  likesCount: z.number().default(0),
  commentsCount: z.number().default(0),
  sharesCount: z.number().default(0),
  savesCount: z.number().default(0),
  isPublic: z.boolean().default(true),
  isSponsored: z.boolean().default(false),
  isReported: z.boolean().default(false),
  isHidden: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type PostType = z.infer<typeof Post>

// Story model
export const Story = z.object({
  id: z.string(),
  authorId: z.string(),
  type: z.enum(['photo', 'video', 'text']),
  mediaUrl: z.string().optional(),
  text: z.string().optional(),
  backgroundColor: z.string().optional(),
  videoDuration: z.number().optional(),
  viewsCount: z.number().default(0),
  expiresAt: z.date(),
  createdAt: z.date()
})

export type StoryType = z.infer<typeof Story>

// Comment model
export const Comment = z.object({
  id: z.string(),
  authorId: z.string(),
  postId: z.string(),
  text: z.string(),
  parentCommentId: z.string().optional(),
  likesCount: z.number().default(0),
  repliesCount: z.number().default(0),
  isReported: z.boolean().default(false),
  isHidden: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type CommentType = z.infer<typeof Comment>

// Like model
export const Like = z.object({
  id: z.string(),
  userId: z.string(),
  postId: z.string().optional(),
  commentId: z.string().optional(),
  createdAt: z.date()
})

export type LikeType = z.infer<typeof Like>

// Follow model
export const Follow = z.object({
  id: z.string(),
  followerId: z.string(),
  followingId: z.string(),
  notificationsEnabled: z.boolean().default(true),
  createdAt: z.date()
})

export type FollowType = z.infer<typeof Follow>

// Saved post model
export const SavedPost = z.object({
  id: z.string(),
  userId: z.string(),
  postId: z.string(),
  collectionName: z.string().optional(),
  savedAt: z.date()
})

export type SavedPostType = z.infer<typeof SavedPost>

// Content report model
export const ContentReport = z.object({
  id: z.string(),
  reporterId: z.string(),
  postId: z.string().optional(),
  commentId: z.string().optional(),
  reason: z.enum(['spam', 'inappropriate', 'fake', 'harassment', 'other']),
  description: z.string().optional(),
  status: z.enum(['pending', 'reviewed', 'action_taken', 'dismissed']).default('pending'),
  reviewedBy: z.string().optional(),
  reviewedAt: z.date().optional(),
  actionTaken: z.string().optional(),
  createdAt: z.date()
})

export type ContentReportType = z.infer<typeof ContentReport>
