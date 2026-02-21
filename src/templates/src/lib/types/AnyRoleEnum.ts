import type { AdminRoleEnum } from './AdminRoleEnum';
import type { UserRoleEnum } from './UserRoleEnum';

// Keep a union type if you ever need "any role"
export type AnyRoleEnum = AdminRoleEnum | UserRoleEnum;
