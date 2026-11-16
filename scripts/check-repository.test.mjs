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
    (value) => {value.jobs.checks['continue-on-error'] = true;},
    (value) => {value.jobs.checks.env = {ENABLE_SYNTHETIC_ACTORS: 'true'};},
  ]) {const copy = structuredClone(original); mutate(copy); assert.throws(() => validateWorkflow(copy, 'unsafe'));}
});
test('YAML parser preserves on and rejects duplicate keys', () => {
  assert.deepEqual(parseYaml('on:\n  push:\n', 'sample'), {on: {push: null}});
  assert.throws(() => parseYaml('permissions: {}\npermissions: write-all\n', 'duplicate'));
});
