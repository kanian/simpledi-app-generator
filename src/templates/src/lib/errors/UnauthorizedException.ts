import { HttpException } from './HttpException';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';

export class UnauthorizedException extends HttpException {
  readonly name = 'UnauthorizedException';
  constructor(
    response: string | Record<string, any> = ReasonPhrases.UNAUTHORIZED,
  ) {
    super(response, StatusCodes.UNAUTHORIZED);
  }
}
