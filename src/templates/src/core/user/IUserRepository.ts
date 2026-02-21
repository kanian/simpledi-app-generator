import type { IRepository } from '@root/IRepository';
import type { UserInterface } from './baseZodUserSchema';

export const USER_REPOSITORY_INTERFACE = 'IUserRepository';

export interface IUserRepository extends IRepository<UserInterface> {
  // Add entity-specific repository methods here
}
