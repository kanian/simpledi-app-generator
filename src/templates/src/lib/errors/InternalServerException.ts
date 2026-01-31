import { HttpException } from './HttpException';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';

export class InternalServerException extends HttpException {
  readonly name = 'NotFoundException';
  constructor(
    response:
      | string
      | Record<string, any> = ReasonPhrases.INTERNAL_SERVER_ERROR,
  ) {
    super(response, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}
