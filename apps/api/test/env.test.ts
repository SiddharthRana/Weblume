import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env';

const base = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  SUPABASE_URL: 'http://localhost:54321',
};

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv(base);
    expect(env.PORT).toBe(4000);
    expect(env.CORS_ORIGINS).toEqual([]);
    expect(env.SUPABASE_JWT_SECRET).toBeUndefined();
  });

  it('parses comma-separated CORS origins', () => {
    expect(loadEnv({ ...base, CORS_ORIGINS: 'https://a.com, https://b.com' }).CORS_ORIGINS).toEqual(
      ['https://a.com', 'https://b.com'],
    );
  });

  it('names invalid variables without echoing secret values', () => {
    const secretish = 'mysql://user:SuperSecretPassword@host/db';
    let message = '';
    try {
      loadEnv({ ...base, DATABASE_URL: secretish });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('DATABASE_URL');
    expect(message).not.toContain('SuperSecretPassword');
  });

  it('requires the database and Supabase URLs', () => {
    expect(() => loadEnv({})).toThrow(
      /DATABASE_URL[\s\S]*SUPABASE_URL|SUPABASE_URL[\s\S]*DATABASE_URL/,
    );
  });
});
