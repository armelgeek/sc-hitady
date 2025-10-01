import { betterAuth, type User } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware, openAPI } from 'better-auth/plugins'

import { Hono } from 'hono'
import { db } from '../database/db'
import { sendEmail } from './mail.config'

export const auth = betterAuth({
  plugins: [openAPI()],
  database: drizzleAdapter(db, {
    provider: 'pg'
  }),
  baseURL: 'http://localhost:3000',
  trustedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
  user: {
    modelName: 'users',
    additionalFields: {
      isAdmin: { type: 'boolean', default: false, returned: true }
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({ newEmail, url }) => {
        await sendEmail({
          to: newEmail,
          subject: 'Verify your new email',
          text: `Click the link to verify your new email: ${url}`
        })
      }
    }
  },
  session: { modelName: 'sessions' },
  account: {
    modelName: 'accounts'
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    password: {
      hash: async (password) => {
        return await Bun.password.hash(password, {
          algorithm: 'bcrypt',
          cost: 10
        })
      },
      verify: async ({ password, hash }) => {
        return await Bun.password.verify(password, hash)
      }
    },
    requireEmailVerification: false,
    emailVerification: {
      sendVerificationEmail: async ({ user, url }: { user: User; url: string }) => {
        await sendEmail({
          to: user.email,
          subject: 'Verify your email',
          text: `Click the link to verify your email: ${url}`
        })
      },
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 3600 // 1 hour
    },
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Reset your password',
        text: `Click the link to reset your password: ${url}`
      })
    }
  },
  hooks: {
    after: createAuthMiddleware(async (ctx: any) => {
      if (ctx.path === '/sign-up/email') {
        const session = ctx.context.newSession
        const user = session?.user
        try {
          const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
          const loader = new CypherQueryLoader()
          await loader.run('user', 'create-user', {
            id: user.id,
            name: user.name,
            email: user.email
          })
        } catch (error) {
          console.error("Erreur lors de la création du noeud Neo4j pour l'utilisateur:", error)
        }
      }
    })
  }
})

const router = new Hono({
  strict: false
})

router.on(['POST', 'GET'], '/auth/*', (c) => {
  return auth.handler(c.req.raw)
})

export default router
