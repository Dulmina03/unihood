## Issue and outcome

UNI-### / issue link:
Describe the concrete problem and resulting behavior. A PR is an optional review vehicle in the solo workflow.

## Scope and requirements

Owned paths/modules, specification/ADR references, excluded work and shared contract impact:

## Verification and evidence

Exact commands with PASS/FAIL/NOT RUN; distinguish local runs from remote CI URLs/results. Include applicable 390×844 / 1440×900 UI evidence, migration/rollback notes, OpenAPI changes and limitations. Mark nonapplicable checks with a reason. Do not include private logs, credentials or real identity/location evidence.

## Privacy and self-review

- [ ] Community boarding recommendations remain advertisement-only; official fields and exact pins require property authorization/consent.
- [ ] Public payloads, metadata, media, caches, errors and logs do not leak private data.
- [ ] Fixtures are synthetic/labeled; development actors remain local/test-only; no final authentication policy is introduced early.
- [ ] Relevant checks passed and progress documentation records actual results/caveats.
- [ ] I reviewed the human-visible changes and migration/contract impact, or recorded why not applicable.

## Human integration

- [ ] Feature/fix/docs/chore/test PR base is dev; main is reserved for stable releases.
- [ ] The human performs all Git operations and integrates the verified issue branch with git merge --ff-only into dev, then pushes dev. No merge commit, squash or rebase merge substitutes for this workflow.
- [ ] This PR does not authorize an assistant or CI bot to commit, push, merge, publish or deploy. Do not use a merge button that changes the required history.
- [ ] Stop at the issue checkpoint; the next issue needs its own human-prepared branch.
