import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, MaybeUser, OptionalAuth } from '../auth/decorators';
import {
  ApiErrorDto,
  CreateScanBody,
  CreateScanResponse,
  ListScansQuery,
  ScanListResponse,
  ScanReportDtoClass,
} from './scans.dto';
import { ScansService, type Requester } from './scans.service';

// Read lazily so the limit follows configuration (validated in env.ts).
const scanCreateLimit = () => Number(process.env.SCAN_CREATE_RATE_LIMIT_PER_MINUTE ?? 10);

const scanTokenHeader = {
  name: 'x-scan-token',
  required: false,
  description: 'Guest scans: the scanToken returned when the scan was created',
};

@ApiTags('scans')
@ApiBearerAuth()
@Controller('scans')
export class ScansController {
  constructor(private readonly scans: ScansService) {}

  /** Start a scan. Signed-in users or guests (guests need a Turnstile token and get one scan per day). */
  @Post()
  @OptionalAuth()
  @Throttle({ default: { limit: scanCreateLimit, ttl: 60_000 } })
  @ApiOkResponse({
    type: CreateScanResponse,
    description: '202 when queued; 200 when a recent identical scan is returned',
  })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiConflictResponse({
    type: ApiErrorDto,
    description: 'A scan is already running for this user',
  })
  @ApiTooManyRequestsResponse({ type: ApiErrorDto, description: 'Scan quota used up' })
  async create(
    @Body() body: CreateScanBody,
    @MaybeUser() user: AuthUser | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CreateScanResponse> {
    const requester: Requester = user
      ? { user }
      : { guest: { ip: req.ip ?? 'unknown', turnstileToken: body.turnstileToken } };
    const result = await this.scans.create(body.url, requester);
    res.status(result.deduplicated ? 200 : 202);
    return result;
  }

  @Get()
  @ApiOkResponse({ type: ScanListResponse })
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListScansQuery,
  ): Promise<ScanListResponse> {
    return this.scans.list(user, { q: query.q, limit: query.limit ?? 20, before: query.before });
  }

  @Get(':id')
  @OptionalAuth()
  @ApiHeader(scanTokenHeader)
  @ApiOkResponse({ type: ScanReportDtoClass })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @MaybeUser() user: AuthUser | undefined,
    @Headers('x-scan-token') scanToken?: string,
  ): Promise<ScanReportDtoClass> {
    return this.scans.get(id, { user, scanToken });
  }

  @Post(':id/retry')
  @OptionalAuth()
  @HttpCode(202)
  @Throttle({ default: { limit: scanCreateLimit, ttl: 60_000 } })
  @ApiHeader(scanTokenHeader)
  @ApiOkResponse({ type: CreateScanResponse })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  @ApiTooManyRequestsResponse({ type: ApiErrorDto })
  async retry(
    @Param('id', new ParseUUIDPipe()) id: string,
    @MaybeUser() user: AuthUser | undefined,
    @Req() req: Request,
    @Headers('x-scan-token') scanToken?: string,
  ): Promise<CreateScanResponse> {
    const requester: Requester = user ? { user } : { guest: { ip: req.ip ?? 'unknown' } };
    return this.scans.retry(id, { user, scanToken }, requester);
  }
}
