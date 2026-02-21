import { Hono, type Schema, type Env } from 'hono';
import { getTestServer } from './getTestServer';

export const getNewTestServer = (
  routes: Record<
    string,
    { handler: Hono<Env, Schema, string>; mw?: any[] }
  > = {}
) => {
  const app = new Hono();
  Object.keys(routes).forEach((route: string) => {
    console.log('route', route);
    if (!routes || !routes[route]) {
      console.warn('Route not found', route);
      return;
    }
    app.route(route, routes[route].handler);
    routes[route].mw?.forEach((mw) => app.use(route, mw));
  });

  return getTestServer(app);
};
