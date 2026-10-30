import { type ArgumentsHost, Catch, HttpException, Inject } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { ERROR_REPORTER, type ErrorReporter } from './error-reporter';

/** Reports unexpected (5xx / non-HTTP) errors, then responds exactly as Nest normally would. */
@Catch()
export class ReportingExceptionFilter extends BaseExceptionFilter {
  constructor(
    @Inject(ERROR_REPORTER) private readonly reporter: ErrorReporter,
    adapterHost: HttpAdapterHost,
  ) {
    super(adapterHost.httpAdapter);
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    const status = statusOf(exception);
    if (status >= 500 && host.getType() === 'http') {
      const req = host.switchToHttp().getRequest<Request>();
      this.reporter.capture(exception, {
        method: req.method,
        // The route pattern (e.g. /v1/scans/:id), never the concrete URL.
        route: (req.route as { path?: string } | undefined)?.path ?? 'unmatched',
        status,
      });
    }
    super.catch(exception, host);
  }
}

/** Same status Nest will answer with: HttpException, or an error carrying one (e.g. body-parser's 413). */
function statusOf(exception: unknown): number {
  if (exception instanceof HttpException) return exception.getStatus();
  const s = (exception as { statusCode?: unknown } | null)?.statusCode;
  return typeof s === 'number' && s >= 400 && s < 600 ? s : 500;
}
