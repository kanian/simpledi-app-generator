import { Hono } from 'hono';
import { StatusCodes } from 'http-status-codes';

const mainRoutes = new Hono();

mainRoutes.get('/health', (c) => {
  return c.json({ status: 'healthy' }, StatusCodes.OK);
});

export { mainRoutes };
