import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('kpi', {
    active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
  }, { ifNotExists: true });

  pgm.createIndex('kpi', 'active', { ifNotExists: true });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('kpi', 'active', { ifExists: true });
  pgm.dropColumn('kpi', 'active', { ifExists: true });
}
