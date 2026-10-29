import createClient, { type Client, type Middleware } from 'openapi-fetch';
import type { components, paths } from './schema.js';

export type { components, paths };
export type Schemas = components['schemas'];
export type WeblumeClient = Client<paths>;

export interface ClientOptions {
  baseUrl: string;
  /** Returns the current Supabase access token, or null when signed out. */
  getAccessToken?: () => Promise<string | null> | string | null;
  fetch?: typeof fetch;
}

/** Typed client for the Weblume API, generated from apps/api/openapi.json. */
export function createWeblumeClient(options: ClientOptions): WeblumeClient {
  const client = createClient<paths>({ baseUrl: options.baseUrl, fetch: options.fetch });
  if (options.getAccessToken) {
    const getToken = options.getAccessToken;
    const auth: Middleware = {
      async onRequest({ request }) {
        const token = await getToken();
        if (token) request.headers.set('Authorization', `Bearer ${token}`);
        return request;
      },
    };
    client.use(auth);
  }
  return client;
}
