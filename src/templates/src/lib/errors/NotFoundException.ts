import { HttpException } from './HttpException';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';

export class NotFoundException extends HttpException {
  readonly name = 'NotFoundException';
  constructor(
    response: string | Record<string, any> = ReasonPhrases.NOT_FOUND,
  ) {
    super(response, StatusCodes.NOT_FOUND);
  }
}
