-- PostGIS is a retained infrastructure prerequisite, including on plain PostgreSQL.
-- Never infer ownership of extensions installed before this bookkeeping existed.
BEGIN;
SET LOCAL lock_timeout = '10s';
SELECT pg_advisory_xact_lock(73201, 1);

CREATE SCHEMA IF NOT EXISTS unihood_migrations;
CREATE TABLE IF NOT EXISTS unihood_migrations.bootstrap_extensions (
    migration_id text PRIMARY KEY,
    owns_pg_trgm boolean NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $migration$
DECLARE
    created_pg_trgm boolean;
BEGIN
    IF EXISTS (
        SELECT 1 FROM unihood_migrations.bootstrap_extensions
        WHERE migration_id = '001_extensions'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis')
           OR NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
            RAISE EXCEPTION '001_extensions is recorded but required extensions are missing; inspect database drift before retrying';
        END IF;
        RAISE NOTICE '001_extensions already applied; preserving extension ownership';
        RETURN;
    END IF;

    SELECT NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm')
    INTO created_pg_trgm;

    CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;
    CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

    INSERT INTO unihood_migrations.bootstrap_extensions (migration_id, owns_pg_trgm)
    VALUES ('001_extensions', created_pg_trgm);
END
$migration$;
COMMIT;
