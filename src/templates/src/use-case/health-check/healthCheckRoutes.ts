import { Hono } from 'hono';
import { inject } from '@kanian77/simple-di';
import { StatusCodes } from 'http-status-codes';
import { FailedOperation } from '@root/lib';
import { HealthCheck, HEALTH_CHECK_USE_CASE_TOKEN } from './HealthCheck';

export const healthCheckRoutes = new Hono();

healthCheckRoutes.get('/', async (c) => {
  try {
    const useCase = inject<HealthCheck>(HEALTH_CHECK_USE_CASE_TOKEN);
    const result = await useCase.execute();
    return c.json(result, StatusCodes.OK);
  } catch (e) {
    return c.json(
      new FailedOperation('Internal Server Error'),
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
});

export const healthCheckRoutesPath = '/health';
export { healthCheckRoutes as Route, healthCheckRoutesPath as Path };
