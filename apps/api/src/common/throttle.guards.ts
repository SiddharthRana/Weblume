import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerRequest } from '@nestjs/throttler';

/** The `user` throttler is keyed by the verified user id, so it must run after authentication. */
export const USER_THROTTLER = 'user';

/** Per-IP limits. Runs before authentication so unauthenticated floods are limited too. */
@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  protected override handleRequest(props: ThrottlerRequest): Promise<boolean> {
    if (props.throttler.name === USER_THROTTLER) return Promise.resolve(true);
    return super.handleRequest(props);
  }
}

/** Per-user limits across all of a user's IPs. Registered after the auth guard. */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override handleRequest(props: ThrottlerRequest): Promise<boolean> {
    if (props.throttler.name !== USER_THROTTLER) return Promise.resolve(true);
    return super.handleRequest(props);
  }
}
