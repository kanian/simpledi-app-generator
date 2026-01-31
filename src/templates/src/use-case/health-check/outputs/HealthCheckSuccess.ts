import { SuccessfullOperation } from '@root/lib';

export type HealthCheckPayload = {
  status: string;
};

export class HealthCheckSuccess extends SuccessfullOperation {
  constructor(
    public readonly result: HealthCheckPayload,
    public readonly message: string = 'Service is healthy',
  ) {
    super();
  }
}
