/**
 * AAHAR Mobile — Database Client
 * Provides async SQLite operations with support for Expo SQLite and in-memory Node/test runtime.
 */

import { CREATE_TABLES_SQL } from './schema';

export interface IDatabaseClient {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<{ rowsAffected: number; insertId?: number }>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
  withTransactionAsync<T>(action: () => Promise<T>): Promise<T>;
  closeAsync(): Promise<void>;
}

/**
 * Pure TypeScript In-Memory SQL Storage Engine for Tests and Node environments.
 * Handles CREATE TABLE, INSERT, SELECT, UPDATE, DELETE, and transactions.
 */
export class InMemoryDatabaseClient implements IDatabaseClient {
  private tables = new Map<string, Array<Record<string, unknown>>>();
  private inTransaction = false;
  private transactionSnapshot: Map<string, Array<Record<string, unknown>>> | null = null;

  async execAsync(sql: string): Promise<void> {
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await this.runAsync(stmt);
    }
  }

  async runAsync(
    sql: string,
    params: unknown[] = [],
  ): Promise<{ rowsAffected: number; insertId?: number }> {
    const cleanSql = sql.trim().replace(/\s+/g, ' ');

    // Handle CREATE TABLE
    const createMatch = cleanSql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
    if (createMatch) {
      const tableName = createMatch[1];
      if (!this.tables.has(tableName)) {
        this.tables.set(tableName, []);
      }
      return { rowsAffected: 0 };
    }

    // Handle CREATE INDEX
    if (/CREATE INDEX/i.test(cleanSql)) {
      return { rowsAffected: 0 };
    }

    // Handle INSERT INTO
    const insertMatch = cleanSql.match(/INSERT (?:OR REPLACE )?INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const columns = insertMatch[2].split(',').map((c) => c.trim());
      if (!this.tables.has(tableName)) {
        this.tables.set(tableName, []);
      }
      const table = this.tables.get(tableName)!;

      const row: Record<string, unknown> = {};
      columns.forEach((col, idx) => {
        row[col] = params[idx];
      });

      // Handle replace / primary key check (assumes 'id' or first column)
      const primaryKeyCol = columns.find(c => c === 'id' || c === 'farm_id' || c === 'measurement_id') ?? columns[0];
      const existingIdx = table.findIndex(r => r[primaryKeyCol] === row[primaryKeyCol]);
      if (existingIdx >= 0) {
        table[existingIdx] = row;
      } else {
        table.push(row);
      }
      return { rowsAffected: 1 };
    }

    // Handle UPDATE
    const updateMatch = cleanSql.match(/UPDATE (\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
    if (updateMatch) {
      const tableName = updateMatch[1];
      const setClause = updateMatch[2];
      const whereClause = updateMatch[3];
      const table = this.tables.get(tableName) ?? [];

      let paramIdx = 0;
      const setAssignments = setClause.split(',').map((assignment) => {
        const [col] = assignment.split('=').map((s) => s.trim());
        const val = params[paramIdx++];
        return { col, val };
      });

      let affected = 0;
      for (const row of table) {
        let matches = true;
        if (whereClause) {
          const conditions = whereClause.split(/\s+AND\s+/i);
          for (const cond of conditions) {
            const [condCol] = cond.split(/[=<>]+/).map((s) => s.trim());
            const expectedVal = params[paramIdx];
            if (row[condCol] !== expectedVal) {
              matches = false;
              break;
            }
          }
        }
        if (matches) {
          for (const { col, val } of setAssignments) {
            row[col] = val;
          }
          affected++;
        }
      }
      return { rowsAffected: affected };
    }

    // Handle DELETE
    const deleteMatch = cleanSql.match(/DELETE FROM (\w+)(?:\s+WHERE\s+(.+))?$/i);
    if (deleteMatch) {
      const tableName = deleteMatch[1];
      const whereClause = deleteMatch[2];
      const table = this.tables.get(tableName) ?? [];

      if (!whereClause) {
        const count = table.length;
        this.tables.set(tableName, []);
        return { rowsAffected: count };
      }

      let paramIdx = 0;
      const initialCount = table.length;
      const filtered = table.filter((row) => {
        const conditions = whereClause.split(/\s+AND\s+/i);
        for (const cond of conditions) {
          const [col] = cond.split(/[=<>]+/).map((s) => s.trim());
          const expectedVal = params[paramIdx];
          if (row[col] === expectedVal) {
            return false;
          }
        }
        return true;
      });
      this.tables.set(tableName, filtered);
      return { rowsAffected: initialCount - filtered.length };
    }

    return { rowsAffected: 0 };
  }

  async getAllAsync<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const cleanSql = sql.trim().replace(/\s+/g, ' ');

    const selectMatch = cleanSql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);
    if (!selectMatch) {
      return [];
    }

    const [, columnsStr, tableName, whereClause, orderByClause, limitStr] = selectMatch;
    const table = this.tables.get(tableName) ?? [];
    let results = [...table];

    if (whereClause) {
      let paramIdx = 0;
      const conditions = whereClause.split(/\s+AND\s+/i);
      results = results.filter((row) => {
        for (const cond of conditions) {
          if (cond.includes('=')) {
            const [col] = cond.split('=').map((s) => s.trim());
            const expectedVal = params[paramIdx++];
            if (row[col] !== expectedVal) return false;
          } else if (cond.includes('IN')) {
            const [col] = cond.split(/\s+IN\s+/i).map((s) => s.trim());
            const inValues = params[paramIdx++] as unknown[];
            if (!Array.isArray(inValues) || !inValues.includes(row[col])) return false;
          }
        }
        return true;
      });
    }

    if (orderByClause) {
      const [orderCol, orderDir] = orderByClause.trim().split(/\s+/);
      const isDesc = orderDir?.toUpperCase() === 'DESC';
      results.sort((a, b) => {
        const valA = a[orderCol];
        const valB = b[orderCol];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (valA < valB) return isDesc ? 1 : -1;
        return isDesc ? -1 : 1;
      });
    }

    if (limitStr) {
      const limit = parseInt(limitStr, 10);
      results = results.slice(0, limit);
    }

    if (columnsStr.trim() !== '*') {
      const cols = columnsStr.split(',').map((c) => c.trim());
      results = results.map((row) => {
        const projected: Record<string, unknown> = {};
        for (const c of cols) {
          projected[c] = row[c];
        }
        return projected;
      });
    }

    return results as T[];
  }

  async getFirstAsync<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.getAllAsync<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async withTransactionAsync<T>(action: () => Promise<T>): Promise<T> {
    if (this.inTransaction) {
      return action();
    }
    this.inTransaction = true;
    this.transactionSnapshot = new Map();
    for (const [k, v] of this.tables.entries()) {
      this.transactionSnapshot.set(k, v.map((row) => ({ ...row })));
    }

    try {
      const result = await action();
      this.inTransaction = false;
      this.transactionSnapshot = null;
      return result;
    } catch (err) {
      if (this.transactionSnapshot) {
        this.tables = this.transactionSnapshot;
      }
      this.inTransaction = false;
      this.transactionSnapshot = null;
      throw err;
    }
  }

  async closeAsync(): Promise<void> {
    this.tables.clear();
  }
}

