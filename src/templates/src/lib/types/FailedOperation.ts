import { OperationResult } from './OperationResult';

export class FailedOperation extends OperationResult {
  public override readonly success = false;
  public override readonly result = null;
  constructor(public override readonly message = 'Failed Operation') {
    super();
  }
}
