import type { IService } from '@root/IService';
import type { UserInterface } from './baseZodUserSchema';

export const USER_SERVICE_INTERFACE = 'IUserService';

export interface IUserService extends IService<UserInterface> {
  // Add entity-specific service methods here
}
