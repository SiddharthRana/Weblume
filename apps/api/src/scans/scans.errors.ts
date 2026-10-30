import { HttpException, HttpStatus } from '@nestjs/common';

/** API errors carry a stable machine-readable `code` plus a human message. */
export class ApiError extends HttpException {
  constructor(
    status: HttpStatus,
    code: string,
    message: string,
    extra: Record<string, unknown> = {},
  ) {
    super({ statusCode: status, code, message, ...extra }, status);
  }
}
