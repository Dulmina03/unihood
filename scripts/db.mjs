import { createClient, DatabaseToolError, loadMigrations, runMigrations, seedDatabase, assertSeedEnvironment } from './lib/database.mjs';

const [action, ...args] = process.argv.slice(2);
let client;
try {
  if (!['migrate', 'rollback', 'seed'].includes(action) || args.some((arg) => arg !== '--test') || args.length > 1) {
    throw new DatabaseToolError('Usage: db.mjs migrate|rollback|seed [--test]');
  }
  const url = args.includes('--test') ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
  const target = (value) => {
    if (!value) return null;
    const parsed = new URL(value);
    const host = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) ? 'loopback' : parsed.hostname;
    return `${host}:${parsed.port || '5432'}${decodeURIComponent(parsed.pathname)}`;
  };
  if (args.includes('--test') && url && target(url) === target(process.env.DATABASE_URL)) {
    throw new DatabaseToolError('Test and development URLs must differ');
  }
  if (action === 'seed') assertSeedEnvironment(url, process.env);
  client = createClient(url);
  await client.connect();
  const result = action === 'seed'
    ? await seedDatabase(client, url, process.env)
    : await runMigrations(client, await loadMigrations(), action);
  console.log(`${action}: ${Array.isArray(result) ? result.join(', ') || 'no changes' : `${result} synthetic fixture(s) verified`}`);
} catch (error) {
  const code = /^[0-9A-Z]{5}$/.test(error.code) ? error.code : 'unavailable';
  console.error(error instanceof DatabaseToolError ? error.message : `Database operation failed (${code}); connection details redacted`);
  process.exitCode = 1;
} finally {
  if (client) await client.end();
}
