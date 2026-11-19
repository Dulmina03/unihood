# UNI-046 verification — Contact / Request Location UI for owner ads

Verified base: clean `dev` `8564852664d822e63ec21779eccc64fe9bdc6975`. Worktree `/home/dulmina/Projects/unihood-uni-046`, branch `feat/uni-046-contact-location-requests`.

## Implemented

- Strict contracts in `packages/contracts/src/boarding-request.ts`: two explicit kinds, synthetic acknowledgement, pending receipt and requester status view. No private owner/contact/coordinate fields exist in the schemas.
- Migration `019_boarding_requests` stores only actor reference, boarding id, kind, request key, payload hash, fixed pending status, synthetic marker and timestamps in `unihood_private`; public grants are revoked and populated rollback refuses.
- Protected API `POST /api/v1/boarding-requests` and actor-scoped `GET /api/v1/boarding-requests/{requestId}`. Eligibility rereads current curated public projections; only owner official advertisements are eligible, and location requests are refused for already-public maps (outside this private-detail feed).
- Owner-advertisement UI adds Contact owner and Request location interactions, a responsive dialog, simulation disclosure, acknowledgement, loading/error/retry, duplicate messaging, private-free receipt, pending status check and focus restoration. Community advertisements show no request actions.
- No owner phone/email, coordinates, directions, fees, vacancies, visibility or publication is exposed or modified. `ownerNotified` and `locationDisclosed` are always false.

## Local verification (actual)

- Lint, typecheck, production build, `check:repo` and `check:workflows`: PASS.
- Contracts: 135 tests PASS (4 new boarding-request contract tests).
- API: 252 tests PASS (5 new service tests, 5 new HTTP boundary tests) in 31 suites.
- Web/component: 222 tests PASS in 37 files (4 new UI tests).
- Root runner tests: 13 PASS.
- Browser acceptance: 130 PASS (2 new UNI-046 viewport cases, desktop/mobile). Four new axe reports have zero violations.
- Evidence: `boarding-request-actions-*.png` and `boarding-request-receipt-*.png` plus matching `-axe.json` files in this directory.

## Not run locally

- Isolated Docker/PostGIS `pnpm db:test`, including the new `test-boarding-requests` group, was **NOT RUN** locally (no Docker daemon, no `.env`). Remote CI is required and the new test is registered in `scripts/test-database.mjs`.
- Human visual and assistive-technology checks were **NOT RUN**. Automated axe and keyboard focus checks are not a substitute for a human review.
- No real messaging, owner notification, contact delivery or location disclosure was tested because none is implemented.

## Remote CI (actual)

Feature commit `a7ee35c0f3fb3dbddfb827d0ef0e53c40a49be2f` on `feat/uni-046-contact-location-requests` passed [feature run 44469814443](https://github.com/Dulmina03/unihood/actions/runs/44469814443), all required jobs SUCCESS:

- Workspace quality — job 135376255703
- Isolated PostGIS integration — job 135376255153 (includes `test-boarding-requests`)
- Component browser acceptance — job 135376255512

Earlier feature runs (`44460860103`, `44466975395`, `44468662816`) failed only on database migration-order expectations while adding `019_boarding_requests` and are retained honestly. They were fixed by rolling back the empty request schema before populated-history refusal and by updating the CLI rollback assertion.
