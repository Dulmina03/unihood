import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

// Load in-process: Next dev forwards execArgv into NODE_OPTIONS, where Node
// rejects --env-file / --env-file-if-exists. Existing exported variables win.
try {
  loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
// Resolve WEB_PORT after env loading, rather than expanding it early in a shell.
const mode = process.argv[2];
if (!['dev', 'start'].includes(mode)) throw new Error('Expected dev or start');
const port = process.env.WEB_PORT ?? '3000';
if (!/^[1-9][0-9]{0,4}$/.test(port) || Number(port) > 65535) throw new Error('WEB_PORT must be between 1 and 65535');
process.argv = [process.execPath, process.argv[1], mode, '--hostname', '127.0.0.1', '--port', port, ...process.argv.slice(3)];
await import('next/dist/bin/next');
