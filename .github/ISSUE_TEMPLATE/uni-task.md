---
name: UNI implementation task
about: One scoped UNI issue with dependencies, verification and a human Git checkpoint
title: "UNI-### — "
---

## Goal and ownership

Issue: UNI-###
Owner module: M#
Dependencies: UNI-### / none
Specification sections and ADRs:
Human-created branch: type/uni-###-description
Status: Not started / In progress / Tested / Awaiting human Git action / Merged

## Scope and paths

Describe the verifiable outcome, owned paths and any cross-module contract/migration review. List excluded work and deferred decisions.

## Implementation steps

1. Describe the first scoped change.
2. Add relevant verification and documentation.

## Acceptance criteria

- [ ] Concrete behavior and edge cases are specified.
- [ ] Privacy/permission boundaries and failure behavior are specified.
- [ ] Expected tests and evidence are identified.

## Tests and evidence

Record exact commands and expected results. At close, replace expectations with actual PASS/FAIL/NOT RUN, local versus remote CI, limitations, and evidence links. UI changes need 390×844 and 1440×900 evidence; schema changes need reversible migration/rollback notes. Mark inapplicable checks with a reason.

## Privacy and role review

No private data in public DTOs, logs, screenshots, fixtures or errors. Community boarding contributions stay ad-only. Official fields and exact pins require property authority and consent. Synthetic actors are local/test only; final registration remains deferred. Do not post sensitive evidence in a public issue.

## Human Git checkpoint

One issue per branch; the human performs every Git operation. PR optional; feature integration target is dev using git merge --ff-only, no merge commit. Main is reserved for stable releases. Suggested commit: type(scope): description.

- [ ] Stop after verification/progress updates and hand off explicit staging/commit/push suggestions.
- [ ] The human completes integration before the next issue begins.
