import { describe, expect, it } from 'vitest';
import { createWeblumeClient } from '../src/index.js';

describe('createWeblumeClient', () => {
  it('attaches the bearer token and parses typed responses', async () => {
    let seenAuth: string | null = null;
    const fakeFetch = async (input: Request) => {
      seenAuth = input.headers.get('authorization');
      return new Response(JSON.stringify({ id: 'abc', email: 'a@b.test' }), {
        headers: { 'content-type': 'application/json' },
      });
    };
    const client = createWeblumeClient({
      baseUrl: 'http://api.test',
      getAccessToken: () => 'tok',
      fetch: fakeFetch as typeof fetch,
    });
    const { data, error } = await client.GET('/v1/me');
    expect(error).toBeUndefined();
    expect(data?.id).toBe('abc');
    expect(seenAuth).toBe('Bearer tok');
  });

  it('omits the header when signed out', async () => {
    let seenAuth: string | null = 'unset';
    const client = createWeblumeClient({
      baseUrl: 'http://api.test',
      getAccessToken: () => null,
      fetch: (async (input: Request) => {
        seenAuth = input.headers.get('authorization');
        return new Response('[]', { headers: { 'content-type': 'application/json' } });
      }) as typeof fetch,
    });
    await client.GET('/v1/plans');
    expect(seenAuth).toBeNull();
  });
});
