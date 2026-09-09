import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Drop the old constraint if it exists
  pgm.sql(`ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_performed_by_fkey";`);
  
  // Clean up invalid foreign keys before adding the constraint
  pgm.sql(`
    UPDATE "audit_log"
    SET performed_by = NULL
    WHERE performed_by IS NOT NULL 
    AND performed_by NOT IN (SELECT id FROM "app_user");
  `);

  // Add new constraint referencing app_user idempotently
  pgm.sql(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'audit_log_performed_by_fkey'
      ) THEN
        ALTER TABLE "audit_log"
        ADD CONSTRAINT "audit_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "app_user"(id);
      END IF;
    END $$;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_performed_by_fkey";`);
  
  pgm.sql(`
    UPDATE "audit_log"
    SET performed_by = NULL
    WHERE performed_by IS NOT NULL 
    AND performed_by NOT IN (SELECT id FROM "employee");
  `);

  pgm.sql(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'audit_log_performed_by_fkey'
      ) THEN
        ALTER TABLE "audit_log"
        ADD CONSTRAINT "audit_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "employee"(id);
      END IF;
    END $$;
  `);
}
