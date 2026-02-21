import { inject } from '@kanian77/simple-di';
import type { Context, Next } from 'hono';
import { StatusCodes } from 'http-status-codes';
import { USER_SERVICE_INTERFACE } from '@root/core/user/IUserService';
import type { UserService } from '@root/core/user/UserService';
import type { TokenPayload } from '@root/lib';
import { AuthenticationUtils } from '@root/lib/AuthenticationUtils';

export const authGuard = () => {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, StatusCodes.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      console.log(' no token')
      return c.json({ error: 'Unauthorized' }, StatusCodes.UNAUTHORIZED);
    }
    try {
      const payload = AuthenticationUtils.verifyToken(token) as TokenPayload;

      if (!payload) {
        console.log(' no payload')
        return c.json({ error: 'Unauthorized' }, StatusCodes.UNAUTHORIZED);
      }

      const user = await inject<UserService>(USER_SERVICE_INTERFACE).findById(
        payload.userId,
      );

      if (!user) {
        console.log(' no user')
        return c.json({ error: 'Unauthorized' }, StatusCodes.UNAUTHORIZED);
      }

      c.set('user', user);
      await next();
    } catch {
      return c.json({ error: 'Unauthorized' }, StatusCodes.UNAUTHORIZED);
    }
  };
};
