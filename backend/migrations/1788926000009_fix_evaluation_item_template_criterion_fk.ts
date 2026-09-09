import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE evaluation_item 
    DROP CONSTRAINT IF EXISTS evaluation_item_template_criterion_id_fkey;

    ALTER TABLE evaluation_item
    ADD CONSTRAINT evaluation_item_template_criterion_id_fkey
    FOREIGN KEY (template_criterion_id)
    REFERENCES template_criteria(id)
    ON DELETE RESTRICT;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE evaluation_item 
    DROP CONSTRAINT IF EXISTS evaluation_item_template_criterion_id_fkey;

    ALTER TABLE evaluation_item
    ADD CONSTRAINT evaluation_item_template_criterion_id_fkey
    FOREIGN KEY (template_criterion_id)
    REFERENCES template_criterion(template_criterion_id)
    ON DELETE RESTRICT;
  `);
}
