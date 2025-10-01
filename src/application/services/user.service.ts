import { GetUserByIdUseCase, type GetUserByIdArgs } from '../use-cases/user/get-user-by.use-case'

export class UserService {
  private readonly getUserByIdUseCase: GetUserByIdUseCase

  constructor() {
    this.getUserByIdUseCase = new GetUserByIdUseCase()
  }
  getUserById = (args: GetUserByIdArgs) => {
    return this.getUserByIdUseCase.execute(args)
  }
}
