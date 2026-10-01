import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    INSERT INTO kpi (code, name, description, active)
    VALUES
      -- 1. Performance KPIs
      (
        'KPI_PERF_ON_TIME',
        '[EN] On-time Completion\n[VN] Hoàn thành đúng hạn',
        'Performance: Measures task on-time delivery rate against sprint/cycle deadlines.',
        true
      ),
      (
        'KPI_PERF_PLAN_MILESTONE',
        '[EN] Plan / Milestone Adherence\n[VN] Bám sát kế hoạch / Milestone',
        'Performance: Adherence to planned milestones and project roadmap schedules.',
        true
      ),
      (
        'KPI_PERF_ESTIMATION_DISCIPLINE',
        '[EN] Estimation & Planning Discipline\n[VN] Kỷ luật ước lượng & lập kế hoạch',
        'Performance: Accuracy in effort estimation, sprint capacity planning, and delivery predictability.',
        true
      ),
      (
        'KPI_PERF_OWNERSHIP_SCOPE',
        '[EN] Ownership Scope\n[VN] Phạm vi nhận việc',
        'Performance: Scope and initiative in taking ownership of critical epics, modules, and features.',
        true
      ),
      (
        'KPI_PERF_INDEPENDENCE',
        '[EN] Independence (Mentor Dependency)\n[VN] Tính độc lập (mức cần hỗ trợ)',
        'Performance: Ability to execute work autonomously without excessive mentor or lead intervention.',
        true
      ),

      -- 2. Capability KPIs
      (
        'KPI_CAP_TASK_QUALITY',
        '[EN] Task Quality — Bug & Rework\n[VN] Chất lượng — Bug & rework',
        'Capability: Low defect rate, minimal code rework, and defect containment in testing.',
        true
      ),
      (
        'KPI_CAP_PROD_INCIDENT',
        '[EN] Production Incident\n[VN] Sự cố Production',
        'Capability: Frequency and severity of production incidents or regressions caused.',
        true
      ),
      (
        'KPI_CAP_CORE_ENGINEERING',
        '[EN] Core Engineering Skillset\n[VN] Năng lực lập trình cốt lõi',
        'Capability: Engineering fundamentals, clean architecture, design patterns, and code maintainability.',
        true
      ),
      (
        'KPI_CAP_SQL_DATABASE',
        '[EN] SQL & Database\n[VN] SQL & Database',
        'Capability: Database design, query optimization, indexing, and migration discipline.',
        true
      ),
      (
        'KPI_CAP_CODE_REVIEW',
        '[EN] Code Review & Feedback\n[VN] Review code & góp ý',
        'Capability: Thoroughness and constructive value of pull request reviews and technical feedback.',
        true
      ),
      (
        'KPI_CAP_TESTING_DOCS',
        '[EN] Testing & Documentation\n[VN] Kiểm thử & tài liệu',
        'Capability: Comprehensive unit/integration testing coverage and technical documentation quality.',
        true
      ),
      (
        'KPI_CAP_BUSINESS_DOMAIN',
        '[EN] Business Domain Knowledge\n[VN] Kiến thức & vận dụng nghiệp vụ',
        'Capability: Deep understanding and correct application of shipping, logistics, and business domain rules.',
        true
      ),

      -- 3. Contribution KPIs
      (
        'KPI_CONTRIB_MENTORING',
        '[EN] Mentoring\n[VN] Mentoring',
        'Contribution: Active guidance, pairing, and onboarding of junior engineers and team members.',
        true
      ),
      (
        'KPI_CONTRIB_KNOWLEDGE_SHARING',
        '[EN] Knowledge Sharing\n[VN] Chia sẻ kiến thức',
        'Contribution: Organizing tech talks, sharing post-mortems, and writing engineering wiki guides.',
        true
      ),
      (
        'KPI_CONTRIB_TEAMWORK',
        '[EN] Teamwork & Communication\n[VN] Làm việc nhóm & giao tiếp',
        'Contribution: Collaboration, proactive status updates, and healthy cross-functional teamwork.',
        true
      ),
      (
        'KPI_CONTRIB_CUSTOMER_ENG',
        '[EN] Customer Communication & English\n[VN] Giao tiếp khách hàng & tiếng Anh',
        'Contribution: English proficiency and professional client/stakeholder communication.',
        true
      ),
      (
        'KPI_CONTRIB_IMPROVEMENTS',
        '[EN] Proposing Improvements\n[VN] Đề xuất cải tiến',
        'Contribution: Proactively proposing CI/CD, DX, performance, or process optimizations.',
        true
      ),
      (
        'KPI_CONTRIB_CULTURE',
        '[EN] Attitude & Company Culture\n[VN] Thái độ & văn hóa công ty',
        'Contribution: Positive demeanor, corporate culture championing, and company value adherence.',
        true
      )
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      active = true,
      updated_at = NOW();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DELETE FROM kpi WHERE code IN (
      'KPI_PERF_ON_TIME',
      'KPI_PERF_PLAN_MILESTONE',
      'KPI_PERF_ESTIMATION_DISCIPLINE',
      'KPI_PERF_OWNERSHIP_SCOPE',
      'KPI_PERF_INDEPENDENCE',
      'KPI_CAP_TASK_QUALITY',
      'KPI_CAP_PROD_INCIDENT',
      'KPI_CAP_CORE_ENGINEERING',
      'KPI_CAP_SQL_DATABASE',
      'KPI_CAP_CODE_REVIEW',
      'KPI_CAP_TESTING_DOCS',
      'KPI_CAP_BUSINESS_DOMAIN',
      'KPI_CONTRIB_MENTORING',
      'KPI_CONTRIB_KNOWLEDGE_SHARING',
      'KPI_CONTRIB_TEAMWORK',
      'KPI_CONTRIB_CUSTOMER_ENG',
      'KPI_CONTRIB_IMPROVEMENTS',
      'KPI_CONTRIB_CULTURE'
    );
  `);
}
