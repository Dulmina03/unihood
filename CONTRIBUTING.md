# Contributing to UniHood

Read [AGENTS.md](AGENTS.md), the [master specification](UniHood_MASTER_PROJECT_SPECIFICATION.md), [product ADRs](docs/decisions/README.md) and [current status](docs/progress/CURRENT_STATUS.md) before work. Keep one UNI issue within its module scope; record contract/migration impacts before cross-module edits. The user's solo Git clarification takes precedence over older mandatory-PR wording or the sample template's main target in the specification. Feature work targets dev; main is reserved for stable releases.

## One issue, one human-prepared branch

The human performs **all Git operations**, including branch creation/switching, staging, commit, push, integration and releases. Assistants may provide commands and read plain repository metadata when permitted; they must not execute Git commands in this project. CI checks source in isolated runners but never commits, pushes, merges, creates PRs or deploys. A PR is optional and is a review record, not a different integration method.

The following commands are **human-only examples**. First inspect existing work/remotes and ensure dev is the intended integration branch; do not overwrite uncommitted work. Only pull origin/dev when that remote branch exists and its identity is verified.

```sh
git status --short --branch
git remote -v
git switch dev
git pull --ff-only origin dev
git switch -c chore/uni-006-ci
```

Use the branch/commit names in the relevant UNI issue, not UNI-006 for unrelated work. Supported issue prefixes are feat, fix, chore, test and docs. Conventional commits describe the resulting change, such as `chore(ci): add quality gates and PR template`. The [issue template](.github/ISSUE_TEMPLATE/uni-task.md) captures scope, dependencies, paths, acceptance, privacy and evidence.

## Verify and hand off

Install the pinned Node/pnpm toolchain and run [the quality gates](docs/contributing/ci.md). Follow [coding conventions](docs/contributing/coding-conventions.md) and [synthetic fixture rules](docs/contributing/synthetic-fixtures.md). Report actual PASS/FAIL/NOT RUN, including local versus remote evidence; do not treat a configured workflow as a successful GitHub Actions run. Update the issue's PHASE-XX entry and CURRENT_STATUS, then stop at its human Git checkpoint. Do not continue to the next issue automatically.

The human reviews the actual changes, stages explicit issue paths, commits and pushes the issue branch. Optional PRs use [the PR template](.github/pull_request_template.md) with dev as base. Issue-branch pushes run CI even without a PR; pushes to dev/main and PRs into dev/main also run it. Verify the newest applicable commit/run, not an older green result. Manual dispatch is available after the workflow exists remotely. This guide does not dispatch a workflow or claim remote success.

## Fast-forward-only integration

After local verification and review of available remote CI, the human integrates the exact reviewed branch. These are **human-only commands**, run with a clean working tree and the appropriate issue name:

```sh
git switch dev
git pull --ff-only origin dev
git merge --ff-only chore/uni-006-ci
git push origin dev
```

No merge commits are created. If fast-forward fails, stop and inspect the divergence; do not replace it with a normal merge, squash, reset, force-push or an assistant-run rebase. The human resolves branch preparation separately, reruns affected checks on the resulting commit, and retries the fast-forward. Do not claim integration while the command has failed.

GitHub's merge/squash/rebase buttons are not substitutes for this local fast-forward workflow. An optional PR can be closed/updated by the human after integration if GitHub does not detect it automatically. No auto-merge bot is introduced. Main receives stable releases only through a separate human-reviewed release process; this issue neither implements releases nor authorizes a deployment. Do not delete issue branches automatically.

After the human confirms integration, prepare a fresh branch from current dev for the next specified issue. The assistant stops at each checkpoint. The human remains responsible for remote branch/ruleset settings and checking Actions results; no repository setting is changed by these files.
