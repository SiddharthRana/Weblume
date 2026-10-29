import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators';

class MeDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ required: false }) email?: string;
}

@ApiTags('account')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  @Get()
  @ApiOkResponse({ type: MeDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  me(@CurrentUser() user: AuthUser): MeDto {
    return { id: user.id, email: user.email };
  }
}
