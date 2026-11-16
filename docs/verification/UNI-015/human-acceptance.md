# UNI-015 human acceptance and closure review

Recorded 16 November 2026 (Asia/Colombo), from explicit human statements in this conversation. This is a human-reported evidence record, not an independently observed CI run or a new automated/manual test performed by the agent. Closure branch verified by plain `.git/HEAD`: `docs/uni-015-phase-1-closure`. No Git operations performed.

## Human-confirmed integration and CI

The human confirms UNI-015 was committed and merged into `dev`. GitHub Actions **run #16 SUCCESS**, short tested commit **432e83c**:

- Workspace quality: **PASS**, human-confirmed.
- Isolated PostGIS integration: **PASS**, human-confirmed.
- Component browser acceptance: **PASS**, human-confirmed.

No run URL, full commit SHA, run timestamp, raw logs, per-command counts or exact workflow revision were provided. None are invented; run #16 is not treated as a numeric Actions run ID for constructing a URL. No independent Git/remote audit, new workflow dispatch or claim that this documentation branch was tested remotely. Commit/merge is confirmed; a separate UNI-015 push statement or integration method is not inferred. Human-only Git, optional PRs and `git merge --ff-only` integration remain the workflow.

This supersedes UNI-015's original pending human implementation checkpoint and remote NOT OBSERVED status, not its historical test results. UNI-013's own remote CI remains **NOT OBSERVED**; another issue's green run does not establish it. Historical failed runs #7/#8/#9 remain failures. UNI-014's separate run #14 SUCCESS at short commit 9eefe89 remains unchanged.

## Human visual and live-provider observations

The human explicitly approved **UI-01 landing** and **UI-03 Map Explorer**, each on **desktop and mobile**. The configured **live OpenFreeMap** experience was reviewed with explicitly synthetic university and entrance fixtures. These approvals supersede the original NOT SUPPLIED visual gates.

Exact human review dates, viewport dimensions, device/browser versions and screenshot artifacts were not supplied. Existing agent-reviewed 390×844 / 1440×900 screenshots, tablet 768px checks and 320px overflow tests remain separately documented automated/agent evidence; their dimensions are not attributed to the human. No new screenshot capture or visual approval is invented for this documentation task.

The fixtures are fictional public university/campus/entrance examples near (0,0), not verified real campus geography. Ocean around those coordinates is expected, not a substitute for real campus data. Live map review is distinct from the existing automated tests' intercepted synthetic MapLibre style resources. It proves neither broad provider coverage/SLA nor a real-data pilot. Campus Teal, licensed photo provenance, attribution and the five ADR/privacy boundaries are unchanged. No live boarding inventory, owner claims, private boarding pins, distances or routes are implied.

## Human Orca smoke observations

The human reports manual use of **Orca with Chrome on Ubuntu**, with the following working:

- Landing Page keyboard navigation and control announcements.
- University selection.
- Map Explorer selectors and Map/List toggle.
- Entrance selection and Save action.
- Saved Favourites navigation.

These specific observations are **PASS — human-reported**, not agent-observed speech or automated assertions. Actual Orca/Chrome/Ubuntu versions, test date, exact spoken phrases, input mode and responsive/mobile-AT setup were not supplied. Versions from the earlier agent attempt must not be assigned to this later human test. No new failure was reported; missing confirmation is not a diagnosed defect.

The earlier agent Orca attempt remains **PARTIAL / INCOMPLETE**, with its original sanitized JSON unchanged. The later successful human core smoke is a separate observation, not a retroactive pass for that attempt or full WCAG certification.

## Remaining documented checklist evidence

The [existing manual checklist](../../testing/phase-1-acceptance.md#real-screen-reader-smoke--human-gate) asks for step-by-step evidence beyond the reported core smoke. The following are **NOT CONFIRMED**, rather than assumed failed or assumed not performed:

1. QR title/landmark/headings and Skip to content activation, main focus and reading order under Orca (general landing keyboard navigation was reported working).
2. Dependent campus/entrance reset and selection-status announcements (selectors and selection were reported working).
3. Entrance preview/provenance reading; filters/category navigation; equivalent list selection and focus-trap/obscured-marker checks under Orca (Map/List and entrance selection were reported working).
4. Responsive bottom-sheet expand/collapse, visible focus and unobscured controls under the assistive-technology setup; identify responsive desktop emulation versus actual mobile AT. Visual mobile approval alone does not confirm these AT checks. A physical mobile screen reader is not being added as a requirement.
5. Unsave; save pressed-state announcement; Saved reload/reopen persistence; removal and focus return to Saved places (Save and Saved navigation were reported working).
6. Share dialog title/reading order/containment; Escape close and focus restoration; Copy and manual clipboard fallback.
7. Loading/empty/error announcements, directory/map retry and list fallback, including recovery focus under Orca.
8. Actual manual test date, Orca/Chrome/Ubuntu versions and representative spoken observations/limitations. No raw desktop logs or sensitive content are required.

Automated keyboard/axe/fallback/storage assertions cover relevant behavior separately; they do not substitute for the outstanding manual confirmations. Run URL/full SHA are missing traceability attachments, not evidence of a failed job and not the reason Phase 1 remains open. UNI-013 remote evidence and local Turbopack EPERM remain historical limitations, not newly failed Phase 1 tests.

## Closure decision

**Phase 1: IN PROGRESS — closure pending the remaining manual screen-reader checklist evidence above.** The specification §10 Phase 1 functionality and UNI-015 automated journey/visual evidence are documented; human integration, current CI, core Orca smoke and both visual approvals are now confirmed. Because the repository's documented manual gate requires the additional step-level confirmations, all documented acceptance requirements cannot yet be marked satisfied. No broader feature work is requested or needed to record those results. Stop before Phase 2.

This documentation update does not rerun runtime lint/typecheck/unit/browser/build/Docker checks or change their historical outcomes. The local default Turbopack build remains historically **BLOCKED by socket EPERM**; the supported Webpack build passed separately. Current human CI success is recorded without converting that local failure to a pass. Documentation consistency and scope checks for this update are recorded in the human checkpoint response.


## Subsequent authorized scheduling/workflow change

The human now explicitly defers remaining Phase 1 accessibility checks to [Phase 6](../../progress/PHASE-06.md), allowing Phase 2 development starting UNI-020. All unconfirmed observations above remain DEFERRED / NOT CONFIRMED, never PASS; this is not a new screen-reader test or retroactive certification. Original closure decision and historical Git handoffs describe their time; current AGENTS.md replaces routine human-only Git with authorized agent one-issue branches, exact-commit issue/dev CI and fast-forward-only integration. No main/release/deployment approval is implied.
