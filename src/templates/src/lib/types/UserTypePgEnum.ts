import { pgEnum } from 'drizzle-orm/pg-core';

export const UserTypePgEnum = pgEnum('user_type', ['ADMIN', 'USER']);
