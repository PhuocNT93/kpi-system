import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Staging table: evaluation_data_import
  pgm.createTable('evaluation_data_import', {
    import_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    source_system: { type: 'varchar(100)', notNull: true },
    batch_reference: { type: 'varchar(100)' },
    status: { type: 'varchar(50)', notNull: true, default: 'DRAFT' },
    raw_payload: { type: 'jsonb', notNull: true },
    record_count: { type: 'integer', notNull: true, default: 0 },
    success_count: { type: 'integer', notNull: true, default: 0 },
    error_count: { type: 'integer', notNull: true, default: 0 },
    conflict_count: { type: 'integer', notNull: true, default: 0 },
    created_by: { type: 'varchar(100)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    applied_at: { type: 'timestamptz' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createIndex('evaluation_data_import', ['status']);
  pgm.createIndex('evaluation_data_import', ['created_at']);

  // 2. Staging table: evaluation_data_import_record
  pgm.createTable('evaluation_data_import_record', {
    record_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    import_id: {
      type: 'uuid',
      notNull: true,
      references: '"evaluation_data_import"',
      onDelete: 'CASCADE',
    },
    employee_code: { type: 'varchar(100)', notNull: true },
    cycle_id: { type: 'uuid', notNull: true },
    kpi_code: { type: 'varchar(100)', notNull: true },
    value: { type: 'numeric(10,2)', notNull: true },
    comment: { type: 'text' },
    rationale: { type: 'text', notNull: true },
    source_snapshot: { type: 'jsonb', notNull: true },
    status: { type: 'varchar(50)', notNull: true, default: 'VALID' },
    error_message: { type: 'text' },
    conflicts: { type: 'jsonb' },
    evaluation_item_id: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createIndex('evaluation_data_import_record', ['import_id']);
  pgm.createIndex('evaluation_data_import_record', ['employee_code', 'cycle_id', 'kpi_code']);

  // 3. Staging table: evaluation_data_import_evidence
  pgm.createTable('evaluation_data_import_evidence', {
    staging_evidence_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    record_id: {
      type: 'uuid',
      notNull: true,
      references: '"evaluation_data_import_record"',
      onDelete: 'CASCADE',
    },
    evidence_type: { type: 'varchar(50)', notNull: true },
    title: { type: 'varchar(255)', notNull: true },
    evidence_url: { type: 'text' },
    file_reference: { type: 'varchar(500)' },
    description: { type: 'text' },
    metadata: { type: 'jsonb' },
    status: { type: 'varchar(50)', notNull: true, default: 'PENDING' },
    final_evidence_id: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createIndex('evaluation_data_import_evidence', ['record_id']);

  // 4. Extend evaluation_item
  pgm.addColumn('evaluation_item', {
    rationale: { type: 'text', notNull: false },
    import_id: {
      type: 'uuid',
      notNull: false,
      references: '"evaluation_data_import"',
      onDelete: 'SET NULL',
    },
    source_snapshot: { type: 'jsonb', notNull: false },
  }, { ifNotExists: true });

  // 5. Extend evidence
  pgm.alterColumn('evidence', 'uploaded_by', { notNull: false });
  pgm.alterColumn('evidence', 'evidence_value', { notNull: false });
  pgm.alterColumn('evidence', 'evidence_type', { type: 'varchar(50)' });

  pgm.addColumn('evidence', {
    title: { type: 'varchar(255)', notNull: true, default: '' },
    evidence_url: { type: 'text', notNull: false },
    file_reference: { type: 'varchar(500)', notNull: false },
    rationale: { type: 'text', notNull: false },
    source: { type: 'varchar(100)', notNull: false },
    source_import_id: {
      type: 'uuid',
      notNull: false,
      references: '"evaluation_data_import"',
      onDelete: 'SET NULL',
    },
    source_record_id: { type: 'uuid', notNull: false },
    metadata: { type: 'jsonb', notNull: false },
    status: { type: 'varchar(50)', notNull: true, default: 'ACTIVE' },
    superseded_by: {
      type: 'uuid',
      notNull: false,
      references: '"evidence"',
      onDelete: 'SET NULL',
    },
    superseded_at: { type: 'timestamptz', notNull: false },
    supersede_reason: { type: 'text', notNull: false },
  }, { ifNotExists: true });

  pgm.createIndex('evidence', ['evaluation_item_id', 'status']);

  // 6. Extend employee_kpi_score_read_model
  pgm.addColumn('employee_kpi_score_read_model', {
    has_evidence: { type: 'boolean', notNull: true, default: false },
    evidence_count: { type: 'integer', notNull: true, default: 0 },
    comment: { type: 'text', notNull: false },
  }, { ifNotExists: true });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('employee_kpi_score_read_model', ['has_evidence', 'evidence_count', 'comment'], { ifExists: true });

  pgm.dropColumn('evidence', [
    'title',
    'evidence_url',
    'file_reference',
    'rationale',
    'source',
    'source_import_id',
    'source_record_id',
    'metadata',
    'status',
    'superseded_by',
    'superseded_at',
    'supersede_reason',
  ], { ifExists: true });

  pgm.dropColumn('evaluation_item', ['rationale', 'import_id', 'source_snapshot'], { ifExists: true });

  pgm.dropTable('evaluation_data_import_evidence', { ifExists: true });
  pgm.dropTable('evaluation_data_import_record', { ifExists: true });
  pgm.dropTable('evaluation_data_import', { ifExists: true });
}
