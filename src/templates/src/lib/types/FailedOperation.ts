import { OperationResult } from './OperationResult';

export class FailedOperation extends OperationResult {
  public readonly success = false;
  public readonly result = null;
  constructor(readonly message = 'Failed Operation') {
    super();
  }
}
