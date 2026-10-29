import {
  Controller,
  Get,
  HttpCode,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/decorators';
import { Database } from '../database/database.module';

class HealthDto {
  @ApiProperty({ example: 'ok' })
  status: 'ok';
}

@ApiTags('health')
@Public()
@SkipThrottle()
@Controller({ version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly database: Database) {}

  /** Liveness: the process is up. Doesn't touch dependencies. */
  @Get('health')
  @HttpCode(200)
  @ApiOkResponse({ type: HealthDto })
  health(): HealthDto {
    return { status: 'ok' };
  }

  /** Readiness: dependencies needed to serve traffic are reachable. */
  @Get('ready')
  @ApiOkResponse({ type: HealthDto })
  @ApiServiceUnavailableResponse({ description: 'A dependency (database) is unavailable' })
  async ready(): Promise<HealthDto> {
    if (!(await this.database.ping()))
      throw new ServiceUnavailableException('Database unavailable');
    return { status: 'ok' };
  }
}
