import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE crawl_script_version (
      crawl_script_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(100) NOT NULL,
      version_no INTEGER NOT NULL CHECK (version_no > 0),
      source_system VARCHAR(20) NOT NULL CHECK (source_system IN ('BLUEPRINT', 'JIRA', 'GOOGLE_SHEET')),
      source_code TEXT NOT NULL,
      checksum VARCHAR(64) NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED', 'DEPRECATED')),
      created_by VARCHAR(100) NOT NULL,
      published_by VARCHAR(100),
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (code, version_no)
    );

    CREATE FUNCTION enforce_published_crawl_script_immutability() RETURNS trigger AS $$
    BEGIN
      IF OLD.status = 'PUBLISHED' AND (
        NEW.code IS DISTINCT FROM OLD.code OR
        NEW.version_no IS DISTINCT FROM OLD.version_no OR
        NEW.source_system IS DISTINCT FROM OLD.source_system OR
        NEW.source_code IS DISTINCT FROM OLD.source_code OR
        NEW.checksum IS DISTINCT FROM OLD.checksum
      ) THEN
        RAISE EXCEPTION 'Published crawl script versions are immutable';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER crawl_script_version_immutable
      BEFORE UPDATE ON crawl_script_version
      FOR EACH ROW EXECUTE FUNCTION enforce_published_crawl_script_immutability();

    CREATE TABLE connector_credential (
      connector_credential_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(100) NOT NULL UNIQUE,
      source_system VARCHAR(20) NOT NULL CHECK (source_system IN ('BLUEPRINT', 'JIRA', 'GOOGLE_SHEET')),
      display_name VARCHAR(200) NOT NULL,
      secret_reference VARCHAR(500) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE crawl_job_definition (
      crawl_job_definition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(200) NOT NULL,
      source_system VARCHAR(20) NOT NULL CHECK (source_system IN ('BLUEPRINT', 'JIRA', 'GOOGLE_SHEET')),
      crawl_script_version_id UUID NOT NULL REFERENCES crawl_script_version(crawl_script_version_id),
      connector_credential_id UUID NOT NULL REFERENCES connector_credential(connector_credential_id),
      source_config JSONB NOT NULL DEFAULT '{}'::jsonb,
      default_schedule_cron VARCHAR(100),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      failure_policy VARCHAR(30) NOT NULL DEFAULT 'CONTINUE'
        CHECK (failure_policy IN ('CONTINUE', 'STOP_CYCLE', 'RETRY_THEN_CONTINUE', 'RETRY_THEN_STOP')),
      created_by VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE crawl_job_criterion (
      crawl_job_definition_id UUID NOT NULL REFERENCES crawl_job_definition(crawl_job_definition_id) ON DELETE CASCADE,
      criterion_id UUID NOT NULL REFERENCES criterion(criterion_id),
      PRIMARY KEY (crawl_job_definition_id, criterion_id)
    );

    CREATE TABLE evaluation_cycle_crawl_job (
      evaluation_cycle_id UUID NOT NULL REFERENCES evaluation_cycle(evaluation_cycle_id) ON DELETE CASCADE,
      crawl_job_definition_id UUID NOT NULL REFERENCES crawl_job_definition(crawl_job_definition_id) ON DELETE CASCADE,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      sequence_order INTEGER NOT NULL DEFAULT 0,
      failure_policy VARCHAR(30) NOT NULL DEFAULT 'CONTINUE'
        CHECK (failure_policy IN ('CONTINUE', 'STOP_CYCLE', 'RETRY_THEN_CONTINUE', 'RETRY_THEN_STOP')),
      enabled_by VARCHAR(100),
      enabled_at TIMESTAMPTZ,
      PRIMARY KEY (evaluation_cycle_id, crawl_job_definition_id)
    );

    CREATE INDEX idx_cycle_crawl_job_enabled_order
      ON evaluation_cycle_crawl_job (evaluation_cycle_id, enabled, sequence_order);

    CREATE TABLE crawl_job_execution (
      crawl_job_execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      crawl_job_definition_id UUID NOT NULL REFERENCES crawl_job_definition(crawl_job_definition_id),
      evaluation_cycle_id UUID NOT NULL REFERENCES evaluation_cycle(evaluation_cycle_id),
      status VARCHAR(30) NOT NULL CHECK (status IN (
        'QUEUED', 'RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'TIMEOUT', 'SKIPPED', 'CANCELLED'
      )),
      attempt_no INTEGER NOT NULL DEFAULT 1 CHECK (attempt_no > 0),
      max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0 AND max_attempts <= 5),
      next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      claimed_by VARCHAR(150),
      lease_expires_at TIMESTAMPTZ,
      heartbeat_at TIMESTAMPTZ,
      trigger_type VARCHAR(20) NOT NULL CHECK (trigger_type IN ('SCHEDULED', 'MANUAL', 'RETRY')),
      triggered_by VARCHAR(100),
      scheduled_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      duration_ms BIGINT CHECK (duration_ms IS NULL OR duration_ms >= 0),
      crawl_script_version_id UUID NOT NULL REFERENCES crawl_script_version(crawl_script_version_id),
      script_version INTEGER NOT NULL,
      script_checksum VARCHAR(64) NOT NULL,
      source_system VARCHAR(20) NOT NULL CHECK (source_system IN ('BLUEPRINT', 'JIRA', 'GOOGLE_SHEET')),
      source_config_snapshot JSONB NOT NULL,
      criteria_snapshot JSONB NOT NULL,
      connector_credential_id UUID NOT NULL REFERENCES connector_credential(connector_credential_id),
      records_fetched INTEGER NOT NULL DEFAULT 0 CHECK (records_fetched >= 0),
      records_parsed INTEGER NOT NULL DEFAULT 0 CHECK (records_parsed >= 0),
      records_valid INTEGER NOT NULL DEFAULT 0 CHECK (records_valid >= 0),
      records_invalid INTEGER NOT NULL DEFAULT 0 CHECK (records_invalid >= 0),
      records_conflict INTEGER NOT NULL DEFAULT 0 CHECK (records_conflict >= 0),
      records_applied INTEGER NOT NULL DEFAULT 0 CHECK (records_applied >= 0),
      error_code VARCHAR(100),
      error_message TEXT,
      idempotency_key VARCHAR(255) NOT NULL UNIQUE,
      retry_of_execution_id UUID REFERENCES crawl_job_execution(crawl_job_execution_id),
      evaluation_data_import_id UUID REFERENCES evaluation_data_import(import_id),
      request_id VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE FUNCTION enforce_crawl_execution_snapshot_immutability() RETURNS trigger AS $$
    BEGIN
      IF NEW.crawl_job_definition_id IS DISTINCT FROM OLD.crawl_job_definition_id OR
         NEW.evaluation_cycle_id IS DISTINCT FROM OLD.evaluation_cycle_id OR
         NEW.trigger_type IS DISTINCT FROM OLD.trigger_type OR
         NEW.triggered_by IS DISTINCT FROM OLD.triggered_by OR
         NEW.attempt_no IS DISTINCT FROM OLD.attempt_no OR
         NEW.max_attempts IS DISTINCT FROM OLD.max_attempts OR
         NEW.crawl_script_version_id IS DISTINCT FROM OLD.crawl_script_version_id OR
         NEW.script_version IS DISTINCT FROM OLD.script_version OR
         NEW.script_checksum IS DISTINCT FROM OLD.script_checksum OR
         NEW.source_system IS DISTINCT FROM OLD.source_system OR
         NEW.source_config_snapshot IS DISTINCT FROM OLD.source_config_snapshot OR
         NEW.criteria_snapshot IS DISTINCT FROM OLD.criteria_snapshot OR
         NEW.connector_credential_id IS DISTINCT FROM OLD.connector_credential_id OR
         NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key OR
         NEW.retry_of_execution_id IS DISTINCT FROM OLD.retry_of_execution_id
      THEN
        RAISE EXCEPTION 'Crawl execution snapshot fields are immutable';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER crawl_job_execution_snapshot_immutable
      BEFORE UPDATE ON crawl_job_execution
      FOR EACH ROW EXECUTE FUNCTION enforce_crawl_execution_snapshot_immutability();

    CREATE INDEX idx_crawl_execution_job_created
      ON crawl_job_execution (crawl_job_definition_id, created_at DESC);
    CREATE INDEX idx_crawl_execution_cycle_status
      ON crawl_job_execution (evaluation_cycle_id, status, created_at DESC);
    CREATE INDEX idx_crawl_execution_due_claim
      ON crawl_job_execution (next_retry_at, scheduled_at, created_at)
      WHERE status = 'QUEUED';
    CREATE INDEX idx_crawl_execution_expired_lease
      ON crawl_job_execution (lease_expires_at)
      WHERE status = 'RUNNING';

    CREATE TABLE crawl_job_execution_log (
      crawl_job_execution_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      crawl_job_execution_id UUID NOT NULL REFERENCES crawl_job_execution(crawl_job_execution_id) ON DELETE CASCADE,
      logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      level VARCHAR(10) NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR')),
      message VARCHAR(2000) NOT NULL,
      context JSONB NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE INDEX idx_crawl_execution_log_time
      ON crawl_job_execution_log (crawl_job_execution_id, logged_at DESC);

    CREATE TABLE crawl_raw_payload (
      raw_payload_reference VARCHAR(500) PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX idx_crawl_raw_payload_expiry ON crawl_raw_payload (expires_at);

    ALTER TABLE evaluation_data_import_record
      ADD COLUMN IF NOT EXISTS crawl_job_execution_id UUID REFERENCES crawl_job_execution(crawl_job_execution_id),
      ADD COLUMN IF NOT EXISTS source_comment TEXT,
      ADD COLUMN IF NOT EXISTS reviewer_comment TEXT,
      ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS measurement_from TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS measurement_to TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS raw_payload_reference VARCHAR(500);

      ALTER TABLE evaluation_data_import
        ADD COLUMN IF NOT EXISTS crawl_job_execution_id UUID UNIQUE
          REFERENCES crawl_job_execution(crawl_job_execution_id);

    CREATE INDEX idx_import_record_execution
      ON evaluation_data_import_record (crawl_job_execution_id)
      WHERE crawl_job_execution_id IS NOT NULL;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_import_record_execution;
      ALTER TABLE evaluation_data_import DROP COLUMN IF EXISTS crawl_job_execution_id;
    ALTER TABLE evaluation_data_import_record
      DROP COLUMN IF EXISTS raw_payload_reference,
      DROP COLUMN IF EXISTS reviewer_comment,
      DROP COLUMN IF EXISTS source_comment,
      DROP COLUMN IF EXISTS source_updated_at,
      DROP COLUMN IF EXISTS measurement_to,
      DROP COLUMN IF EXISTS measurement_from,
      DROP COLUMN IF EXISTS collected_at,
      DROP COLUMN IF EXISTS crawl_job_execution_id;
    DROP TABLE IF EXISTS crawl_raw_payload;
    DROP TABLE IF EXISTS crawl_job_execution_log;
    DROP TABLE IF EXISTS crawl_job_execution;
    DROP FUNCTION IF EXISTS enforce_crawl_execution_snapshot_immutability();
    DROP TABLE IF EXISTS evaluation_cycle_crawl_job;
    DROP TABLE IF EXISTS crawl_job_criterion;
    DROP TABLE IF EXISTS crawl_job_definition;
    DROP TABLE IF EXISTS connector_credential;
    DROP TABLE IF EXISTS crawl_script_version;
    DROP FUNCTION IF EXISTS enforce_published_crawl_script_immutability();
  `);
}