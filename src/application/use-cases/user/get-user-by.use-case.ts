import type { User } from '@/domain/models/user.model'
import type { IUseCase } from '@/domain/types/use-case.type'
import type { z } from 'zod'
export interface GetUserByIdArgs {
  userId: string
}

export class GetUserByIdUseCase implements IUseCase<GetUserByIdArgs, z.infer<typeof User>> {
  constructor() {}

  execute({ userId }: GetUserByIdArgs) {
    return new Promise<z.infer<typeof User>>((resolve, reject) => {
      const user = {
        id: userId,
        name: 'John Doe',
        email: ''
      }
      if (user) {
        resolve(user)
      } else {
        reject(new Error('User not found'))
      }
    })
  }
}
