import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Drop the old constraint if it exists
  pgm.sql(`ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_performed_by_fkey";`);
  
  // Use NOT VALID so it does not validate existing records and hit the append-only trigger
  pgm.sql(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'audit_log_performed_by_fkey'
      ) THEN
        ALTER TABLE "audit_log"
        ADD CONSTRAINT "audit_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "app_user"(id) NOT VALID;
      END IF;
    END $$;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_performed_by_fkey";`);
  
  pgm.sql(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'audit_log_performed_by_fkey'
      ) THEN
        ALTER TABLE "audit_log"
        ADD CONSTRAINT "audit_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "employee"(id) NOT VALID;
      END IF;
    END $$;
  `);
}
