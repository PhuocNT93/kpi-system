import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS collector_monthly_snapshot (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_type VARCHAR(50) NOT NULL,
      year_month VARCHAR(7) NOT NULL,
      target_member VARCHAR(100) NOT NULL,
      team_id VARCHAR(100),
      data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      score10 NUMERIC(5,2),
      total_records INTEGER DEFAULT 0,
      is_locked BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_collector_monthly_snapshot UNIQUE (source_type, year_month, target_member)
    );

    CREATE INDEX IF NOT EXISTS idx_collector_monthly_snapshot_lookup 
    ON collector_monthly_snapshot (source_type, target_member, year_month);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TABLE IF EXISTS collector_monthly_snapshot CASCADE;
  `);
}
