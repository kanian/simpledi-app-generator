/**
 * Defines the base HTTP exception
 */
export class HttpException extends Error {
  /**
   * Instantiate a plain HTTP Exception.
   *
   * @example
   * \`throw new HttpException()\`
   * The \`status\` argument is required, and should be a valid HTTP status code.
   * Best practice is to use the \`HttpStatus\` enum imported from \`nestjs/common\`.
   *
   * @param response string or object describing the error condition.
   * @param status HTTP response status code.
   */
  constructor(
    private readonly response: string | Record<string, any>,
    readonly status: number,
  ) {
    super(typeof response === 'string' ? response : JSON.stringify(response));
  }
}
