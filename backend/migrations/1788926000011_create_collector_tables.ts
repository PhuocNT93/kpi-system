import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS collector_data_source (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(150) NOT NULL,
      source_type VARCHAR(50) NOT NULL,
      auth_config JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS collector_job (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      source_id UUID NOT NULL REFERENCES collector_data_source(id) ON DELETE CASCADE,
      evaluation_cycle_id UUID REFERENCES evaluation_cycle(evaluation_cycle_id) ON DELETE SET NULL,
      target_criterion_code VARCHAR(100) NOT NULL DEFAULT 'CULTURE_ATTITUDE',
      cron_expression VARCHAR(100) DEFAULT '0 1 * * *',
      params JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_run_at TIMESTAMPTZ,
      last_status VARCHAR(50),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS collector_run_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID REFERENCES collector_job(id) ON DELETE CASCADE,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      status VARCHAR(50) NOT NULL DEFAULT 'RUNNING',
      records_count INTEGER NOT NULL DEFAULT 0,
      summary JSONB,
      error_message TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_collector_job_source_id ON collector_job(source_id);
    CREATE INDEX IF NOT EXISTS idx_collector_run_log_job_id ON collector_run_log(job_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TABLE IF EXISTS collector_run_log CASCADE;
    DROP TABLE IF EXISTS collector_job CASCADE;
    DROP TABLE IF EXISTS collector_data_source CASCADE;
  `);
}
