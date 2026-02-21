import { Module } from '@kanian77/simple-di';
import { UserService } from './UserService';
import { UserRepositoryModule } from './UserRepositoryModule';
import { USER_SERVICE_INTERFACE } from './IUserService';

export const UserServiceModule = new Module({
  imports: [UserRepositoryModule],
  providers: [
    {
      provide: USER_SERVICE_INTERFACE,
      useClass: UserService,
    },
  ],
});
