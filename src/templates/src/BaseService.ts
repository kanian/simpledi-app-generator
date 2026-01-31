import type { IRepository } from './IRepository';
import { randomUUIDv7 } from 'bun';
import type { IService } from './IService';
import type { ZodObject } from 'zod';
import { type BaseEntityInterface } from '@root/lib';

export abstract class BaseService<
  T extends BaseEntityInterface,
  U extends ZodObject<any> = ZodObject<any>,
> implements IService<T> {
  constructor(
    private readonly repository: IRepository<T>,
    private readonly insertSchema: U,
    private readonly updateSchema: U,
    private readonly selectSchema: U,
  ) {}

  async create(entity: Partial<T>): Promise<Partial<T>> {
    try {
      if (entity.id === undefined || entity.id === null) {
        entity.id = randomUUIDv7();
      }
      entity.createdAt = new Date();
      const result = this.insertSchema.safeParse(entity);
      if (!result.success) {
        return Promise.reject(result.error);
      }
      return await this.repository.create(entity);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async find(config?: any): Promise<T[]> {
    return await this.repository.find(config);
  }

  async findOne(config?: any): Promise<T> {
    return await this.repository.findOne(config);
  }

  async findById(id: string, withDeleted?: boolean): Promise<T | null> {
    try {
      return await this.repository.findById(id, withDeleted);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async findAll(withDeleted?: boolean): Promise<Partial<T>[]> {
    try {
      return await this.repository.findAll(withDeleted);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async update(id: string, entity: Partial<T>): Promise<Partial<T> | null> {
    try {
      entity.updatedAt = new Date();
      const result = this.updateSchema.safeParse(entity);
      if (!result.success) {
        return Promise.reject(result.error);
      }
      return await this.repository.update(id, entity);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async delete(id: string, soft: boolean): Promise<boolean> {
    return await this.repository.delete(id, soft);
  }
}
