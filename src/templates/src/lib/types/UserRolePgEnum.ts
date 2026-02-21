import { pgEnum } from 'drizzle-orm/pg-core';

export const UserRolePgEnum = pgEnum('role', ['ADMIN', 'AUTHOR', 'EDITOR', 'AUTHENTICATED']);