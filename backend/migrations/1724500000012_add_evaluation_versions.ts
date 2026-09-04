import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('evaluation', {
    version: { type: 'integer', notNull: true, default: 1 },
  });
  pgm.addColumn('evaluation_item', {
    version: { type: 'integer', notNull: true, default: 1 },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('evaluation_item', 'version');
  pgm.dropColumn('evaluation', 'version');
}