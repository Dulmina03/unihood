import { Injectable, ServiceUnavailableException, type OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';

@Injectable()
export class UniversityRepository implements OnModuleDestroy {
  private readonly pool: pg.Pool | null;
  readonly includeSynthetic: boolean;
  constructor() {
    const local = process.env.APP_ENV === 'local' && (process.env.NODE_ENV === undefined || process.env.NODE_ENV === 'development');
    const test = process.env.APP_ENV === 'test' && process.env.NODE_ENV === 'test';
    this.includeSynthetic = local || test;
    const connectionString = process.env.DATABASE_URL;
    let valid = false;
    try {const url = new URL(connectionString ?? ''); valid = ['postgres:', 'postgresql:'].includes(url.protocol) && Boolean(url.hostname);} catch { /* Never fall back to libpq defaults. */ }
    this.pool = valid ? new pg.Pool({connectionString, max: 3, connectionTimeoutMillis: 1000, statement_timeout: 1500, query_timeout: 2000, idleTimeoutMillis: 5000}) : null;
    this.pool?.on('error', () => {});
  }
  async query(sql: string, values: unknown[]) {
    if (!this.pool) throw new ServiceUnavailableException();
    try {return (await this.pool.query(sql, values)).rows;}
    catch {throw new ServiceUnavailableException();}
  }
  async onModuleDestroy() {await this.pool?.end();}
}
