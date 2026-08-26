import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Criteria
  pgm.createTable('criteria', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(100)', notNull: true, unique: true },
    category: { type: 'varchar(50)', notNull: true },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    status: { type: 'varchar(20)', notNull: true, default: 'ACTIVE' },
    version: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_by: { type: 'uuid' },
  });
  pgm.createIndex('criteria', 'code');
  pgm.createIndex('criteria', 'status');

  // 2. Scoring Rules
  pgm.createTable('scoring_rules', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(100)', notNull: true, unique: true },
    name: { type: 'varchar(255)', notNull: true },
    rule_type: { type: 'varchar(50)', notNull: true },
    config: { type: 'jsonb', notNull: true, default: '{}' },
    status: { type: 'varchar(20)', notNull: true, default: 'DRAFT' },
    version: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_by: { type: 'uuid' },
  });
  pgm.createIndex('scoring_rules', 'code');
  pgm.createIndex('scoring_rules', 'status');

  // 3. Criterion Versions
  pgm.createTable('criterion_versions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    criterion_id: { type: 'uuid', notNull: true, references: '"criteria"', onDelete: 'CASCADE' },
    version_no: { type: 'integer', notNull: true },
    default_weight: { type: 'numeric(5,2)', notNull: true, default: 0 },
    measurement_unit: { type: 'varchar(50)', notNull: true },
    measurement_source_label: { type: 'varchar(100)' },
    scoring_rule_id: { type: 'uuid', references: '"scoring_rules"' },
    effective_from: { type: 'date' },
    effective_to: { type: 'date' },
    status: { type: 'varchar(20)', notNull: true, default: 'DRAFT' },
    version: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
  });
  pgm.addConstraint('criterion_versions', 'criterion_version_unique', {
    unique: ['criterion_id', 'version_no'],
  });
  pgm.createIndex('criterion_versions', 'criterion_id');
  pgm.createIndex('criterion_versions', 'status');

  // 4. Evaluation Levels
  pgm.createTable('evaluation_levels', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(50)', notNull: true, unique: true },
    level_number: { type: 'integer', notNull: true },
    name: { type: 'varchar(100)', notNull: true },
    description: { type: 'text' },
    score_value: { type: 'numeric(5,2)', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: 'ACTIVE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createIndex('evaluation_levels', 'code');

  // 5. Evaluation Templates
  pgm.createTable('evaluation_templates', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(100)', notNull: true, unique: true },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    status: { type: 'varchar(20)', notNull: true, default: 'DRAFT' },
    current_version_id: { type: 'uuid' },
    version: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_by: { type: 'uuid' },
  });
  pgm.createIndex('evaluation_templates', 'code');
  pgm.createIndex('evaluation_templates', 'status');

  // 6. Evaluation Template Versions
  pgm.createTable('evaluation_template_versions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    template_id: { type: 'uuid', notNull: true, references: '"evaluation_templates"', onDelete: 'CASCADE' },
    version_no: { type: 'integer', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: 'DRAFT' },
    weight_total_policy: { type: 'varchar(50)', notNull: true, default: 'EXACT_100' },
    effective_from: { type: 'date' },
    effective_to: { type: 'date' },
    version: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
  });
  pgm.addConstraint('evaluation_template_versions', 'template_version_unique', {
    unique: ['template_id', 'version_no'],
  });
  pgm.createIndex('evaluation_template_versions', 'template_id');

  // Add FK for current_version_id after table creation
  pgm.addConstraint('evaluation_templates', 'fk_templates_current_version', {
    foreignKeys: {
      columns: 'current_version_id',
      references: 'evaluation_template_versions(id)',
      onDelete: 'SET NULL',
    },
  });

  // 7. Template Criteria
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

  // 8. Role Overrides
  pgm.createTable('role_overrides', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    role_code: { type: 'varchar(50)', notNull: true },
    template_version_id: { type: 'uuid', references: '"evaluation_template_versions"', onDelete: 'CASCADE' },
    criterion_version_id: { type: 'uuid', notNull: true, references: '"criterion_versions"', onDelete: 'CASCADE' },
    override_config: { type: 'jsonb', notNull: true, default: '{}' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
  });

  // 9. Team Overrides
  pgm.createTable('team_overrides', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    team_code: { type: 'varchar(50)', notNull: true },
    template_version_id: { type: 'uuid', references: '"evaluation_template_versions"', onDelete: 'CASCADE' },
    criterion_version_id: { type: 'uuid', notNull: true, references: '"criterion_versions"', onDelete: 'CASCADE' },
    override_config: { type: 'jsonb', notNull: true, default: '{}' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
  });

  // 10. Template Overrides
  pgm.createTable('template_overrides', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    template_version_id: { type: 'uuid', notNull: true, references: '"evaluation_template_versions"', onDelete: 'CASCADE' },
    criterion_version_id: { type: 'uuid', notNull: true, references: '"criterion_versions"', onDelete: 'CASCADE' },
    override_config: { type: 'jsonb', notNull: true, default: '{}' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
  });

  // 11. Workflow Definitions
  pgm.createTable('workflow_definitions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(100)', notNull: true, unique: true },
    name: { type: 'varchar(255)', notNull: true },
    version_no: { type: 'integer', notNull: true, default: 1 },
    status: { type: 'varchar(20)', notNull: true, default: 'DRAFT' },
    version: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
  });

  // 12. Workflow States
  pgm.createTable('workflow_states', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    workflow_definition_id: { type: 'uuid', notNull: true, references: '"workflow_definitions"', onDelete: 'CASCADE' },
    code: { type: 'varchar(50)', notNull: true },
    name: { type: 'varchar(100)', notNull: true },
    type: { type: 'varchar(50)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('workflow_states', 'workflow_states_unique', {
    unique: ['workflow_definition_id', 'code'],
  });

  // 13. Workflow Transitions
  pgm.createTable('workflow_transitions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    workflow_definition_id: { type: 'uuid', notNull: true, references: '"workflow_definitions"', onDelete: 'CASCADE' },
    from_state: { type: 'varchar(50)', notNull: true },
    action: { type: 'varchar(50)', notNull: true },
    to_state: { type: 'varchar(50)', notNull: true },
    allowed_roles: { type: 'jsonb', notNull: true, default: '[]' },
    validation_policy: { type: 'jsonb', notNull: true, default: '{}' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  // 14. Configuration Audit Logs
  pgm.createTable('configuration_audit_logs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    entity_type: { type: 'varchar(50)', notNull: true },
    entity_id: { type: 'varchar(100)', notNull: true },
    action: { type: 'varchar(50)', notNull: true },
    performed_by: { type: 'varchar(100)', notNull: true },
    timestamp: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    changes: { type: 'jsonb', notNull: true, default: '{}' },
    reason: { type: 'text' },
  });
  pgm.createIndex('configuration_audit_logs', 'entity_type');
  pgm.createIndex('configuration_audit_logs', 'entity_id');
  pgm.createIndex('configuration_audit_logs', 'timestamp');

  // Insert Configuration RBAC Permissions
  const permissions = [
    ['CONFIGURATION_READ', 'configuration', 'read', 'View configuration entities'],
    ['CONFIGURATION_CREATE', 'configuration', 'create', 'Create configuration entities'],
    ['CONFIGURATION_UPDATE', 'configuration', 'update', 'Update configuration entities'],
    ['CONFIGURATION_VALIDATE', 'configuration', 'validate', 'Validate configuration entities'],
    ['CONFIGURATION_PUBLISH', 'configuration', 'publish', 'Publish configuration entities'],
    ['CONFIGURATION_RETIRE', 'configuration', 'retire', 'Retire configuration entities'],
    ['CONFIGURATION_OVERRIDE', 'configuration', 'override', 'Manage configuration overrides'],
    ['CONFIGURATION_AUDIT_READ', 'configuration', 'audit_read', 'View configuration audit logs'],
  ];

  for (const [code, resource, action, desc] of permissions) {
    pgm.sql(
      `INSERT INTO permission (code, resource, action, description) VALUES ('${code}', '${resource}', '${action}', '${desc}') ON CONFLICT (code) DO NOTHING;`
    );
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('configuration_audit_logs');
  pgm.dropTable('workflow_transitions');
  pgm.dropTable('workflow_states');
  pgm.dropTable('workflow_definitions');
  pgm.dropTable('template_overrides');
  pgm.dropTable('team_overrides');
  pgm.dropTable('role_overrides');
  pgm.dropTable('template_criteria');
  pgm.dropConstraint('evaluation_templates', 'fk_templates_current_version');
  pgm.dropTable('evaluation_template_versions');
  pgm.dropTable('evaluation_templates');
  pgm.dropTable('evaluation_levels');
  pgm.dropTable('criterion_versions');
  pgm.dropTable('scoring_rules');
  pgm.dropTable('criteria');
}