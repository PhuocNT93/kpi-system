import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('evaluation_item', {
    system_note: {
      type: 'text',
      notNull: false,
    },
    system_suggested_level: {
      type: 'integer',
      notNull: false,
    },
    system_suggested_score: {
      type: 'numeric',
      notNull: false,
    },
    system_source: {
      type: 'varchar(255)',
      notNull: false,
    },
  }, { ifNotExists: true });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('evaluation_item', 'system_source', { ifExists: true });
  pgm.dropColumn('evaluation_item', 'system_suggested_score', { ifExists: true });
  pgm.dropColumn('evaluation_item', 'system_suggested_level', { ifExists: true });
  pgm.dropColumn('evaluation_item', 'system_note', { ifExists: true });
}
