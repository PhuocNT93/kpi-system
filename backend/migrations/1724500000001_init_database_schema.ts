import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // --- 1. Organization ---
  pgm.createTable('team', {
    team_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(50)', notNull: true, unique: true },
    name: { type: 'varchar(200)', notNull: true },
    department_id: { type: 'uuid', notNull: true, references: '"department"' },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER team_set_updated_at BEFORE UPDATE ON team FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('role', {
    role_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(50)', notNull: true, unique: true },
    name: { type: 'varchar(200)', notNull: true },
    description: { type: 'text' },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER role_set_updated_at BEFORE UPDATE ON role FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('job_level', {
    job_level_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(50)', notNull: true, unique: true },
    name: { type: 'varchar(200)', notNull: true },
    rank: { type: 'int', notNull: true },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER job_level_set_updated_at BEFORE UPDATE ON job_level FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('employee', {
    employee_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    employee_code: { type: 'varchar(50)', notNull: true, unique: true },
    full_name: { type: 'varchar(200)', notNull: true },
    email: { type: 'varchar(200)', notNull: true, unique: true },
    department_id: { type: 'uuid', references: '"department"' },
    team_id: { type: 'uuid', references: '"team"' },
    role_id: { type: 'uuid', notNull: true, references: '"role"' },
    job_level_id: { type: 'uuid', notNull: true, references: '"job_level"' },
    manager_id: { type: 'uuid', references: '"employee"' },
    employment_status: { type: 'varchar(20)', notNull: true },
    join_date: { type: 'date', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER employee_set_updated_at BEFORE UPDATE ON employee FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
  pgm.createIndex('employee', 'team_id');
  pgm.createIndex('employee', 'manager_id');
  pgm.createIndex('employee', 'employment_status');

  pgm.createTable('employee_team_history', {
    employee_team_history_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    employee_id: { type: 'uuid', notNull: true, references: '"employee"' },
    team_id: { type: 'uuid', notNull: true, references: '"team"' },
    role_id: { type: 'uuid', notNull: true, references: '"role"' },
    effective_from: { type: 'date', notNull: true },
    effective_to: { type: 'date' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER employee_team_history_set_updated_at BEFORE UPDATE ON employee_team_history FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  // --- 2. Template & Criteria ---
  pgm.createTable('criterion', {
    criterion_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(50)', notNull: true, unique: true },
    category: { type: 'varchar(30)', notNull: true },
    name: { type: 'varchar(200)', notNull: true },
    description: { type: 'text' },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER criterion_set_updated_at BEFORE UPDATE ON criterion FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('scoring_rule', {
    scoring_rule_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    rule_type: { type: 'varchar(30)', notNull: true },
    rule_config: { type: 'jsonb', notNull: true },
    description: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER scoring_rule_set_updated_at BEFORE UPDATE ON scoring_rule FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('criterion_version', {
    criterion_version_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    criterion_id: { type: 'uuid', notNull: true, references: '"criterion"' },
    version_no: { type: 'int', notNull: true },
    default_weight: { type: 'numeric(5,2)', notNull: true },
    measurement_unit: { type: 'varchar(30)', notNull: true },
    measurement_source_label: { type: 'varchar(100)' },
    scoring_rule_id: { type: 'uuid', notNull: true, references: '"scoring_rule"' },
    effective_from: { type: 'timestamptz', notNull: true },
    effective_to: { type: 'timestamptz' },
    status: { type: 'varchar(20)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER criterion_version_set_updated_at BEFORE UPDATE ON criterion_version FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
  pgm.addConstraint('criterion_version', 'criterion_version_unique_constraint', { unique: ['criterion_id', 'version_no'] });

  pgm.createTable('criterion_level', {
    criterion_level_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    criterion_version_id: { type: 'uuid', notNull: true, references: '"criterion_version"' },
    level_no: { type: 'int', notNull: true },
    label_en: { type: 'varchar(200)' },
    label_vn: { type: 'varchar(200)' },
    score_value: { type: 'numeric(5,2)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER criterion_level_set_updated_at BEFORE UPDATE ON criterion_level FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('criterion_override', {
    criterion_override_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    criterion_version_id: { type: 'uuid', notNull: true, references: '"criterion_version"' },
    scope_type: { type: 'varchar(20)', notNull: true },
    scope_id: { type: 'uuid', notNull: true },
    override_weight: { type: 'numeric(5,2)' },
    override_scoring_rule_id: { type: 'uuid', references: '"scoring_rule"' },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER criterion_override_set_updated_at BEFORE UPDATE ON criterion_override FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('evaluation_template', {
    evaluation_template_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(50)', notNull: true, unique: true },
    name: { type: 'varchar(200)', notNull: true },
    description: { type: 'text' },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER evaluation_template_set_updated_at BEFORE UPDATE ON evaluation_template FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('evaluation_template_version', {
    evaluation_template_version_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    evaluation_template_id: { type: 'uuid', notNull: true, references: '"evaluation_template"' },
    version_no: { type: 'int', notNull: true },
    status: { type: 'varchar(20)', notNull: true },
    published_at: { type: 'timestamptz' },
    published_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER evaluation_template_version_set_updated_at BEFORE UPDATE ON evaluation_template_version FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
  pgm.addConstraint('evaluation_template_version', 'evaluation_template_version_unique_constraint', { unique: ['evaluation_template_id', 'version_no'] });

  pgm.createTable('template_criterion', {
    template_criterion_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    evaluation_template_version_id: { type: 'uuid', notNull: true, references: '"evaluation_template_version"' },
    criterion_version_id: { type: 'uuid', notNull: true, references: '"criterion_version"' },
    effective_weight: { type: 'numeric(5,2)', notNull: true },
    applicable_role_ids: { type: 'uuid[]' },
    applicable_team_ids: { type: 'uuid[]' },
    is_disabled: { type: 'boolean', notNull: true, default: false },
    display_order: { type: 'int', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER template_criterion_set_updated_at BEFORE UPDATE ON template_criterion FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  // --- 3. Evaluation Cycle & Evaluation ---
  pgm.createTable('evaluation_cycle', {
    evaluation_cycle_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(50)', notNull: true, unique: true },
    name: { type: 'varchar(200)', notNull: true },
    start_date: { type: 'date', notNull: true },
    end_date: { type: 'date', notNull: true },
    status: { type: 'varchar(20)', notNull: true },
    evaluation_template_version_id: { type: 'uuid', notNull: true, references: '"evaluation_template_version"' },
    applicable_team_ids: { type: 'uuid[]' },
    applicable_role_ids: { type: 'uuid[]' },
    approved_by: { type: 'uuid' },
    locked_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER evaluation_cycle_set_updated_at BEFORE UPDATE ON evaluation_cycle FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('evaluation', {
    evaluation_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    evaluation_cycle_id: { type: 'uuid', notNull: true, references: '"evaluation_cycle"' },
    employee_id: { type: 'uuid', notNull: true, references: '"employee"' },
    team_id_snapshot: { type: 'uuid', notNull: true },
    role_id_snapshot: { type: 'uuid', notNull: true },
    job_level_snapshot: { type: 'uuid' },
    manager_id_snapshot: { type: 'uuid' },
    status: { type: 'varchar(20)', notNull: true },
    self_score: { type: 'numeric(6,3)' },
    manager_score: { type: 'numeric(6,3)' },
    final_score: { type: 'numeric(6,3)' },
    submitted_at: { type: 'timestamptz' },
    approved_at: { type: 'timestamptz' },
    is_locked: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER evaluation_set_updated_at BEFORE UPDATE ON evaluation FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
  pgm.addConstraint('evaluation', 'evaluation_unique_constraint', { unique: ['evaluation_cycle_id', 'employee_id'] });

  pgm.createTable('evaluation_item', {
    evaluation_item_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    evaluation_id: { type: 'uuid', notNull: true, references: '"evaluation"' },
    template_criterion_id: { type: 'uuid', notNull: true, references: '"template_criterion"' },
    criterion_code_snapshot: { type: 'varchar(50)', notNull: true },
    criterion_name_snapshot: { type: 'varchar(200)', notNull: true },
    weight_snapshot: { type: 'numeric(5,2)', notNull: true },
    scoring_rule_snapshot: { type: 'jsonb', notNull: true },
    level_definition_snapshot: { type: 'jsonb', notNull: true },
    resolved_level: { type: 'int' },
    raw_score: { type: 'numeric(6,3)' },
    weighted_score: { type: 'numeric(6,3)' },
    is_disabled_for_employee: { type: 'boolean', notNull: true, default: false },
    is_missing_score: { type: 'boolean', notNull: true, default: false },
    comment: { type: 'text' },
    reviewer_id: { type: 'uuid' },
    review_date: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER evaluation_item_set_updated_at BEFORE UPDATE ON evaluation_item FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('measurement', {
    measurement_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    evaluation_item_id: { type: 'uuid', notNull: true, references: '"evaluation_item"' },
    measurement_key: { type: 'varchar(50)', notNull: true },
    measurement_value: { type: 'numeric(12,4)', notNull: true },
    measurement_unit: { type: 'varchar(30)' },
    source_label: { type: 'varchar(100)' },
    recorded_at: { type: 'timestamptz', notNull: true },
    recorded_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER measurement_set_updated_at BEFORE UPDATE ON measurement FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('evidence', {
    evidence_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    evaluation_item_id: { type: 'uuid', notNull: true, references: '"evaluation_item"' },
    evidence_type: { type: 'varchar(20)', notNull: true },
    evidence_value: { type: 'text', notNull: true },
    uploaded_by: { type: 'uuid', notNull: true },
    uploaded_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER evidence_set_updated_at BEFORE UPDATE ON evidence FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('score_adjustment', {
    score_adjustment_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    evaluation_item_id: { type: 'uuid', notNull: true, references: '"evaluation_item"' },
    old_score: { type: 'numeric', notNull: true },
    new_score: { type: 'numeric', notNull: true },
    reason: { type: 'text', notNull: true },
    adjusted_by: { type: 'uuid', notNull: true },
    adjusted_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER score_adjustment_set_updated_at BEFORE UPDATE ON score_adjustment FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  // --- 4. Workflow / Review / Approval ---
  pgm.createTable('review', {
    review_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    evaluation_id: { type: 'uuid', notNull: true, references: '"evaluation"' },
    reviewer_id: { type: 'uuid', notNull: true, references: '"employee"' },
    review_type: { type: 'varchar(20)', notNull: true },
    status: { type: 'varchar(20)', notNull: true },
    comment: { type: 'text' },
    reviewed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER review_set_updated_at BEFORE UPDATE ON review FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('approval', {
    approval_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    evaluation_id: { type: 'uuid', notNull: true, references: '"evaluation"' },
    approver_id: { type: 'uuid', notNull: true, references: '"employee"' },
    decision: { type: 'varchar(20)', notNull: true },
    comment: { type: 'text' },
    decided_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER approval_set_updated_at BEFORE UPDATE ON approval FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('workflow_definition', {
    workflow_definition_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(50)', notNull: true, unique: true },
    applicable_evaluation_template_id: { type: 'uuid', references: '"evaluation_template"' },
    steps: { type: 'jsonb', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER workflow_definition_set_updated_at BEFORE UPDATE ON workflow_definition FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  // --- 5. Calibration ---
  pgm.createTable('calibration_session', {
    calibration_session_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    evaluation_cycle_id: { type: 'uuid', notNull: true, references: '"evaluation_cycle"' },
    scope_type: { type: 'varchar(20)', notNull: true },
    scope_id: { type: 'uuid' },
    status: { type: 'varchar(20)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER calibration_session_set_updated_at BEFORE UPDATE ON calibration_session FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('calibration_adjustment', {
    calibration_adjustment_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    calibration_session_id: { type: 'uuid', notNull: true, references: '"calibration_session"' },
    evaluation_id: { type: 'uuid', notNull: true, references: '"evaluation"' },
    old_final_score: { type: 'numeric', notNull: true },
    new_final_score: { type: 'numeric', notNull: true },
    reason: { type: 'text', notNull: true },
    adjusted_by: { type: 'uuid', notNull: true },
    adjusted_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER calibration_adjustment_set_updated_at BEFORE UPDATE ON calibration_adjustment FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  // --- 6. CSV Import ---
  pgm.createTable('csv_template', {
    csv_template_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(50)', notNull: true, unique: true },
    version_no: { type: 'int', notNull: true },
    status: { type: 'varchar(20)', notNull: true },
    effective_from: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER csv_template_set_updated_at BEFORE UPDATE ON csv_template FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('csv_template_column', {
    csv_template_column_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    csv_template_id: { type: 'uuid', notNull: true, references: '"csv_template"' },
    column_name: { type: 'varchar(100)', notNull: true },
    data_type: { type: 'varchar(20)', notNull: true },
    required: { type: 'boolean', notNull: true, default: false },
    validation_rule: { type: 'jsonb' },
    display_order: { type: 'int', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER csv_template_column_set_updated_at BEFORE UPDATE ON csv_template_column FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.createTable('import_job', {
    import_job_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    csv_template_id: { type: 'uuid', notNull: true, references: '"csv_template"' },
    evaluation_cycle_id: { type: 'uuid', notNull: true, references: '"evaluation_cycle"' },
    file_name: { type: 'varchar(255)', notNull: true },
    file_hash: { type: 'varchar(64)', notNull: true },
    status: { type: 'varchar(20)', notNull: true },
    total_rows: { type: 'int' },
    success_rows: { type: 'int' },
    error_rows: { type: 'int' },
    imported_by: { type: 'uuid', notNull: true },
    started_at: { type: 'timestamptz', notNull: true },
    finished_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER import_job_set_updated_at BEFORE UPDATE ON import_job FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
  pgm.addConstraint('import_job', 'import_job_unique_constraint', { unique: ['evaluation_cycle_id', 'file_hash'] });

  pgm.createTable('import_row', {
    import_row_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    import_job_id: { type: 'uuid', notNull: true, references: '"import_job"' },
    row_no: { type: 'int', notNull: true },
    raw_data: { type: 'jsonb', notNull: true },
    status: { type: 'varchar(20)', notNull: true },
    error_messages: { type: 'jsonb' },
    evaluation_item_id: { type: 'uuid', references: '"evaluation_item"' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.sql(`CREATE TRIGGER import_row_set_updated_at BEFORE UPDATE ON import_row FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  // --- 7. Audit ---
  pgm.createTable('audit_log', {
    audit_log_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    entity_type: { type: 'varchar(50)', notNull: true },
    entity_id: { type: 'uuid', notNull: true },
    action: { type: 'varchar(20)', notNull: true },
    field_name: { type: 'varchar(100)' },
    old_value: { type: 'text' },
    new_value: { type: 'text' },
    reason: { type: 'text' },
    performed_by: { type: 'uuid', notNull: true, references: '"employee"' },
    performed_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    source: { type: 'varchar(20)', notNull: true }
  });
  pgm.createIndex('audit_log', ['entity_type', 'entity_id']);
  pgm.createIndex('audit_log', 'performed_at');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop tables in reverse order of dependencies
  pgm.dropTable('audit_log');
  
  pgm.dropTable('import_row');
  pgm.dropTable('import_job');
  pgm.dropTable('csv_template_column');
  pgm.dropTable('csv_template');
  
  pgm.dropTable('calibration_adjustment');
  pgm.dropTable('calibration_session');
  
  pgm.dropTable('workflow_definition');
  pgm.dropTable('approval');
  pgm.dropTable('review');
  
  pgm.dropTable('score_adjustment');
  pgm.dropTable('evidence');
  pgm.dropTable('measurement');
  pgm.dropTable('evaluation_item');
  pgm.dropTable('evaluation');
  pgm.dropTable('evaluation_cycle');
  
  pgm.dropTable('template_criterion');
  pgm.dropTable('evaluation_template_version');
  pgm.dropTable('evaluation_template');
  pgm.dropTable('criterion_override');
  pgm.dropTable('criterion_level');
  pgm.dropTable('criterion_version');
  pgm.dropTable('scoring_rule');
  pgm.dropTable('criterion');
  
  pgm.dropTable('employee_team_history');
  pgm.dropTable('employee');
  pgm.dropTable('job_level');
  pgm.dropTable('role');
  pgm.dropTable('team');
}
