import { BaseRepository } from '@root/BaseRepository';
import {
  USER_REPOSITORY_INTERFACE,
  type IUserRepository,
} from './IUserRepository';
import { userSchema, type UserSchemaType } from './User';
import { type UserInterface } from './baseZodUserSchema';
import { Inject, Service } from '@kanian77/simple-di';
import { DB_SERVICE, DbService } from 'db/DbService';

@Service({ token: USER_REPOSITORY_INTERFACE })
export class UserRepository
  extends BaseRepository<UserInterface, UserSchemaType>
  implements IUserRepository
{
  constructor(@Inject(DB_SERVICE) private dbService: DbService) {
    super(userSchema, dbService);
  }

  async find(config?: any): Promise<UserInterface[]> {
    return (await this.db.query.userSchema.findMany(
      config
    )) as unknown as UserInterface[];
  }

  async findOne(config?: any): Promise<UserInterface> {
    return (await this.db.query.userSchema.findFirst(
      config
    )) as unknown as UserInterface;
  }
}
