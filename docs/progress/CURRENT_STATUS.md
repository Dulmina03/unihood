# Current status

Updated: 16 November 2026 (Asia/Colombo).

- Current issue: **UNI-002 — reproducible PostGIS development/test foundation**, M5 + M2.
- Branch confirmed from the `.git/HEAD` file: `chore/uni-002-postgis-dev`. No Git commands were performed; integration/remote history was not checked.
- Status: **implemented and verified locally; awaiting human Git checkpoint**. UNI-001 verification is recorded historically in PHASE-00.md; user requested continuation on the new issue branch.
- Delivered: pinned existing PostGIS image; preserved development volume; separate tmpfs test service; ordered checksummed transactional migration runner that adopts UNI-001 extension ownership; guarded idempotent synthetic seeds; strict bounded database readiness; unit/HTTP/Docker integration tests; CI database job and push triggers.
- Verified: frozen install, lint, typecheck, **14 tests**, build; development and manual test CLI migration/seed/rollback/re-migration; seven Docker integration result groups; four legacy extension test groups; fresh test storage and persistent development restart. All six original extension versions, 37 original table row counts and the existing ownership flag survived. See [PHASE-00.md](PHASE-00.md) for commands/results and [database strategy](../architecture/database.md) for recovery.
- Development database is left migrated with its original extensions/data and one explicitly synthetic infrastructure fixture. Manual and automatic test containers are disposable; smoke child APIs are stopped.
- No cascade, persistent volume deletion, production seed, public write route or registration/provider policy was introduced. Browser E2E remains unconfigured (UNI-015); remote CI has not been executed here.
- Human workflow: review/stage/commit on the issue branch, then integrate into dev with **git merge --ff-only**. PR optional; no merge commits. Main is reserved for stable releases. All Git operations belong to the human.
- **Stop before UNI-003** (`feat/uni-003-campus-teal-design-system`) until human integration and branch preparation are complete.
