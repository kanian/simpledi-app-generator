import type { Context } from 'hono';

export const getContextUser = (c: Context) => {
  return c.get('user');
};
