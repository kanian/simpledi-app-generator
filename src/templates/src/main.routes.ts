import { Hono } from 'hono';
import {
  healthCheckRoutes,
  healthCheckRoutesPath,
} from './use-case/health-check/healthCheckRoutes';

const mainRoutes = new Hono();

mainRoutes.route(healthCheckRoutesPath, healthCheckRoutes);

export { mainRoutes };
