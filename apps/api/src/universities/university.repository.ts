import { Injectable, HttpException, ServiceUnavailableException, type OnModuleDestroy } from '@nestjs/common';
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
  async transaction<T>(work:(query:(sql:string,values:unknown[])=>Promise<pg.QueryResultRow[]>)=>Promise<T>):Promise<T> {
    if(!this.pool)throw new ServiceUnavailableException();
    const client=await this.pool.connect().catch(()=>{throw new ServiceUnavailableException();});
    let discard=false;
    try{
      await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
      await client.query("SET LOCAL lock_timeout='1500ms'; SET LOCAL idle_in_transaction_session_timeout='5s'");
      const result=await work(async(sql,values)=>(await client.query(sql,values)).rows);
      await client.query('COMMIT');return result;
    }catch(error){
      try{await client.query('ROLLBACK');}catch{discard=true;}
      // Only deliberate application boundary errors survive; never leak SQL.
      if(error instanceof HttpException)throw error;
      throw new ServiceUnavailableException();
    }finally{client.release(discard);}
  }
  async onModuleDestroy() {await this.pool?.end();}
}
