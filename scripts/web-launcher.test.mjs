import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

// Run the real launcher source with a tiny Next entry point, avoiding server
// ports while observing exactly what its downstream process inherits.
async function fixture(t, envFile) {
  const root = await mkdtemp(join(tmpdir(), 'unihood-launcher-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const scripts = join(root, 'apps/web/scripts');
  const next = join(root, 'apps/web/node_modules/next');
  await mkdir(scripts, {recursive: true});
  await mkdir(next, {recursive: true});
  await copyFile(new URL('../apps/web/scripts/next.mjs', import.meta.url), join(scripts, 'next.mjs'));
  await writeFile(join(next, 'package.json'), JSON.stringify({type: 'module', exports: {'./dist/bin/next': './cli.mjs'}}));
  await writeFile(join(next, 'cli.mjs'), 'console.log(JSON.stringify({argv:process.argv.slice(2),execArgv:process.execArgv,fixture:process.env.LAUNCHER_FIXTURE}))');
  if (envFile !== undefined) await writeFile(join(root, '.env'), envFile);
  const env = {...process.env};
  for (const key of ['WEB_PORT', 'LAUNCHER_FIXTURE', 'NODE_OPTIONS']) delete env[key];
  return (mode, overrides = {}) => spawnSync(process.execPath, [join(scripts, 'next.mjs'), mode, '--help'], {cwd: tmpdir(), env: {...env, ...overrides}, encoding: 'utf8', timeout: 10000});
}

test('web launcher loads root env regardless of cwd without forwarding CLI env flags', async (t) => {
  const run = await fixture(t, 'WEB_PORT=4319\nLAUNCHER_FIXTURE=synthetic\n');
  for (const mode of ['dev', 'start']) {
    const result = run(mode);
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.deepEqual(output.argv, [mode, '--hostname', '127.0.0.1', '--port', '4319', '--help']);
    assert.deepEqual(output.execArgv, []);
    assert.equal(output.fixture, 'synthetic');
  }
});

test('web launcher preserves exported values and rejects invalid ports', async (t) => {
  const run = await fixture(t, 'WEB_PORT=4319\nLAUNCHER_FIXTURE=file\n');
  const result = run('dev', {WEB_PORT: '4320', LAUNCHER_FIXTURE: 'exported'});
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.argv[4], '4320');
  assert.equal(output.fixture, 'exported');
  const invalid = run('dev', {WEB_PORT: '0'});
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /WEB_PORT must be between/);
});

test('web launcher permits missing root env with safe defaults', async (t) => {
  const run = await fixture(t);
  const result = run('dev');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).argv[4], '3000');
});
