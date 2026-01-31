import { HttpException } from './HttpException';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';

export class ForbiddenException extends HttpException {
  readonly name = 'ForbiddenException';
  constructor(
    response: string | Record<string, any> = ReasonPhrases.FORBIDDEN,
  ) {
    super(response, StatusCodes.FORBIDDEN);
  }
}
