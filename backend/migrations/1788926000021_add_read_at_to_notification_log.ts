import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE "notification_log" 
    ADD COLUMN IF NOT EXISTS "read_at" timestamptz;

    CREATE INDEX IF NOT EXISTS "idx_notification_log_recipient_read"
    ON "notification_log" ("recipient_user_account_id", "read_at");
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS "idx_notification_log_recipient_read";
    ALTER TABLE "notification_log" DROP COLUMN IF EXISTS "read_at";
  `);
}
