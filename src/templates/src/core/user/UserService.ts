import { BaseService } from '@root/BaseService';
import type { UserInterface } from './baseZodUserSchema';
import {
  USER_SERVICE_INTERFACE,
  type IUserService,
} from './IUserService';
import {
  USER_REPOSITORY_INTERFACE,
  type IUserRepository,
} from './IUserRepository';
import {
  UserInsertSchema,
  UserSelectSchema,
  UserUpdateSchema,
} from './User';
import { Inject, Service } from '@kanian77/simple-di';

@Service({ token: USER_SERVICE_INTERFACE })
export class UserService
  extends BaseService<UserInterface>
  implements IUserService
{
  constructor(
    @Inject(USER_REPOSITORY_INTERFACE)
    private readonly userRepository: IUserRepository
  ) {
    super(
      userRepository,
      UserInsertSchema,
      UserUpdateSchema,
      UserSelectSchema
    );
  }
}
