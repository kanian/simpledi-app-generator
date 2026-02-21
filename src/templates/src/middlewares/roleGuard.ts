import type { AnyRoleEnum } from '@root/lib/types/AnyRoleEnum';
import type { Context, Next } from 'hono';
import { StatusCodes } from 'http-status-codes';

export const roleGuard = (roles: AnyRoleEnum[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, StatusCodes.UNAUTHORIZED);
    }
    if (!roles.includes(user.role)) {
      return c.json({ error: 'Unauthorized' }, StatusCodes.UNAUTHORIZED);
    }
    await next();
  };
};