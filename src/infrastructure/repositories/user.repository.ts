import type { User } from '@/domain/models/user.model'
import type { UserRepositoryInterface } from '@/domain/repositories/user.repository.interface'
import type { z } from 'zod'

export class UserRepository implements UserRepositoryInterface {
  private users: Map<string, z.infer<typeof User>> = new Map()

  async findById(id: string): Promise<z.infer<typeof User> | null> {
    return (await this.users.get(id)) || null
  }

  async findAll(): Promise<z.infer<typeof User>[]> {
    return await Array.from(this.users.values())
  }

  async save(user: z.infer<typeof User>): Promise<z.infer<typeof User>> {
    await this.users.set(user.id, user)
    return user
  }

  async remove(id: string): Promise<boolean> {
    return await this.users.delete(id)
  }
}
