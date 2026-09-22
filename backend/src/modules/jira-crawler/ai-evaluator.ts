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
  overallScore: number; // weighted avg (PERF_01 30% + CODE_QUALITY 20% + TASK_VOLUME 20% + task_contribution 30%)
  overallLevel: number;
  dateFrom: string | null;
  dateTo: string | null;
  blueprintSummary?: BlueprintMemberSummary;
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
      if (value >= 30) return { level: 5, score: 100 };
      if (value >= 20) return { level: 4, score: 95 };
      if (value >= 10) return { level: 3, score: 85 };
      if (value >= 5) return { level: 2, score: 75 };
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
    if (completedTasks.length === 0) return [];

    // Evaluate top completed tasks (up to 15 tasks)
    const sampleTasks = completedTasks.slice(0, 15);
    const taskMap = new Map<string, JiraIssueRecord>(sampleTasks.map((t) => [t.key, t]));

    if (this.apiKey) {
      const taskList = sampleTasks.map((t, idx) =>
        `Task ${idx + 1}:
- Key: ${t.key}
- Summary: "${t.summary}"
- Type: ${t.issueType} | Priority: ${t.priority} | Status: ${t.status} | OnTime: ${t.isOnTime ? 'Đúng hạn' : 'Trễ hạn'}
- Components: ${t.components && t.components.length > 0 ? t.components.join(', ') : 'Chung'}
- Labels: ${t.labels && t.labels.length > 0 ? t.labels.join(', ') : 'N/A'}
- TimeSpent: ${t.timeSpentHours}h${t.originalEstimateHours ? ` (Ước lượng ban đầu: ${t.originalEstimateHours}h)` : ''}
- Description: "${t.descriptionPreview || 'Không có mô tả bổ sung'}"
- Số lượng trao đổi/comment: ${t.commentsCount || 0}${t.latestComment ? ` | Comment gần nhất: "${t.latestComment}"` : ''}`
      ).join('\n\n');

      const prompt = `Bạn là Giám đốc kỹ thuật (Engineering Director) tại CyberLogitec Việt Nam.
Hãy đánh giá CHI TIẾT và TOÀN DIỆN từng task Jira của nhân viên ${metrics.memberName} (Mã NV: ${metrics.employeeCode}).

DANH SÁCH TASKS CẦN ĐÁNH GIÁ:
${taskList}

YÊU CẦU: Trả về DUY NHẤT một chuỗi JSON hợp lệ theo schema sau (hoàn toàn bằng tiếng Việt chuyên nghiệp):
{
  "tasks": [
    {
      "key": "TASK-KEY",
      "complexityScore": <1-5: số nguyên đánh giá độ khó kỹ thuật và phạm vi>,
      "complexityRationale": "<Giải thích chi tiết 2-3 câu: VÌ SAO task này đạt mức phức tạp đó? Phân tích góc độ kỹ thuật, độ khó xử lý, phạm vi tác động module và thời lượng bỏ ra>",
      "contributionScore": <1-5: số nguyên đánh giá mức độ đóng góp và giá trị mang lại>,
      "contributionRationale": "<Giải thích chi tiết 2-3 câu: NHÂN SỰ ĐÃ ĐÓNG GÓP GÌ CỤ THỂ? Phân tích vai trò, tính chủ động, cách thức giải quyết triệt để vấn đề, cam kết đúng hạn và chất lượng bàn giao>",
      "comment": "<Nhận xét cô đọng, chuyên sâu 1-2 câu từ Engineering Manager>"
    }
  ],
  "overallContributionSummary": "<Nhận xét tổng thể 2-3 câu về năng lực chuyên môn và mức độ cống hiến>"
}

TIÊU CHÍ ĐÁNH GIÁ ĐỘ PHỨC TẠP (complexityScore 1-5):
- 5 (Rất cao): Nhiệm vụ kiến trúc hệ thống, bug nghiêm trọng mức Critical/Blocker, xử lý logic lõi nghiệp vụ vận tải biển đa bên, thời gian xử lý > 8h.
- 4 (Cao): Feature nghiệp vụ lớn, bug High priority, tích hợp API phức tạp hoặc điều chỉnh cấu trúc dữ liệu, timeSpent 4-8h.
- 3 (Trung bình): Bug thường gặp, Service Request trung bình, cải tiến UI/UX hoặc tối ưu query, timeSpent 2-4h.
- 2 (Thấp): Chỉnh sửa nhỏ (small fix), label, cấu hình tham số, cập nhật tài liệu kỹ thuật, timeSpent < 2h.
- 1 (Rất thấp): Subtask phụ trợ, việc cơ bản không đòi hỏi tư duy giải thuật.

TIÊU CHÍ ĐÁNH GIÁ MỨC ĐỘ ĐÓNG GÓP (contributionScore 1-5):
- 5 (Xuất sắc): Chủ động giải quyết độc lập, khắc phục dứt điểm gốc rễ vấn đề, bàn giao vượt tiến độ, comment và tài liệu hóa rõ ràng.
- 4 (Tốt): Hoàn thành đúng hạn, tuân thủ tiêu chuẩn lập trình, log work đầy đủ, phối hợp hiệu quả với team.
- 3 (Đạt yêu cầu): Hoàn thành theo yêu cầu nhưng cần nhắc nhở hoặc trễ nhẹ, khối lượng ở mức bình thường.
- 2 (Cần cải thiện): Trễ hạn nhiều lần hoặc phải làm lại do sót lỗi, thiếu sót trong việc kiểm thử.
- 1 (Kém): Không hoàn thành hoặc gây ảnh hưởng tiêu cực tới hệ thống.`;

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
            const parsed = JSON.parse(rawText) as GeminiTaskEvaluationResponse;
            if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
              return parsed.tasks.map((t) => {
                const originalTask = taskMap.get(t.key);
                const complexity = Math.min(5, Math.max(1, Math.round(t.complexityScore || 3)));
                const contribution = Math.min(5, Math.max(1, Math.round(t.contributionScore || 3)));
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
                  complexityRationale: t.complexityRationale || this.getDefaultComplexityRationale(originalTask, complexity),
                  contributionScore: contribution,
                  contributionRationale: t.contributionRationale || this.getDefaultContributionRationale(originalTask, contribution),
                  aiComment: t.comment || 'Đã hoàn thành theo phân công nhiệm vụ.',
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
    return this.generateFallbackTaskContributions(sampleTasks);
  }

  /**
   * Intelligent heuristic rule-based evaluator providing in-depth Vietnamese rationales
   */
  private generateFallbackTaskContributions(tasks: JiraIssueRecord[]): TaskContributionScore[] {
    return tasks.map((t) => {
      let complexity = 3;
      if (t.priority === 'Critical' || t.priority === 'Highest' || t.timeSpentHours >= 8) {
        complexity = 5;
      } else if (t.priority === 'High' || (t.timeSpentHours >= 4 && t.timeSpentHours < 8)) {
        complexity = 4;
      } else if (t.priority === 'Low' || t.priority === 'Lowest' || t.timeSpentHours < 1.5) {
        complexity = t.timeSpentHours < 1 ? 1 : 2;
      }

      let contribution = 4;
      if (t.isOnTime && complexity >= 4) {
        contribution = 5;
      } else if (!t.isOnTime) {
        contribution = complexity >= 4 ? 3 : 2;
      } else if (complexity <= 2) {
        contribution = 3;
      }

      const complexityRationale = this.getDefaultComplexityRationale(t, complexity);
      const contributionRationale = this.getDefaultContributionRationale(t, contribution);
      const aiComment = `Được đánh giá ${complexity}/5 về độ phức tạp nghiệp vụ và ${contribution}/5 về mức đóng góp giải quyết vấn đề.`;

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

    if (score >= 5) {
      return `Nhiệm vụ mức độ phức tạp rất cao (${score}/5) do liên quan đến ${typeLabel} có mức độ ưu tiên ${task.priority}${compText}. Yêu cầu phân tích sâu luồng dữ liệu, xử lý tương thích nghiệp vụ phức tạp${timeText} và rủi ro ảnh hưởng lớn đến vận hành.`;
    }
    if (score === 4) {
      return `Nhiệm vụ có độ phức tạp cao (${score}/5) thuộc diện ${typeLabel}${compText}. Cần hiểu rõ quy trình xử lý nghiệp vụ, kiểm tra đa trường hợp biên${timeText} để đảm bảo chất lượng hệ thống.`;
    }
    if (score === 3) {
      return `Độ phức tạp mức trung bình (${score}/5), xử lý ${typeLabel}${compText} theo đúng quy trình phát triển tiêu chuẩn. Khối lượng công việc tương đối rõ ràng${timeText}, đòi hỏi nắm vững kiến trúc module.`;
    }
    return `Độ phức tạp mức cơ bản (${score}/5), là ${typeLabel} có phạm vi nhỏ, logic đơn giản${timeText}, không tác động lan tỏa ra các thành phần khác.`;
  }

  private getDefaultContributionRationale(task?: JiraIssueRecord, score = 4): string {
    if (!task) return `Mức đóng góp ${score}/5 phản ánh sự nỗ lực và cam kết hoàn thành công việc.`;
    const onTimeText = task.isOnTime ? 'hoàn thành đúng hạn cam kết' : 'hoàn thành nhưng ghi nhận trễ tiến độ';
    const timeSpent = task.timeSpentHours > 0 ? ` (ghi nhận ${task.timeSpentHours} giờ làm việc)` : '';

    if (score >= 5) {
      return `Đóng góp xuất sắc (${score}/5): Nhân sự chủ động xử lý triệt để bài toán, ${onTimeText}${timeSpent}, đảm bảo chất lượng deliverable chuẩn mực và giúp đội ngũ giảm thiểu rủi ro kỹ thuật đáng kể.`;
    }
    if (score === 4) {
      return `Đóng góp tốt (${score}/5): Đảm nhiệm vai trò thực thi chính, ${onTimeText}${timeSpent}, phối hợp xử lý dứt điểm các yêu cầu kỹ thuật và đáp ứng kỳ vọng của quản lý.`;
    }
    if (score === 3) {
      return `Đóng góp đạt yêu cầu (${score}/5): Nhân sự đã giải quyết nhiệm vụ được giao${timeSpent}, tuy nhiên ${task.isOnTime ? 'cần gia tăng thêm tính chủ động trong trao đổi' : 'cần kiểm soát tiến độ chặt chẽ hơn để tránh phát sinh delay'}.`;
    }
    return `Mức đóng góp khiêm tốn (${score}/5): Khối lượng bàn giao còn hạn chế hoặc gặp vướng mắc tiến độ, cần được hướng dẫn sát sao hơn ở các sprint tiếp theo.`;
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
    const { level: volumeLevel, score: volumeScore } = this.resolveLevel('TASK_VOLUME', completed);

    const defaultVolumeComment = `Hoàn thành ${completed} nhiệm vụ trong kỳ, tổng thời gian ghi nhận ${metrics.totalHoursSpent}h.`;
    const defaultVolumeRationale = `AI Productivity Metric: Số lượng task hoàn thành ${completed} đạt mốc Level ${volumeLevel} (Điểm: ${volumeScore}).`;

    const volumeComment = gemini?.volumeComment || defaultVolumeComment;
    const volumeRationale = gemini?.volumeRationale
      ? `${gemini.volumeRationale} (Quy đổi Rubric: Level ${volumeLevel} - ${volumeScore} điểm).`
      : defaultVolumeRationale;

    records.push({
      employee_code: metrics.employeeCode,
      evaluation_cycle_code: this.cycleCode,
      kpi_code: 'TASK_VOLUME',
      value: completed,
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
          total_hours: metrics.totalHoursSpent,
        },
      },
      evidences: [
        {
          evidence_type: 'URL',
          title: `Danh sách ${completed} task hoàn thành`,
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
    const weights = this.rubric.weights || {
      PERF_01: 0.25,
      CODE_QUALITY: 0.20,
      TASK_VOLUME: 0.15,
      OWNERSHIP_SCOPE: 0.20,
      INDEPENDENCE: 0.20,
    };

    const perf01Score = (records.find((r) => r.kpi_code === 'PERF_01')?.resolved_level || 3) * 20;
    const qualityScore = (records.find((r) => r.kpi_code === 'CODE_QUALITY')?.resolved_level || 3) * 20;
    const volumeScore = (records.find((r) => r.kpi_code === 'TASK_VOLUME')?.resolved_level || 3) * 20;
    const ownershipScore = ownershipRes.score;
    const indepScore = indepRes.score;

    const wPerf = weights.PERF_01 ?? 0.25;
    const wQuality = weights.CODE_QUALITY ?? 0.20;
    const wVolume = weights.TASK_VOLUME ?? 0.15;
    const wOwner = weights.OWNERSHIP_SCOPE ?? 0.20;
    const wIndep = weights.INDEPENDENCE ?? 0.20;
    const totalWeight = (wPerf + wQuality + wVolume + wOwner + wIndep) || 1;

    const overallScore = Math.round(
      ((perf01Score * wPerf + qualityScore * wQuality + volumeScore * wVolume + ownershipScore * wOwner + indepScore * wIndep) / totalWeight) * 10
    ) / 10;

    // Map overall score to level (1-5)
    let overallLevel = 1;
    if (overallScore >= 95) overallLevel = 5;
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
