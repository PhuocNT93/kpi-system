import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('template_criteria', {
    criterion_category: { type: 'varchar(50)', notNull: false },
  });

  pgm.sql(`
    UPDATE template_criteria tc
    SET criterion_category = c.category
    FROM criterion_versions cv
    JOIN criteria c ON c.id = cv.criterion_id
    WHERE tc.criterion_version_id = cv.id
      AND tc.criterion_category IS NULL
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('template_criteria', 'criterion_category');
}