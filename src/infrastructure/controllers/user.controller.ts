import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { UserService } from '../../application/services/user.service'
import { User } from '../../domain/models'
import type { Routes } from '../../domain/types'

export class UserController implements Routes {
  public controller: OpenAPIHono
  private userService: UserService

  constructor() {
    this.controller = new OpenAPIHono()
    this.userService = new UserService()
  }

  public initRoutes() {
    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/get-user-by-id',
        tags: ['User'],
        summary: 'Retrieve User by ID',
        description: `Retrieve user by ID.`,
        operationId: 'getUserByIdOrLink',
        request: {
          query: z.object({
            page: z.string().pipe(z.coerce.number()).optional().openapi({
              title: 'Page number',
              description: 'page number',
              type: 'number',
              example: '1'
            }),
            sortBy: z.enum(['popularity', 'latest', 'alphabetical']).optional().openapi({
              title: 'Sort by',
              description: 'sort by',
              type: 'string',
              example: 'popularity'
            }),
            sortOrder: z.enum(['asc', 'desc']).optional().openapi({
              title: 'Sort order',
              description: 'sort order',
              type: 'string',
              example: 'desc',
              default: 'desc'
            })
          })
        },
        responses: {
          200: {
            description: 'Successful response with User details',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean().openapi({
                    description: 'Indicates whether the request was successful',
                    type: 'boolean',
                    example: true
                  }),
                  data: User.openapi({
                    description: 'User details'
                  })
                })
              }
            }
          }
        }
      }),
      async (ctx) => {
        //  const { page = 0, sortBy = 'popularity', sortOrder = 'asc' } = ctx.req.valid('query')

        const response = await this.userService.getUserById({ userId: '' })
        return ctx.json({ success: true, data: response })
      }
    )
  }
}
