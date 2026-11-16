# Contributing to UniHood

Read [AGENTS.md](AGENTS.md), [the specification](UniHood_MASTER_PROJECT_SPECIFICATION.md), [the five ADRs](docs/decisions/README.md), [current status](docs/progress/CURRENT_STATUS.md) and [CI requirements](docs/contributing/ci.md). The human explicitly authorizes routine agent Git operations and sequential roadmap implementation starting at UNI-020. This replaces earlier human-only Git/mandatory checkpoint wording; product/privacy requirements are unchanged.

## One issue, one branch

Begin with a clean working tree, verify origin, fetch and synchronize dev by fast-forward only. Preserve unrelated work. Create an appropriately named branch for the exact next specification issue; never change main. For example:

```sh
git status --short --branch
git remote -v
git fetch origin
git switch dev
git pull --ff-only origin dev
git switch -c feat/uni-020-place-geography
```

Implement only that issue. Follow [coding conventions](docs/contributing/coding-conventions.md) and [synthetic fixture guidelines](docs/contributing/synthetic-fixtures.md). Run appropriate local lint/typecheck/tests/build/browser/isolated database checks; fix failures, review the full diff, stage only explicit relevant paths and review the staged diff. Never commit local .env credentials, secrets, real private data, raw sensitive logs or generated output. Use conventional commit messages. Branch prefixes are feat/fix/chore/test/docs with uni-### issue names.

## Remote CI is required

Commit and push the issue branch. Push triggers applicable Actions; optional PRs target dev. Observe the exact full tested commit and issue-branch run URL/status/job results; all required checks must succeed. A workflow existing, triggering, pending, skipped, cancelled or an older green commit is not proof. If remote checks cannot be observed, stop with the blocker/next action. No CI gate, failure assertion or privacy boundary may be bypassed to obtain green results.

## Fast-forward-only integration

After local checks, diff review and exact-commit issue CI pass, use a clean tree and recheck remote dev:

```sh
git fetch origin
git switch dev
git pull --ff-only origin dev
git merge --ff-only feat/uni-020-place-geography
git push origin dev
```

Verify the exact-commit **dev** run too before continuing. No merge commits or merge/squash/rebase buttons substitute for this workflow. On divergence, inspect it; do not force-push, reset or rewrite shared history. Stop for conflicts that cannot safely be resolved. No auto-merge bot, branch deletion or repository protection change is introduced. CI jobs remain read-only and never commit, push or deploy; the authorized agent performs local integration.

## Progress and autonomous continuation

Record features, exact local commands/results, exclusions, tested full SHA, branch/run URLs, required job conclusions and integration status in CURRENT_STATUS/PHASE-XX and issue verification. Do not invent future CI results. Evidence follow-up commits are subject to the same exact-commit CI process. Give a short completed-issue report and proceed directly to the next specification issue after dev CI passes, without routine Git approval.

Only stop for real product/policy/privacy/ownership decisions, real-world data/service consent, unavailable credentials/permissions, manual checks that cannot reliably be automated, destructive actions/deployment/releases, persistent unsafe failures/conflicts, or unobservable remote CI. Keep pending manual checks visible; remaining Phase 1 accessibility confirmations are deferred to [Phase 6](docs/progress/PHASE-06.md), never marked PASS without verification. Physical/mobile AT certification is not inferred from browser emulation. Registration decisions remain in Phase 7.

Do not modify main, create release tags, publish deployments or delete important data without explicit human approval. No claim of ongoing background work after the active session ends.
