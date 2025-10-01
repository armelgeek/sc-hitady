import type { User } from '../models/user.model'
import type { z } from 'zod'

export interface UserRepositoryInterface {
  findById: (id: string) => Promise<z.infer<typeof User> | null>
  findAll: () => Promise<z.infer<typeof User>[]>
  save: (user: z.infer<typeof User>) => Promise<z.infer<typeof User>>
  remove: (id: string) => Promise<boolean>
}
