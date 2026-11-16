# UNI-002 — reproducible database foundation

## Ownership and storage

The Compose development service keeps the original named volume and credentials. Its image is pinned to `postgis/postgis:17-3.5@sha256:01a6a70e41e6c4467c8f55f6063555ed72db2d6662cd0d571040d42eadaeb6f6`, the same verified build already used by UNI-001 (PostgreSQL 17.5, PostGIS 3.5.2). No database directory is reset or upgraded. The image initializes its spatial extensions only on empty storage; starting an existing volume does not rerun initialization.

`db-test` is an explicit Compose profile with tmpfs storage, a separate bridge and local test credentials. Its optional manual port is 5433, bound to 127.0.0.1. The bridge is not Docker-internal because this engine does not publish host ports on internal networks; it is separate from the development container network. Isolation of data is enforced by separate PostgreSQL clusters, users, URLs and mounts. Test data is intentionally disposable. The automatic suite creates a fresh one-off test container per run with a random loopback port and verifies both Docker configuration and the actual tmpfs mount before connecting. It never uses DATABASE_URL for test DDL.

## Ordered migrations

`infra/db/migrations/NNN_name.up.sql` and matching `.down.sql` files are paired, ordered, and assigned a SHA-256 covering both original file contents. Numbers must be unique; unpaired/unrecognized SQL files fail. Applied history must be an unchanged prefix of available versions, or the tool refuses to run. Applied migrations are immutable; add a new pair for future changes.

`scripts/lib/database.mjs` uses parameterized pg queries for ledger values and a single checked-out client per command. BEGIN, lock acquisition, DDL and ledger mutation share one transaction. All pending migrations apply atomically; rollback removes only the most recent version. A PostgreSQL failure rolls back DDL and bookkeeping together. The shared transaction advisory lock `(73201,1)` also serializes seeding and legacy bootstrap scripts. Lock timeout: 10 seconds; migration statement timeout: 30 seconds; connection timeout: 3 seconds. Long-running future migrations require an explicitly reviewed timeout change, rather than silent partial execution.

The runner rejects top-level transaction commands/psql commands in new migrations. It recognizes only UNI-001's existing outer BEGIN/COMMIT wrapper and strips that wrapper in memory. The files remain unchanged and still work with their original standalone regression harness. SQL files are trusted, reviewed repository code; the validation is an authoring guard, not an untrusted SQL sandbox.

`unihood_migrations.schema_migrations` is the new ordered ledger. If the legacy `bootstrap_extensions` record exists without the ordered ledger, the runner verifies its required extensions/state and adopts version 001 without rerunning ownership detection. Inconsistent extension/metadata state fails for inspection. PostGIS, topology, Tiger and pre-existing pg_trgm stay installed; rollback can remove only a pg_trgm owned by version 001, with RESTRICT. Both bookkeeping tables/schema remain after rollback. No cascade or volume deletion is part of tooling.

Only version 001 is needed for the current infrastructure. Integration tests use isolated synthetic versions 002/003 to prove ordering, atomic failure, checksum drift and reverse-order rollback; product university/place schemas remain in their scheduled issues.

## Synthetic seeds

`infra/db/seeds/synthetic.json` contains a fixed UUID, an explicit Synthetic label and the infrastructure test coordinate (0,0), not a Sri Lankan listing. Seed tooling creates `unihood_fixtures.samples` separately from product schemas and requires local/test APP_ENV, non-production NODE_ENV and a loopback database. It requires all current ordered migrations and exact checksums before seeding. UNI-010 additionally seeds the [university/campus/gate graph](../api/universities.md) in the same guarded transaction. Idempotent insert plus verification rejects conflicts instead of overwriting local edits. Fixtures remain after extension rollback, so there is no destructive down migration for their data. No API publishes these samples.

`DATABASE_URL` is the explicit development target; `TEST_DATABASE_URL` is the explicit manual test target. A missing URL never falls back to libpq defaults or another environment. Test CLI mode compares normalized host/port/database targets, including localhost aliases, to refuse accidental use of development. An administrator can still misconfigure a tunnel or name a production database local; these local tools are not production migration/seed policy.

## API checks

`GET /health` and `/api/v1/health` are process liveness. `/health/ready` and `/api/v1/health/ready` are database readiness. The latter checks connectivity, PostGIS, pg_trgm, bootstrap ownership, ordered records 001/002 and the three university tables; responds with 200/ready or 503/not_ready and no-store. Missing configuration, missing migration, authentication/connectivity errors and query timeouts all produce the same strict public unavailable response. No database URL, raw SQL error or data is included.

The lazily connected pg pool has at most two clients, a 1-second connection/server-statement timeout and a 1.5-second client query timeout. Idle errors are handled without dumping connection information. Shutdown closes the pool. DB loss never turns process liveness into failure. Future API migrations must extend the expected readiness baseline as their features are added; this check does not replace the CLI's checksum/history validation. No write routes, auth provider or owner registration decisions are introduced.

## Verification and recovery

Use README commands for development, manual tests and `pnpm db:test`. The automatic suite checks unmigrated readiness, concurrent migrations, all-or-nothing failed batches, checksum mismatch, latest-only rollback, repeated seeds, conflict/production guards, spatial data, extension ownership/adoption, dependency-blocked rollback, actual paused-database timeouts and recovery. It builds on the already-built API, uses a random port and cleans up its child API/container in finally. CLI/parser tests run with `pnpm test`; full database tests require Docker. The original UNI-001 extension suite remains under `pnpm db:test:extensions`.

For a dependent extension rollback error, roll back the dependent application migration first. For checksum/history drift, restore the reviewed applied SQL or investigate a forward migration; never edit ledger checksums/ownership flags to bypass validation. For seed conflict, inspect the local synthetic fixture; tooling preserves it rather than resetting it. Docker-unavailable errors require daemon/context repair, not data removal. Do not use a volume reset to fix a failed migration.

CI adds an isolated Docker test job and runs on dev/main pushes as well as optional PRs/manual dispatch, supporting human fast-forward integration. No automatic deployment, Git operations, production data or secrets are required. Remote CI execution is not implied by local results.

## References

[pg transactions](https://node-postgres.com/features/transactions) require the same client for all transaction statements. [PostgreSQL advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html) provide transaction-scoped serialization. pg 8.23.1 and matching types were verified against the registry and locked during this issue. Raw parameterized pg was chosen over adding a query builder because this issue needs infrastructure/metadata queries only; later domain access can adopt Kysely without changing migration ownership.

## UNI-010 public university tables

Migration 002 adds universities → campuses → campus_entrances, canonical UUID FKs, unique bounded lower-case university slug, active/archived status, public provenance, restricted parent deletes, active-primary uniqueness and parent/spatial indexes. Geometry(Point,4326) uses explicit finite bounds/nonempty/validity checks, avoiding implicit geography coordinate normalization. No private residential data or auth table is included.

The down migration exclusively locks all three tables before checking emptiness, refuses any rows and drops empty tables with RESTRICT; a concurrent committed write or external dependency is preserved. Existing applied 001 files/ownership stay unchanged. Run a forward migration for a populated persistent database instead of forcing rollback. Only the isolated tmpfs regression prepares/removes its own test rows to prove empty rollback/re-migration. See [operation and source policy](../api/universities.md). University API pools have three clients, 1-second connection, 1.5-second statement and 2-second query deadlines, with redacted errors and shutdown cleanup.
