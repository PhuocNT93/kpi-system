import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS team_evaluation_formula (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID REFERENCES team(team_id) ON DELETE CASCADE,
      is_custom_override BOOLEAN DEFAULT FALSE,
      scale_max NUMERIC(3, 1) DEFAULT 5.0,
      components JSONB NOT NULL DEFAULT '[
        {
          "code": "Con.1",
          "name": "Performance (Kết quả công việc - Định lượng)",
          "weight": 40,
          "source_type": "JIRA_COLLECTOR",
          "scale_max": 5.0,
          "description": "Dựa trên KPI, Jira, tỷ lệ hoàn thành task"
        },
        {
          "code": "Con.2",
          "name": "Capability (Năng lực kỹ thuật - Định tính)",
          "weight": 30,
          "source_type": "MANUAL_RATING",
          "scale_max": 5.0,
          "description": "Dựa trên bài kiểm tra hoặc code review"
        },
        {
          "code": "Con.3",
          "name": "Contribution & Culture (Đóng góp tổ chức - Định tính)",
          "weight": 30,
          "source_type": "MANUAL_RATING",
          "scale_max": 5.0,
          "description": "Dựa trên thái độ, khả năng mentor/support, tham gia event",
          "sub_criteria": [
            { "code": "ATTITUDE", "name": "Attitude & Phối hợp", "weight": 10 },
            { "code": "MENTOR", "name": "Mentor & Hỗ trợ", "weight": 10 },
            { "code": "CULTURE", "name": "Culture & Events", "weight": 10 }
          ]
        }
      ]'::jsonb,
      rank_matrix JSONB NOT NULL DEFAULT '{
        "S": {
          "label": "Exceed Expectation",
          "min": 4.5,
          "max": 5.0,
          "description": "Chỉ những người thực sự xuất sắc (>4.5)",
          "raise_rates": {
            "<30m": [10, 15],
            "30m-50m": [10, 15],
            ">=50m": [10, 15]
          },
          "ceiling_action": "ONE_TIME_BONUS",
          "ceiling_note": "Lương sẽ bị đóng băng nếu chạm mức trần. Xem xét one-time bonus cho member đạt loại S."
        },
        "A": {
          "label": "Meet Expectation",
          "min": 3.0,
          "max": 4.49,
          "description": "Đại đa số nhân viên hoàn thành tốt công việc (3.0 - 4.4)",
          "raise_rates": {
            "<30m": [4, 8],
            "30m-50m": [4, 8],
            ">=50m": [4, 8]
          },
          "ceiling_action": "FREEZE",
          "ceiling_note": "Lương sẽ bị đóng băng nếu lương của member chạm mức trần."
        },
        "B": {
          "label": "Need Improvement",
          "min": 0.0,
          "max": 2.99,
          "description": "Nhân viên mới cần thời gian catch up hoặc nhân viên cũ chưa đạt yêu cầu với Level (<3)",
          "raise_rates": {
            "<30m": [0, 2],
            "30m-50m": [0, 2],
            ">=50m": [0, 0]
          },
          "ceiling_action": "FREEZE",
          "ceiling_note": "Tăng từ 0 - 2% hoặc không tăng."
        }
      }'::jsonb,
      version INT DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uq_team_eval_formula_global ON team_evaluation_formula ((team_id IS NULL)) WHERE team_id IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_team_eval_formula_team ON team_evaluation_formula (team_id) WHERE team_id IS NOT NULL;

    -- Seed Global Default nếu chưa có
    INSERT INTO team_evaluation_formula (team_id, is_custom_override, scale_max)
    SELECT NULL, FALSE, 5.0
    WHERE NOT EXISTS (SELECT 1 FROM team_evaluation_formula WHERE team_id IS NULL);

    -- Cập nhật bảng evaluation để lưu snapshot và rank
    ALTER TABLE evaluation
    ADD COLUMN IF NOT EXISTS formula_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS calculated_rank VARCHAR(10),
    ADD COLUMN IF NOT EXISTS salary_recommendation JSONB;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TABLE IF EXISTS team_evaluation_formula CASCADE;
    ALTER TABLE evaluation
    DROP COLUMN IF EXISTS formula_snapshot,
    DROP COLUMN IF EXISTS calculated_rank,
    DROP COLUMN IF EXISTS salary_recommendation;
  `);
}
