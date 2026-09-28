import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS criterion_category (
      code VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_criterion_category_status ON criterion_category(status);

    -- Seed default core categories
    INSERT INTO criterion_category (code, name, description, is_system, status)
    VALUES
      ('PERFORMANCE', 'Performance', 'Kết quả đầu ra, mức độ hoàn thành mục tiêu và KPI theo kỳ đánh giá.', TRUE, 'ACTIVE'),
      ('CAPABILITY', 'Capability', 'Năng lực chuyên môn, kỹ năng làm việc và mức độ đáp ứng vai trò.', TRUE, 'ACTIVE'),
      ('CONTRIBUTION', 'Contribution', 'Đóng góp cho tập thể, hỗ trợ đồng đội và ảnh hưởng tích cực đến tổ chức.', TRUE, 'ACTIVE'),
      ('BEHAVIOR', 'Behavior', 'Hành vi làm việc, tác phong chuyên nghiệp và tuân thủ văn hóa công ty.', FALSE, 'ACTIVE')
    ON CONFLICT (code) DO NOTHING;

    -- Also seed any existing distinct categories from criteria table if any
    INSERT INTO criterion_category (code, name, is_system, status)
    SELECT DISTINCT UPPER(TRIM(category)), INITCAP(TRIM(category)), FALSE, 'ACTIVE'
    FROM criteria
    WHERE category IS NOT NULL AND TRIM(category) <> ''
    ON CONFLICT (code) DO NOTHING;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TABLE IF EXISTS criterion_category CASCADE;
  `);
}
