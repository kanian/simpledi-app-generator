import { HttpException } from './HttpException';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';

export class ConflictException extends HttpException {
  readonly name = 'ConflictException';
  constructor(response: string | Record<string, any> = ReasonPhrases.CONFLICT) {
    super(response, StatusCodes.CONFLICT);
  }
}
