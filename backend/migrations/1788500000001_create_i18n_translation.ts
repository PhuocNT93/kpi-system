import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('i18n_translation', {
    translation_id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    entity_type: { type: 'varchar(50)', notNull: true },
    entity_id: { type: 'uuid', notNull: true },
    field_name: { type: 'varchar(50)', notNull: true },
    locale: { type: 'varchar(10)', notNull: true },
    value: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
  });

  pgm.addConstraint('i18n_translation', 'uq_i18n_translation_entity_field_locale', {
    unique: ['entity_type', 'entity_id', 'field_name', 'locale'],
  });

  pgm.createIndex('i18n_translation', ['entity_type', 'entity_id'], { name: 'idx_i18n_translation_entity' });

  pgm.sql(`
    CREATE TRIGGER i18n_translation_set_updated_at
    BEFORE UPDATE ON i18n_translation
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);

  pgm.addColumns('app_user', {
    locale: { type: 'varchar(10)', notNull: true, default: 'en' },
  });

  pgm.sql(`
    ALTER TABLE evaluation_item
    ALTER COLUMN criterion_name_snapshot TYPE jsonb
    USING CASE
      WHEN criterion_name_snapshot LIKE '{%' THEN criterion_name_snapshot::jsonb
      ELSE jsonb_build_object('en', criterion_name_snapshot)
    END;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('app_user', ['locale']);
  pgm.dropTable('i18n_translation');
}
