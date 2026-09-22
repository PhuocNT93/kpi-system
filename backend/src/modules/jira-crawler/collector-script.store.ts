import { Pool } from 'pg';

export interface RubricThreshold {
  min: number;
  max: number;
  level: number;
  score: number;
}

export interface MetricRubric {
  metric: string;
  inverse?: boolean;
  thresholds: RubricThreshold[];
}

export interface ScoringRubricConfig {
  PERF_01?: MetricRubric;
  CODE_QUALITY?: MetricRubric;
  TASK_VOLUME?: MetricRubric;
  OWNERSHIP_SCOPE?: MetricRubric;
  INDEPENDENCE?: MetricRubric;
  weights?: Record<string, number>;
}

export interface CollectorScriptConfig {
  id?: string;
  scriptCode: string;
  name: string;
  description: string;
  targetSystem: string;
  jqlTemplate: string;
  picCustomField: string;
  completedStatuses: string[];
  bugIssueTypes: string[];
  criticalPriorities: string[];
  includeWorklogs: boolean;
  leadTimeDays: number;
  defaultFromDays: number;
  geminiModel: string;
  scoringRubric: ScoringRubricConfig;
  transformScript: string;
  aiPromptTemplate: string;
  aiTaskPromptTemplate: string;
  isActive: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_SCORING_RUBRIC: ScoringRubricConfig = {
  PERF_01: {
    metric: 'onTimeRate',
    thresholds: [
      { min: 95, max: 100, level: 5, score: 100 },
      { min: 90, max: 94.99, level: 4, score: 95 },
      { min: 80, max: 89.99, level: 3, score: 85 },
      { min: 70, max: 79.99, level: 2, score: 75 },
      { min: 0,  max: 69.99, level: 1, score: 60 }
    ]
  },
  CODE_QUALITY: {
    metric: 'criticalBugs',
    inverse: true,
    thresholds: [
      { min: 0, max: 0,   level: 5, score: 100 },
      { min: 1, max: 1,   level: 4, score: 95 },
      { min: 2, max: 3,   level: 3, score: 85 },
      { min: 4, max: 5,   level: 2, score: 75 },
      { min: 6, max: 999, level: 1, score: 60 }
    ]
  },
  TASK_VOLUME: {
    metric: 'completedTasks',
    thresholds: [
      { min: 30, max: 999, level: 5, score: 100 },
      { min: 20, max: 29,  level: 4, score: 95 },
      { min: 10, max: 19,  level: 3, score: 85 },
      { min: 5,  max: 9,   level: 2, score: 75 },
      { min: 0,  max: 4,   level: 1, score: 60 }
    ]
  },
  OWNERSHIP_SCOPE: {
    metric: 'avgComplexityScore',
    thresholds: [
      { min: 4.5, max: 5.0, level: 5, score: 100 },
      { min: 3.5, max: 4.49, level: 4, score: 95 },
      { min: 2.5, max: 3.49, level: 3, score: 85 },
      { min: 1.5, max: 2.49, level: 2, score: 75 },
      { min: 0.0, max: 1.49, level: 1, score: 60 }
    ]
  },
  INDEPENDENCE: {
    metric: 'avgContributionScore',
    thresholds: [
      { min: 4.5, max: 5.0, level: 5, score: 100 },
      { min: 3.5, max: 4.49, level: 4, score: 95 },
      { min: 2.5, max: 3.49, level: 3, score: 85 },
      { min: 1.5, max: 2.49, level: 2, score: 75 },
      { min: 0.0, max: 1.49, level: 1, score: 60 }
    ]
  },
  weights: {
    PERF_01: 0.25,
    CODE_QUALITY: 0.20,
    TASK_VOLUME: 0.15,
    OWNERSHIP_SCOPE: 0.20,
    INDEPENDENCE: 0.20
  }
};

export const DEFAULT_AI_TASK_PROMPT = `Bạn là Technical Lead đánh giá task Jira của kỹ sư phần mềm.
Hãy phân tích task sau và chấm 2 thang điểm từ 1 đến 5:
- Task: {{key}} - {{summary}}
- Loại: {{issueType}}, Độ ưu tiên: {{priority}}, Trạng thái: {{status}}
- Thời gian ước tính: {{originalEstimateHours}}h, Thực tế: {{timeSpentHours}}h
- Mô tả tóm tắt: {{description}}

Thang điểm (1 đến 5):
1. complexityScore (Độ phức tạp kỹ thuật):
   1: Task rất đơn giản, sửa text, fix typo, thay đổi nhỏ
   2: Task cơ bản, sửa bug đơn giản, UI tweak
   3: Feature tiêu chuẩn, logic nghiệp vụ thông thường
   4: Feature phức tạp, tích hợp nhiều module, tối ưu hiệu năng
   5: Task kiến trúc hệ thống, giải pháp kỹ thuật cốt lõi, vấn đề nan giải
2. contributionScore (Mức độ đóng góp và tự chủ):
   1: Đóng góp tối thiểu hoặc cần hỗ trợ rất nhiều
   2: Thực hiện với hướng dẫn chi tiết
   3: Hoàn thành độc lập theo spec
   4: Đề xuất giải pháp tốt, chủ động giải quyết phát sinh
   5: Đóng vai trò then chốt, dẫn dắt hoặc giải quyết vấn đề lớn của team

Trả về DUY NHẤT một chuỗi JSON hợp lệ theo schema:
{
  "complexityScore": <1-5>,
  "complexityRationale": "<Lập luận ngắn gọn 1 câu>",
  "contributionScore": <1-5>,
  "contributionRationale": "<Lập luận ngắn gọn 1 câu>"
}`;

export const DEFAULT_JIRA_COLLECTOR_SCRIPT: CollectorScriptConfig = {
  scriptCode: 'jira-pim-clv',
  name: 'CyberLogitec Jira PIM Dynamic Collector',
  description: 'Bộ quy tắc cào dữ liệu Jira PIM CyberLogitec theo Assignee & Custom Field PIC (cf[11902])',
  targetSystem: 'JIRA',
  jqlTemplate: '(assignee = "{{employee_code}}" OR cf[{{pic_field}}] = "{{employee_code}}") {{date_filter}} ORDER BY updated DESC',
  picCustomField: '11902',
  completedStatuses: ['Done', 'Closed', 'Resolved', 'Complete'],
  bugIssueTypes: ['Bug', 'Defect', 'Int_Bug Management', 'Ext_Bug Management'],
  criticalPriorities: ['Critical', 'Highest', 'Blocker'],
  includeWorklogs: false,
  leadTimeDays: 7,
  defaultFromDays: 180,
  geminiModel: 'gemini-2.0-flash-lite',
  scoringRubric: DEFAULT_SCORING_RUBRIC,
  transformScript: `// Script xử lý và lọc thêm task (nếu cần tinh chỉnh ngoài JQL)
function filterAndTransformIssues(issues, member) {
  // Mặc định giữ lại tất cả các task đã lọc bởi JQL
  return issues;
}`,
  aiPromptTemplate: `Bạn là Giám đốc kỹ thuật tại CyberLogitec Việt Nam. Hãy đánh giá hiệu suất nhân viên dựa trên dữ liệu Jira PIM thực tế:
- Nhân viên: {{memberName}} (Mã NV: {{employeeCode}})
- Hoàn thành: {{completedTasks}}/{{totalTasks}} nhiệm vụ (Chưa đóng/Đang mở: {{inProgressTasks}})
- Tỷ lệ đúng hạn: {{onTimeRate}}% (Đúng hạn: {{onTimeTasks}}, Trễ: {{delayedTasks}})
- Bug phát sinh: {{totalBugs}} bugs (Nghiêm trọng: {{criticalBugs}}, Đã fix: {{resolvedBugs}})
- Tổng giờ công: {{totalHoursSpent}} giờ
- Task tiêu biểu: {{sampleTasks}}

Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ theo schema sau (tiếng Việt chuyên nghiệp):
{
  "perfComment": "Nhận xét 1 câu súc tích về tiến độ hoàn thành đúng hạn",
  "perfRationale": "Lập luận 1-2 câu giải thích mức độ cam kết tiến độ và ảnh hưởng",
  "qualityComment": "Nhận xét 1 câu súc tích về chất lượng mã nguồn và xử lý lỗi",
  "qualityRationale": "Lập luận 1-2 câu giải thích về kiểm soát lỗi và độ ổn định",
  "volumeComment": "Nhận xét 1 câu súc tích về năng suất và khối lượng bàn giao",
  "volumeRationale": "Lập luận 1-2 câu giải thích đóng góp tổng thể và tinh thần trách nhiệm"
}`,
  aiTaskPromptTemplate: DEFAULT_AI_TASK_PROMPT,
  isActive: true,
  updatedAt: new Date().toISOString(),
};

let cachedConfig: CollectorScriptConfig = { ...DEFAULT_JIRA_COLLECTOR_SCRIPT };

export class CollectorScriptStore {
  private pool: Pool;
  private tableInitialized = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Đảm bảo bảng collector_script tồn tại trong DB và có đầy đủ cột
   */
  private async ensureTable(): Promise<void> {
    if (this.tableInitialized) return;
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS collector_script (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          script_code VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          target_system VARCHAR(50) NOT NULL DEFAULT 'JIRA',
          jql_template TEXT NOT NULL,
          pic_custom_field VARCHAR(50) DEFAULT '11902',
          completed_statuses JSONB NOT NULL DEFAULT '["Done","Closed","Resolved","Complete"]'::jsonb,
          bug_issue_types JSONB NOT NULL DEFAULT '["Bug","Defect","Int_Bug Management","Ext_Bug Management"]'::jsonb,
          critical_priorities JSONB NOT NULL DEFAULT '["Critical","Highest","Blocker"]'::jsonb,
          include_worklogs BOOLEAN NOT NULL DEFAULT false,
          lead_time_days INT DEFAULT 7,
          default_from_days INT DEFAULT 180,
          gemini_model VARCHAR(100) DEFAULT 'gemini-2.0-flash-lite',
          scoring_rubric JSONB DEFAULT '{}'::jsonb,
          transform_script TEXT,
          ai_prompt_template TEXT,
          ai_task_prompt_template TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_by VARCHAR(100)
        );
      `);

      // Add columns if table already existed without them
      await this.pool.query(`
        ALTER TABLE collector_script
          ADD COLUMN IF NOT EXISTS gemini_model VARCHAR(100) DEFAULT 'gemini-2.0-flash-lite',
          ADD COLUMN IF NOT EXISTS critical_priorities JSONB DEFAULT '["Critical","Highest","Blocker"]'::jsonb,
          ADD COLUMN IF NOT EXISTS lead_time_days INT DEFAULT 7,
          ADD COLUMN IF NOT EXISTS default_from_days INT DEFAULT 180,
          ADD COLUMN IF NOT EXISTS scoring_rubric JSONB DEFAULT '{}'::jsonb,
          ADD COLUMN IF NOT EXISTS ai_task_prompt_template TEXT;
      `);

      this.tableInitialized = true;
    } catch (err) {
      console.warn('[CollectorScriptStore] ensureTable warning (fallback in-memory):', (err as Error).message);
    }
  }

  /**
   * Lấy cấu hình script thu thập hiện tại
   */
  public async getScript(scriptCode = 'jira-pim-clv'): Promise<CollectorScriptConfig> {
    await this.ensureTable();
    try {
      const res = await this.pool.query(
        'SELECT * FROM collector_script WHERE script_code = $1 LIMIT 1',
        [scriptCode]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        cachedConfig = {
          id: row.id,
          scriptCode: row.script_code,
          name: row.name,
          description: row.description || '',
          targetSystem: row.target_system,
          jqlTemplate: row.jql_template,
          picCustomField: row.pic_custom_field || '11902',
          completedStatuses: Array.isArray(row.completed_statuses)
            ? row.completed_statuses
            : JSON.parse(row.completed_statuses || '[]'),
          bugIssueTypes: Array.isArray(row.bug_issue_types)
            ? row.bug_issue_types
            : JSON.parse(row.bug_issue_types || '[]'),
          criticalPriorities: Array.isArray(row.critical_priorities)
            ? row.critical_priorities
            : JSON.parse(row.critical_priorities || '["Critical","Highest","Blocker"]'),
          includeWorklogs: Boolean(row.include_worklogs),
          leadTimeDays: Number(row.lead_time_days ?? 7),
          defaultFromDays: Number(row.default_from_days ?? 180),
          geminiModel: row.gemini_model || 'gemini-2.0-flash-lite',
          scoringRubric: (row.scoring_rubric && Object.keys(row.scoring_rubric).length > 0)
            ? (typeof row.scoring_rubric === 'string' ? JSON.parse(row.scoring_rubric) : row.scoring_rubric)
            : DEFAULT_SCORING_RUBRIC,
          transformScript: row.transform_script || '',
          aiPromptTemplate: row.ai_prompt_template || DEFAULT_JIRA_COLLECTOR_SCRIPT.aiPromptTemplate,
          aiTaskPromptTemplate: row.ai_task_prompt_template || DEFAULT_AI_TASK_PROMPT,
          isActive: Boolean(row.is_active),
          updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
          updatedBy: row.updated_by,
        };
        return cachedConfig;
      }
    } catch (err) {
      console.warn('[CollectorScriptStore] getScript DB error, using cached:', (err as Error).message);
    }
    return cachedConfig;
  }

  /**
   * Lưu hoặc cập nhật cấu hình script thu thập
   */
  public async saveScript(
    patch: Partial<CollectorScriptConfig>,
    updatedBy?: string
  ): Promise<CollectorScriptConfig> {
    await this.ensureTable();

    const merged: CollectorScriptConfig = {
      ...cachedConfig,
      ...patch,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || patch.updatedBy || 'admin',
    };

    try {
      const res = await this.pool.query(
        `INSERT INTO collector_script (
          script_code, name, description, target_system, jql_template,
          pic_custom_field, completed_statuses, bug_issue_types, critical_priorities,
          include_worklogs, lead_time_days, default_from_days, gemini_model, scoring_rubric,
          transform_script, ai_prompt_template, ai_task_prompt_template, is_active, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), $19)
        ON CONFLICT (script_code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          target_system = EXCLUDED.target_system,
          jql_template = EXCLUDED.jql_template,
          pic_custom_field = EXCLUDED.pic_custom_field,
          completed_statuses = EXCLUDED.completed_statuses,
          bug_issue_types = EXCLUDED.bug_issue_types,
          critical_priorities = EXCLUDED.critical_priorities,
          include_worklogs = EXCLUDED.include_worklogs,
          lead_time_days = EXCLUDED.lead_time_days,
          default_from_days = EXCLUDED.default_from_days,
          gemini_model = EXCLUDED.gemini_model,
          scoring_rubric = EXCLUDED.scoring_rubric,
          transform_script = EXCLUDED.transform_script,
          ai_prompt_template = EXCLUDED.ai_prompt_template,
          ai_task_prompt_template = EXCLUDED.ai_task_prompt_template,
          is_active = EXCLUDED.is_active,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
        RETURNING id`,
        [
          merged.scriptCode,
          merged.name,
          merged.description,
          merged.targetSystem,
          merged.jqlTemplate,
          merged.picCustomField,
          JSON.stringify(merged.completedStatuses),
          JSON.stringify(merged.bugIssueTypes),
          JSON.stringify(merged.criticalPriorities),
          merged.includeWorklogs,
          merged.leadTimeDays,
          merged.defaultFromDays,
          merged.geminiModel,
          JSON.stringify(merged.scoringRubric),
          merged.transformScript,
          merged.aiPromptTemplate,
          merged.aiTaskPromptTemplate,
          merged.isActive,
          merged.updatedBy,
        ]
      );
      if (res.rows.length > 0) {
        merged.id = res.rows[0].id;
      }
    } catch (err) {
      console.warn('[CollectorScriptStore] saveScript DB error, cached only:', (err as Error).message);
    }

    cachedConfig = merged;
    return cachedConfig;
  }

  /**
   * Khôi phục script mặc định
   */
  public async resetDefault(updatedBy?: string): Promise<CollectorScriptConfig> {
    return this.saveScript({ ...DEFAULT_JIRA_COLLECTOR_SCRIPT }, updatedBy);
  }
}

