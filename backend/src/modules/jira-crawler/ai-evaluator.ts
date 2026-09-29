import { MemberJiraMetrics, JiraIssueRecord } from './jira-client.js';
import { JIRA_CONFIG } from './config.js';
import { ScoringRubricConfig, MetricRubric, DEFAULT_SCORING_RUBRIC } from './collector-script.store.js';

export interface EvaluatedKpiRecord {
  employee_code: string;
  evaluation_cycle_code: string;
  kpi_code: string;
  value: number;
  resolved_level: number;
  comment: string;
  rationale: string;
  source_snapshot: {
    source_type: 'JIRA';
    source_name: string;
    source_reference: string;
    collected_at: string;
    collector_version: string;
    metadata: Record<string, unknown>;
  };
  evidences: Array<{
    evidence_type: 'URL' | 'DOCUMENT' | 'FILE' | 'SCREENSHOT' | 'EXTERNAL_REF';
    title: string;
    evidence_url?: string;
    description?: string;
  }>;
}

// Task-level AI contribution assessment
export interface TaskContributionScore {
  taskKey: string;
  summary: string;
  issueType: string;
  priority: string;
  status: string;
  isOnTime: boolean;
  timeSpentHours: number;
  originalEstimateHours?: number;
  complexityScore: number; // 1-5 AI estimated complexity
  complexityRationale: string; // Chi tiết kỹ thuật: vì sao task này có độ phức tạp X/5 (nghiệp vụ, khó khăn, phạm vi)
  contributionScore: number; // 1-5 AI estimated contribution quality
  contributionRationale: string; // Chi tiết đóng góp: nhân viên đóng góp gì cụ thể (chủ động, giải quyết dứt điểm, tiến độ)
  aiComment: string; // Nhận xét sâu sắc tổng thể
  jiraUrl: string;
  components?: string[];
  labels?: string[];
  commentsCount?: number;
  latestComment?: string;
  descriptionPreview?: string;
}

export interface BlueprintAttendanceLateRecord {
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  lateMinutes: number;
  workShift?: string;
  reason?: string | null;
}

export interface BlueprintMemberSummary {
  hasData: boolean;
  source: string;
  collectedAt?: string;
  attendance?: {
    totalWorkDays: number;
    onTimeDays: number;
    lateDays: number;
    lateMinutes: number;
    leaveDays: number;
    punctualityRate: number; // %
    score10: number; // 1-10
    lateRecords?: BlueprintAttendanceLateRecord[];
  };
  tasks?: {
    totalTasks: number;
    completedTasks: number;
    score10: number;
  };
  blendedKpis: Array<{
    kpiCode: string;
    kpiName: string;
    jiraScore: number;
    blueprintScore: number;
    blendedScore: number;
    formula: string;
  }>;
}

export interface AiScoringBatchPayload {
  source_system: string;
  batch_reference: string;
  cycle_code: string;
  evaluated_at: string;
  evaluator: string;
  records: EvaluatedKpiRecord[];
  summary: {
    total_members: number;
    total_records: number;
    average_on_time_rate: number;
    total_tasks_evaluated: number;
  };
}

export interface ScoreDeductionItem {
  category: 'CODE_QUALITY' | 'ATTENDANCE' | 'DEADLINE' | 'OTHER';
  reason: string;
  points: number;
}

export interface ScoreBonusItem {
  category: 'TASK_VOLUME' | 'COMPLEXITY' | 'INITIATIVE' | 'OTHER';
  reason: string;
  points: number;
}

export interface PenaltyBreakdown {
  baselineScore: number; // 100
  totalDeductions: number;
  totalBonuses: number;
  deductions: ScoreDeductionItem[];
  bonuses: ScoreBonusItem[];
  finalScore: number;
  explanation: string;
}

export type EvaluationStrictness = 'EASY' | 'MEDIUM' | 'HARD';

export function detectEvaluationStrictness(promptTemplate?: string): EvaluationStrictness {
  if (!promptTemplate) return 'MEDIUM';
  const lower = promptTemplate.toLowerCase();
  if (
    lower.includes('nghiêm ngặt') ||
    lower.includes('khắt khe') ||
    lower.includes('architect') ||
    lower.includes('thẩm định chuyên sâu') ||
    lower.includes('mức 3') ||
    lower.includes('khó')
  ) {
    return 'HARD';
  }
  if (
    lower.includes('ngắn gọn') ||
    lower.includes('tiết kiệm token') ||
    lower.includes('tóm tắt nhanh') ||
    lower.includes('mức 1') ||
    lower.includes('dễ')
  ) {
    return 'EASY';
  }
  return 'MEDIUM';
}

// Per-member batch result (for dashboard view)
export interface MemberBatchResult {
  employeeCode: string;
  memberName: string;
  team: string;
  cycleCode: string;
  evaluatedAt: string;
  metrics: MemberJiraMetrics;
  records: EvaluatedKpiRecord[];
  taskContributions: TaskContributionScore[];
  overallScore: number;
  overallLevel: number;
  dateFrom: string | null;
  dateTo: string | null;
  blueprintSummary?: BlueprintMemberSummary;
  penaltyBreakdown?: PenaltyBreakdown;
  scoringBreakdown?: Record<string, unknown>;
}

interface GeminiEvaluationResponse {
  perfComment?: string;
  perfRationale?: string;
  qualityComment?: string;
  qualityRationale?: string;
  volumeComment?: string;
  volumeRationale?: string;
}

interface GeminiTaskEvaluationResponse {
  tasks: Array<{
    key: string;
    complexityScore: number;
    complexityRationale?: string;
    contributionScore: number;
    contributionRationale?: string;
    comment: string;
  }>;
  overallContributionSummary: string;
}

export class AiScoringEngine {
  private readonly cycleCode: string;
  private readonly apiKey?: string;
  private readonly rubric: ScoringRubricConfig;
  private readonly geminiModel: string;
  private readonly memberPromptTemplate?: string;
  private readonly taskPromptTemplate?: string;

  constructor(
    cycleCode = 'H2-2026',
    apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
    rubric: ScoringRubricConfig = DEFAULT_SCORING_RUBRIC,
    geminiModel = 'gemini-2.0-flash-lite',
    memberPromptTemplate?: string,
    taskPromptTemplate?: string
  ) {
    this.cycleCode = cycleCode;
    this.apiKey = apiKey;
    this.rubric = rubric || DEFAULT_SCORING_RUBRIC;
    this.geminiModel = geminiModel || 'gemini-2.0-flash-lite';
    this.memberPromptTemplate = memberPromptTemplate;
    this.taskPromptTemplate = taskPromptTemplate;
  }

  /**
   * Xác định mức độ khắt khe của đánh giá (EASY, MEDIUM, HARD) từ prompt template
   */
  public getStrictnessMode(): EvaluationStrictness {
    return detectEvaluationStrictness(this.taskPromptTemplate);
  }

