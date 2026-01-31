import { HttpException } from './HttpException';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';

export class BadRequestException extends HttpException {
  readonly name = 'BadRequestException';
  constructor(
    response: string | Record<string, any> = ReasonPhrases.BAD_REQUEST,
  ) {
    super(response, StatusCodes.BAD_REQUEST);
  }
}
