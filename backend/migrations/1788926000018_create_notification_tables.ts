import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. notification_template
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "notification_template" (
      "notification_template_id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      "code" varchar(50) NOT NULL UNIQUE,
      "active" boolean NOT NULL DEFAULT true,
      "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  pgm.sql(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'notification_template_set_updated_at'
      ) THEN
        CREATE TRIGGER notification_template_set_updated_at
        BEFORE UPDATE ON notification_template
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;
  `);

  // 2. notification_log (Transactional Outbox)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "notification_log" (
      "notification_log_id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      "notification_type" varchar(50) NOT NULL,
      "related_entity_type" varchar(50),
      "related_entity_id" uuid,
      "recipient_user_account_id" uuid NOT NULL REFERENCES "app_user"("id") ON DELETE CASCADE,
      "recipient_email" varchar(200) NOT NULL,
      "locale_used" varchar(10) NOT NULL DEFAULT 'en',
      "subject_rendered" text NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'PENDING',
      "retry_count" int NOT NULL DEFAULT 0,
      "error_message" text,
      "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "sent_at" timestamptz,
      "read_at" timestamptz
    );

    ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "read_at" timestamptz;
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS "idx_notification_log_status_created_at"
    ON "notification_log" ("status", "created_at");
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS "idx_notification_log_recipient"
    ON "notification_log" ("recipient_user_account_id");
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS "idx_notification_log_recipient_read"
    ON "notification_log" ("recipient_user_account_id", "read_at");
  `);

  // 3. user_notification_preference
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "user_notification_preference" (
      "user_account_id" uuid NOT NULL REFERENCES "app_user"("id") ON DELETE CASCADE,
      "notification_type" varchar(50) NOT NULL,
      "enabled" boolean NOT NULL DEFAULT true,
      "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
      CONSTRAINT "user_notification_preference_pkey" PRIMARY KEY ("user_account_id", "notification_type")
    );
  `);

  pgm.sql(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'user_notification_preference_set_updated_at'
      ) THEN
        CREATE TRIGGER user_notification_preference_set_updated_at
        BEFORE UPDATE ON user_notification_preference
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;
  `);

  // 4. Seed initial template codes
  pgm.sql(`
    INSERT INTO "notification_template" ("code", "active")
    VALUES 
      ('CYCLE_OPENED', true),
      ('SELF_SUBMITTED', true),
      ('MANAGER_SUBMITTED', true),
      ('CORRECTION_REQUESTED', true),
      ('RESULT_PUBLISHED', true),
      ('SCORE_ADJUSTED', true),
      ('REVIEW_DUE_REMINDER', true),
      ('IMPORT_COMPLETED', true),
      ('CYCLE_LOCKED', true)
    ON CONFLICT ("code") DO NOTHING;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('user_notification_preference');
  pgm.dropTable('notification_log');
  pgm.dropTable('notification_template');
}
