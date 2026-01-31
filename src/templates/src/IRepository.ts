import type { BaseEntityInterface } from '@root/lib';

export interface IRepository<T extends BaseEntityInterface> {
  create(entity: Partial<T>): Promise<Partial<T>>;
  findById(id: string, withDeleted?: boolean): Promise<T | null>;
  findAll(withDeleted?: boolean): Promise<Partial<T>[]>;
  update(id: string, entity: Partial<T>): Promise<Partial<T> | null>;
  delete(id: string, soft: boolean): Promise<boolean>;
  find(config?: any): Promise<T[]>;
  findOne(config?: any): Promise<T>;
}
