import type { IRepository } from './IRepository';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { PgTableWithColumns } from 'drizzle-orm/pg-core';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from 'db/getDb';
import type { BaseEntityInterface } from '@root/lib';
import * as schema from './schema';
import type { DbService } from 'db/DbService';
export abstract class BaseRepository<
  T extends BaseEntityInterface,
  TSchema extends PgTableWithColumns<any> = PgTableWithColumns<any>,
> implements IRepository<T> {
  private readonly _db!: NeonHttpDatabase<typeof schema>;
  private readonly _schema!: TSchema;

  constructor(schema: TSchema, dbService: DbService) {
    this._db = dbService.getDb();
    this._schema = schema;
  }

  get schema() {
    return this._schema;
  }

  get db() {
    return this._db;
  }
  async create(entity: Partial<T>): Promise<Partial<T>> {
    // Remove undefined values
    const filteredValues = Object.fromEntries(
      Object.entries(entity).filter(([_, v]) => v !== undefined),
    );
    try {
      const [insertedEntity] = await this._db
        .insert(this._schema)
        .values(filteredValues as any)
        .returning();

      return insertedEntity as Partial<T>;
    } catch (error) {
      console.error('Error creating entity:', error);
      throw error;
    }
  }

  async findById(id: string, withDeleted = false): Promise<T | null> {
    const conditions = [
      eq(this._schema.id, id),
      withDeleted ? undefined : eq(this._schema.deleted, false),
    ];

    const result = await this._db
      .select()
      .from(this._schema)
      .where(and(...conditions));
    return result.length > 0 ? (result[0] as unknown as T) : null;
  }

  async findAll(withDeleted = false): Promise<T[]> {
    const conditions = withDeleted
      ? undefined
      : eq(this._schema.deleted, false);

    return (await this._db
      .select()
      .from(this._schema)
      .where(conditions)) as unknown as T[];
  }

  async update(id: string, entity: Partial<T>): Promise<T | null> {
    try {
      // Remove undefined values
      const filteredValues = Object.fromEntries(
        Object.entries(entity).filter(
          ([_, v]) => v !== undefined || v === null,
        ),
      );
      const result = await this._db
        .update(this._schema)
        .set(filteredValues as any)
        .where(eq(this._schema.id, id))
        .returning();
      const updated = Array.isArray(result) ? result[0] : null;
      return updated as unknown as T | null;
    } catch (e) {
      console.error('Error updating entity:', e);
      throw e;
    }
  }

  async delete(id: string, soft = true): Promise<boolean> {
    try {
      if (soft) {
        const updatedAt = new Date();
        const [result] = await this._db
          .update(this._schema)
          .set({
            updatedAt,
            deletedAt: updatedAt,
            deleted: true,
          })
          .where(eq(this._schema.id, id))
          .returning({ id: this._schema.id });

        return !!result;
      } else {
        const result = await this._db
          .delete(this._schema)
          .where(eq(this._schema.id, id));

        return result.rowCount > 0;
      }
    } catch (error) {
      console.error('Error deleting entity:', error);
      throw error;
    }
  }

  /**
   *
   * @param config - The configuration object for the query.
   * @returns A promise that resolves to an array of entities.
   * @description This method is used to find multiple entities in the database.
   * It can take a configuration object that specifies the query parameters.
   * The configuration object can include the following properties:
   * - where: The conditions to filter the results.
   * - orderBy: The column to order the results by.
   * - limit: The maximum number of results to return.
   * - offset: The number of results to skip.
   * - with: The related entities to include in the results.
   * - withDeleted: Whether to include deleted entities in the results.
   */
  abstract find(config?: any): Promise<T[]>;

  abstract findOne(config?: any): Promise<T>;
}
