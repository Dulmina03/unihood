# AGENTS.md — UniHood coding-agent operating rules

This file controls how AI coding assistants work in **this repository**. For full product requirements and acceptance tests, read `UniHood_MASTER_PROJECT_SPECIFICATION.md` (v3.0). Never silently replace its agreed requirements.

## Starting point — read before changing files

1. Inspect read-only `git status --short --branch`, `git branch -vv`, `git remote -v`, repository tree, package manifests, `docs/progress/CURRENT_STATUS.md` if it exists.
2. Read the specification Sections 0, 4–11, 13 and 18. Determine the first incomplete `UNI-###` task. The current reported task is **UNI-001**, branch **`chore/uni-001-workspace-bootstrap`**, but verify the actual branch before writing.
3. Treat the current repo as existing. **NEVER run git init**, recreate the repo, overwrite existing work or assume the remote is correct. Current reported GitHub remote: `https://github.com/Dulmina03/unihood.git`.
4. The project uses `main` for stable releases and `dev` for integration, with `feature/chore/fix/test/docs` branches merging by human PR into `dev`, then releases merging into `main`.

## Human-only Git — absolute rule

You MUST NOT run `git switch`, `checkout`, `branch`, `init`, `add`, `commit`, `push`, `pull`, `fetch`, `merge`, `rebase`, `reset`, `tag`, or PR create/merge actions. Read-only Git commands are permitted. The human alone creates/switches branches, stages files, commits, pushes, opens and merges pull requests. If a new branch is required, print exact commands and **stop** until verified. Do not unnecessarily request a new branch when already on the correct issue branch.

At the completion of each issue, after implementing and testing, print:

```
GIT CHECKPOINT — HUMAN ACTION REQUIRED
Issue: UNI-###
Current verified branch: <name>
Changes: <paths and summary>
Tests: <actual commands, PASS/FAIL/NOT RUN>
Staging suggestion: git add <explicit paths>
Commit suggestion: git commit -m "type(scope): description"
Push suggestion: git push -u origin <current-branch>
PR base: dev
Follow-up: after human merge, switch/create next issue branch manually.
```

Stop at that handoff. Do not continue to the next issue automatically. A single initial Codex request can drive one complete issue; it cannot bypass required human Git actions or guarantee continuous background development.

## Implementation protocol

- Stay within the issue scope; use the five-module ownership and sequential phase plan in the specification.
- Scaffold and install compatible development dependencies yourself *when your available environment permits*, then run lint, typecheck, tests and build. Never claim passing checks that were not executed.
- **UNI-001:** Follow detailed §9.7 bootstrap recipe. `pnpm` is not installed on the user's Ubuntu machine as of the last terminal output. Check Node/npm/Corepack versions, install compatible pnpm using a safe user-level method, create workspace and scripts, scaffold Next.js/NestJS, add PostgreSQL/PostGIS infrastructure, then test. Do not run `pnpm lint` until script exists.
- Make reasonable engineering choices without repeated clarification. Record them in `docs/decisions/` or `docs/architecture/stack.md`. Ask only for genuine blocker/approval, paid-service or sensitive security/privacy choices.
- Before final registration phase, implement identity/authorization interfaces and local-test-only actor adapters. **Never enable unauthenticated protected writes** in staging/production. Keep owner location private by default and test for leakage.
- Students may create **community boarding recommendations only in the advertisement experience**, never exact boarding map pins. Only verified authorized owners publish exact boarding map listings and owner-official fees/vacancies. Community members can propose public POIs with duplicate checks. No routine admin dashboard.
- UI direction: **Editorial Explorer + Urban Map**, approved **Campus Teal**. Use `docs/design/references/` for provided design assets. Keep mobile-first, accessible, and simple owner flows. Sample prices/places are clearly synthetic.
- Registration methods and owner proof policy are **intentionally deferred until the last feature phase**. Don't decide or implement them early.
- Update `docs/progress/PHASE-XX.md` and `docs/progress/CURRENT_STATUS.md` at each issue close, with exact verification, caveats and next checkpoint.

## First task

Resume **UNI-001 — workspace bootstrap** on the user's already-created branch if read-only Git inspection verifies it. If it does not, display branch instructions for the human and stop. Finish the entire issue and its tests, then stop at the Git handoff. Do not begin UNI-002 until the human finishes the PR/branch checkpoint.