  /**
   * Phân giải Level (1-5) và Điểm quy đổi dựa trên giá trị metric và scoringRubric từ DB/config
   */
  public resolveLevel(kpiCode: string, value: number): { level: number; score: number } {
    const metricConfig = this.rubric[kpiCode as keyof ScoringRubricConfig] as MetricRubric | undefined;
    if (metricConfig && Array.isArray(metricConfig.thresholds) && metricConfig.thresholds.length > 0) {
      for (const t of metricConfig.thresholds) {
        if (value >= t.min && value <= t.max) {
          return { level: t.level, score: t.score };
        }
      }
    }
    // Heuristic fallbacks nếu rubric trống
    if (kpiCode === 'PERF_01') {
      if (value >= 95) return { level: 5, score: 100 };
      if (value >= 90) return { level: 4, score: 95 };
      if (value >= 80) return { level: 3, score: 85 };
      if (value >= 70) return { level: 2, score: 75 };
      return { level: 1, score: 60 };
    }
    if (kpiCode === 'CODE_QUALITY') {
      if (value === 0) return { level: 5, score: 100 };
      if (value === 1) return { level: 4, score: 95 };
      if (value <= 3) return { level: 3, score: 85 };
      if (value <= 5) return { level: 2, score: 75 };
      return { level: 1, score: 60 };
    }
    if (kpiCode === 'TASK_VOLUME') {
      if (value >= 15) return { level: 5, score: 100 };
      if (value >= 10) return { level: 4, score: 95 };
      if (value >= 5) return { level: 3, score: 85 };
      if (value >= 2) return { level: 2, score: 75 };
      return { level: 1, score: 60 };
    }
    if (kpiCode === 'OWNERSHIP_SCOPE' || kpiCode === 'INDEPENDENCE') {
      if (value >= 4.5) return { level: 5, score: 100 };
      if (value >= 3.5) return { level: 4, score: 95 };
      if (value >= 2.5) return { level: 3, score: 85 };
      if (value >= 1.5) return { level: 2, score: 75 };
      return { level: 1, score: 60 };
    }
    return { level: 3, score: 85 };
  }

