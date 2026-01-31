import { Module } from '@kanian77/simple-di';
import { HealthCheckModule } from './health-check/HealthCheck';

export const UseCaseModule = new Module({
  imports: [HealthCheckModule],
});
