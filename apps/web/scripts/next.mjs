// Node loads the repository .env before this launcher. Existing exported variables win.
// Resolve WEB_PORT after env loading, rather than expanding it early in a shell.
const mode = process.argv[2];
if (!['dev', 'start'].includes(mode)) throw new Error('Expected dev or start');
const port = process.env.WEB_PORT ?? '3000';
if (!/^[1-9][0-9]{0,4}$/.test(port) || Number(port) > 65535) throw new Error('WEB_PORT must be between 1 and 65535');
process.argv = [process.execPath, process.argv[1], mode, '--hostname', '127.0.0.1', '--port', port, ...process.argv.slice(3)];
await import('next/dist/bin/next');
