import { boolean, timestamp, uuid } from 'drizzle-orm/pg-core';

// Base entity schema with common fields
export const baseSchema = {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deleted: boolean('deleted').default(false),
  deletedAt: timestamp('deleted_at').defaultNow(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
};
export type BaseSchemaType = typeof baseSchema;
