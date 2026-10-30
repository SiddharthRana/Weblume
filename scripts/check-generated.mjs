// Regenerates every committed generated file and fails if any differs from what's committed.
// Run in CI after install: `pnpm openapi:check`.
import { execSync } from 'node:child_process';

const GENERATED = [
  'apps/api/openapi.json',
  'packages/api-client-ts/src/schema.ts',
  'apps/mobile/lib/theme/tokens.g.dart',
  'apps/mobile/lib/api/generated/models.g.dart',
  'apps/mobile/lib/api/generated/api.g.dart',
];

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
run('pnpm --filter @weblume/shared run build');
run('pnpm --filter @weblume/design-tokens run build');
run('pnpm --filter @weblume/api run openapi');
run('pnpm --filter @weblume/api-client-ts run generate');
run('node scripts/generate-dart-client.mjs');

try {
  execSync(`git diff --exit-code -- ${GENERATED.join(' ')}`, { stdio: 'inherit' });
  const untracked = execSync(`git ls-files --others --exclude-standard -- ${GENERATED.join(' ')}`)
    .toString()
    .trim();
  if (untracked) throw new Error(`Untracked generated files:\n${untracked}`);
  console.log('Generated files are up to date.');
} catch (err) {
  console.error(
    '\nGenerated files are stale. Run `pnpm openapi && pnpm tokens` and commit the changes.',
  );
  if (err instanceof Error && err.message.startsWith('Untracked')) console.error(err.message);
  process.exit(1);
}
