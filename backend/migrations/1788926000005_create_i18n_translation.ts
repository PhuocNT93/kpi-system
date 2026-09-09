import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "i18n_translation" (
      "translation_id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      "entity_type" varchar(50) NOT NULL,
      "entity_id" uuid NOT NULL,
      "field_name" varchar(50) NOT NULL,
      "locale" varchar(10) NOT NULL,
      "value" text NOT NULL,
      "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "created_by" uuid,
      "updated_by" uuid
    );
  `);

  pgm.sql(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_i18n_translation_entity_field_locale'
      ) THEN
        ALTER TABLE "i18n_translation"
        ADD CONSTRAINT "uq_i18n_translation_entity_field_locale"
        UNIQUE ("entity_type", "entity_id", "field_name", "locale");
      END IF;
    END $$;
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS "idx_i18n_translation_entity"
    ON "i18n_translation" ("entity_type", "entity_id");
  `);

  pgm.sql(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'i18n_translation_set_updated_at'
      ) THEN
        CREATE TRIGGER i18n_translation_set_updated_at
        BEFORE UPDATE ON i18n_translation
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;
  `);

  pgm.sql(`
    ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS locale varchar(10) NOT NULL DEFAULT 'en';
  `);

  pgm.sql(`
    ALTER TABLE evaluation_item
    ALTER COLUMN criterion_name_snapshot TYPE jsonb
    USING CASE
      WHEN criterion_name_snapshot IS NULL THEN NULL
      WHEN criterion_name_snapshot::text LIKE '{%' THEN criterion_name_snapshot::jsonb
      ELSE jsonb_build_object('en', criterion_name_snapshot::text)
    END;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('app_user', ['locale']);
  pgm.dropTable('i18n_translation');
}
