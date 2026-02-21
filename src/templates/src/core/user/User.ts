import { withBaseSchema } from '@root/lib/functions/withBaseSchema';
import { jsonb, text, varchar } from 'drizzle-orm/pg-core';
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod';
import { z } from 'zod';
import { adminZodUserSchema, userZodUserSchema } from './baseZodUserSchema';
import { UserTypePgEnum } from '@root/lib/types/UserTypePgEnum';
import { UserRolePgEnum } from '@root/lib/types/UserRolePgEnum';
import type { PhoneNumberInterface } from '@root/lib';

// Table name constant
export const USER_TABLE_NAME = 'users';

// Schema definition
export const userSchema = withBaseSchema(USER_TABLE_NAME, {
  email: varchar('email', { length: 255 }).unique(),
  password: varchar('password', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  phoneNumber: jsonb('phone_number').$type<PhoneNumberInterface>(),
  userType: UserTypePgEnum('user_type').notNull(), // Stores 'ADMIN' or 'USER'
  role: UserRolePgEnum('role').notNull(),
});

// Relations definition
// import { relations } from 'drizzle-orm';
// export const userRelations = relations(userSchema, ({ one, many }) => ({
//   // TODO: Add relationships here
// }));

// Type exports
export type UserSchemaType = typeof userSchema;

// Zod validation schemas
export const UserInsertSchema = z.discriminatedUnion('userType', [
  createInsertSchema(userSchema).merge(
    adminZodUserSchema.partial({
      id: true,
      createdAt: true,
      createdBy:true,
      updatedAt: true,
      updatedBy: true,
      deletedAt: true,
      deleted: true,
    }),
  ),
  createInsertSchema(userSchema).merge(
    userZodUserSchema.partial({
      id: true,
      createdAt: true,
      createdBy:true,
      updatedAt: true,
      updatedBy: true,
      deletedAt: true,
      deleted: true,
    }),
  ),
]);

export const UserSelectSchema = z.discriminatedUnion('userType', [
  createSelectSchema(userSchema).merge(adminZodUserSchema),
  createSelectSchema(userSchema).merge(userZodUserSchema),
]);

export const UserUpdateSchema = z.union([
  createUpdateSchema(userSchema).merge(adminZodUserSchema.partial()),
  createUpdateSchema(userSchema).merge(userZodUserSchema.partial()),
]);
