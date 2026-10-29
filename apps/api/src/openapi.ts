// Writes apps/api/openapi.json without connecting to any external service.
// Placeholder env values are fine: the database pool is lazy and nothing is called.
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildOpenApi, createApp } from './app';

process.env.DATABASE_URL ??= 'postgres://openapi:openapi@127.0.0.1:5432/openapi';
process.env.SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.NODE_ENV ??= 'test';

async function main() {
  const app = await createApp({ logger: false });
  const doc = buildOpenApi(app);
  const out = join(__dirname, '..', 'openapi.json');
  writeFileSync(out, JSON.stringify(doc, null, 2) + '\n');
  await app.close();
  process.stdout.write(`Wrote ${out}\n`);
}

void main();
