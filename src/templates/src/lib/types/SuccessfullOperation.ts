import { OperationResult } from './OperationResult';

export class SuccessfullOperation extends OperationResult {
  readonly success = true;

  constructor(readonly message = 'Successfull Operation') {
    super();
  }
}
