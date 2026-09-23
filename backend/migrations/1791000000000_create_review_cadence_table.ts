import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Create review_cadence table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "review_cadence" (
      "review_cadence_id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      "code"              varchar(30) NOT NULL UNIQUE,
      "name"              varchar(100) NOT NULL,
      "interval_months"   integer NOT NULL,
      "is_system_default" boolean NOT NULL DEFAULT false,
      "active"            boolean NOT NULL DEFAULT true,
      "created_at"        timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updated_at"        timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
      CONSTRAINT "review_cadence_interval_months_positive" CHECK (interval_months > 0)
    );
  `);

  // 2. Unique partial index: at most one is_system_default = true row
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_review_cadence_system_default"
    ON "review_cadence" (is_system_default)
    WHERE is_system_default = true;
  `);

  // 3. Trigger: auto-update updated_at
  pgm.sql(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'review_cadence_set_updated_at'
      ) THEN
        CREATE TRIGGER review_cadence_set_updated_at
        BEFORE UPDATE ON review_cadence
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;
  `);

  // 4. Seed system-default cadence
  pgm.sql(`
    INSERT INTO "review_cadence" ("code", "name", "interval_months", "is_system_default", "active")
    VALUES ('SEMI_ANNUAL', 'Semi-Annual (6 months)', 6, true, true)
    ON CONFLICT ("code") DO NOTHING;
  `);

  // 5. Add default_review_cadence_id FK to job_level
  pgm.sql(`
    ALTER TABLE "job_level"
    ADD COLUMN IF NOT EXISTS "default_review_cadence_id" uuid
      REFERENCES "review_cadence"("review_cadence_id") ON DELETE SET NULL;
  `);

  // 6. Add review_cadence_override_id FK to employee
  pgm.sql(`
    ALTER TABLE "employee"
    ADD COLUMN IF NOT EXISTS "review_cadence_override_id" uuid
      REFERENCES "review_cadence"("review_cadence_id") ON DELETE SET NULL;
  `);

  // 7. Index for FK lookups
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS "idx_job_level_default_review_cadence_id"
    ON "job_level" ("default_review_cadence_id");

    CREATE INDEX IF NOT EXISTS "idx_employee_review_cadence_override_id"
    ON "employee" ("review_cadence_override_id");
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove FK columns first, then the table
  pgm.sql(`ALTER TABLE "employee" DROP COLUMN IF EXISTS "review_cadence_override_id";`);
  pgm.sql(`ALTER TABLE "job_level" DROP COLUMN IF EXISTS "default_review_cadence_id";`);
  pgm.sql(`DROP INDEX IF EXISTS "uq_review_cadence_system_default";`);
  pgm.sql(`DROP TABLE IF EXISTS "review_cadence";`);
}