  /**
   * Thay thế placeholder {{variable}} trong template bằng giá trị thực
   */
  public renderPrompt(template: string, vars: Record<string, string | number>): string {
    let rendered = template;
    for (const [key, val] of Object.entries(vars)) {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(val));
    }
    return rendered;
  }


  /**
   * Evaluate individual tasks with deep AI reasoning:
   * - Complexity Score (1-5) & Complexity Rationale (Vì sao được điểm này, yếu tố kỹ thuật/nghiệp vụ)
   * - Contribution Score (1-5) & Contribution Rationale (Nhân viên đã đóng góp gì cụ thể vào task)
   * - AI Summary Comment
   */
  private async evaluateTaskContributions(
    metrics: MemberJiraMetrics
  ): Promise<TaskContributionScore[]> {
    const completedTasks = metrics.tasks.filter((t) => t.isCompleted);
    const inProgressTasks = metrics.tasks.filter((t) => !t.isCompleted);
    if (completedTasks.length === 0 && inProgressTasks.length === 0) return [];

    // Prioritize completed tasks, then in-progress tasks (up to 25 tasks)
    const sampleTasks = [...completedTasks, ...inProgressTasks].slice(0, 25);
    const taskMap = new Map<string, JiraIssueRecord>(sampleTasks.map((t) => [t.key, t]));

    if (this.apiKey) {
      const taskList = sampleTasks.map((t, idx) => {
        return `Task ${idx + 1}:
- Key: ${t.key}
- Summary: "${t.summary}"
- Type: ${t.issueType} | Priority: ${t.priority} | Status: ${t.status} | OnTime: ${t.isOnTime ? 'Đúng hạn' : 'Trễ hạn'}
- Components/Phân hệ: ${t.components && t.components.length > 0 ? t.components.join(', ') : 'Chung'}
- Labels: ${t.labels && t.labels.length > 0 ? t.labels.join(', ') : 'N/A'}
- TimeSpent: ${t.timeSpentHours}h${t.originalEstimateHours ? ` (Ước lượng ban đầu: ${t.originalEstimateHours}h)` : ''}
- Description: "${t.descriptionPreview || 'Không có mô tả bổ sung'}"
- Số lượng trao đổi/comment: ${t.commentsCount || 0}${t.latestComment ? ` | Comment gần nhất: "${t.latestComment}"` : ''}`;
      }).join('\n\n');

      const customPromptInstructions = this.taskPromptTemplate
        ? this.renderPrompt(this.taskPromptTemplate, {
            memberName: metrics.memberName,
            employeeCode: metrics.employeeCode,
          })
        : '';

      const strictness = this.getStrictnessMode();
      let strictnessCriteria = '';
      if (strictness === 'HARD') {
        strictnessCriteria = `TIÊU CHÍ ĐÁNH GIÁ KHẮT KHE CẤP ARCHITECT (MỨC 3 - KHÓ):
- complexityScore (1-5):
  * 5 (Rất cao): Nhiệm vụ kiến trúc hệ thống, xử lý sự cố cấp bách Block/Critical hệ thống lớn, timeSpent > 10h.
  * 4 (Cao): Feature nghiệp vụ cốt lõi, logic phức tạp, tối ưu hiệu năng DB/API quy mô lớn, timeSpent 6-10h.
  * 3 (Trung bình): Nghiệp vụ thông thường, bug chuẩn, timeSpent 3-6h.
  * 2 (Thấp): Chức năng CRUD cơ bản, sửa lỗi giao diện, cấu hình tham số, timeSpent 1-3h.
  * 1 (Rất thấp): Cập nhật label, chỉnh sửa văn bản, việc phụ trợ < 1h.
- contributionScore (1-5):
  * 5 (Đột phá): Giải quyết dứt điểm vấn đề hóc búa, dẫn dắt giải pháp kỹ thuật, bàn giao hoàn hảo.
  * 4 (Xuất sắc): Hoàn thành độc lập, code chất lượng cao, bàn giao đúng hạn.
  * 3 (Đạt yêu cầu): Hoàn thành nhiệm vụ nhưng cần nhắc nhở hoặc không có cải tiến nổi bật.
  * 2 (Cần cải thiện): Trễ hạn, thiếu chủ động hoặc còn sót lỗi phải sửa lại.
  * 1 (Kém): Gây rủi ro kỹ thuật hoặc không đạt cam kết bàn giao.
* ĐẶC BIỆT LƯU Ý: Thẩm định nghiêm ngặt! Nếu task không có mô tả chi tiết, không log thời gian hoặc bị trễ hạn thì KHÔNG được chấm điểm 4 hoặc 5.`;
      } else if (strictness === 'EASY') {
        strictnessCriteria = `TIÊU CHÍ ĐÁNH GIÁ ĐỘNG VIÊN & TÓM TẮT NHANH (MỨC 1 - DỄ):
- complexityScore (1-5): Khích lệ tinh thần nỗ lực, hầu hết các task nghiệp vụ hoàn thành đạt mức 3-4, task quan trọng đạt mức 5.
- contributionScore (1-5): Ưu tiên ghi nhận sự tận tụy và hoàn thành đúng cam kết (mức 4-5).
- Nhận xét: Ngắn gọn 1-2 câu, mang tính khích lệ và tóm tắt nhanh.`;
      } else {
        strictnessCriteria = `TIÊU CHÍ ĐÁNH GIÁ TIÊU CHUẨN TECH LEAD (MỨC 2 - VỪA):
- complexityScore (1-5):
  * 5 (Rất cao): Nhiệm vụ kiến trúc hệ thống, bug Critical/Blocker, xử lý logic lõi, timeSpent > 8h.
  * 4 (Cao): Feature nghiệp vụ lớn, bug High priority, tích hợp API phức tạp, timeSpent 4-8h.
  * 3 (Trung bình): Bug thường gặp, Service Request trung bình, tối ưu query, timeSpent 2-4h.
  * 2 (Thấp): Chỉnh sửa nhỏ, label, cấu hình tham số, timeSpent < 2h.
  * 1 (Rất thấp): Subtask phụ trợ, việc cơ bản không đòi hỏi tư duy giải thuật.
- contributionScore (1-5):
  * 5 (Xuất sắc): Chủ động giải quyết độc lập, khắc phục dứt điểm gốc rễ vấn đề, bàn giao đúng/vượt tiến độ.
  * 4 (Tốt): Hoàn thành đúng hạn, tuân thủ tiêu chuẩn lập trình, log work đầy đủ.
  * 3 (Đạt yêu cầu): Hoàn thành theo yêu cầu, khối lượng ở mức bình thường.
  * 2 (Cần cải thiện): Trễ hạn hoặc phải làm lại do sót lỗi.
  * 1 (Kém): Không hoàn thành hoặc gây ảnh hưởng tiêu cực.`;
      }

      const prompt = `Bạn là Giám đốc kỹ thuật (Engineering Director) và Solution Architect tại CyberLogitec Việt Nam.
Hãy thẩm định CHI TIẾT, TOÀN DIỆN và THỰC CHẤT từng task Jira sau của kỹ sư ${metrics.memberName} (Mã NV: ${metrics.employeeCode}).

QUY TẮC PHÂN TÍCH BẮT BUỘC:
1. ĐỘ PHỨC TẠP KỸ THUẬT (complexityScore 1-5):
   - Đánh giá dựa trên: bản chất logic nghiệp vụ (vận tải biển, logistics cảng, EDI, booking, billing, container, hải quan, điều độ tàu...), độ khó thuật toán, cấu trúc dữ liệu, tích hợp API/DB, rủi ro hồi quy và thời lượng thực tế bỏ ra.
   - Lập luận (complexityRationale): Phải chỉ rõ VÌ SAO task khó hoặc dễ. Nêu tên chức năng/module/luồng xử lý cụ thể từ tiêu đề hoặc mô tả task. TUYỆT ĐỐI KHÔNG dùng câu chung chung sáo rỗng.
2. MỨC ĐỘ ĐÓNG GÓP (contributionScore 1-5):
   - Đánh giá dựa trên: vai trò then chốt hay hỗ trợ, tính chủ động giải quyết dứt điểm vấn đề, cam kết đúng tiến độ và kỷ luật log work/ước tính thời gian.
   - Lập luận (contributionRationale): Phải chỉ rõ nhân sự đã giải quyết vấn đề gì, mang lại giá trị gì cho module hoặc sprint.
3. PHÂN BỐ ĐIỂM SỐ KHÁCH QUAN:
   - Phân biệt rõ rệt giữa việc vặt/CRUD nhỏ (1-2 điểm) với task nghiệp vụ trung bình (3 điểm) và các task lớn/sự cố nghiêm trọng/tối ưu kiến trúc (4-5 điểm).

${customPromptInstructions ? `TIÊU CHÍ VÀ CHỈ DẪN TÙY CHỈNH TỪ QUẢN LÝ:\n${customPromptInstructions}\n` : ''}
DANH SÁCH TASKS CẦN THẨM ĐỊNH (${sampleTasks.length} tasks):
${taskList}

YÊU CẦU: Trả về DUY NHẤT một chuỗi JSON hợp lệ theo schema sau (hoàn toàn bằng tiếng Việt chuyên nghiệp):
{
  "tasks": [
    {
      "key": "TASK-KEY",
      "complexityScore": <1-5: số nguyên>,
      "complexityRationale": "<Phân tích chi tiết 2-3 câu: VÌ SAO task đạt mức độ phức tạp này? Dẫn chứng từ tên module, nghiệp vụ hoặc logic kỹ thuật trong task>",
      "contributionScore": <1-5: số nguyên>,
      "contributionRationale": "<Phân tích chi tiết 2-3 câu: Kỹ sư đã đóng góp gì cụ thể? Giải pháp xử lý, tính chủ động và chất lượng bàn giao>",
      "comment": "<Nhận xét súc tích 1-2 câu từ Tech Lead>"
    }
  ],
  "overallContributionSummary": "<Nhận xét tổng thể 2-3 câu về năng lực chuyên môn và mức độ cống hiến>"
}

${strictnessCriteria}`;

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (res.ok) {
          const data = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            let tasksList: Array<any> = [];
            try {
              const parsed = JSON.parse(rawText);
              if (Array.isArray(parsed?.tasks)) {
                tasksList = parsed.tasks;
              } else if (Array.isArray(parsed)) {
                tasksList = parsed;
              } else if (parsed && typeof parsed === 'object') {
                const values = Object.entries(parsed).map(([k, v]: [string, any]) => ({
                  key: v?.key || k,
                  ...(typeof v === 'object' ? v : {}),
                }));
                if (values.length > 0 && (values[0].complexityScore !== undefined || values[0].complexityRationale !== undefined)) {
                  tasksList = values;
                }
              }
            } catch (pErr) {
              console.warn('[Gemini Task Eval] JSON parse error:', pErr);
            }

            if (tasksList.length > 0) {
              return tasksList.map((t) => {
                const originalTask = taskMap.get(t.key);
                const complexity = Math.min(5, Math.max(1, Math.round(Number(t.complexityScore) || 3)));
                const contribution = Math.min(5, Math.max(1, Math.round(Number(t.contributionScore) || 3)));
                const reasoning = t.reasoning || t.rationale || '';
                const complexityRationale = t.complexityRationale || reasoning || this.getDefaultComplexityRationale(originalTask, complexity);
                const contributionRationale = t.contributionRationale || reasoning || this.getDefaultContributionRationale(originalTask, contribution);
                const aiComment = t.comment || reasoning || (originalTask?.isCompleted
                  ? `Đã hoàn thành: Đánh giá ${complexity}/5 về độ phức tạp nghiệp vụ và ${contribution}/5 về mức đóng góp giải quyết vấn đề.`
                  : `Đang thực hiện (${originalTask?.status}): Đánh giá ${complexity}/5 về độ phức tạp.`);

                return {
                  taskKey: t.key,
                  summary: originalTask?.summary || '',
                  issueType: originalTask?.issueType || 'Task',
                  priority: originalTask?.priority || 'Medium',
                  status: originalTask?.status || 'Done',
                  isOnTime: originalTask?.isOnTime ?? true,
                  timeSpentHours: originalTask?.timeSpentHours || 0,
                  originalEstimateHours: originalTask?.originalEstimateHours,
                  complexityScore: complexity,
                  complexityRationale,
                  contributionScore: contribution,
                  contributionRationale,
                  aiComment,
                  jiraUrl: originalTask?.jiraUrl || `${JIRA_CONFIG.baseUrl}/browse/${t.key}`,
                  components: originalTask?.components,
                  labels: originalTask?.labels,
                  commentsCount: originalTask?.commentsCount,
                  latestComment: originalTask?.latestComment,
                  descriptionPreview: originalTask?.descriptionPreview,
                };
              });
            }
          }
        }
      } catch (err) {
        console.warn(`[Gemini Task Eval] Fallback to heuristic evaluator for ${metrics.employeeCode}:`, (err as Error).message);
      }
    }

    // Heuristic deep analyzer fallback if Gemini fails or is not configured
    return this.generateFallbackTaskContributions(sampleTasks, this.getStrictnessMode());
  }

  /**
   * Intelligent heuristic rule-based evaluator providing in-depth Vietnamese rationales calibrated by strictness
   */
  private generateFallbackTaskContributions(
    tasks: JiraIssueRecord[],
    strictness: EvaluationStrictness = 'MEDIUM'
  ): TaskContributionScore[] {
    return tasks.map((t) => {
      let complexity = 3;
      let contribution = 3;

      if (strictness === 'HARD') {
        // Chế độ Khắt khe: Yêu cầu cao hơn nhiều, hạ chuẩn điểm
        if (t.priority === 'Critical' || (t.priority === 'Highest' && t.timeSpentHours >= 12)) {
          complexity = 5;
        } else if ((t.priority === 'High' || t.priority === 'Highest') && t.timeSpentHours >= 6) {
          complexity = 4;
        } else if (t.timeSpentHours >= 3) {
          complexity = 3;
        } else if (t.timeSpentHours >= 1) {
          complexity = 2;
        } else {
          complexity = 1;
        }

        if (t.isCompleted) {
          if (t.isOnTime && complexity >= 4) {
            contribution = 4; // Khắt khe: chỉ 4, rất hiếm 5
          } else if (t.isOnTime) {
            contribution = 3;
          } else {
            contribution = 1; // Trễ hạn trong chế độ khó bị trừ rất nặng
          }
        } else {
          contribution = t.isOnTime ? 2 : 1;
        }
      } else if (strictness === 'EASY') {
        // Chế độ Dễ: Khích lệ và ghi nhận tối đa
        if (t.priority === 'Critical' || t.priority === 'Highest' || t.timeSpentHours >= 4) {
          complexity = 5;
        } else if (t.priority === 'High' || t.timeSpentHours >= 2) {
          complexity = 4;
        } else {
          complexity = 3;
        }

        if (t.isCompleted) {
          contribution = t.isOnTime ? 5 : 4;
        } else {
          contribution = t.isOnTime ? 4 : 3;
        }
      } else {
        // Chế độ Vừa (Standard Tech Lead)
        if (t.priority === 'Critical' || t.priority === 'Highest' || t.timeSpentHours >= 8) {
          complexity = 5;
        } else if (t.priority === 'High' || (t.timeSpentHours >= 4 && t.timeSpentHours < 8)) {
          complexity = 4;
        } else if (t.priority === 'Low' || t.priority === 'Lowest' || t.timeSpentHours < 1.5) {
          complexity = t.timeSpentHours < 1 ? 1 : 2;
        }

        if (t.isCompleted) {
          if (t.isOnTime && complexity >= 4) {
            contribution = 5;
          } else if (!t.isOnTime) {
            contribution = complexity >= 4 ? 3 : 2;
          } else if (complexity <= 2) {
            contribution = 3;
          } else {
            contribution = 4;
          }
        } else {
          if (!t.isOnTime) {
            contribution = 2;
          } else if (t.timeSpentHours > 0) {
            contribution = 4;
          } else {
            contribution = 3;
          }
        }
      }

      const complexityRationale = this.getDefaultComplexityRationale(t, complexity);
      const contributionRationale = this.getDefaultContributionRationale(t, contribution);
      const statusLabel = t.isCompleted ? 'Đã hoàn thành' : `Đang thực hiện (${t.status})`;
      const aiComment = `${statusLabel}: Được đánh giá ${complexity}/5 về độ phức tạp nghiệp vụ và ${contribution}/5 về mức đóng góp giải quyết vấn đề.`;

      return {
        taskKey: t.key,
        summary: t.summary,
        issueType: t.issueType,
        priority: t.priority,
        status: t.status,
        isOnTime: t.isOnTime,
        timeSpentHours: t.timeSpentHours,
        originalEstimateHours: t.originalEstimateHours,
        complexityScore: complexity,
        complexityRationale,
        contributionScore: contribution,
        contributionRationale,
        aiComment,
        jiraUrl: t.jiraUrl,
        components: t.components,
        labels: t.labels,
        commentsCount: t.commentsCount,
        latestComment: t.latestComment,
        descriptionPreview: t.descriptionPreview,
      };
    });
  }

  private getDefaultComplexityRationale(task?: JiraIssueRecord, score = 3): string {
    if (!task) return `Độ phức tạp mức ${score}/5 dựa trên yêu cầu xử lý tiêu chuẩn trong sprint.`;
    const typeLabel = task.isBug ? 'sự cố phần mềm (Bug)' : `yêu cầu nghiệp vụ (${task.issueType})`;
    const compText = task.components && task.components.length > 0 ? ` trong module ${task.components.join(', ')}` : '';
    const timeText = task.timeSpentHours > 0 ? ` với thời lượng xử lý ${task.timeSpentHours}h` : '';
    const taskTitle = task.summary ? ` "${task.summary.slice(0, 90)}"` : '';

    if (score >= 5) {
      return `Nhiệm vụ [${task.key}]${taskTitle} đạt mức độ phức tạp rất cao (${score}/5) do thuộc diện ${typeLabel} ưu tiên ${task.priority}${compText}. Yêu cầu phân tích sâu luồng dữ liệu, xử lý logic tương thích kiến trúc${timeText} và rủi ro ảnh hưởng lớn đến vận hành.`;
    }
    if (score === 4) {
      return `Nhiệm vụ [${task.key}]${taskTitle} có độ phức tạp cao (${score}/5) thuộc diện ${typeLabel}${compText}. Đòi hỏi xử lý quy trình nghiệp vụ chuyên sâu, kiểm thử đa trường hợp biên${timeText} để bảo đảm tính toàn vẹn hệ thống.`;
    }
    if (score === 3) {
      return `Nhiệm vụ [${task.key}]${taskTitle} có độ phức tạp trung bình (${score}/5), xử lý ${typeLabel}${compText} theo quy trình chuẩn. Phạm vi công việc rõ ràng${timeText}, đòi hỏi nắm vững kiến trúc module.`;
    }
    return `Nhiệm vụ [${task.key}]${taskTitle} ở mức cơ bản (${score}/5), là ${typeLabel} có phạm vi nhỏ, logic xử lý chuẩn${timeText}, ít tác động lan tỏa.`;
  }

  private getDefaultContributionRationale(task?: JiraIssueRecord, score = 4): string {
    if (!task) return `Mức đóng góp ${score}/5 phản ánh sự nỗ lực và cam kết hoàn thành công việc.`;
    const onTimeText = task.isCompleted
      ? (task.isOnTime ? 'hoàn thành đúng hạn cam kết' : 'hoàn thành nhưng ghi nhận trễ tiến độ')
      : (task.isOnTime ? 'đang tiến hành trong thời hạn quy định' : 'đang xử lý nhưng đã quá hạn due date');
    const timeSpent = task.timeSpentHours > 0 ? ` (${task.timeSpentHours}h làm việc)` : '';
    const taskTitle = task.summary ? ` [${task.key}: "${task.summary.slice(0, 70)}"]` : ` [${task.key}]`;

    if (!task.isCompleted) {
      if (!task.isOnTime) {
        return `Nhiệm vụ${taskTitle} đang thực hiện (${task.status}) nhưng quá hạn cam kết${timeSpent}. Cần tập trung nguồn lực đẩy nhanh tiến độ bàn giao để tránh ảnh hưởng sprint.`;
      }
      return `Nhiệm vụ${taskTitle} đang được triển khai tích cực theo đúng tiến độ (${task.status})${timeSpent}. Nhân sự đang bám sát các yêu cầu kỹ thuật của task.`;
    }

    if (score >= 5) {
      return `Đóng góp xuất sắc (${score}/5) tại task${taskTitle}: Nhân sự chủ động xử lý triệt để bài toán, ${onTimeText}${timeSpent}, đảm bảo chất lượng deliverable chuẩn mực và giúp đội ngũ giảm thiểu rủi ro kỹ thuật.`;
    }
    if (score === 4) {
      return `Đóng góp tốt (${score}/5) tại task${taskTitle}: Đảm nhiệm vai trò thực thi chính, ${onTimeText}${timeSpent}, phối hợp xử lý dứt điểm các yêu cầu kỹ thuật và đáp ứng kỳ vọng của quản lý.`;
    }
    if (score === 3) {
      return `Đóng góp đạt yêu cầu (${score}/5) tại task${taskTitle}: Nhân sự đã giải quyết nhiệm vụ được giao${timeSpent}, ${task.isOnTime ? 'đáp ứng tiến độ đề ra' : 'cần tăng tốc độ hoàn thành ở các kỳ tiếp theo'}.`;
    }
    return `Mức đóng góp khiêm tốn (${score}/5) tại task${taskTitle}: Khối lượng xử lý còn hạn chế hoặc gặp vướng mắc tiến độ, cần được hướng dẫn sát sao hơn.`;
  }

  /**
   * Call Google Gemini API to generate professional qualitative feedback at member level
   */
  private async generateGeminiAnalysis(metrics: MemberJiraMetrics): Promise<GeminiEvaluationResponse | null> {
    if (!this.apiKey) return null;

    try {
      const defaultPrompt = `Bạn là Giám đốc kỹ thuật (Engineering Director) tại CyberLogitec Việt Nam. Hãy đánh giá hiệu suất nhân sự dựa trên dữ liệu Jira PIM thực tế:
- Nhân viên: {{memberName}} (Mã NV: {{employeeCode}})
- Hoàn thành: {{completedTasks}}/{{totalTasks}} nhiệm vụ (Đang thực hiện: {{inProgressTasks}})
- Tỷ lệ đúng hạn: {{onTimeRate}}% (Đúng hạn: {{onTimeTasks}}, Trễ hạn: {{delayedTasks}})
- Tình trạng Bug: {{totalBugs}} bugs (Lỗi nghiêm trọng Critical: {{criticalBugs}}, Đã giải quyết: {{resolvedBugs}})
- Tổng thời gian ghi nhận (Log work): {{totalHoursSpent}} giờ
- Một số task tiêu biểu: {{sampleTasks}}

Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ theo schema sau (tiếng Việt chuyên nghiệp):
{
  "perfComment": "Nhận xét 1 câu súc tích về tiến độ bàn giao đúng hạn",
  "perfRationale": "Lập luận 1-2 câu giải thích chi tiết mức độ cam kết tiến độ và tác động",
  "qualityComment": "Nhận xét 1 câu súc tích về chất lượng mã nguồn và xử lý lỗi",
  "qualityRationale": "Lập luận 1-2 câu giải thích chi tiết về kiểm soát lỗi và tiêu chuẩn kỹ thuật",
  "volumeComment": "Nhận xét 1 câu súc tích về năng suất và khối lượng đóng góp",
  "volumeRationale": "Lập luận 1-2 câu giải thích chi tiết về đóng góp tổng thể và tính chủ động"
}`;

      const template = this.memberPromptTemplate || defaultPrompt;
      const prompt = this.renderPrompt(template, {
        memberName: metrics.memberName,
        employeeCode: metrics.employeeCode,
        completedTasks: metrics.completedTasks,
        totalTasks: metrics.totalTasks,
        inProgressTasks: metrics.inProgressTasks,
        onTimeRate: metrics.onTimeRate,
        onTimeTasks: metrics.onTimeTasks,
        delayedTasks: metrics.delayedTasks,
        totalBugs: metrics.totalBugs,
        criticalBugs: metrics.criticalBugs,
        resolvedBugs: metrics.resolvedBugs,
        totalHoursSpent: metrics.totalHoursSpent,
        sampleTasks: metrics.sampleTaskKeys.slice(0, 5).join(', ') || 'N/A',
      });

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (!res.ok) {
        console.warn(`[Gemini] Request failed for ${metrics.employeeCode} (${res.status})`);
        return null;
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) return null;

      return JSON.parse(rawText) as GeminiEvaluationResponse;
    } catch (err) {
      console.warn(`[Gemini] Evaluation error for ${metrics.employeeCode}:`, (err as Error).message);
      return null;
    }
  }

  /**
   * Evaluate a member's Jira metrics using calibrated rubric rules and AI commentary
   */
  public async evaluateMember(metrics: MemberJiraMetrics): Promise<EvaluatedKpiRecord[]> {
    const timestamp = new Date().toISOString();
    const records: EvaluatedKpiRecord[] = [];

    // Attempt Gemini qualitative analysis if API key is configured
    const gemini = await this.generateGeminiAnalysis(metrics);
    if (gemini) {
      console.log(`  🤖 [Gemini AI] Generated personalized analysis for ${metrics.memberName} (${metrics.employeeCode})`);
    }

    // ── KPI 1: PERF_01 - Code Quality & Delivery (Range Threshold) ──
    const onTimeRate = metrics.onTimeRate;
    const { level: onTimeLevel, score: onTimeScore } = this.resolveLevel('PERF_01', onTimeRate);

    const defaultOnTimeComment = `Đạt tỷ lệ hoàn thành đúng hạn ${onTimeRate}% (${metrics.onTimeTasks}/${metrics.completedTasks || metrics.totalTasks} nhiệm vụ).`;
    const defaultOnTimeRationale = `AI Rubric Resolution: Tỷ lệ on-time ${onTimeRate}% đạt ngưỡng Level ${onTimeLevel} (Điểm quy đổi: ${onTimeScore}). Phân tích ghi nhận ${metrics.completedTasks} task hoàn tất, ${metrics.delayedTasks} task chậm trễ.`;

    const onTimeComment = gemini?.perfComment || defaultOnTimeComment;
    const onTimeRationale = gemini?.perfRationale
      ? `${gemini.perfRationale} (Quy đổi Rubric: Level ${onTimeLevel} - ${onTimeScore} điểm).`
      : defaultOnTimeRationale;

    records.push({
      employee_code: metrics.employeeCode,
      evaluation_cycle_code: this.cycleCode,
      kpi_code: 'PERF_01',
      value: onTimeRate,
      resolved_level: onTimeLevel,
      comment: onTimeComment,
      rationale: onTimeRationale,
      source_snapshot: {
        source_type: 'JIRA',
        source_name: 'CyberLogitec Jira PIM',
        source_reference: `PIM-ONTIME-${metrics.employeeCode}`,
        collected_at: timestamp,
        collector_version: 'v3.0.0',
        metadata: {
          total_tasks: metrics.totalTasks,
          completed_tasks: metrics.completedTasks,
          on_time_tasks: metrics.onTimeTasks,
          delayed_tasks: metrics.delayedTasks,
          hours_spent: metrics.totalHoursSpent,
        },
      },
      evidences: [
        {
          evidence_type: 'URL',
          title: `Bộ lọc Jira PIM của ${metrics.memberName} (${metrics.employeeCode})`,
          evidence_url: metrics.filterUrl,
          description: `Truy xuất tự động từ Jira PIM cho chu kỳ ${this.cycleCode}`,
        },
      ],
    });

    // ── KPI 2: CODE_QUALITY (Bug Density & Production Escapes) ──
    const criticalBugs = metrics.criticalBugs;
    const { level: qualityLevel, score: qualityScore } = this.resolveLevel('CODE_QUALITY', criticalBugs);

    const defaultQualityComment = criticalBugs === 0
      ? `Chất lượng bàn giao ổn định, không có lỗi nghiêm trọng (Critical Bug = 0). Đã giải quyết ${metrics.resolvedBugs}/${metrics.totalBugs} bugs.`
      : `Phát sinh ${criticalBugs} lỗi nghiêm trọng cần lưu ý kiểm soát chất lượng kỹ càng hơn.`;

    const defaultQualityRationale = `AI Quality Analysis: Ghi nhận ${criticalBugs} critical bugs trên tổng số ${metrics.totalBugs} bug tasks. Xếp hạng Level ${qualityLevel} (Điểm quy đổi: ${qualityScore}).`;

    const qualityComment = gemini?.qualityComment || defaultQualityComment;
    const qualityRationale = gemini?.qualityRationale
      ? `${gemini.qualityRationale} (Quy đổi Rubric: Level ${qualityLevel} - ${qualityScore} điểm).`
      : defaultQualityRationale;

    records.push({
      employee_code: metrics.employeeCode,
      evaluation_cycle_code: this.cycleCode,
      kpi_code: 'CODE_QUALITY',
      value: criticalBugs,
      resolved_level: qualityLevel,
      comment: qualityComment,
      rationale: qualityRationale,
      source_snapshot: {
        source_type: 'JIRA',
        source_name: 'CyberLogitec Jira PIM',
        source_reference: `PIM-QUALITY-${metrics.employeeCode}`,
        collected_at: timestamp,
        collector_version: 'v3.0.0',
        metadata: {
          total_bugs: metrics.totalBugs,
          resolved_bugs: metrics.resolvedBugs,
          critical_bugs: metrics.criticalBugs,
        },
      },
      evidences: [
        {
          evidence_type: 'URL',
          title:
            metrics.bugTaskKeys && metrics.bugTaskKeys.length > 0
              ? `Chi tiết Bug Jira [${metrics.bugTaskKeys.join(', ')}]`
              : `Bộ lọc Jira Defect & Bug (${metrics.employeeCode})`,
          evidence_url:
            metrics.bugTaskKeys && metrics.bugTaskKeys.length > 0
              ? `${JIRA_CONFIG.baseUrl}/issues/?jql=${encodeURIComponent(
                  `key in (${metrics.bugTaskKeys.join(', ')}) ORDER BY updated DESC`
                )}`
              : `${JIRA_CONFIG.baseUrl}/issues/?jql=${encodeURIComponent(
                  `(assignee = "${metrics.employeeCode}" OR reporter = "${metrics.employeeCode}" OR worklogAuthor = "${metrics.employeeCode}") AND (issuetype in ("Int_Bug Management", Bug, Defect, "Customer Bug") OR text ~ "bug") ORDER BY updated DESC`
                )}`,
          description: `Tổng số bug: ${metrics.totalBugs}, đã xử lý: ${metrics.resolvedBugs}, critical: ${metrics.criticalBugs}`,
        },
      ],
    });

    // ── KPI 3: TASK_VOLUME (Năng suất & Đóng góp công việc) ──
    const completed = metrics.completedTasks;
    const inProgressCredit = Math.min(Math.round(metrics.inProgressTasks * 0.5), 5);
    const hourCredit = metrics.totalHoursSpent >= 140 ? 4 : metrics.totalHoursSpent >= 80 ? 2 : metrics.totalHoursSpent >= 40 ? 1 : 0;
    const effectiveVolume = completed + inProgressCredit + hourCredit;
    const volumeEvalValue = Math.max(completed, effectiveVolume);
    const { level: volumeLevel, score: volumeScore } = this.resolveLevel('TASK_VOLUME', volumeEvalValue);

    const defaultVolumeComment = `Đạt khối lượng công việc mức ${volumeLevel}/5 với ${completed} nhiệm vụ hoàn thành, ${metrics.inProgressTasks} nhiệm vụ đang xử lý (tổng thời gian ghi nhận ${metrics.totalHoursSpent}h).`;
    const defaultVolumeRationale = `AI Productivity Metric: Khối lượng công việc hiệu dụng quy đổi là ${volumeEvalValue} (${completed} hoàn thành + đóng góp từ ${metrics.inProgressTasks} task đang xử lý và ${metrics.totalHoursSpent}h công) đạt mốc Level ${volumeLevel} (Điểm: ${volumeScore}).`;

    const volumeComment = gemini?.volumeComment || defaultVolumeComment;
    const volumeRationale = gemini?.volumeRationale
      ? `${gemini.volumeRationale} (Quy đổi Rubric: Level ${volumeLevel} - ${volumeScore} điểm).`
      : defaultVolumeRationale;

    records.push({
      employee_code: metrics.employeeCode,
      evaluation_cycle_code: this.cycleCode,
      kpi_code: 'TASK_VOLUME',
      value: volumeEvalValue,
      resolved_level: volumeLevel,
      comment: volumeComment,
      rationale: volumeRationale,
      source_snapshot: {
        source_type: 'JIRA',
        source_name: 'CyberLogitec Jira PIM',
        source_reference: `PIM-VOLUME-${metrics.employeeCode}`,
        collected_at: timestamp,
        collector_version: 'v3.0.0',
        metadata: {
          completed_tasks: completed,
          in_progress: metrics.inProgressTasks,
          total_tasks: metrics.totalTasks,
          total_hours: metrics.totalHoursSpent,
          effective_volume: volumeEvalValue,
        },
      },
      evidences: [
        {
          evidence_type: 'URL',
          title: `Danh sách ${completed} task hoàn thành (Tổng ${metrics.totalTasks} nhiệm vụ)`,
          evidence_url: metrics.completedFilterUrl,
          description: `Các đầu việc tiêu biểu: ${metrics.sampleTaskKeys.join(', ') || 'N/A'}`,
        },
        ...(metrics.inProgressTasks > 0
          ? [
              {
                evidence_type: 'URL' as const,
                title: `Danh sách ${metrics.inProgressTasks} task chưa đóng (Open / In-Progress)`,
                evidence_url: metrics.inProgressFilterUrl,
                description: `Các task còn đang mở hoặc đang thực hiện trên Jira: ${metrics.inProgressTaskKeys.slice(0, 5).join(', ')}${metrics.inProgressTaskKeys.length > 5 ? '...' : ''}`,
              },
            ]
          : []),
      ],
    });

    return records;
  }

  /**
   * Evaluate a single member fully: KPI records + task-level contribution scores + overall score
   */
  public async evaluateMemberFull(
    metrics: MemberJiraMetrics,
    dateFrom: string | null = null,
    dateTo: string | null = null
  ): Promise<MemberBatchResult> {
    // 1. Get KPI records
    const records = await this.evaluateMember(metrics);

    // 2. Pause to respect Gemini rate limits before task evaluation
    if (this.apiKey) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // 3. Evaluate individual tasks for contribution scores
    const taskContributions = await this.evaluateTaskContributions(metrics);

    // 4. Evaluate OWNERSHIP_SCOPE & INDEPENDENCE from AI task contributions (Mapping to 18-KPI Rubric)
    const avgComplexity = taskContributions.length > 0
      ? Math.round((taskContributions.reduce((s, t) => s + t.complexityScore, 0) / taskContributions.length) * 10) / 10
      : 3;
    const ownershipRes = this.resolveLevel('OWNERSHIP_SCOPE', avgComplexity);
    records.push({
      employee_code: metrics.employeeCode,
      evaluation_cycle_code: this.cycleCode,
      kpi_code: 'OWNERSHIP_SCOPE',
      value: avgComplexity,
      resolved_level: ownershipRes.level,
      comment: `Độ phức tạp kỹ thuật trung bình: ${avgComplexity}/5 từ ${taskContributions.length} task phân tích.`,
      rationale: `AI Complexity Assessment: Điểm trung bình độ khó công việc ${avgComplexity}/5 đạt Level ${ownershipRes.level} (Điểm quy đổi: ${ownershipRes.score}).`,
      source_snapshot: {
        source_type: 'JIRA',
        source_name: 'CyberLogitec Jira PIM',
        source_reference: `PIM-OWNERSHIP-${metrics.employeeCode}`,
        collected_at: new Date().toISOString(),
        collector_version: 'v3.0.0',
        metadata: { avg_complexity: avgComplexity, tasks_evaluated: taskContributions.length },
      },
      evidences: taskContributions.slice(0, 3).map((tc) => ({
        evidence_type: 'URL' as const,
        title: `[${tc.taskKey}] Độ khó ${tc.complexityScore}/5: ${tc.summary}`,
        evidence_url: tc.jiraUrl,
        description: tc.complexityRationale,
      })),
    });

    const avgContribution = taskContributions.length > 0
      ? Math.round((taskContributions.reduce((s, t) => s + t.contributionScore, 0) / taskContributions.length) * 10) / 10
      : 3;
    const indepRes = this.resolveLevel('INDEPENDENCE', avgContribution);
    records.push({
      employee_code: metrics.employeeCode,
      evaluation_cycle_code: this.cycleCode,
      kpi_code: 'INDEPENDENCE',
      value: avgContribution,
      resolved_level: indepRes.level,
      comment: `Mức độ chủ động và đóng góp chất lượng trung bình: ${avgContribution}/5.`,
      rationale: `AI Independence & Contribution: Đánh giá tự chủ đạt ${avgContribution}/5 xếp hạng Level ${indepRes.level} (Điểm quy đổi: ${indepRes.score}).`,
      source_snapshot: {
        source_type: 'JIRA',
        source_name: 'CyberLogitec Jira PIM',
        source_reference: `PIM-INDEPENDENCE-${metrics.employeeCode}`,
        collected_at: new Date().toISOString(),
        collector_version: 'v3.0.0',
        metadata: { avg_contribution: avgContribution, tasks_evaluated: taskContributions.length },
      },
      evidences: taskContributions.slice(0, 3).map((tc) => ({
        evidence_type: 'URL' as const,
        title: `[${tc.taskKey}] Đóng góp ${tc.contributionScore}/5: ${tc.summary}`,
        evidence_url: tc.jiraUrl,
        description: tc.contributionRationale,
      })),
    });

    // 5. Calculate overall weighted score using dynamic rubric weights
    const penaltyBreakdown = this.calculatePenaltyScore(metrics, taskContributions);

    const weights = this.rubric.weights || {
      PERF_01: 0.25,
      CODE_QUALITY: 0.20,
      TASK_VOLUME: 0.15,
      OWNERSHIP_SCOPE: 0.20,
      INDEPENDENCE: 0.20,
    };

    const levelScoreMap: Record<number, number> = { 5: 100, 4: 95, 3: 85, 2: 75, 1: 60 };
    const getKpiScore = (kpiCode: string): number => {
      const rec = records.find((r) => r.kpi_code === kpiCode);
      if (!rec) return 85;
      const res = this.resolveLevel(kpiCode, rec.value);
      if (res && typeof res.score === 'number') return res.score;
      return levelScoreMap[rec.resolved_level] ?? 85;
    };

    const pScore = getKpiScore('PERF_01');
    const qScore = getKpiScore('CODE_QUALITY');
    const vScore = getKpiScore('TASK_VOLUME');
    const oScore = getKpiScore('OWNERSHIP_SCOPE');
    const iScore = getKpiScore('INDEPENDENCE');

    const wP = weights.PERF_01 ?? 0.25;
    const wQ = weights.CODE_QUALITY ?? 0.20;
    const wV = weights.TASK_VOLUME ?? 0.15;
    const wO = weights.OWNERSHIP_SCOPE ?? 0.20;
    const wI = weights.INDEPENDENCE ?? 0.20;
    const totalW = (wP + wQ + wV + wO + wI) || 1;

    const weightedScore = Math.round(
      ((pScore * wP + qScore * wQ + vScore * wV + oScore * wO + iScore * wI) / totalW) * 10
    ) / 10;

    // Infraction Ceiling: Disciplinary infractions (Critical Bugs) strictly cap the score
    const disciplineDeduction = penaltyBreakdown.deductions
      .filter((d) => d.category === 'CODE_QUALITY')
      .reduce((sum, d) => sum + d.points, 0);

    const ceiling = disciplineDeduction > 0 ? Math.max(0, 100 - disciplineDeduction) : 100;
    const overallScore = Math.min(ceiling, weightedScore);

    // Mức 5 (Xuất sắc) bắt buộc đạt >= 95 và 0 vi phạm kỷ luật
    let overallLevel = 1;
    if (overallScore >= 95 && disciplineDeduction === 0) overallLevel = 5;
    else if (overallScore >= 85) overallLevel = 4;
    else if (overallScore >= 75) overallLevel = 3;
    else if (overallScore >= 65) overallLevel = 2;
    else overallLevel = 1;

    return {
      employeeCode: metrics.employeeCode,
      memberName: metrics.memberName,
      team: metrics.team,
      cycleCode: this.cycleCode,
      evaluatedAt: new Date().toISOString(),
      metrics,
      records,
      taskContributions,
      overallScore,
      overallLevel,
      dateFrom,
      dateTo,
      penaltyBreakdown,
    };
  }

  /**
   * Tính điểm theo cơ chế Penalty từ mốc 100 điểm:
   * - Mốc bắt đầu: 100 điểm (tính từ sau ngày lastEvaluation completed)
   * - Trừ điểm vi phạm Code Quality (critical bugs, defects)
   * - Trừ điểm trễ hạn cam kết nhiệm vụ (delayed tasks)
   * - Cộng thưởng năng suất (nhiều task hoàn thành, task phức tạp cao)
   * - Giới hạn an toàn trong khoảng [0, 100]
   */
  public calculatePenaltyScore(
    metrics: MemberJiraMetrics,
    taskContributions: TaskContributionScore[],
    customStrictness?: EvaluationStrictness
  ): PenaltyBreakdown {
    const strictness = customStrictness || this.getStrictnessMode();
    const baselineScore = 100;
    const deductions: ScoreDeductionItem[] = [];
    const bonuses: ScoreBonusItem[] = [];

    // Cấu hình tham số theo mức độ DỄ - VỪA - KHÓ
    const penaltyConfig = {
      HARD: {
        criticalBugPoints: 20,
        criticalBugCap: 40,
        minorBugThreshold: 1,
        minorBugPoints: 5,
        minorBugCap: 25,
        delayTaskPoints: 6,
        delayTaskCap: 36,
        volumeHighMinTasks: 25,
        volumeHighPoints: 3,
        volumeMidMinTasks: 15,
        volumeMidPoints: 1,
        complexityMinScore: 4,
        complexityMinTasks: 4,
        complexityPoints: 3,
      },
      MEDIUM: {
        criticalBugPoints: 15,
        criticalBugCap: 30,
        minorBugThreshold: 2,
        minorBugPoints: 3,
        minorBugCap: 15,
        delayTaskPoints: 4,
        delayTaskCap: 25,
        volumeHighMinTasks: 20,
        volumeHighPoints: 5,
        volumeMidMinTasks: 10,
        volumeMidPoints: 2,
        complexityMinScore: 4,
        complexityMinTasks: 3,
        complexityPoints: 5,
      },
      EASY: {
        criticalBugPoints: 10,
        criticalBugCap: 20,
        minorBugThreshold: 4,
        minorBugPoints: 2,
        minorBugCap: 10,
        delayTaskPoints: 2,
        delayTaskCap: 16,
        volumeHighMinTasks: 15,
        volumeHighPoints: 7,
        volumeMidMinTasks: 8,
        volumeMidPoints: 4,
        complexityMinScore: 3,
        complexityMinTasks: 2,
        complexityPoints: 7,
      },
    }[strictness];

    // 1. Vi phạm Code Quality
    if (metrics.criticalBugs > 0) {
      const bugPenalty = Math.min(penaltyConfig.criticalBugCap, metrics.criticalBugs * penaltyConfig.criticalBugPoints);
      deductions.push({
        category: 'CODE_QUALITY',
        reason: `Phát sinh ${metrics.criticalBugs} lỗi nghiêm trọng (Critical Bug) [-${bugPenalty}đ]`,
        points: bugPenalty,
      });
    }
    const nonCriticalBugs = Math.max(0, metrics.totalBugs - metrics.criticalBugs);
    if (nonCriticalBugs > penaltyConfig.minorBugThreshold) {
      const diff = nonCriticalBugs - penaltyConfig.minorBugThreshold;
      const minorBugPenalty = Math.min(penaltyConfig.minorBugCap, diff * penaltyConfig.minorBugPoints);
      deductions.push({
        category: 'CODE_QUALITY',
        reason: `Phát sinh ${nonCriticalBugs} lỗi phần mềm thông thường [-${minorBugPenalty}đ]`,
        points: minorBugPenalty,
      });
    }

    // 2. Vi phạm tiến độ bàn giao (Deadline)
    if (metrics.delayedTasks > 0) {
      const delayPenalty = Math.min(penaltyConfig.delayTaskCap, metrics.delayedTasks * penaltyConfig.delayTaskPoints);
      deductions.push({
        category: 'DEADLINE',
        reason: `Ghi nhận ${metrics.delayedTasks} nhiệm vụ trễ hạn cam kết [-${delayPenalty}đ]`,
        points: delayPenalty,
      });
    }

    // 3. Thưởng năng suất hoàn thành vượt trội
    if (metrics.completedTasks >= penaltyConfig.volumeHighMinTasks) {
      bonuses.push({
        category: 'TASK_VOLUME',
        reason: `Hoàn thành khối lượng lớn (${metrics.completedTasks} nhiệm vụ) [${strictness === 'HARD' ? 'Mức Khó: +3đ' : strictness === 'EASY' ? 'Mức Dễ: +7đ' : '+5đ'}]`,
        points: penaltyConfig.volumeHighPoints,
      });
    } else if (metrics.completedTasks >= penaltyConfig.volumeMidMinTasks) {
      bonuses.push({
        category: 'TASK_VOLUME',
        reason: `Năng suất tốt (${metrics.completedTasks} nhiệm vụ hoàn tất) [${strictness === 'HARD' ? 'Mức Khó: +1đ' : strictness === 'EASY' ? 'Mức Dễ: +4đ' : '+2đ'}]`,
        points: penaltyConfig.volumeMidPoints,
      });
    }

    // 4. Thưởng xử lý nhiệm vụ phức tạp cao
    const highComplexityTasks = taskContributions.filter((t) => t.complexityScore >= penaltyConfig.complexityMinScore);
    if (highComplexityTasks.length >= penaltyConfig.complexityMinTasks) {
      bonuses.push({
        category: 'COMPLEXITY',
        reason: `Chủ động đảm nhận ${highComplexityTasks.length} nhiệm vụ có độ khó cao (≥${penaltyConfig.complexityMinScore}/5) [${strictness === 'HARD' ? 'Mức Khó: +3đ' : strictness === 'EASY' ? 'Mức Dễ: +7đ' : '+5đ'}]`,
        points: penaltyConfig.complexityPoints,
      });
    }

    const totalDeductions = deductions.reduce((sum, d) => sum + d.points, 0);
    const totalBonuses = bonuses.reduce((sum, b) => sum + b.points, 0);
    const rawScore = baselineScore - totalDeductions + totalBonuses;

    // NGUYÊN TẮC TRẦN ĐIỂM VI PHẠM (Infraction Ceiling):
    // Điểm thưởng chỉ bù đắp nỗ lực/deadline, KHÔNG THỂ xóa sạch điểm phạt kỷ luật chất lượng/critical bugs
    const disciplineDeduction = deductions
      .filter((d) => d.category === 'CODE_QUALITY')
      .reduce((sum, d) => sum + d.points, 0);

    const ceiling = disciplineDeduction > 0 ? Math.max(0, 100 - disciplineDeduction) : 100;
    const finalScore = Math.min(ceiling, Math.max(0, Math.round(rawScore * 10) / 10));

    let overallLevel = 1;
    if (finalScore >= 95 && disciplineDeduction === 0) overallLevel = 5;
    else if (finalScore >= 85) overallLevel = 4;
    else if (finalScore >= 75) overallLevel = 3;
    else if (finalScore >= 65) overallLevel = 2;
    else overallLevel = 1;

    const strictnessLabel = strictness === 'HARD' ? 'Khắt khe' : strictness === 'EASY' ? 'Dễ' : 'Tiêu chuẩn';
    const explanation = `Cơ chế trừ điểm (${strictnessLabel}): Khởi điểm 100đ - ${totalDeductions}đ vi phạm + ${totalBonuses}đ thưởng = ${finalScore}/100 (Level ${overallLevel}).`;

    return {
      baselineScore,
      totalDeductions,
      totalBonuses,
      deductions,
      bonuses,
      finalScore,
      explanation,
    };
  }

  /**
   * Batch evaluate all members in the team and generate full staging payload
   */
  public async evaluateTeam(teamMetrics: MemberJiraMetrics[]): Promise<AiScoringBatchPayload> {
    const allRecords: EvaluatedKpiRecord[] = [];

    for (const memberMetrics of teamMetrics) {
      const records = await this.evaluateMember(memberMetrics);
      allRecords.push(...records);

      // Pace calls to respect Gemini API rate limits (15 RPM free-tier limit)
      if (this.apiKey) {
        await new Promise((resolve) => setTimeout(resolve, 4200));
      }
    }

    const totalTasks = teamMetrics.reduce((sum, m) => sum + m.totalTasks, 0);
    const avgOnTime = teamMetrics.length > 0
      ? Math.round((teamMetrics.reduce((sum, m) => sum + m.onTimeRate, 0) / teamMetrics.length) * 10) / 10
      : 100;

    return {
      source_system: 'Jira PIM',
      batch_reference: `PIM-KYLUONG-${this.cycleCode}`,
      cycle_code: this.cycleCode,
      evaluated_at: new Date().toISOString(),
      evaluator: this.apiKey ? 'Google Gemini 3.5 Flash + Calibrated Rubric v3.0 + Task Contribution AI' : 'AI Scoring Engine (Calibrated Rubric v3.0)',
      records: allRecords,
      summary: {
        total_members: teamMetrics.length,
        total_records: allRecords.length,
        average_on_time_rate: avgOnTime,
        total_tasks_evaluated: totalTasks,
      },
    };
  }
}
