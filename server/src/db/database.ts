import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { Pool, type PoolClient } from 'pg';

export interface DbQueryRunner {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<{ rowCount: number }>;
}

export interface DbClient extends DbQueryRunner {
  dialect: 'postgres' | 'sqlite';
  transaction<T>(fn: (tx: DbQueryRunner) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/**
 * Convert PostgreSQL-style positional placeholders ($1, $2, ...) into SQLite `?`
 * placeholders and reorder/repeat parameter values accordingly.
 */
export function convertPgSqlToSqlite(sql: string, params: unknown[] = []): { sql: string; params: unknown[] } {
  const orderedParams: unknown[] = [];
  let inSingleQuote = false;
  let out = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      out += ch;
      if (inSingleQuote && sql[i + 1] === "'") {
        out += "'";
        i += 1;
      } else {
        inSingleQuote = !inSingleQuote;
      }
      continue;
    }

    if (!inSingleQuote && ch === '$') {
      let j = i + 1;
      while (j < sql.length && sql[j] >= '0' && sql[j] <= '9') {
        j += 1;
      }
      if (j > i + 1) {
        const idx = Number(sql.slice(i + 1, j)) - 1;
        orderedParams.push(idx >= 0 && idx < params.length ? params[idx] : null);
        out += '?';
        i = j - 1;
        continue;
      }
    }

    out += ch;
  }

  return { sql: out, params: orderedParams };
}

class SqliteDbClient implements DbClient {
  public readonly dialect = 'sqlite' as const;
  private readonly db: Database.Database;

  constructor(sqlitePath: string) {
    if (sqlitePath !== ':memory:') {
      fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
    }
    this.db = new Database(sqlitePath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const converted = convertPgSqlToSqlite(sql, params);
    const stmt = this.db.prepare(converted.sql);
    return stmt.all(...converted.params) as T[];
  }

  async queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const converted = convertPgSqlToSqlite(sql, params);
    const stmt = this.db.prepare(converted.sql);
    const row = stmt.get(...converted.params) as T | undefined;
    return row ?? null;
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ rowCount: number }> {
    const trimmed = sql.trim();
    if (!params.length && trimmed.includes(';') && !trimmed.endsWith(';')) {
      this.db.exec(sql);
      return { rowCount: 0 };
    }
    const converted = convertPgSqlToSqlite(sql, params);
    const info = this.db.prepare(converted.sql).run(...converted.params);
    return { rowCount: info.changes };
  }

  execRaw(sql: string): void {
    this.db.exec(sql);
  }

  async transaction<T>(fn: (tx: DbQueryRunner) => Promise<T>): Promise<T> {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = await fn(this);
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

class PostgresDbClient implements DbClient {
  public readonly dialect = 'postgres' as const;
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  private wrapClient(client: PoolClient | Pool): DbQueryRunner {
    return {
      query: async <T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> => {
        const res = await client.query(sql, params);
        return res.rows as T[];
      },
      queryOne: async <T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> => {
        const res = await client.query(sql, params);
        return (res.rows[0] as T | undefined) ?? null;
      },
      execute: async (sql: string, params: unknown[] = []): Promise<{ rowCount: number }> => {
        const res = await client.query(sql, params);
        return { rowCount: res.rowCount ?? 0 };
      },
    };
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.wrapClient(this.pool).query<T>(sql, params);
  }

  async queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    return this.wrapClient(this.pool).queryOne<T>(sql, params);
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ rowCount: number }> {
    return this.wrapClient(this.pool).execute(sql, params);
  }

  async transaction<T>(fn: (tx: DbQueryRunner) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(this.wrapClient(client));
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export function createDbClient(options: { databaseUrl?: string; sqlitePath?: string }): DbClient {
  const url = (options.databaseUrl || '').trim();
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    return new PostgresDbClient(url);
  }
  return new SqliteDbClient(options.sqlitePath || ':memory:');
}
