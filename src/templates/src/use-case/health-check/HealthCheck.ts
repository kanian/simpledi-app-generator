import { Module, Service } from '@kanian77/simple-di';
import type { IUseCase } from '../IUseCase';
import {
  HealthCheckSuccess,
  type HealthCheckPayload,
} from './outputs/HealthCheckSuccess';

export const HEALTH_CHECK_USE_CASE_TOKEN = 'HEALTH_CHECK_USE_CASE';

@Service({
  token: HEALTH_CHECK_USE_CASE_TOKEN,
  lifecycle: 'transient',
})
export class HealthCheck implements IUseCase {
  async execute(): Promise<HealthCheckSuccess> {
    const result: HealthCheckPayload = { status: 'healthy' };
    return new HealthCheckSuccess(result);
  }
}

export const HealthCheckModule = new Module({
  imports: [],
  providers: [{ provide: HEALTH_CHECK_USE_CASE_TOKEN, useClass: HealthCheck }],
});
