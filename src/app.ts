import { OpenAPIHono } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import router, { type auth } from './infrastructure/config/auth.config'
import revolutionaryAuthRouter from './infrastructure/controllers/revolutionary-auth.controller'
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
      user: typeof auth.$Infer.Session.user | null
      session: typeof auth.$Infer.Session.session | null
    }
  }>

  constructor(routes: Routes[]) {
    this.app = new OpenAPIHono<{
      Variables: {
        user: typeof auth.$Infer.Session.user | null
        session: typeof auth.$Infer.Session.session | null
      }
    }>()

    this.initializeGlobalMiddlewares()
    this.initializeRoutes(routes)
    this.initializeSwaggerUI()
    this.initializeRouteFallback()
    this.initializeErrorHandler()
    /**showRoutes(this.app, {
      verbose: true,
    })**/
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach((route) => {
      route.initRoutes()
      this.app.route('/api', route.controller)
    })
    this.app.basePath('/api').route('/', router)
    // Add revolutionary authentication routes
    this.app.basePath('/api').route('/revolutionary-auth', revolutionaryAuthRouter)
    this.app.basePath('/api').route('/verification', userProfileRouter)
    this.app.basePath('/api').route('/profile', userProfileRouter)
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
