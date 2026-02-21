import { Module } from '@kanian77/simple-di';
import { USER_REPOSITORY_INTERFACE } from './IUserRepository';
import { UserRepository } from './UserRepository';
import { getConfigModule } from 'config/getConfigModule';
import { getDbModule } from 'db/getDbModule';

export const UserRepositoryModule = new Module({
  imports: [getConfigModule(), getDbModule()],
  providers: [
    {
      provide: USER_REPOSITORY_INTERFACE,
      useClass: UserRepository,
    },
  ],
});
