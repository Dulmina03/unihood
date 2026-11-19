# UNI-047 verification — multi-contributor, multi-owner and false-claim regressions

Verified base: clean `dev` `05dffcef465b1bab185a868a5c910b2deb490e3c`. Worktree `/home/dulmina/Projects/unihood-uni-047`, branch `feat/uni-047-multi-contributor-owner-regressions`.

## Implemented

- Added the guarded local/test fixture `contributor-b` and the second owner fixture `owner-b`, which holds the full owner permission set only on `SYNTHETIC_SECOND_OWNER_PROPERTY` (`71000000-0000-4000-8000-000000000002`). Existing owner/contributor surfaces are unchanged.
- Extended the synthetic report actor allowlist with `synthetic:contributor-b`; report authorization still comes from server-side issuance, not headers or body fields.
- Added `apps/api/test/uni-047-regressions.spec.ts`: disjoint owner-a/owner-b capabilities, spoofed actor/member refusal, independent contributor capability separation, production fail-closed fixtures and strict contribution schemas rejecting owner identity, actor overrides, votes, publication state and exact-location extras.
- Added `scripts/lib/test-role-boundaries.mjs` and registered it in `scripts/test-database.mjs`: full fixture seed; contributing reviews from two actors (consistent, contradictory and replayed) remain held and actor-scoped; reports from both actors stay private and non-publishing; owners can modify only their own contact/privacy/map authority; cross-property and spoofed false-claim attempts fail before private state; student price/vacancy/visibility/publication authority is denied; UNI-046 requests remain mock-only with no notification or location disclosure; a private coordinate/contact canary never reaches public, history or request payloads; no `AUTO_PUBLISH`; all created rows are removed.
- Added `apps/web/browser-tests/role-boundaries.spec.ts`: owner-public advertisements expose only the request simulations, community advertisements expose no owner actions, no `/api/v1/owner` request is made from either visitor page, and no private coordinate/contact/actor data appears in the DOM or browser storage.

No migration, public authorization mechanism, owner transfer, admin dashboard or publication path was added.

## Local verification (actual)

- Lint, typecheck, production build, `check:repo` and `check:workflows`: PASS.
- Contracts: 135 tests PASS.
- API: 255 tests PASS in 32 suites (3 new UNI-047 unit tests).
- Web/component: 222 tests PASS in 37 files.
- Root runner tests: 13 PASS.
- Browser acceptance: 132 cases across mobile and desktop. The new UNI-047 case passed in both viewports; four new axe reports have zero violations. The full-suite run reported one unrelated pre-existing `explore.spec.ts` desktop focus timing failure; that exact test passed on an immediate isolated retry and was not changed or suppressed.
- Evidence: `owner-public-request-surface-*.png`, `community-recommendation-no-owner-actions-*.png` and matching `-axe.json` files in this directory.

## Not run locally

- Isolated Docker/PostGIS `pnpm db:test`, including the new `test-role-boundaries` group, was **NOT RUN** locally (no Docker daemon, no `.env`). The new group is registered in `scripts/test-database.mjs` and remote CI is required to execute it.
- Human visual and assistive-technology checks were **NOT RUN**. Automated axe, keyboard and responsive-width checks are not a substitute for human review.
- No real contributor, owner, identity-provider, notification or final claim-authorization flow exists; this issue adds regression evidence only.

## Remote CI (in progress)

First feature run [44491567782](https://github.com/Dulmina03/unihood/actions/runs/44491567782) on `f3c82ef1ac1cd74378057b57c6d165e1cd942c0c` failed honestly: Workspace quality found an unused test helper after the fixture refactor, and Isolated PostGIS integration passed the new assertions but its cleanup deleted only standard fixture listings before `boarding_properties`, leaving the owner-demo listing referenced. Component browser acceptance passed all jobs. Both local defects were fixed by removing the helper and deleting listings by boarding id.

Second feature run [44495644513](https://github.com/Dulmina03/unihood/actions/runs/44495644513) on `9318cb2c8edc254d90cd30d00ae9e85baf8ccb1d` passed lint, tests/build and browser acceptance, but the database group's second-owner privacy assertion returned 404. The standard fixture is an ordinary UNI-031 seed and is not eligible for the owner-private surface; the test now labels property B as the closed synthetic owner fixture before exercising owner-b.

Third feature run [44497365408](https://github.com/Dulmina03/unihood/actions/runs/44497365408) on `54f5b3606700d8a421c5927306b2f6dda526c224` passed Workspace quality and Component browser acceptance, and the database group passed every new assertion, but cleanup still failed because the contact-update privacy event referenced the property. Cleanup now removes scoped privacy events before contacts/properties. Exact-commit results will be appended only after the replacement run passes.
