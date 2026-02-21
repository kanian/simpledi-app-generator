import { Module } from '@kanian77/simple-di';
import { UserRepositoryModule } from './UserRepositoryModule';
import { UserServiceModule } from './UserServiceModule';

export const UserModule = new Module({
  imports: [UserRepositoryModule, UserServiceModule],
});
