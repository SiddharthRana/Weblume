import { Body, Controller, Delete, Get, HttpCode, Patch, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators';
import { ApiErrorDto } from '../scans/scans.dto';
import {
  AccountDtoClass,
  DeleteAccountBody,
  DeleteAccountResponse,
  UpdateAccountBody,
} from './account.dto';
import { AccountService } from './account.service';

@ApiTags('account')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto, description: 'account_deleted' })
@Controller('me')
export class AccountController {
  constructor(private readonly accounts: AccountService) {}

  /** The signed-in account: profile, current plan (server-side entitlements) and usage. */
  @Get()
  @ApiOkResponse({ type: AccountDtoClass })
  me(@CurrentUser() user: AuthUser): Promise<AccountDtoClass> {
    return this.accounts.get(user);
  }

  @Patch()
  @ApiOkResponse({ type: AccountDtoClass })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  update(@CurrentUser() user: AuthUser, @Body() body: UpdateAccountBody): Promise<AccountDtoClass> {
    return this.accounts.updateProfile(user, body.displayName ?? null);
  }

  /** Download all data we hold about the account as JSON. */
  @Get('export')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOkResponse({ description: 'JSON export (account, plan, scans with findings)' })
  async export(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    const data = await this.accounts.export(user);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="weblume-export-${new Date().toISOString().slice(0, 10)}.json"`,
    );
    res.setHeader('Cache-Control', 'no-store');
    return data;
  }

  /** Permanently delete the account and its data. Body must be {"confirm":"DELETE"}. */
  @Delete()
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOkResponse({ type: DeleteAccountResponse })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  delete(
    @CurrentUser() user: AuthUser,
    @Body() _body: DeleteAccountBody,
  ): Promise<DeleteAccountResponse> {
    return this.accounts.delete(user);
  }
}
