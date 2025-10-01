import { auth } from '../config/auth.config'
import type { Context, Next } from 'hono'

export const protect = async (c: Context, next: Next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session || !session.user) {
    return c.json(
      {
        success: false,
        message: 'Unauthorized',
        error: 'No valid session found'
      },
      401
    )
  }

  //console.log(session.user)
  c.set('user', session.user)
  c.set('session', session.session)

  await next()
}

export const isAdmin = async (c: Context, next: Next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session || !session.user) {
    return c.json(
      {
        success: false,
        message: 'Unauthorized',
        error: 'No valid session found'
      },
      401
    )
  }

  if (!session.user.isAdmin) {
    return c.json(
      {
        success: false,
        message: 'Unauthorized',
        error: 'User is not an admin'
      },
      403
    )
  }

  c.set('user', session.user)
  c.set('session', session.session)

  await next()
}
