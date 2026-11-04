import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, Public } from '../auth/decorators';
import { ApiErrorDto } from '../scans/scans.dto';
import {
  CreateMonitorBody,
  MonitorDto,
  MonitorListResponse,
  PauseMonitorBody,
  PauseMonitorResponse,
  UpdateMonitorBody,
} from './monitors.dto';
import { MonitorsService } from './monitors.service';

// Same per-IP budget as starting scans (read lazily so it follows configuration).
const createLimit = () => Number(process.env.SCAN_CREATE_RATE_LIMIT_PER_MINUTE ?? 10);

const forbidden = {
  type: ApiErrorDto,
  description:
    'upgrade_required (plan has no monitoring or not this frequency) or monitor_limit_reached',
};

@ApiTags('monitors')
@ApiBearerAuth()
@Controller('monitors')
export class MonitorsController {
  constructor(private readonly monitors: MonitorsService) {}

  /** Sites this account monitors, with the plan's limit. */
  @Get()
  @ApiOkResponse({ type: MonitorListResponse })
  list(@CurrentUser() user: AuthUser): Promise<MonitorListResponse> {
    return this.monitors.list(user);
  }

  /** Monitor a site: re-scan it on a schedule and email a digest when something changes. */
  @Post()
  @Throttle({ default: { limit: createLimit, ttl: 60_000 } })
  @ApiOkResponse({ type: MonitorDto, description: '201 Created' })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiForbiddenResponse(forbidden)
  @ApiConflictResponse({ type: ApiErrorDto, description: 'already_monitored' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateMonitorBody): Promise<MonitorDto> {
    return this.monitors.create(user, body);
  }

  /** Pause or resume, or change the frequency or what gets emailed. */
  @Patch(':id')
  @ApiOkResponse({ type: MonitorDto })
  @ApiForbiddenResponse(forbidden)
  @ApiNotFoundResponse({ type: ApiErrorDto })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateMonitorBody,
  ): Promise<MonitorDto> {
    return this.monitors.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ApiErrorDto })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.monitors.remove(user, id);
  }

  /** Pause a monitored site from the signed link in a digest email. No sign-in needed. */
  @Post('pause')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOkResponse({ type: PauseMonitorResponse })
  @ApiNotFoundResponse({
    type: ApiErrorDto,
    description: 'Invalid link or site no longer monitored',
  })
  pause(@Body() body: PauseMonitorBody): Promise<PauseMonitorResponse> {
    return this.monitors.pauseByToken(body.token);
  }
}
