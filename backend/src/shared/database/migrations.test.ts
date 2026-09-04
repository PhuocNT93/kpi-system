import { Pool } from 'pg';
import { runner } from 'node-pg-migrate';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getMigrationTestDatabaseUrl } from './migration-test-config.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const canRunMigrationTests = testDatabaseUrl !== undefined && testDatabaseUrl !== process.env.DATABASE_URL;

if (canRunMigrationTests) {
  describe('database migrations', () => {
  const databaseUrl = testDatabaseUrl ?? getMigrationTestDatabaseUrl();
  const pool = new Pool({ connectionString: databaseUrl });

  beforeAll(async () => {
    await runner({
      databaseUrl,
      dir: 'migrations',
      direction: 'up',
      migrationsTable: 'pgmigrations',
      checkOrder: true,
      noLock: false
    });
  });

  afterAll(async () => {
    await runner({
      databaseUrl,
      dir: 'migrations',
      direction: 'down',
      count: 1,
      migrationsTable: 'pgmigrations',
      checkOrder: true,
      noLock: false
    });
    await pool.end();
  });

  it('creates the LLD-aligned department schema', async () => {
    const { rows } = await pool.query<{
      column_name: string;
      data_type: string;
      column_default: string | null;
    }>(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'department'
      ORDER BY ordinal_position
    `);

    expect(rows.map((column: Record<string, unknown>) => column.column_name)).toEqual([
      'department_id',
      'code',
      'name',
      'active',
      'created_at',
      'updated_at',
      'created_by',
      'updated_by'
    ]);
    expect(rows.find((column: Record<string, unknown>) => column.column_name === 'department_id')).toMatchObject({
      data_type: 'uuid',
      column_default: expect.stringContaining('gen_random_uuid')
    });
    expect(rows.filter((column: Record<string, unknown>) => column.column_name.endsWith('_at')).every((column: Record<string, unknown>) => column.data_type === 'timestamp with time zone')).toBe(true);
  });

  it('generates IDs, updates timestamps, and provides the declared active index', async () => {
    const inserted = await pool.query<{ department_id: string; created_at: Date; updated_at: Date }>(`
      INSERT INTO department (code, name)
      VALUES ('ENG', 'Engineering')
      RETURNING department_id, created_at, updated_at
    `);
    const department = inserted.rows[0];

    expect(department?.department_id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(department?.created_at).toBeInstanceOf(Date);
    expect(department?.updated_at).toBeInstanceOf(Date);

    const { rows: indexRows } = await pool.query<{ indexname: string }>(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'department' AND indexname = 'department_active_idx'
    `);
    expect(indexRows).toHaveLength(1);
  });
  });
} else {
  describe.skip('database migrations', () => {
    it('requires a separate TEST_DATABASE_URL', () => undefined);
  });
}