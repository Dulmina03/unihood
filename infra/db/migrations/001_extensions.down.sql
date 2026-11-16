-- PostGIS/topology/Tiger and any pre-existing pg_trgm are retained prerequisites.
-- RESTRICT protects objects depending on a pg_trgm created by this migration.
-- On dependency failure PostgreSQL rolls back the whole transaction, including state.
BEGIN;
SET LOCAL lock_timeout = '10s';
SELECT pg_advisory_xact_lock(73201, 1);

DO $migration$
DECLARE
    created_pg_trgm boolean;
BEGIN
    IF to_regclass('unihood_migrations.bootstrap_extensions') IS NULL THEN
        RAISE NOTICE 'No bootstrap migration record; retaining all existing extensions';
        RETURN;
    END IF;

    SELECT owns_pg_trgm INTO created_pg_trgm
    FROM unihood_migrations.bootstrap_extensions
    WHERE migration_id = '001_extensions';

    IF NOT FOUND THEN
        RAISE NOTICE '001_extensions already rolled back; retaining all existing extensions';
        RETURN;
    END IF;

    IF created_pg_trgm THEN
        DROP EXTENSION IF EXISTS pg_trgm RESTRICT;
    ELSE
        RAISE NOTICE 'Retaining pg_trgm: it predates this migration record';
    END IF;

    DELETE FROM unihood_migrations.bootstrap_extensions
    WHERE migration_id = '001_extensions';
    -- Retain the bookkeeping schema/table so rollback never drops unrelated objects.
END
$migration$;
COMMIT;
