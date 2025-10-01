import { randomBytes } from 'node:crypto'
import { OpenAPIHono } from '@hono/zod-openapi'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../database/db'
import { comments, contentReports, posts, users } from '../database/schema'

// Helper function to generate unique IDs
function generateId(length: number = 16): string {
  return randomBytes(length).toString('hex')
}

type UserType = {
  id: string
  name: string
  email: string
  username?: string | null
  isAdmin: boolean
  isVerified: boolean
  isProfessional: boolean
} | null

const router = new OpenAPIHono<{
  Variables: {
    user: UserType
  }
}>()

/**
 * Report content (post or comment)
 * POST /api/moderation/report
 */
router.post('/report', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const body = await c.req.json()

  const schema = z.object({
    postId: z.string().optional(),
    commentId: z.string().optional(),
    reason: z.enum(['spam', 'inappropriate', 'fake', 'harassment', 'other']),
    description: z.string().optional()
  })

  const validation = schema.safeParse(body)
  if (!validation.success) {
    return c.json({ success: false, message: 'Invalid input', errors: validation.error.errors }, 400)
  }

  const data = validation.data

  // Must report either a post or a comment
  if (!data.postId && !data.commentId) {
    return c.json({ success: false, message: 'Must specify either postId or commentId' }, 400)
  }

  // Can't report both
  if (data.postId && data.commentId) {
    return c.json({ success: false, message: 'Cannot report both post and comment at the same time' }, 400)
  }

  // Verify content exists
  if (data.postId) {
    const existingPost = await db.select().from(posts).where(eq(posts.id, data.postId)).limit(1)

    if (existingPost.length === 0) {
      return c.json({ success: false, message: 'Post not found' }, 404)
    }
  }

  if (data.commentId) {
    const existingComment = await db.select().from(comments).where(eq(comments.id, data.commentId)).limit(1)

    if (existingComment.length === 0) {
      return c.json({ success: false, message: 'Comment not found' }, 404)
    }
  }

  const reportId = generateId()

  const newReport = {
    id: reportId,
    reporterId: user.id,
    postId: data.postId || null,
    commentId: data.commentId || null,
    reason: data.reason,
    description: data.description || null,
    status: 'pending' as const,
    reviewedBy: null,
    reviewedAt: null,
    actionTaken: null,
    createdAt: new Date()
  }

  await db.insert(contentReports).values(newReport)

  // Mark content as reported
  if (data.postId) {
    await db.update(posts).set({ isReported: true }).where(eq(posts.id, data.postId))
  }

  if (data.commentId) {
    await db.update(comments).set({ isReported: true }).where(eq(comments.id, data.commentId))
  }

  return c.json({
    success: true,
    message: 'Content reported successfully. Our team will review it.',
    data: newReport
  })
})

/**
 * Get all reports (admin only)
 * GET /api/moderation/reports
 */
router.get('/reports', async (c) => {
  const user = c.get('user')
  if (!user || !user.isAdmin) {
    return c.json({ success: false, message: 'Admin access required' }, 403)
  }

  const status = c.req.query('status') // pending, reviewed, action_taken, dismissed
  const page = Number.parseInt(c.req.query('page') || '1')
  const limit = Number.parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit

  let query = db
    .select({
      report: contentReports,
      reporter: {
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image
      }
    })
    .from(contentReports)
    .innerJoin(users, eq(contentReports.reporterId, users.id))
    .orderBy(desc(contentReports.createdAt))
    .limit(limit)
    .offset(offset)

  if (status) {
    query = query.where(eq(contentReports.status, status)) as any
  }

  const reports = await query

  return c.json({
    success: true,
    data: {
      reports,
      page,
      limit,
      hasMore: reports.length === limit
    }
  })
})

/**
 * Get report details with content (admin only)
 * GET /api/moderation/reports/:reportId
 */
