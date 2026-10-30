import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AuthenticatedRequest, AuthUser } from './auth.types';

export const IS_PUBLIC = 'weblume:isPublic';

/** Marks a route as reachable without authentication. Every other route requires a valid JWT. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const OPTIONAL_AUTH = 'weblume:optionalAuth';

/** Route works signed out, but if a bearer token is sent it must be valid and the user is attached. */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH, true);

/** Like CurrentUser, but undefined when signed out (for @OptionalAuth routes). */
export const MaybeUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) throw new Error('CurrentUser used on a route without authentication');
    return req.user;
  },
);
