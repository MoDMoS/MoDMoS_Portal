import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { Pool } from 'pg';

const DB_SOURCES = [
  { id: 'portal', name: 'Portal Auth', envKey: 'DATABASE_URL' },
  { id: 'gold', name: 'Gold Agent', envKey: 'GOLD_DATABASE_URL' },
  { id: 'investment', name: 'Investment', envKey: 'INVESTMENT_DATABASE_URL' },
  { id: 'discord', name: 'Discord Bot', envKey: 'DISCORD_DATABASE_URL' },
] as const;

export type DatabaseId = (typeof DB_SOURCES)[number]['id'];

const DOCKER_DB_HOSTS: Partial<Record<DatabaseId, string>> = {
  portal: 'portal_postgres',
  gold: 'gold_agent_postgres',
  investment: 'investment_postgres',
  discord: 'discord_postgres',
};

export type DatabaseSummary = {
  id: DatabaseId;
  name: string;
  configured: boolean;
  connected: boolean;
  tableCount: number | null;
  error: string | null;
};

export type DatabaseTable = {
  schema: string;
  name: string;
  rowEstimate: number | null;
};

export type DatabaseRows = {
  schema: string;
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
  page: number;
  limit: number;
  total: number | null;
};

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const QUERY_TIMEOUT_MS = 8000;

@Injectable()
export class DbViewerService implements OnModuleDestroy {
  private readonly pools = new Map<DatabaseId, Pool>();

  constructor(private readonly config: ConfigService) {}

  onModuleDestroy() {
    for (const pool of this.pools.values()) {
      void pool.end();
    }
  }

  private getConnectionString(id: DatabaseId): string | undefined {
    const source = DB_SOURCES.find((entry) => entry.id === id);
    if (!source) return undefined;
    const value = this.config.get<string>(source.envKey)?.trim();
    if (!value) return undefined;
    return this.normalizeConnectionString(id, value);
  }

  private runningInDocker(): boolean {
    return existsSync('/.dockerenv');
  }

  /** Portal API in Docker must reach Postgres on modmos-db by container name (:5432). */
  private normalizeConnectionString(id: DatabaseId, raw: string): string {
    if (!this.runningInDocker()) return raw;

    const host = DOCKER_DB_HOSTS[id];
    if (!host) return raw;

    // Rewrite host:port (127.0.0.1, host.docker.internal, etc.) → container:5432
    return raw.replace(/@([^/?#]+)/, `@${host}:5432`);
  }

  private getPool(id: DatabaseId): Pool | null {
    const connectionString = this.getConnectionString(id);
    if (!connectionString) return null;

    let pool = this.pools.get(id);
    if (!pool) {
      const isSsl =
        connectionString.includes('sslmode=require') ||
        connectionString.includes('neon.tech');
      pool = new Pool({
        connectionString,
        max: 3,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
        ssl: isSsl ? { rejectUnauthorized: false } : undefined,
      });
      this.pools.set(id, pool);
    }
    return pool;
  }

  private assertDatabaseId(id: string): DatabaseId {
    const match = DB_SOURCES.find((entry) => entry.id === id);
    if (!match) {
      throw new NotFoundException('Database not found');
    }
    return match.id;
  }

  private assertSafeIdentifier(value: string, label: string) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }

  private quoteIdent(value: string) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  private async withReadOnlyClient<T>(
    id: DatabaseId,
    run: (client: import('pg').PoolClient) => Promise<T>,
  ): Promise<T> {
    const pool = this.getPool(id);
    if (!pool) {
      throw new NotFoundException('Database is not configured');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN READ ONLY');
      await client.query(`SET LOCAL statement_timeout = ${QUERY_TIMEOUT_MS}`);
      const result = await run(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async listDatabases(): Promise<DatabaseSummary[]> {
    return Promise.all(
      DB_SOURCES.map(async (source) => {
        const configured = Boolean(this.getConnectionString(source.id));
        if (!configured) {
          return {
            id: source.id,
            name: source.name,
            configured: false,
            connected: false,
            tableCount: null,
            error: null,
          };
        }

        try {
          const tables = await this.listTables(source.id);
          return {
            id: source.id,
            name: source.name,
            configured: true,
            connected: true,
            tableCount: tables.length,
            error: null,
          };
        } catch (error) {
          return {
            id: source.id,
            name: source.name,
            configured: true,
            connected: false,
            tableCount: null,
            error:
              error instanceof Error ? error.message : 'Connection failed',
          };
        }
      }),
    );
  }

  async listTables(idRaw: string): Promise<DatabaseTable[]> {
    const id = this.assertDatabaseId(idRaw);
    return this.withReadOnlyClient(id, async (client) => {
      const result = await client.query<{
        table_schema: string;
        table_name: string;
        row_estimate: string | null;
      }>(
        `
          SELECT
            t.table_schema,
            t.table_name,
            c.reltuples::bigint::text AS row_estimate
          FROM information_schema.tables t
          LEFT JOIN pg_namespace n ON n.nspname = t.table_schema
          LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = t.table_name
          WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
            AND t.table_type = 'BASE TABLE'
          ORDER BY t.table_schema, t.table_name
        `,
      );

      return result.rows.map((row) => ({
        schema: row.table_schema,
        name: row.table_name,
        rowEstimate:
          row.row_estimate != null ? Number(row.row_estimate) : null,
      }));
    });
  }

  async getTableRows(
    idRaw: string,
    schemaRaw: string,
    tableRaw: string,
    pageRaw?: string,
    limitRaw?: string,
  ): Promise<DatabaseRows> {
    const id = this.assertDatabaseId(idRaw);
    this.assertSafeIdentifier(schemaRaw, 'schema');
    this.assertSafeIdentifier(tableRaw, 'table');

    const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.parseInt(limitRaw ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
    );
    const offset = (page - 1) * limit;
    const qualified = `${this.quoteIdent(schemaRaw)}.${this.quoteIdent(tableRaw)}`;

    return this.withReadOnlyClient(id, async (client) => {
      const exists = await client.query<{ ok: number }>(
        `
          SELECT 1 AS ok
          FROM information_schema.tables
          WHERE table_schema = $1
            AND table_name = $2
            AND table_type = 'BASE TABLE'
          LIMIT 1
        `,
        [schemaRaw, tableRaw],
      );
      if (exists.rowCount === 0) {
        throw new NotFoundException('Table not found');
      }

      const countResult = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM ${qualified}`,
      );
      const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10);

      const data = await client.query(
        `SELECT * FROM ${qualified} LIMIT $1 OFFSET $2`,
        [limit, offset],
      );

      return {
        schema: schemaRaw,
        table: tableRaw,
        columns: data.fields.map((field) => field.name),
        rows: data.rows.map((row) => this.serializeRow(row)),
        page,
        limit,
        total: Number.isFinite(total) ? total : null,
      };
    });
  }

  private serializeRow(row: Record<string, unknown>) {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      next[key] = this.serializeValue(value);
    }
    return next;
  }

  private serializeValue(value: unknown): unknown {
    if (value == null) return value;
    if (value instanceof Date) return value.toISOString();
    if (Buffer.isBuffer(value)) return `[binary ${value.length} bytes]`;
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map((item) => this.serializeValue(item));
      }
      return JSON.parse(JSON.stringify(value, (_, nested) => {
        if (typeof nested === 'bigint') return nested.toString();
        if (nested instanceof Date) return nested.toISOString();
        if (Buffer.isBuffer(nested)) return `[binary ${nested.length} bytes]`;
        return nested;
      }));
    }
    return value;
  }
}
