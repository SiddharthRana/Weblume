import { Global, Inject, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ENV, type Env } from '../config/env';
import * as schema from './schema';

/** Owns the connection pool. Connections are opened lazily on first query. */
@Injectable()
export class Database implements OnApplicationShutdown {
  readonly sql: postgres.Sql;
  readonly db: PostgresJsDatabase<typeof schema>;

  constructor(@Inject(ENV) env: Env) {
    this.sql = postgres(env.DATABASE_URL, {
      max: 10,
      idle_timeout: 30,
      connect_timeout: 10,
      // Supabase's transaction pooler (port 6543) doesn't support prepared statements.
      prepare: false,
      onnotice: () => undefined,
    });
    this.db = drizzle({ client: this.sql, schema });
  }

  async ping(): Promise<boolean> {
    try {
      await this.sql`select 1`;
      return true;
    } catch {
      return false;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.sql.end({ timeout: 5 });
  }
}

@Global()
@Module({ providers: [Database], exports: [Database] })
export class DatabaseModule {}
