import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * LLD §10.3 / §14.1 — distinguishes batch cycles from individual (per-employee) cycles.
 * Existing rows are batch cycles, so the column default backfills them as BATCH.
 * Idempotent: environments that applied an earlier draft of this migration under another name
 * keep working (columns, constraints and indexes are only created when missing).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE "evaluation_cycle"
      ADD COLUMN IF NOT EXISTS "cycle_type" varchar(20) NOT NULL DEFAULT 'BATCH',
      ADD COLUMN IF NOT EXISTS "triggered_by_employee_id" uuid NULL
        REFERENCES "employee" ("employee_id");
  `);

  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluation_cycle_type_check') THEN
        ALTER TABLE "evaluation_cycle"
          ADD CONSTRAINT "evaluation_cycle_type_check"
            CHECK (cycle_type IN ('BATCH', 'INDIVIDUAL_SCHEDULED'));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluation_cycle_trigger_consistency_check') THEN
        ALTER TABLE "evaluation_cycle"
          ADD CONSTRAINT "evaluation_cycle_trigger_consistency_check"
            CHECK ((cycle_type = 'INDIVIDUAL_SCHEDULED') = (triggered_by_employee_id IS NOT NULL));
      END IF;
    END $$;
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS "idx_evaluation_cycle_triggered_by_employee"
      ON "evaluation_cycle" ("triggered_by_employee_id");
    CREATE INDEX IF NOT EXISTS "idx_evaluation_cycle_type_status_start"
      ON "evaluation_cycle" ("cycle_type", "status", "start_date");
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS "idx_evaluation_cycle_type_status_start";
    DROP INDEX IF EXISTS "idx_evaluation_cycle_triggered_by_employee";
    ALTER TABLE "evaluation_cycle"
      DROP CONSTRAINT IF EXISTS "evaluation_cycle_trigger_consistency_check",
      DROP CONSTRAINT IF EXISTS "evaluation_cycle_type_check",
      DROP COLUMN IF EXISTS "triggered_by_employee_id",
      DROP COLUMN IF EXISTS "cycle_type";
  `);
}
