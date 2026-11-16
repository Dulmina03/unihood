import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';

export function parseYaml(source, name) {
  const document = parseDocument(source, {uniqueKeys: true, version: '1.2'});
  assert.equal(document.errors.length, 0, `${name}: invalid/duplicate YAML keys`);
  return document.toJS();
}
function permissions(value, name) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${name}: explicit permission map required`);
  for (const [key, permission] of Object.entries(value)) assert.ok(key === 'contents' && ['read', 'none'].includes(permission), `${name}: repository CI needs no write/elevated permissions`);
}
export function validateWorkflow(workflow, name) {
  assert.ok(workflow && typeof workflow === 'object', `${name}: workflow required`);
  const triggers = Object.keys(workflow.on ?? {});
  assert.ok(triggers.length && triggers.every((trigger) => ['push', 'pull_request', 'workflow_dispatch'].includes(trigger)), `${name}: unapproved workflow trigger`);
  permissions(workflow.permissions, name);
  assert.equal(workflow.permissions.contents, 'read', `${name}: checkout needs contents: read`);
  assert.equal(workflow.env?.ENABLE_SYNTHETIC_ACTORS, 'false', `${name}: synthetic actors must default off`);
  assert.equal(workflow.env?.SYNTHETIC_ACTOR, '', `${name}: no configured actor in CI`);
  assert.equal(workflow.env?.APP_ENV, 'test', `${name}: CI must use test environment`);
  assert.ok(!/secrets\s*[.[]/.test(JSON.stringify(workflow)), `${name}: quality gates must not need secrets`);
  for (const [id, job] of Object.entries(workflow.jobs ?? {})) {
    assert.equal(job['runs-on'], 'ubuntu-24.04', `${name}/${id}: documented isolated runner required`);
    assert.ok(Number.isInteger(job['timeout-minutes']) && job['timeout-minutes'] >= 1 && job['timeout-minutes'] <= 30, `${name}/${id}: bounded timeout required`);
    assert.ok(!job.if && !job['continue-on-error'], `${name}/${id}: quality gate must not be skipped/masked`);
    if (job.permissions) permissions(job.permissions, `${name}/${id}`);
    for (const step of job.steps ?? []) {
      assert.ok(!step.if && !step['continue-on-error'], `${name}/${id}: gate step must not be skipped/masked`);
      for (const env of [job.env, step.env]) {
        if (env?.ENABLE_SYNTHETIC_ACTORS !== undefined) assert.equal(env.ENABLE_SYNTHETIC_ACTORS, 'false', `${name}/${id}: actor override`);
        if (env?.SYNTHETIC_ACTOR !== undefined) assert.equal(env.SYNTHETIC_ACTOR, '', `${name}/${id}: actor fixture override`);
      }
      if (step.uses) {
        assert.match(step.uses, /^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/, `${name}/${id}: immutable action revision required`);
        if (step.uses.startsWith('actions/checkout@')) assert.equal(step.with?.['persist-credentials'], false, `${name}/${id}: never persist checkout credentials`);
      }
      if (step.run) {
        assert.ok(!step.run.includes('${{'), `${name}/${id}: do not interpolate contexts into shell code`);
        assert.ok(!/continue-on-error|\|\|\s*true|pnpm\s+db:(?:up|down|seed|migrate|rollback)\b|git\s+(?:add|commit|push|merge|rebase|tag)|gh\s+pr\s+(?:create|merge)/.test(step.run), `${name}/${id}: masked checks, persistent DB commands or Git mutation`);
      }
    }
  }
}
export async function checkRepository(root = process.cwd()) {
  const read = (name) => readFile(resolve(root, name), 'utf8');
  const workflows = (await readdir(resolve(root, '.github/workflows'))).filter((name) => /\.ya?ml$/.test(name));
  assert.ok(workflows.length, 'No workflow files');
  for (const name of workflows) validateWorkflow(parseYaml(await read(`.github/workflows/${name}`), name), name);
  const ci = parseYaml(await read('.github/workflows/ci.yml'), 'ci');
  const runs = (job) => ci.jobs[job]?.steps?.filter((step) => step.run).map((step) => step.run) ?? [];
  for (const command of ['pnpm install --frozen-lockfile', 'pnpm check:repo', 'pnpm check:workflows', 'pnpm lint', 'pnpm typecheck', 'pnpm test', 'pnpm build']) assert.ok(runs('checks').includes(command), `Missing workspace gate: ${command}`);
  assert.ok(runs('database').includes('pnpm db:test'), 'Isolated database gate required');
  assert.ok(runs('ui').includes('pnpm test:ui'), 'Component browser gate required');
  assert.ok(runs('ui').includes('pnpm test:e2e'), 'Phase 1 E2E gate required');
  const e2eStep = ci.jobs.ui.steps.find((step) => step.run === 'pnpm test:e2e');
  assert.ok(e2eStep.env.UI_EVIDENCE_DIR.startsWith('${{ runner.temp }}/'), 'Phase 1 evidence must use temporary storage');
  const uiStep = ci.jobs.ui.steps.find((step) => step.run === 'pnpm test:ui');
  const installBrowser = ci.jobs.ui.steps.find((step) => step.run?.includes('playwright install'));
  assert.ok(uiStep.env.UI_EVIDENCE_DIR.startsWith('${{ runner.temp }}/'), 'Browser evidence must use temporary storage');
  assert.equal(uiStep.env.PLAYWRIGHT_BROWSERS_PATH, installBrowser.env.PLAYWRIGHT_BROWSERS_PATH, 'Browser install/test paths must match');
  assert.equal(e2eStep.env.PLAYWRIGHT_BROWSERS_PATH, installBrowser.env.PLAYWRIGHT_BROWSERS_PATH, 'Phase 1 browser install/test paths must match');
  for (const branch of ['dev', 'main', 'feat/uni-*', 'fix/uni-*', 'chore/uni-*', 'test/uni-*', 'docs/uni-*']) assert.ok(ci.on.push.branches.includes(branch), `Missing solo branch trigger: ${branch}`);
  for (const branch of ['dev', 'main']) assert.ok(ci.on.pull_request.branches.includes(branch), `Missing optional PR target: ${branch}`);
  assert.equal(ci.concurrency?.['cancel-in-progress'], true, 'Superseded runs must be cancellable');
  const compose = parseYaml(await read('infra/compose.yaml'), 'compose');
  assert.ok(compose.services['db-test'].tmpfs.includes('/var/lib/postgresql/data'), 'Test DB must remain tmpfs');
  assert.ok(!compose.services['db-test'].volumes?.length, 'Test DB cannot mount persistent storage');
  for (const name of ['uni-task.md', 'bug-report.md']) {
    const content = await read(`.github/ISSUE_TEMPLATE/${name}`);
    const match = content.match(/^---\n([\s\S]+?)\n---\n/);
    assert.ok(match, `${name}: YAML frontmatter required`);
    const metadata = parseYaml(match[1], name);
    for (const key of ['name', 'about', 'title']) assert.ok(typeof metadata[key] === 'string' && metadata[key].trim(), `${name}: ${key} required`);
    assert.ok(content.includes('human') && content.includes('git merge --ff-only') && content.includes('dev'), `${name}: human workflow missing`);
  }
  assert.equal(parseYaml(await read('.github/ISSUE_TEMPLATE/config.yml'), 'issue config').blank_issues_enabled, true);
  const pr = await read('.github/pull_request_template.md');
  for (const term of ['UNI-', 'NOT RUN', 'remote CI', 'git merge --ff-only', 'dev', 'privacy', 'human']) assert.ok(pr.toLowerCase().includes(term.toLowerCase()), `PR template missing ${term}`);
  const manifest = JSON.parse(await read('package.json'));
  assert.equal(manifest.scripts['test:e2e'], 'node scripts/test-phase-one.mjs', 'Phase 1 E2E must use the owned isolated runner');
  assert.match(manifest.packageManager, /^pnpm@\d+\.\d+\.\d+$/, 'Exact pnpm version required');
  console.log(`PASS: ${workflows.length} workflow(s), quality/security policy, isolated Compose test storage and issue/PR metadata`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkRepository().catch((error) => {console.error(error.message); process.exitCode = 1;});
}
