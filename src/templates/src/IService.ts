import type { BaseEntityInterface } from '@root/lib';
import type { IRepository } from './IRepository';

export interface IService<
  T extends BaseEntityInterface,
> extends IRepository<T> {}
