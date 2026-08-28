import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Drop the old 1-tier mapping table
  pgm.dropTable('template_criteria', { cascade: true });

  // Create template_kpi table (1st tier)
  pgm.createTable('template_kpis', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    template_version_id: { type: 'uuid', notNull: true, references: '"evaluation_template_versions"', onDelete: 'CASCADE' },
    kpi_id: { type: 'uuid', notNull: true, references: '"kpi"', onDelete: 'RESTRICT' },
    weight: { type: 'numeric(5,2)', notNull: true, default: 0 },
    display_order: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('template_kpis', 'template_kpi_unique', {
    unique: ['template_version_id', 'kpi_id'],
  });
  pgm.createIndex('template_kpis', 'template_version_id');

  // Create template_kpi_criteria table (2nd tier)
  pgm.createTable('template_kpi_criteria', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    template_kpi_id: { type: 'uuid', notNull: true, references: '"template_kpis"', onDelete: 'CASCADE' },
    criterion_version_id: { type: 'uuid', notNull: true, references: '"criterion_versions"', onDelete: 'RESTRICT' },
    weight: { type: 'numeric(5,2)', notNull: true, default: 0 },
    display_order: { type: 'integer', notNull: true, default: 1 },
    required: { type: 'boolean', notNull: true, default: true },
    enabled: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('template_kpi_criteria', 'template_kpi_criterion_unique', {
    unique: ['template_kpi_id', 'criterion_version_id'],
  });
  pgm.createIndex('template_kpi_criteria', 'template_kpi_id');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Revert the changes
  pgm.dropTable('template_kpi_criteria');
  pgm.dropTable('template_kpis');

  pgm.createTable('template_criteria', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    template_version_id: { type: 'uuid', notNull: true, references: '"evaluation_template_versions"', onDelete: 'CASCADE' },
    criterion_version_id: { type: 'uuid', notNull: true, references: '"criterion_versions"', onDelete: 'CASCADE' },
    weight: { type: 'numeric(5,2)', notNull: true, default: 0 },
    display_order: { type: 'integer', notNull: true, default: 1 },
    required: { type: 'boolean', notNull: true, default: true },
    enabled: { type: 'boolean', notNull: true, default: true },
    applicability: { type: 'jsonb', notNull: true, default: '{}' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('template_criteria', 'template_criteria_unique', {
    unique: ['template_version_id', 'criterion_version_id'],
  });
  pgm.createIndex('template_criteria', 'template_version_id');
}
