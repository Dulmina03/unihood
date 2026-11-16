import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';

@Injectable()
export class DatabaseReadinessService implements OnModuleDestroy {
  private readonly pool: pg.Pool | null;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    let valid = false;
    try {
      const url = new URL(connectionString ?? '');
      valid = ['postgres:', 'postgresql:'].includes(url.protocol) && Boolean(url.hostname);
    } catch { /* Missing/invalid config is unready, never an implicit libpq target. */ }
    this.pool = valid ? new pg.Pool({
      connectionString, max: 2, connectionTimeoutMillis: 1000,
      statement_timeout: 1000, query_timeout: 1500, idleTimeoutMillis: 5000,
    }) : null;
    // Idle connection errors are expected during DB restarts. Never log connection data.
    this.pool?.on('error', () => {});
  }

  async isReady(): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const { rows: [row] } = await this.pool.query(`SELECT
        EXISTS (SELECT 1 FROM pg_extension WHERE extname='postgis') AND
        EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_trgm') AND
        EXISTS (SELECT 1 FROM unihood_migrations.bootstrap_extensions WHERE migration_id='001_extensions') AND
        EXISTS (SELECT 1 FROM unihood_migrations.schema_migrations WHERE migration_id='001_extensions') AS ready`);
      return row.ready === true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }
}
