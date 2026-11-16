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

## Verified integration

- [ ] Feature/fix/docs/chore/test PR base is dev; main/release/deployment remain subject to human approval.
- [ ] The authorized agent reviews relevant staged changes and integrates only after exact-commit issue CI passes, using git merge --ff-only into dev; push dev and confirm its CI too. No merge commit or merge-button substitute.
- [ ] No secrets, local .env credentials or real private data are committed. CI jobs retain read-only permissions and do not perform integration/deployment.
- [ ] Progress/evidence and pending manual checks are accurate. Continue to the next roadmap issue only after verified dev CI; stop for inaccessible checks or necessary human input.