let activeClient: IDatabaseClient | null = null;

export class PersistenceUnavailableError extends Error {
  readonly code = 'PERSISTENCE_UNAVAILABLE';
  constructor(detail: string) {
    super(detail);
    this.name = 'PersistenceUnavailableError';
  }
}

/**
 * Register the durable storage driver. Called once at app start with an
 * expo-sqlite backed client.
 */
export function registerDatabaseDriver(client: IDatabaseClient): void {
  activeClient = client;
}

/**
 * Test-only: install the in-memory engine. Named so it cannot be mistaken
 * for durable storage. Throws if called outside a test runtime.
 */
export function useInMemoryDatabaseForTests(client?: IDatabaseClient): IDatabaseClient {
  const isTest =
    typeof process !== 'undefined' &&
    (process.env?.NODE_ENV === 'test' || process.env?.VITEST === 'true');
  if (!isTest) {
    throw new PersistenceUnavailableError(
      'The in-memory database is a test fixture. It does not survive an app ' +
        'restart and must never back production data.',
    );
  }
  activeClient = client ?? new InMemoryDatabaseClient();
  return activeClient;
}

export async function getDatabaseClient(): Promise<IDatabaseClient> {
  if (activeClient) {
    return activeClient;
  }

  // Previously this silently constructed an InMemoryDatabaseClient -- a
  // JavaScript Map -- and returned it as the app's persistence layer. The
  // product claims offline-first durable storage; in practice every scan,
  // advisory and queued sync record was lost when the process was killed.
  // expo-sqlite is not installed (see mobile/package.json), so there is no
  // durable driver to fall back to. Fail loudly rather than lose farmer data.
  throw new PersistenceUnavailableError(
    'No durable database driver is registered. Install expo-sqlite and call ' +
      'registerDatabaseDriver() during app start-up. Refusing to fall back to ' +
      'in-memory storage, which loses all data on restart.',
  );
}

/** @deprecated Misleading name. Use useInMemoryDatabaseForTests(). */
export function setMockDatabaseClient(mock: IDatabaseClient | null): void {
  activeClient = mock;
}
