import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. employee_evaluation_score_read_model
  pgm.createTable('employee_evaluation_score_read_model', {
    evaluation_id: { type: 'uuid', primaryKey: true },
    evaluation_cycle_id: { type: 'uuid', notNull: true },
    employee_id: { type: 'uuid', notNull: true },
    team_id: { type: 'uuid' },
    role_id: { type: 'uuid' },
    job_level_id: { type: 'uuid' },
    cycle_status: { type: 'varchar(50)', notNull: true },
    evaluation_status: { type: 'varchar(50)', notNull: true },
    self_score: { type: 'numeric(10,4)' },
    manager_score: { type: 'numeric(10,4)' },
    final_score: { type: 'numeric(10,4)' },
    is_locked: { type: 'boolean', notNull: true, default: false },
    published_at: { type: 'timestamp' },
    locked_at: { type: 'timestamp' },
    last_refreshed_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });
  
  pgm.createIndex('employee_evaluation_score_read_model', ['employee_id', 'evaluation_cycle_id']);
  pgm.createIndex('employee_evaluation_score_read_model', ['team_id', 'evaluation_cycle_id']);

  // 2. employee_kpi_score_read_model
  pgm.createTable('employee_kpi_score_read_model', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    evaluation_id: { type: 'uuid', notNull: true },
    evaluation_cycle_id: { type: 'uuid', notNull: true },
    employee_id: { type: 'uuid', notNull: true },
    team_id: { type: 'uuid' },
    criterion_code: { type: 'varchar(255)', notNull: true },
    criterion_name: { type: 'varchar(255)', notNull: true },
    category: { type: 'varchar(255)' },
    weight_snapshot: { type: 'numeric(10,4)', notNull: true },
    resolved_level: { type: 'integer' },
    raw_score: { type: 'numeric(10,4)' },
    weighted_score: { type: 'numeric(10,4)' },
    is_disabled_for_employee: { type: 'boolean', notNull: true, default: false },
    is_missing_score: { type: 'boolean', notNull: true, default: false },
    kpi_score: { type: 'numeric(10,4)' },
    kpi_weighted_score: { type: 'numeric(10,4)' },
    last_refreshed_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });
  
  pgm.createIndex('employee_kpi_score_read_model', ['evaluation_id', 'criterion_code'], { unique: true });
  pgm.createIndex('employee_kpi_score_read_model', ['employee_id', 'evaluation_cycle_id']);
  pgm.createIndex('employee_kpi_score_read_model', ['team_id', 'evaluation_cycle_id']);

  // 3. team_evaluation_aggregate_read_model
  pgm.createTable('team_evaluation_aggregate_read_model', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    evaluation_cycle_id: { type: 'uuid', notNull: true },
    team_id: { type: 'uuid', notNull: true },
    team_average_score: { type: 'numeric(10,4)' },
    employee_count: { type: 'integer', notNull: true, default: 0 },
    completed_employee_count: { type: 'integer', notNull: true, default: 0 },
    completion_rate: { type: 'numeric(5,2)' },
    score_distribution: { type: 'jsonb' },
    last_refreshed_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });
  
  pgm.createIndex('team_evaluation_aggregate_read_model', ['team_id', 'evaluation_cycle_id'], { unique: true });

  // 4. team_kpi_aggregate_read_model
  pgm.createTable('team_kpi_aggregate_read_model', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    evaluation_cycle_id: { type: 'uuid', notNull: true },
    team_id: { type: 'uuid', notNull: true },
    criterion_code: { type: 'varchar(255)', notNull: true },
    criterion_name: { type: 'varchar(255)', notNull: true },
    category: { type: 'varchar(255)' },
    employee_count: { type: 'integer', notNull: true, default: 0 },
    completed_employee_count: { type: 'integer', notNull: true, default: 0 },
    kpi_score: { type: 'numeric(10,4)' },
    kpi_weighted_score: { type: 'numeric(10,4)' },
    last_refreshed_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });
  
  pgm.createIndex('team_kpi_aggregate_read_model', ['team_id', 'evaluation_cycle_id', 'criterion_code'], { unique: true });

  // 5. organization_aggregate_read_model
  pgm.createTable('organization_aggregate_read_model', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    evaluation_cycle_id: { type: 'uuid', notNull: true },
    department_id: { type: 'uuid' },
    team_id: { type: 'uuid' },
    employee_count: { type: 'integer', notNull: true, default: 0 },
    completed_employee_count: { type: 'integer', notNull: true, default: 0 },
    completion_rate: { type: 'numeric(5,2)' },
    average_score: { type: 'numeric(10,4)' },
    score_distribution: { type: 'jsonb' },
    last_refreshed_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });
  
  pgm.createIndex('organization_aggregate_read_model', ['evaluation_cycle_id', 'department_id', 'team_id']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('organization_aggregate_read_model');
  pgm.dropTable('team_kpi_aggregate_read_model');
  pgm.dropTable('team_evaluation_aggregate_read_model');
  pgm.dropTable('employee_kpi_score_read_model');
  pgm.dropTable('employee_evaluation_score_read_model');
}
