import { createWeblumeClient } from '@weblume/api-client-ts';
import { currentAccessToken } from './supabase';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(
  /\/$/,
  '',
);

/** Typed API client. Sends the Supabase access token when signed in; nothing when signed out. */
export const api = createWeblumeClient({ baseUrl: API_URL, getAccessToken: currentAccessToken });

export interface ApiErrorBody {
  statusCode?: number;
  code?: string;
  message?: string | string[];
}

/** Turns an API error body (or a network failure) into a message safe to show users. */
export function errorMessage(error: unknown): string {
  const body = error as ApiErrorBody | undefined;
  if (body && typeof body === 'object') {
    if (typeof body.message === 'string' && body.code) return body.message;
    if (Array.isArray(body.message) && body.message.length) return body.message[0]!;
    if (body.statusCode === 401) return 'Your session has expired. Please log in again.';
    if (body.statusCode === 429) return 'Too many requests. Please wait a minute and try again.';
    if (body.statusCode === 400)
      return 'That request wasn’t valid. Check the address and try again.';
  }
  return 'We couldn’t reach Weblume. Check your connection and try again.';
}
