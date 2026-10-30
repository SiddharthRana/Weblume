import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, Public } from '../auth/decorators';
import { ApiErrorDto } from '../scans/scans.dto';
import {
  CompareQuery,
  CreateShareBody,
  CreateShareResponse,
  ReportComparisonDto,
  SharedReportDto,
  ShareLinkDto,
  ShareListResponse,
} from './reports.dto';
import { ReportsService } from './reports.service';

const upgradeRequired = {
  type: ApiErrorDto,
  description: 'upgrade_required: the plan does not include this feature',
};

@ApiTags('reports')
@ApiBearerAuth()
@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** Compare two finished scans of the same URL: new, resolved and unchanged findings, score deltas. */
  @Get('compare')
  @ApiOkResponse({ type: ReportComparisonDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'different_urls or same_scan' })
  @ApiForbiddenResponse(upgradeRequired)
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'report_not_ready' })
  compare(
    @CurrentUser() user: AuthUser,
    @Query() query: CompareQuery,
  ): Promise<ReportComparisonDto> {
    return this.reports.compare(user, query.base, query.target);
  }

  /** The report as a branded PDF (Starter plan). */
  @Get('scans/:id/report.pdf')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiForbiddenResponse(upgradeRequired)
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'report_not_ready' })
  async pdf(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { pdf, filename } = await this.reports.pdf(user, id);
    res.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
      length: pdf.length,
    });
  }

  /** Create a read-only share link (Starter plan). The token is returned once. */
  @Post('scans/:id/shares')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOkResponse({ type: CreateShareResponse, description: '201 Created' })
  @ApiForbiddenResponse(upgradeRequired)
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiConflictResponse({
    type: ApiErrorDto,
    description: 'report_not_ready or too_many_share_links',
  })
  createShare(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateShareBody,
  ): Promise<CreateShareResponse> {
    return this.reports.createShare(user, id, body.expiresInDays);
  }

  @Get('scans/:id/shares')
  @ApiOkResponse({ type: ShareListResponse })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async listShares(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ShareListResponse> {
    return { items: await this.reports.listShares(user, id) };
  }

  /** Turn a share link off. Idempotent. */
  @Delete('shares/:shareId')
  @HttpCode(200)
  @ApiOkResponse({ type: ShareLinkDto })
  @ApiNotFoundResponse({ type: ApiErrorDto })
  revokeShare(
    @Param('shareId', new ParseUUIDPipe()) shareId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ShareLinkDto> {
    return this.reports.revokeShare(user, shareId);
  }

  /** Public, read-only shared report. No account details are included. */
  @Get('shared/:token')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('X-Robots-Tag', 'noindex, nofollow')
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @ApiOkResponse({ type: SharedReportDto })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'Unknown, revoked or expired link' })
  viewShared(@Param('token') token: string): Promise<SharedReportDto> {
    return this.reports.viewShared(token);
  }
}
