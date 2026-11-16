# UNI-004 documentation verification

Recorded: 16 November 2026 (Asia/Colombo). Branch metadata: `docs/uni-004-product-decisions`, read from `.git/HEAD` without a Git command. UNI-003 merge into `dev` is explicitly human-confirmed, not independently audited. This issue records already agreed policy; it does not implement the future behaviors described by ADR validation obligations.

## Actual results

- `python3 /tmp/unihood-004-verify.py`: **PASS**, 11 Markdown files; 86 local file/heading links, including 41 specification references. Five ADRs have unique sequential IDs, consistent status/issue metadata, context, decision, rationale/alternatives, consequences, privacy/security boundaries, deferred questions, validation obligations and specification references. Newline/trailing-whitespace and unresolved-placeholder checks pass. Coverage probes check key policy terms; they are presence checks, not semantic proof. The read-only temporary checker and its pre-edit manifest remain in `/tmp` for this session; no runtime/test tooling was added to the repository.
- Documentation-only scope comparison: **PASS**. SHA-256 comparison against 97 pre-edit repository files shows exactly 11 changed/new documentation paths, no deleted existing files and no runtime/configuration/dependency/specification/AGENTS change. Dependency/output/Git directories and existing ignored `.tsbuildinfo` compiler caches are excluded. Build/typecheck naturally refresh ignored generated artifacts; they are not source edits.
- `pnpm lint`: **PASS**, zero warnings. ESLint checks existing code; the separate documentation checker validates Markdown links/structure.
- `pnpm typecheck`: **PASS**, contracts/UI/API/web.
- `pnpm test`: **PASS**, **23 existing tests**: Node database tooling 3, contracts 3, API 7, web 10. Existing Jest VM-module experimental warning remains. No new test is warranted for prose-only changes, and passing existing tests is not evidence that future owner/claim/support domain workflows are implemented.
- `pnpm build`: **PASS**, contracts/API/web production build, including existing static `/`, `/design-system` and not-found routes.

HTTP tests/build used elevated local execution where required by sandbox socket/process restrictions; no socket/security setting was weakened. No Git command, manual database operation, dependency installation or runtime/auth implementation was performed for this issue. No external service integration was introduced.

The initial scope scan included a refreshed `.tsbuildinfo` cache; the checker was corrected to exclude compiler output already ignored by the repository. A coverage probe also prompted explicitly naming `X-User-Id`/`X-Role` in ADR-0005's already-stated prohibition on trusting public actor headers. Links/anchors resolved without disabling a validation rule.

## Manual consistency review

The ADRs were compared against specification §§0.2–0.4, 2.1–2.4, 3.3–3.9, 5.1–5.5, 6.1–6.5, 7.3/7.5, 8.6–8.8, Phase 0/6/7/8 ordering, §11, §13.2–13.4 and §14.1/14.3–14.4:

- Three owner visibility modes retain canonical identity. HIDDEN defaults to no locality; only a separately explicitly authorized generic city is an allowed exception. AREA_ONLY is not a blurred residential pin. PUBLIC_MAP requires property authorization and explicit consent; revocation includes public derivatives/index/cache removal and warns about unretractable third-party copies.
- Community boarding recommendations remain advertisements only: no exact pins, official fees/vacancy, forged verification or private contacts. Public POI proposals are a distinct permitted path. Claim/recommendation reuse preserves attribution and canonical identity; shared buildings/contacts do not imply one property or owner.
- Owner authority is server-enforced per target and action, not a global role, UI badge or OTP. Official source, ownership, vacancy freshness and visibility are separate. Private evidence is not public listing content, and redacted audit history is not permission to retain secrets in ordinary logs.
- Automation validates low-risk submissions but holds sensitive cases. Independent confirmations are not simple majority ownership proof. Restricted, audited exceptional escalation, privacy suppression, appeals and reversible merges preserve operator responsibility without routine admins or automatic ownership transfer.
- Registration/provider/proof/session/recovery choices remain open until Phase 7. The older §3.9 Phase 8 reference and closing v2.0 label are documented as source inconsistencies against explicit Phase 7/v3.0 text, without editing the specification. Public reads remain open; local/test actors cannot enable deployed protected writes. UNI-005 implementation is not started by recording its future boundary.
- Public DTOs/client props, map features, media EXIF, metadata/SEO/share/QR links, errors/logs/analytics, cache keys, sorting/proximity and route responses are included in privacy obligations. UNI-003's UI helper is acknowledged as presentation defense, not a server serializer or authorization check.
- README/index/stack navigation is connected; phase/current status records the human-confirmed UNI-003 merge and UNI-004 pending checkpoint. Older issue verification is retained as history, not newly executed evidence. Solo Git integration is human-only, fast-forward-only into dev, optional PR, no merge commits, main stable releases only.

## Not run and remaining boundary

`pnpm test:ui`, `pnpm test:e2e`, Docker migration/rollback/integration, screenshots and remote CI: **NOT RUN for UNI-004**. No UI/runtime/schema/dependencies changed; prior issue evidence is historical. Full product E2E remains UNI-015's explicit placeholder. No new provider, registration or legal policy was selected; no human policy review, launch approval, auth readiness or production security certification is claimed.

The human must review/stage/commit/push and integrate UNI-004. No automatic continuation into UNI-005 is authorized by this handoff. See [decision index](../../decisions/README.md), [Phase 0 entry](../../progress/PHASE-00.md#uni-004--product-decision-records) and [current status](../../progress/CURRENT_STATUS.md).
