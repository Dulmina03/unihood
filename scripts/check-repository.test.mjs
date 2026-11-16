import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { parseYaml, validateWorkflow } from './check-repository.mjs';
const original = parseYaml(await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'), 'ci');
test('repository policy accepts current read-only quality gates', () => {
  assert.doesNotThrow(() => validateWorkflow(original, 'ci'));
});
test('rejects elevated tokens and privileged PR execution', () => {
  for (const mutate of [
    (value) => {value.permissions.contents = 'write';},
    (value) => {value.jobs.checks.permissions = {'id-token': 'write'};},
    (value) => {value.on.pull_request_target = {};},
  ]) {const copy = structuredClone(original); mutate(copy); assert.throws(() => validateWorkflow(copy, 'unsafe'));}
});
test('rejects moving actions, unsafe shell interpolation, hidden failures and actor overrides', () => {
  for (const mutate of [
    (value) => {value.jobs.checks.steps[0].uses = 'actions/checkout@main';},
    (value) => {value.jobs.checks.steps[0].with['persist-credentials'] = true;},
    (value) => {value.jobs.checks.steps.push({run: 'echo ${{ github.event.pull_request.title }}'});},
    (value) => {value.jobs.checks.steps.push({run: 'pnpm test || true'});},
    (value) => {value.jobs.ui.steps.push({run: 'pnpm db:seed'});},
    (value) => {value.jobs.checks['continue-on-error'] = true;},
    (value) => {value.jobs.checks.env = {ENABLE_SYNTHETIC_ACTORS: 'true'};},
  ]) {const copy = structuredClone(original); mutate(copy); assert.throws(() => validateWorkflow(copy, 'unsafe'));}
});
test('YAML parser preserves on and rejects duplicate keys', () => {
  assert.deepEqual(parseYaml('on:\n  push:\n', 'sample'), {on: {push: null}});
  assert.throws(() => parseYaml('permissions: {}\npermissions: write-all\n', 'duplicate'));
});
test('browser job builds generated contracts before web and runs browser acceptance', () => {
  const commands = original.jobs.ui.steps.map((step) => step.run);
  const contracts = commands.indexOf('pnpm --filter @unihood/contracts build');
  const web = commands.indexOf('pnpm --filter @unihood/web build');
  const browser = commands.indexOf('pnpm test:ui');
  assert.ok(contracts >= 0 && web > contracts && browser > web, 'Fresh browser runners need contracts dist before web build and browser acceptance');
});

test('Phase 1 E2E preserves browser regressions and builds API before the isolated journey', () => {
  const commands = original.jobs.ui.steps.map((step) => step.run);
  assert.ok(commands.indexOf('pnpm test:e2e') > commands.indexOf('pnpm test:ui'));
  assert.ok(commands.indexOf('pnpm --filter @unihood/api build') > commands.indexOf('pnpm --filter @unihood/contracts build'));
  assert.ok(commands.indexOf('pnpm test:e2e') > commands.indexOf('pnpm --filter @unihood/api build'));
  assert.ok(commands.indexOf('cp .env.example .env') < commands.indexOf('pnpm test:e2e'));
});
