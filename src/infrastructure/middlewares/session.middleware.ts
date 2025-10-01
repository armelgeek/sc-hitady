import { eq } from 'drizzle-orm'
import { db } from '../database/db'
import { sessions, users } from '../database/schema/auth'
import type { Context, Next } from 'hono'

/**
 * Session middleware for Revolutionary Auth
 * Validates session token from cookies or Authorization header
 */
const addSession = async (c: Context, next: Next) => {
  try {
    // Get token from cookie or Authorization header
    const cookieToken = c.req.header('cookie')?.match(/session_token=([^;]+)/)?.[1]
    const authHeader = c.req.header('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    const token = cookieToken || bearerToken

    if (!token) {
      c.set('user', null)
      c.set('session', null)
      return next()
    }

    // Find session by token
    const sessionResults = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1)

    if (sessionResults.length === 0) {
      c.set('user', null)
      c.set('session', null)
      return next()
    }

    const session = sessionResults[0]

    // Check if session is expired
    if (new Date() > new Date(session.expiresAt)) {
      // Delete expired session
      await db.delete(sessions).where(eq(sessions.id, session.id))
      c.set('user', null)
      c.set('session', null)
      return next()
    }

    // Get user data
    const userResults = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)

    if (userResults.length === 0) {
      c.set('user', null)
      c.set('session', null)
      return next()
    }

    const user = userResults[0]

    // Set user and session in context
    c.set('user', {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
      isVerified: user.isVerified,
      isProfessional: user.isProfessional
    })
    c.set('session', {
      id: session.id,
      token: session.token,
      expiresAt: session.expiresAt,
      userId: session.userId
    })

    return next()
  } catch (error) {
    console.error('Session middleware error:', error)
    c.set('user', null)
    c.set('session', null)
    return next()
  }
}

export default addSession
