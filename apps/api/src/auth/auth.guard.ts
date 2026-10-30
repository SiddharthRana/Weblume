import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedRequest } from './auth.types';
import { IS_PUBLIC, OPTIONAL_AUTH } from './decorators';
import { JwtVerifier } from './jwt-verifier';

/** Global guard: every route requires a valid Supabase access token unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: JwtVerifier,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const optional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const req = ctx.switchToHttp().getRequest<Request & AuthenticatedRequest>();
    const header = req.headers.authorization;
    if (optional && !header) return true;
    const match = header?.match(/^Bearer ([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)$/);
    if (!match?.[1]) throw new UnauthorizedException('Authentication required');

    try {
      req.user = await this.verifier.verify(match[1]);
      return true;
    } catch {
      // Don't reveal why verification failed.
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