router.get('/reports/:reportId', async (c) => {
  const user = c.get('user')
  if (!user || !user.isAdmin) {
    return c.json({ success: false, message: 'Admin access required' }, 403)
  }

  const reportId = c.req.param('reportId')

  const report = await db
    .select({
      report: contentReports,
      reporter: {
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image
      }
    })
    .from(contentReports)
    .innerJoin(users, eq(contentReports.reporterId, users.id))
    .where(eq(contentReports.id, reportId))
    .limit(1)

  if (report.length === 0) {
    return c.json({ success: false, message: 'Report not found' }, 404)
  }

  const reportData = report[0]

  // Fetch reported content
  let content = null

  if (reportData.report.postId) {
    const postResult = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          name: users.name,
          username: users.username,
          image: users.image
        }
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.id, reportData.report.postId))
      .limit(1)

    if (postResult.length > 0) {
      content = { type: 'post', data: postResult[0] }
    }
  }

  if (reportData.report.commentId) {
    const commentResult = await db
      .select({
        comment: comments,
        author: {
          id: users.id,
          name: users.name,
          username: users.username,
          image: users.image
        }
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.id, reportData.report.commentId))
      .limit(1)

    if (commentResult.length > 0) {
      content = { type: 'comment', data: commentResult[0] }
    }
  }

  return c.json({
    success: true,
    data: {
      report: reportData,
      content
    }
  })
})

/**
 * Review a report (admin only)
 * PUT /api/moderation/reports/:reportId/review
 */
router.put('/reports/:reportId/review', async (c) => {
  const user = c.get('user')
  if (!user || !user.isAdmin) {
    return c.json({ success: false, message: 'Admin access required' }, 403)
  }

  const reportId = c.req.param('reportId')

  const body = await c.req.json()

  const schema = z.object({
    action: z.enum(['remove', 'warning', 'dismiss']),
    notes: z.string().optional()
  })

  const validation = schema.safeParse(body)
  if (!validation.success) {
    return c.json({ success: false, message: 'Invalid input', errors: validation.error.errors }, 400)
  }

  const data = validation.data

  // Get report
  const existingReport = await db.select().from(contentReports).where(eq(contentReports.id, reportId)).limit(1)

  if (existingReport.length === 0) {
    return c.json({ success: false, message: 'Report not found' }, 404)
  }

  const report = existingReport[0]

  // Take action based on decision
  if (data.action === 'remove') {
    if (report.postId) {
      await db.update(posts).set({ isHidden: true }).where(eq(posts.id, report.postId))
    }

    if (report.commentId) {
      await db.update(comments).set({ isHidden: true }).where(eq(comments.id, report.commentId))
    }

    // Update report
    await db
      .update(contentReports)
      .set({
        status: 'action_taken',
        actionTaken: 'removed',
        reviewedBy: user.id,
        reviewedAt: new Date()
      })
      .where(eq(contentReports.id, reportId))

    return c.json({
      success: true,
      message: 'Content removed successfully'
    })
  } else if (data.action === 'warning') {
    // Update report
    await db
      .update(contentReports)
      .set({
        status: 'action_taken',
        actionTaken: 'warning',
        reviewedBy: user.id,
        reviewedAt: new Date()
      })
      .where(eq(contentReports.id, reportId))

    // Clear reported flag
    if (report.postId) {
      await db.update(posts).set({ isReported: false }).where(eq(posts.id, report.postId))
    }

    if (report.commentId) {
      await db.update(comments).set({ isReported: false }).where(eq(comments.id, report.commentId))
    }

    return c.json({
      success: true,
      message: 'Warning issued, content remains visible'
    })
  } else {
    // Dismiss
    await db
      .update(contentReports)
      .set({
        status: 'dismissed',
        actionTaken: 'no_action',
        reviewedBy: user.id,
        reviewedAt: new Date()
      })
      .where(eq(contentReports.id, reportId))

    // Clear reported flag
    if (report.postId) {
      await db.update(posts).set({ isReported: false }).where(eq(posts.id, report.postId))
    }

    if (report.commentId) {
      await db.update(comments).set({ isReported: false }).where(eq(comments.id, report.commentId))
    }

    return c.json({
      success: true,
      message: 'Report dismissed, no action taken'
    })
  }
})

export default router
