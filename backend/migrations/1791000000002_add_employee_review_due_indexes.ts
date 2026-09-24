import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS "idx_employee_review_due_lookup"
    ON "employee" ("employment_status", "next_review_due_date")
    WHERE "next_review_due_date" IS NOT NULL;

    CREATE INDEX IF NOT EXISTS "idx_employee_team_employment_status"
    ON "employee" ("team_id", "employment_status");
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS "idx_employee_team_employment_status";
    DROP INDEX IF EXISTS "idx_employee_review_due_lookup";
  `);
}
