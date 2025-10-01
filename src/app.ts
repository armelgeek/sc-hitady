import { OpenAPIHono } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import badgesRouter from './infrastructure/controllers/badges.controller'
import commentsRouter from './infrastructure/controllers/comments.controller'
import discoveryRouter from './infrastructure/controllers/discovery.controller'
import followRouter from './infrastructure/controllers/follow.controller'
import moderationRouter from './infrastructure/controllers/moderation.controller'
import postsRouter from './infrastructure/controllers/posts.controller'
import ratingsRouter from './infrastructure/controllers/ratings.controller'
import revolutionaryAuthRouter from './infrastructure/controllers/revolutionary-auth.controller'
import storiesRouter from './infrastructure/controllers/stories.controller'
import tendersRouter from './infrastructure/controllers/tenders.controller'
import userProfileRouter from './infrastructure/controllers/user-profile.controller'
import { errorHandler, notFound } from './infrastructure/middlewares/error.middleware'
import { responseMiddleware } from './infrastructure/middlewares/response.middleware'
import addSession from './infrastructure/middlewares/session.middleware'
import sessionValidator from './infrastructure/middlewares/unauthorized-access.middleware'
import { Home } from './infrastructure/pages/home'
import type { Routes } from './domain/types'

export class App {
  private app: OpenAPIHono<{
    Variables: {
      user: {
        id: string
        name: string
        email: string
        username?: string | null
        isAdmin: boolean
        isVerified: boolean
        isProfessional: boolean
      } | null
      session: {
        id: string
        token: string
        expiresAt: Date
        userId: string
      } | null
    }
  }>

  constructor(routes: Routes[]) {
    this.app = new OpenAPIHono<{
      Variables: {
        user: {
          id: string
          name: string
          email: string
          username?: string | null
          isAdmin: boolean
          isVerified: boolean
          isProfessional: boolean
        } | null
        session: {
          id: string
          token: string
          expiresAt: Date
          userId: string
        } | null
      }
    }>()

    this.initializeGlobalMiddlewares()
    this.initializeRoutes(routes)
    this.initializeSwaggerUI()
    this.initializeRouteFallback()
    this.initializeErrorHandler()
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach((route) => {
      route.initRoutes()
      this.app.route('/api', route.controller)
    })
    // Revolutionary authentication routes
    this.app.basePath('/api').route('/revolutionary-auth', revolutionaryAuthRouter)
    this.app.basePath('/api').route('/verification', userProfileRouter)
    this.app.basePath('/api').route('/profile', userProfileRouter)
    // Rating system routes
    this.app.basePath('/api').route('/ratings', ratingsRouter)
    // Badge system routes
    this.app.basePath('/api').route('/badges', badgesRouter)
    // Discovery/search routes
    this.app.basePath('/api').route('/discovery', discoveryRouter)
    // Tenders (Call for tenders / Appels d'offres) routes
    this.app.basePath('/api').route('/tenders', tendersRouter)
    // Social network routes
    this.app.basePath('/api').route('/posts', postsRouter)
    this.app.basePath('/api').route('/comments', commentsRouter)
    this.app.basePath('/api').route('/stories', storiesRouter)
    this.app.basePath('/api').route('/follow', followRouter)
    this.app.basePath('/api').route('/moderation', moderationRouter)
    this.app.route('/', Home)
  }

  private initializeGlobalMiddlewares() {
    this.app.use(logger())
    this.app.use(prettyJSON())
    this.app.use(
      '*',
      cors({
        origin: ['http://localhost:3000', 'http://localhost:5173'], // Specify allowed origins (update for production)
        credentials: true,
        maxAge: 86400 // Cache preflight for 1 day
      })
    )
    this.app.use('*', responseMiddleware())
    this.app.use(addSession)
    this.app.use(sessionValidator)
  }

  private initializeSwaggerUI() {
    this.app.doc31('/swagger', (c) => {
      const { protocol: urlProtocol, hostname, port } = new URL(c.req.url)
      const protocol = c.req.header('x-forwarded-proto') ? `${c.req.header('x-forwarded-proto')}:` : urlProtocol

      return {
        openapi: '3.1.0',

        info: {
          version: '1.0.0',
          title: 'SC API',
          description: `# Introduction 
        \n SC API . \n`
        },
        servers: [{ url: `${protocol}//${hostname}${port ? `:${port}` : ''}`, description: 'Current environment' }]
      }
    })

    this.app.get(
      '/docs',
      apiReference({
        pageTitle: 'SC API Documentation',
        theme: 'deepSpace',
        isEditable: false,
        layout: 'modern',
        darkMode: true,
        metaData: {
          applicationName: 'SC API',
          author: 'Armel Wanes',
          creator: 'Armel Wanes',
          publisher: 'Armel Wanes',
          robots: 'index, follow',
          description: 'SC API is ....'
        },
        url: 'swagger'
      })
    )
  }

  private initializeRouteFallback() {
    this.app.notFound((ctx) => {
      return ctx.json({ success: false, message: 'route not found' }, 404)
    })
  }

  private initializeErrorHandler() {
    this.app.notFound(notFound)
    this.app.onError(errorHandler)
  }

  public getApp() {
    return this.app
  }
}
