import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AuthenticatedRequest, AuthUser } from './auth.types';

export const IS_PUBLIC = 'weblume:isPublic';

/** Marks a route as reachable without authentication. Every other route requires a valid JWT. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) throw new Error('CurrentUser used on a route without authentication');
    return req.user;
  },
);
