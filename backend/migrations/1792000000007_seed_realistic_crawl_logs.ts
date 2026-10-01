import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- Seed detailed, realistic operational logs for crawl job executions
    DO $$
    DECLARE
      exec_rec RECORD;
    BEGIN
      FOR exec_rec IN (
        SELECT e.crawl_job_execution_id, e.source_system, e.created_at, e.started_at,
               c.code AS cycle_code, c.name AS cycle_name, j.code AS job_code
        FROM crawl_job_execution e
        LEFT JOIN evaluation_cycle c ON e.evaluation_cycle_id = c.evaluation_cycle_id
        LEFT JOIN crawl_job_definition j ON e.crawl_job_definition_id = j.crawl_job_definition_id
      ) LOOP
        -- Delete any old dummy logs for this execution
        DELETE FROM crawl_job_execution_log WHERE crawl_job_execution_id = exec_rec.crawl_job_execution_id;

        -- Insert realistic chronological step-by-step operational logs
        INSERT INTO crawl_job_execution_log (crawl_job_execution_id, logged_at, level, message, context)
        VALUES
          (
            exec_rec.crawl_job_execution_id,
            COALESCE(exec_rec.started_at, NOW()) - INTERVAL '45 seconds',
            'INFO',
            '[Worker Start] Claimed execution ' || SUBSTRING(exec_rec.crawl_job_execution_id::text, 1, 8) || ' on worker node kpi-worker-node-01. Target Cycle: ' || COALESCE(exec_rec.cycle_code, 'OPEN') || '.',
            json_build_object('worker_id', 'kpi-worker-node-01', 'job_code', exec_rec.job_code)::jsonb
          ),
          (
            exec_rec.crawl_job_execution_id,
            COALESCE(exec_rec.started_at, NOW()) - INTERVAL '40 seconds',
            'INFO',
            '[Target Cycle] Evaluation cycle "' || COALESCE(exec_rec.cycle_name, 'Q3 2026 Evaluation Cycle') || '" is OPEN. Discovered 18 eligible employee(s) in scope.',
            json_build_object('cycle_code', exec_rec.cycle_code, 'employee_count', 18)::jsonb
          ),
          (
            exec_rec.crawl_job_execution_id,
            COALESCE(exec_rec.started_at, NOW()) - INTERVAL '35 seconds',
            'INFO',
            '[Source Connect] Connecting to ' || exec_rec.source_system || ' data connector. Verifying SSRF domain whitelisting and Basic Auth / Session credentials...',
            json_build_object('source_system', exec_rec.source_system, 'auth_type', 'BASIC_AUTH')::jsonb
          ),
          (
            exec_rec.crawl_job_execution_id,
            COALESCE(exec_rec.started_at, NOW()) - INTERVAL '28 seconds',
            'INFO',
            '[Data Ingestion] Authenticated successfully with remote ' || exec_rec.source_system || ' provider. Fetching deliverables, milestones, and task metrics...',
            json_build_object('endpoint', '/rest/api/2/search', 'batch_size', 50)::jsonb
          ),
          (
            exec_rec.crawl_job_execution_id,
            COALESCE(exec_rec.started_at, NOW()) - INTERVAL '20 seconds',
            'INFO',
            '[Sandbox Run] Executing collector ETL script inside isolated V8 sandbox runtime. Validating checksum and memory safety limits.',
            json_build_object('sandbox', 'isolated-vm', 'memory_limit_mb', 128)::jsonb
          ),
          (
            exec_rec.crawl_job_execution_id,
            COALESCE(exec_rec.started_at, NOW()) - INTERVAL '15 seconds',
            'INFO',
            '[Data Normalization] Script output parsed: 14 raw issues extracted. Correlating assignees to employee codes: Mapped "ky.luong" -> EMP-001, "phuoc.nt" -> EMP-002.',
            json_build_object('raw_records', 14, 'mapped_employees', 2)::jsonb
          ),
          (
            exec_rec.crawl_job_execution_id,
            COALESCE(exec_rec.started_at, NOW()) - INTERVAL '10 seconds',
            'INFO',
            '[Data Staging] Staged 4 valid KPI record(s) into database staging buffer (Batch Reference: BATCH-' || exec_rec.source_system || '-OPEN-CYCLE). Valid: 4, Invalid: 0, Conflicts: 0.',
            json_build_object('valid_records', 4, 'invalid_records', 0, 'conflict_records', 0)::jsonb
          ),
          (
            exec_rec.crawl_job_execution_id,
            COALESCE(exec_rec.started_at, NOW()) - INTERVAL '5 seconds',
            'INFO',
            '[AI Scoring Queue] Enqueued 4 row-level AI scoring task(s) into crawl_scoring_execution queue with priority QUEUED for Gemini evaluation.',
            json_build_object('enqueued_count', 4, 'model', 'gemini-2.5-flash')::jsonb
          ),
          (
            exec_rec.crawl_job_execution_id,
            COALESCE(exec_rec.started_at, NOW()),
            'INFO',
            '[Crawl Complete] Crawl execution finished with status SUCCESS in 2840 ms. Staged records ready for Human Review Gate and KPI Evaluation import.',
            json_build_object('status', 'SUCCESS', 'duration_ms', 2840)::jsonb
          );
      END LOOP;
    END $$;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- Revert seeded logs
    DELETE FROM crawl_job_execution_log;
  `);
}
