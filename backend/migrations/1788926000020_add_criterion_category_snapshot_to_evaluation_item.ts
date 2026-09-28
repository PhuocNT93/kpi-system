import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('evaluation_item', {
    criterion_category_snapshot: { type: 'varchar(50)', notNull: false },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('evaluation_item', 'criterion_category_snapshot');
}