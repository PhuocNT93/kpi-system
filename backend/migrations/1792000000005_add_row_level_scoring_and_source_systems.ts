import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- 1. Dynamic Crawl Source System Registry
    CREATE TABLE IF NOT EXISTS crawl_source_system (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      type VARCHAR(50) NOT NULL DEFAULT 'REST_API',
      authentication_type VARCHAR(50) NOT NULL DEFAULT 'NONE',
      allowed_domains TEXT[] NOT NULL DEFAULT '{}',
      credential_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
      configuration_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_by VARCHAR(100) NOT NULL DEFAULT 'system',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by VARCHAR(100),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Seed initial standard source systems
    INSERT INTO crawl_source_system (code, name, description, type, authentication_type, allowed_domains, enabled)
    VALUES
      ('JIRA', 'Jira Issue Tracker', 'Atlassian Jira REST API v2 connector', 'REST_API', 'BASIC_AUTH', ARRAY['pim.cyberlogitec.com', 'jira.atlassian.com'], true),
      ('BLUEPRINT', 'CyberLogitec Blueprint PIM', 'Blueprint PIM tasks and requirements connector', 'REST_API', 'COOKIE_SESSION', ARRAY['blueprint.cyberlogitec.com.vn', 'auth.cyberlogitec.com.vn'], true),
      ('GOOGLE_SHEET', 'Google Sheets Integration', 'Google Sheets v4 REST API connector', 'REST_API', 'OAUTH2', ARRAY['sheets.googleapis.com'], true),
      ('GITLAB', 'GitLab DevOps Platform', 'GitLab v4 REST API repository and commits connector', 'REST_API', 'BEARER_TOKEN', ARRAY['gitlab.com'], true)
    ON CONFLICT (code) DO NOTHING;

    -- Relax legacy hardcoded CHECK constraints to allow extensible sources
    ALTER TABLE crawl_script_version DROP CONSTRAINT IF EXISTS crawl_script_version_source_system_check;
    ALTER TABLE crawl_job_definition DROP CONSTRAINT IF EXISTS crawl_job_definition_source_system_check;
    ALTER TABLE connector_credential DROP CONSTRAINT IF EXISTS connector_credential_source_system_check;
    ALTER TABLE crawl_job_execution DROP CONSTRAINT IF EXISTS crawl_job_execution_source_system_check;

    -- Expand audit_log action and source column limits to accommodate longer event names
    ALTER TABLE audit_log ALTER COLUMN action TYPE VARCHAR(50);
    ALTER TABLE audit_log ALTER COLUMN source TYPE VARCHAR(50);

    -- 2. KPI Scoring Prompts (Parent entity)
    CREATE TABLE IF NOT EXISTS kpi_scoring_prompt (
      prompt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(200) NOT NULL,
      criterion_id UUID REFERENCES criterion(criterion_id) ON DELETE SET NULL,
      criterion_code VARCHAR(100),
      description TEXT,
      created_by VARCHAR(100) NOT NULL DEFAULT 'system',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 3. KPI Scoring Prompt Versions (Immutable versioned entity)
    CREATE TABLE IF NOT EXISTS kpi_scoring_prompt_version (
      prompt_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prompt_id UUID NOT NULL REFERENCES kpi_scoring_prompt(prompt_id) ON DELETE CASCADE,
      version_no INTEGER NOT NULL CHECK (version_no > 0),
      system_prompt TEXT NOT NULL,
      user_prompt_template TEXT NOT NULL,
      expected_output_schema JSONB NOT NULL DEFAULT '{"type":"object","properties":{"score":{"type":"number"},"reason":{"type":"string"},"confidence":{"type":"number"},"evidence":{"type":"array"}},"required":["score","reason"]}'::jsonb,
      model VARCHAR(100) NOT NULL DEFAULT 'gemini-2.5-flash',
      temperature NUMERIC(3, 2) NOT NULL DEFAULT 0.20,
      status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED', 'DEPRECATED')),
      checksum VARCHAR(64) NOT NULL,
      created_by VARCHAR(100) NOT NULL,
      published_by VARCHAR(100),
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (prompt_id, version_no)
    );

    -- Immutability enforcement trigger for published prompt versions
    CREATE OR REPLACE FUNCTION enforce_published_prompt_immutability() RETURNS trigger AS $$
    BEGIN
      IF OLD.status = 'PUBLISHED' AND (
        NEW.system_prompt IS DISTINCT FROM OLD.system_prompt OR
        NEW.user_prompt_template IS DISTINCT FROM OLD.user_prompt_template OR
        NEW.expected_output_schema IS DISTINCT FROM OLD.expected_output_schema OR
        NEW.model IS DISTINCT FROM OLD.model OR
        NEW.temperature IS DISTINCT FROM OLD.temperature OR
        NEW.checksum IS DISTINCT FROM OLD.checksum
      ) THEN
        RAISE EXCEPTION 'Published KPI scoring prompt versions are immutable';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS kpi_scoring_prompt_version_immutable ON kpi_scoring_prompt_version;
    CREATE TRIGGER kpi_scoring_prompt_version_immutable
      BEFORE UPDATE ON kpi_scoring_prompt_version
      FOR EACH ROW EXECUTE FUNCTION enforce_published_prompt_immutability();

    -- 4. Associate KPI scoring prompt version to crawl_job_criterion
    ALTER TABLE crawl_job_criterion
      ADD COLUMN IF NOT EXISTS scoring_prompt_version_id UUID REFERENCES kpi_scoring_prompt_version(prompt_version_id) ON DELETE SET NULL;

    -- 5. Row-Level Scoring Execution Queue (1 RAW ROW = 1 SCORING TASK)
    CREATE TABLE IF NOT EXISTS crawl_scoring_execution (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      crawl_data_row_id UUID NOT NULL REFERENCES evaluation_data_import_record(record_id) ON DELETE CASCADE,
      crawl_execution_id UUID NOT NULL REFERENCES crawl_job_execution(crawl_job_execution_id) ON DELETE CASCADE,
      employee_id UUID REFERENCES employee(employee_id) ON DELETE SET NULL,
      employee_code VARCHAR(100) NOT NULL,
      criterion_id UUID REFERENCES criterion(criterion_id) ON DELETE SET NULL,
      criterion_code VARCHAR(100) NOT NULL,
      evaluation_cycle_id UUID NOT NULL REFERENCES evaluation_cycle(evaluation_cycle_id) ON DELETE CASCADE,
      prompt_version_id UUID REFERENCES kpi_scoring_prompt_version(prompt_version_id) ON DELETE SET NULL,
      status VARCHAR(30) NOT NULL CHECK (status IN (
        'QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'RETRYING', 'CANCELLED'
      )) DEFAULT 'QUEUED',
      attempt_no INTEGER NOT NULL DEFAULT 1 CHECK (attempt_no > 0),
      max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
      next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      locked_at TIMESTAMPTZ,
      locked_by VARCHAR(150),
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      model VARCHAR(100),
      score NUMERIC(10, 2),
      reason TEXT,
      confidence NUMERIC(4, 3),
      evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
      flags JSONB NOT NULL DEFAULT '[]'::jsonb,
      input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      output_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      error_code VARCHAR(100),
      error_message TEXT,
      review_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (review_status IN ('PENDING', 'APPROVED', 'ADJUSTED', 'REJECTED', 'APPLIED')),
      final_score NUMERIC(10, 2),
      reviewer_id VARCHAR(100),
      review_comment TEXT,
      reviewed_at TIMESTAMPTZ,
      applied_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (crawl_data_row_id)
    );

    -- Ensure review columns exist if table was already created in prior migration
    ALTER TABLE crawl_scoring_execution ADD COLUMN IF NOT EXISTS review_status VARCHAR(30) NOT NULL DEFAULT 'PENDING';
    ALTER TABLE crawl_scoring_execution ADD COLUMN IF NOT EXISTS final_score NUMERIC(10, 2);
    ALTER TABLE crawl_scoring_execution ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(100);
    ALTER TABLE crawl_scoring_execution ADD COLUMN IF NOT EXISTS review_comment TEXT;
    ALTER TABLE crawl_scoring_execution ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
    ALTER TABLE crawl_scoring_execution ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS idx_crawl_scoring_status_retry
      ON crawl_scoring_execution (status, next_retry_at)
      WHERE status IN ('QUEUED', 'RETRYING');

    CREATE INDEX IF NOT EXISTS idx_crawl_scoring_crawl_execution
      ON crawl_scoring_execution (crawl_execution_id, status);

    CREATE INDEX IF NOT EXISTS idx_crawl_scoring_cycle
      ON crawl_scoring_execution (evaluation_cycle_id, employee_code, criterion_code);

    -- 6. Seed Standard KPI Scoring Prompts (Parent + Immutable Published Version)
    INSERT INTO kpi_scoring_prompt (prompt_id, code, name, description)
    VALUES
      ('e0000000-0000-0000-0000-000000000001', 'PROMPT_JIRA_TASK_COMPLETION', 'Jira Task Completion & Quality Scoring', 'Evaluates Jira task completion rate and code contribution quality on a 1.0 to 5.0 scale.'),
      ('e0000000-0000-0000-0000-000000000002', 'PROMPT_BP_ONTIME_RATE', 'Blueprint Task On-Time Rate Scoring', 'Evaluates Blueprint task delivery timeliness and delay hour deductions on a 1.0 to 5.0 scale.')
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO kpi_scoring_prompt_version (
      prompt_version_id, prompt_id, version_no, system_prompt, user_prompt_template, model, temperature, status, checksum, created_by, published_by, published_at
    )
    VALUES
      (
        'f0000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000000001',
        1,
        'You are an expert Technical Lead and Performance Evaluation Auditor. Evaluate Jira task completion metrics on a 1.0 to 5.0 scale.',
        'Evaluate employee {{employee_code}} on criterion {{criterion_code}}.\nTask Key: {{source_reference}}\nMeasurement Value: {{measurement_value}}%\nMeasurement Unit: {{measurement_unit}}\nRaw Details: {{raw_payload}}\nEvaluation Cycle: {{target_cycle_code}}\n\nScore on a 1.0 to 5.0 scale (1=Unsatisfactory, 3=Meets Expectations, 5=Outstanding).\nReturn JSON: {"score": <number>, "reason": "<string>", "confidence": <0.0-1.0>, "evidence": [<strings>]}',
        'gemini-2.5-flash',
        0.20,
        'PUBLISHED',
        'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
        'system',
        'system',
        NOW()
      ),
      (
        'f0000000-0000-0000-0000-000000000002',
        'e0000000-0000-0000-0000-000000000002',
        1,
        'You are a Project Director evaluating Blueprint requirement delivery and delay hours on a 1.0 to 5.0 scale.',
        'Evaluate employee {{employee_code}} on criterion {{criterion_code}}.\nBlueprint Req: {{source_reference}}\nOn-time Rate: {{measurement_value}}%\nRaw Details: {{raw_payload}}\nEvaluation Cycle: {{target_cycle_code}}\n\nScore on a 1.0 to 5.0 scale (1=Critical Delays, 3=On-Time Delivery, 5=Early Delivery with Zero Defects).\nReturn JSON: {"score": <number>, "reason": "<string>", "confidence": <0.0-1.0>, "evidence": [<strings>]}',
        'gemini-2.5-flash',
        0.20,
        'PUBLISHED',
        'b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0a1',
        'system',
        'system',
        NOW()
      )
    ON CONFLICT (prompt_id, version_no) DO NOTHING;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TABLE IF EXISTS crawl_scoring_execution CASCADE;
    ALTER TABLE crawl_job_criterion DROP COLUMN IF EXISTS scoring_prompt_version_id;
    DROP TABLE IF EXISTS kpi_scoring_prompt_version CASCADE;
    DROP FUNCTION IF EXISTS enforce_published_prompt_immutability CASCADE;
    DROP TABLE IF EXISTS kpi_scoring_prompt CASCADE;
    DROP TABLE IF EXISTS crawl_source_system CASCADE;
  `);
}
