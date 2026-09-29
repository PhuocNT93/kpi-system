import React, { useState, useEffect, useRef } from 'react';
import {
  Code2,
  Save,
  RotateCcw,
  Play,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Bug,
  Sparkles,
  ShieldAlert,
  Users,
  Clock,
  Zap,
  Check,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import {
  getCollectorScript,
  saveCollectorScript,
  resetCollectorScript,
  testCollectorScript,
  getJiraManagedMembers,
  type CollectorScriptConfig,
  type TestScriptResult,
  type ManagedMember,
} from '../api/jira-collector-api';
import { Button } from '@/shared/ui/Button/Button';
import { Card } from '@/shared/components/Card';
import { COLORS, RADII, SHADOWS, TYPOGRAPHY } from '@/shared/theme';

// ─── Preset Option Types & Components ──────────────────────────────────────────
interface PresetOption {
  id: string;
  name: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  chipBorder: string;
  chipBg: string;
  chipColor: string;
  title: string;
  description: string;
  bullets: string[];
  usage: string;
  template: string;
}

const JQL_PRESETS: PresetOption[] = [
  {
    id: 'jql-assignee',
    name: 'Mẫu 1: Assignee thuần túy',
    badge: 'Cơ bản',
    badgeBg: '#e0f2fe',
    badgeColor: '#0369a1',
    chipBorder: '#bae6fd',
    chipBg: '#f0f9ff',
    chipColor: '#0284c7',
    title: 'Lọc cơ bản: Chỉ theo Assignee',
    description: 'Chỉ truy xuất những task Jira mà nhân viên được gán trực tiếp vào ô Assignee.',
    bullets: [
      'assignee = "{{employee_code}}": Tìm chính xác mã/tài khoản nhân viên.',
      '{{date_filter}}: Tự động gán khoảng thời gian lọc (vd: AND updated >= "2026-01-01").',
      'ORDER BY updated DESC: Ưu tiên các task có cập nhật mới nhất lên đầu.',
    ],
    usage: 'Phù hợp khi nhân viên chỉ đóng vai trò Developer/Tester thông thường, không phụ trách PIC.',
    template: 'assignee = "{{employee_code}}" {{date_filter}} ORDER BY updated DESC',
  },
  {
    id: 'jql-standard',
    name: 'Mẫu 2: Assignee + PIC (11902)',
    badge: 'Khuyên dùng',
    badgeBg: '#dbeafe',
    badgeColor: '#1d4ed8',
    chipBorder: '#93c5fd',
    chipBg: '#eff6ff',
    chipColor: '#2563eb',
    title: 'Tiêu chuẩn PIM: Quét cả Assignee & PIC',
    description: 'Quét toàn diện các task mà nhân viên là Assignee HOẶC là Người phụ trách chính (PIC qua cf[11902]).',
    bullets: [
      'assignee = "{{employee_code}}": Lấy task được phân công trực tiếp.',
      'OR cf[{{pic_field}}] = "{{employee_code}}": Lấy thêm task mà nhân viên là PIC chịu trách nhiệm.',
      'Không bỏ sót sub-task hoặc module do Leader/QA quản lý.',
    ],
    usage: 'Khuyên dùng mặc định cho toàn bộ dự án CyberLogitec PIM để phản ánh đủ 100% công việc.',
    template: '(assignee = "{{employee_code}}" OR cf[{{pic_field}}] = "{{employee_code}}") {{date_filter}} ORDER BY updated DESC',
  },
  {
    id: 'jql-bugs',
    name: 'Mẫu 3: Lọc Bug & Defect',
    badge: 'Chất lượng',
    badgeBg: '#fee2e2',
    badgeColor: '#b91c1c',
    chipBorder: '#fca5a5',
    chipBg: '#fef2f2',
    chipColor: '#dc2626',
    title: 'Chuyên sâu: Chỉ lấy Bug & Defect',
    description: 'Chỉ trích xuất các issue liên quan đến lỗi phần mềm, phục vụ đánh giá năng lực fix bug.',
    bullets: [
      'issuetype in (Bug, Defect, "Int. Bug Management", "Ext. Bug Management"): Chỉ lọc các loại lỗi.',
      'cf[{{pic_field}}]: Bắt cả bug nhân viên làm PIC hoặc Assignee.',
      'ORDER BY priority DESC: Đưa các Bug nghiêm trọng (Blocker/Critical) lên đầu.',
    ],
    usage: 'Dùng khi muốn đánh giá chuyên sâu KPI chất lượng phần mềm, tỷ lệ bug phát sinh hoặc thời gian đóng bug.',
    template: '(assignee = "{{employee_code}}" OR cf[{{pic_field}}] = "{{employee_code}}") AND issuetype in (Bug, Defect, "Int. Bug Management", "Ext. Bug Management") {{date_filter}} ORDER BY priority DESC',
  },
];

export const STANDARD_AI_TASK_PROMPT = `Bạn là Giám đốc kỹ thuật (Tech Lead & Solution Architect) tại CyberLogitec Việt Nam.
Hãy thẩm định khách quan, toàn diện và chính xác từng task Jira của kỹ sư theo các tiêu chí chuyên sâu:

1. ĐỘ PHỨC TẠP KỸ THUẬT (complexityScore 1-5):
- Mức 5 (Rất cao): Thiết kế kiến trúc module, xử lý sự cố cấp bách Block/Critical hệ thống lớn, thuật toán hóc búa (điều độ cảng/tàu, tính cước tariff phức tạp), log work > 8h.
- Mức 4 (Cao): Feature nghiệp vụ cốt lõi, tích hợp API/DB phức tạp, xử lý dữ liệu lớn hoặc luồng EDI, booking, billing.
- Mức 3 (Trung bình): Nghiệp vụ tiêu chuẩn, bug thông thường, tối ưu truy vấn SQL vừa phải (2-6h).
- Mức 1-2 (Thấp): Chỉnh sửa nhãn giao diện (label), cấu hình tham số, CRUD cơ bản hoặc việc phụ trợ (< 2h).
* Lập luận độ phức tạp: Nêu rõ VÌ SAO task khó hoặc dễ, trích dẫn cụ thể tên module, nghiệp vụ hoặc logic kỹ thuật trong task.

2. MỨC ĐỘ ĐÓNG GÓP & TRÁCH NHIỆM (contributionScore 1-5):
- Mức 5 (Xuất sắc): Chủ động dẫn dắt kỹ thuật, giải quyết triệt để vấn đề hóc búa, hỗ trợ đồng đội, bàn giao vượt kỳ vọng.
- Mức 4 (Tốt): Hoàn thành độc lập, code chất lượng cao, bàn giao đúng hạn, tuân thủ kỷ luật log work.
- Mức 3 (Đạt yêu cầu): Hoàn thành công việc được giao theo cam kết sprint.
- Mức 1-2 (Cần cải thiện): Trễ hạn, giải pháp chưa dứt điểm còn phát sinh lỗi hồi quy, hoặc thiếu chủ động.
* Lập luận đóng góp: Phân tích rõ kết quả cụ thể đạt được, giá trị đóng góp cho hệ thống và tính chủ động.

3. NGUYÊN TẮC THẨM ĐỊNH:
- Đánh giá thực chất, công bằng. Tuyệt đối không dùng câu từ sáo rỗng hoặc nhận xét chung chung.
- Trừ điểm nếu task trễ hạn hoặc không có giải trình rõ ràng.`;

interface PresetChipProps {
  preset: PresetOption;
  onSelect: (template: string) => void;
  icon?: React.ReactNode;
}

const PresetChip: React.FC<PresetChipProps> = ({ preset, onSelect, icon }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [applied, setApplied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleApply = () => {
    onSelect(preset.template);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => {
        timerRef.current = setTimeout(() => setIsHovered(true), 150);
      }}
      onMouseLeave={() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setIsHovered(false);
      }}
    >
      <button
        type="button"
        onClick={handleApply}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 12px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          border: `1.5px solid ${preset.chipBorder}`,
          backgroundColor: applied ? '#dcfce7' : isHovered ? preset.chipBg : '#ffffff',
          color: applied ? '#15803d' : preset.chipColor,
          cursor: 'pointer',
          transition: 'all 0.15s ease-in-out',
          boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        {applied ? <Check size={13} color="#15803d" /> : (icon || <Zap size={13} color={preset.chipColor} />)}
        <span>{applied ? 'Đã áp dụng!' : preset.name}</span>
        <span
          style={{
            fontSize: '10px',
            padding: '1px 6px',
            borderRadius: '9999px',
            backgroundColor: preset.badgeBg,
            color: preset.badgeColor,
            fontWeight: 700,
          }}
        >
          {preset.badge}
        </span>
      </button>

      {isHovered && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            width: '380px',
            maxWidth: '90vw',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            borderRadius: '10px',
            padding: '14px 16px',
            fontSize: '12px',
            lineHeight: 1.5,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
            zIndex: 9999,
            border: '1px solid #334155',
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#38bdf8' }}>{preset.title}</div>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: preset.badgeBg,
                color: preset.badgeColor,
                fontWeight: 600,
              }}
            >
              {preset.badge}
            </span>
          </div>

          <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#cbd5e1' }}>
            {preset.description}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
            {preset.bullets.map((b, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <span style={{ color: '#38bdf8', flexShrink: 0 }}>•</span>
                <span style={{ color: '#e2e8f0', fontSize: '11px' }}>{b}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: '6px 8px',
              backgroundColor: '#1e293b',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#94a3b8',
              marginBottom: '8px',
            }}
          >
            💡 <strong style={{ color: '#cbd5e1' }}>Khuyến nghị:</strong> {preset.usage}
          </div>

          <div
            style={{
              fontSize: '11px',
              color: '#34d399',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>👉 Bấm vào chip để áp dụng ngay vào khung nhập</span>
          </div>

          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              left: '24px',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #0f172a',
            }}
          />
        </div>
      )}
    </div>
  );
};

function getCadenceLabel(months?: number, cadenceStr?: string): string {
  if (months === 1 || cadenceStr === 'MONTHLY') return '1 tháng';
  if (months === 3 || cadenceStr === 'QUARTERLY') return '3 tháng (Quý)';
  if (months === 6 || cadenceStr === 'SEMIANNUAL' || cadenceStr === 'SEMI_ANNUAL' || cadenceStr === 'BIANNUALLY') return '6 tháng (Bán niên)';
  if (months === 12 || cadenceStr === 'ANNUAL' || cadenceStr === 'ANNUALLY') return '12 tháng (Hàng năm)';
  return months ? `${months} tháng` : '6 tháng (Bán niên)';
}

export const CollectorScriptEditorPage: React.FC = () => {
  const [config, setConfig] = useState<CollectorScriptConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Status & Bug & Priority tag inputs
  const [newStatusInput, setNewStatusInput] = useState<string>('');
  const [newBugInput, setNewBugInput] = useState<string>('');
  const [newPriorityInput, setNewPriorityInput] = useState<string>('');
  const [showRawJql, setShowRawJql] = useState<boolean>(false);

  // Test Run states
  const [members, setMembers] = useState<ManagedMember[]>([]);
  const [testEmployeeCode, setTestEmployeeCode] = useState<string>('213844');
  const [testFromDate, setTestFromDate] = useState<string>('2026-01-01');
  const [testToDate, setTestToDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<TestScriptResult | null>(null);

  // Member Cadence state (read-only view)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [scriptRes, membersRes] = await Promise.all([
          getCollectorScript(),
          getJiraManagedMembers(),
        ]);
        setConfig({
          ...scriptRes,
          geminiModel: scriptRes.geminiModel || 'gemini-2.0-flash-lite',
          criticalPriorities: scriptRes.criticalPriorities || ['Critical', 'Highest', 'Blocker'],
          leadTimeDays: scriptRes.leadTimeDays ?? 7,
          defaultFromDays: scriptRes.defaultFromDays ?? 180,
          aiTaskPromptTemplate: scriptRes.aiTaskPromptTemplate || '',
        });
        setMembers(membersRes.members || []);
        if (membersRes.members && membersRes.members.length > 0) {
          setTestEmployeeCode(membersRes.members[0].code);
        }
      } catch (err: unknown) {
        setError((err as Error).message || 'Không thể tải cấu hình script');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(null);
      const updated = await saveCollectorScript(config);
      setConfig({
        ...updated,
        geminiModel: updated.geminiModel || 'gemini-2.0-flash-lite',
        criticalPriorities: updated.criticalPriorities || ['Critical', 'Highest', 'Blocker'],
        leadTimeDays: updated.leadTimeDays ?? 7,
        defaultFromDays: updated.defaultFromDays ?? 180,
        aiTaskPromptTemplate: updated.aiTaskPromptTemplate || '',
      });
      setSaveSuccess('Cấu hình Script & Tham số chấm điểm đã được lưu thành công vào cơ sở dữ liệu!');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn khôi phục cấu hình Script về mặc định ban đầu không?')) {
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const reset = await resetCollectorScript();
      setConfig(reset);
      setSaveSuccess('Đã khôi phục cấu hình mặc định ban đầu.');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Lỗi khi khôi phục');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config) return;
    try {
      setTesting(true);
      setError(null);
      const res = await testCollectorScript({
        employeeCode: testEmployeeCode,
        fromDate: testFromDate || undefined,
        toDate: testToDate || undefined,
        scriptConfig: config,
      });
      setTestResult(res);
    } catch (err: unknown) {
      setError((err as Error).message || 'Lỗi khi chạy thử nghiệm script');
    } finally {
      setTesting(false);
    }
  };

  const addStatus = () => {
    if (!newStatusInput.trim() || !config) return;
    if (!config.completedStatuses.includes(newStatusInput.trim())) {
      setConfig({
        ...config,
        completedStatuses: [...config.completedStatuses, newStatusInput.trim()],
      });
    }
    setNewStatusInput('');
  };

  const removeStatus = (status: string) => {
    if (!config) return;
    setConfig({
      ...config,
      completedStatuses: config.completedStatuses.filter((s) => s !== status),
    });
  };

  const addBugType = () => {
    if (!newBugInput.trim() || !config) return;
    if (!config.bugIssueTypes.includes(newBugInput.trim())) {
      setConfig({
        ...config,
        bugIssueTypes: [...config.bugIssueTypes, newBugInput.trim()],
      });
    }
    setNewBugInput('');
  };

  const removeBugType = (type: string) => {
    if (!config) return;
    setConfig({
      ...config,
      bugIssueTypes: config.bugIssueTypes.filter((b) => b !== type),
    });
  };

  const addPriority = () => {
    if (!newPriorityInput.trim() || !config) return;
    const current = config.criticalPriorities || [];
    if (!current.includes(newPriorityInput.trim())) {
      setConfig({
        ...config,
        criticalPriorities: [...current, newPriorityInput.trim()],
      });
    }
    setNewPriorityInput('');
  };

  const removePriority = (priority: string) => {
    if (!config) return;
    setConfig({
      ...config,
      criticalPriorities: (config.criticalPriorities || []).filter((p) => p !== priority),
    });
  };

  const insertPlaceholder = (tag: string) => {
    if (!config) return;
    setConfig({
      ...config,
      jqlTemplate: `${config.jqlTemplate} ${tag}`,
    });
  };

  const insertPromptPlaceholder = (tag: string) => {
    if (!config) return;
    setConfig({
      ...config,
      aiTaskPromptTemplate: `${config.aiTaskPromptTemplate || ''} ${tag}`,
    });
  };

  if (loading || !config) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: COLORS.neutral[500] }}>
        Đang nạp cấu hình Script thu thập & Tham số AI...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: RADII.lg,
          color: '#ffffff',
          boxShadow: SHADOWS.md,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Code2 size={24} color="#38bdf8" />
            <h2 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold }}>
              {config.name}
            </h2>
            <span
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: TYPOGRAPHY.fontSize.xs,
                fontWeight: TYPOGRAPHY.fontWeight.medium,
              }}
            >
              Dynamic Script & AI Engine
            </span>
          </div>
          <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, color: '#94a3b8' }}>
            Tùy biến câu lệnh JQL, trường PIC, tiêu chí Bug/Priority, chu kỳ review và Mẫu Prompt Gemini AI. Mọi thay đổi lưu vào CSDL mà không cần sửa code.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outlined" size="sm" onClick={handleReset} disabled={saving}>
            <RotateCcw size={16} style={{ marginRight: '6px' }} />
            Khôi phục mặc định
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            <Save size={16} style={{ marginRight: '6px' }} />
            {saving ? 'Đang lưu...' : 'Lưu cấu hình Script'}
          </Button>
        </div>
      </div>

      {saveSuccess && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: RADII.md,
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: TYPOGRAPHY.fontSize.sm,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{saveSuccess}</span>
        </div>
      )}


      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: RADII.md,
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: TYPOGRAPHY.fontSize.sm,
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Column: Script Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. JQL Template */}
          <Card style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
                1. Bộ lọc phạm vi Task Jira (JQL Query Scope)
              </h3>
              <button
                type="button"
                onClick={() => setShowRawJql(!showRawJql)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: showRawJql ? COLORS.primary[50] : '#f8fafc',
                  border: `1px solid ${showRawJql ? COLORS.primary[300] : COLORS.neutral[300]}`,
                  borderRadius: RADII.sm,
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: showRawJql ? COLORS.primary.DEFAULT : COLORS.neutral.textSecondary,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Sliders size={12} />
                {showRawJql ? 'Thu gọn JQL nâng cao' : 'Tùy chỉnh JQL nâng cao'}
                {showRawJql ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {/* Quick Presets selector: Accessible for all users without typing JQL */}
            <div style={{ marginBottom: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Zap size={14} color={COLORS.primary.DEFAULT} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: COLORS.neutral.textPrimary }}>
                  Mẫu truy vấn nhanh (Bấm để áp dụng tự động, không cần gõ lệnh):
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {JQL_PRESETS.map((preset) => (
                  <PresetChip
                    key={preset.id}
                    preset={preset}
                    onSelect={(tpl) => setConfig({ ...config, jqlTemplate: tpl })}
                  />
                ))}
              </div>
            </div>

            {/* Current Active Scope Summary */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: RADII.sm }}>
              <CheckCircle2 size={16} color="#16a34a" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.5, flex: 1 }}>
                <b>Phạm vi thu thập hiện tại:</b> Tự động cào task theo PIC <code>cf[{config.picCustomField || '11902'}]</code> của từng nhân viên theo kỳ đánh giá.
                <div style={{ marginTop: '4px', fontFamily: 'monospace', fontSize: '11px', color: '#15803d', background: '#dcfce7', padding: '4px 8px', borderRadius: '4px', wordBreak: 'break-all' }}>
                  {config.jqlTemplate}
                </div>
              </div>
            </div>

            {/* Advanced JQL Editor (Expandable for dev/admin) */}
            {showRawJql && (
              <div style={{ marginTop: '16px', borderTop: `1px solid ${COLORS.neutral[200]}`, paddingTop: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, alignSelf: 'center' }}>
                    Chèn biến:
                  </span>
                  <button
                    type="button"
                    title="Mã số nhân viên đang duyệt (VD: 173232, 257130)"
                    onClick={() => insertPlaceholder('{{employee_code}}')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: RADII.sm,
                      border: `1px solid ${COLORS.primary.DEFAULT}`,
                      backgroundColor: COLORS.primary[50],
                      color: COLORS.primary.DEFAULT,
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    + &#123;&#123;employee_code&#125;&#125;
                  </button>
                  <button
                    type="button"
                    title="Mã Custom Field của PIC trong Jira (mặc định cf[11902])"
                    onClick={() => insertPlaceholder('cf[{{pic_field}}]')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: RADII.sm,
                      border: `1px solid ${COLORS.primary.DEFAULT}`,
                      backgroundColor: COLORS.primary[50],
                      color: COLORS.primary.DEFAULT,
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    + cf[&#123;&#123;pic_field&#125;&#125;]
                  </button>
                  <button
                    type="button"
                    title="Bộ lọc khoảng ngày theo kỳ đánh giá (VD: AND (updated >= &quot;2026-03-24&quot; AND updated <= &quot;2026-09-24&quot;))"
                    onClick={() => insertPlaceholder('{{date_filter}}')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: RADII.sm,
                      border: `1px solid ${COLORS.primary.DEFAULT}`,
                      backgroundColor: COLORS.primary[50],
                      color: COLORS.primary.DEFAULT,
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    + &#123;&#123;date_filter&#125;&#125;
                  </button>
                  <span style={{ fontSize: '11px', color: COLORS.neutral[400], fontStyle: 'italic' }}>
                    (Rê chuột xem ý nghĩa biến)
                  </span>
                </div>

                <textarea
                  rows={4}
                  value={config.jqlTemplate}
                  onChange={(e) => setConfig({ ...config, jqlTemplate: e.target.value })}
                  style={{
                    width: '100%',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    padding: '12px',
                    borderRadius: RADII.md,
                    border: `1px solid ${COLORS.neutral[300]}`,
                    boxSizing: 'border-box',
                    lineHeight: 1.5,
                  }}
                />

                <div style={{ marginTop: '16px' }}>
                  <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.medium, color: COLORS.neutral.textSecondary }}>
                    Mã Custom Field của PIC (Person In Charge):
                  </label>
                  <input
                    type="text"
                    value={config.picCustomField}
                    onChange={(e) => setConfig({ ...config, picCustomField: e.target.value })}
                    placeholder="11902"
                    style={{
                      width: '100%',
                      marginTop: '4px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      borderRadius: RADII.md,
                      border: `1px solid ${COLORS.neutral[300]}`,
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: COLORS.neutral[400], marginTop: '2px', display: 'block' }}>
                    Mặc định trong Jira PIM CyberLogitec là 11902 (tương ứng với cf[11902]).
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* 2. Status & Bug & Priority Mapping */}
          <Card style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
              2. Định nghĩa Trạng thái, Phân loại Bug & Mức độ Ưu tiên
            </h3>

            {/* Completed Statuses */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: COLORS.neutral.textPrimary }}>
                Các trạng thái tính là HOÀN THÀNH (Completed):
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '8px 0' }}>
                {config.completedStatuses.map((st) => (
                  <span
                    key={st}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '16px',
                      fontSize: '12px',
                      color: '#065f46',
                      fontWeight: 500,
                    }}
                  >
                    <CheckCircle2 size={13} />
                    {st}
                    <X size={13} style={{ cursor: 'pointer' }} onClick={() => removeStatus(st)} />
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <input
                  type="text"
                  placeholder="Thêm trạng thái (vd: Finished)..."
                  value={newStatusInput}
                  onChange={(e) => setNewStatusInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addStatus()}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    fontSize: '13px',
                    borderRadius: RADII.md,
                    border: `1px solid ${COLORS.neutral[300]}`,
                  }}
                />
                <Button size="sm" variant="outlined" onClick={addStatus}>
                  <Plus size={14} /> Thêm
                </Button>
              </div>
            </div>

            {/* Bug Issue Types */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: COLORS.neutral.textPrimary }}>
                Các Issue Types tính là LỖI / BUG:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '8px 0' }}>
                {config.bugIssueTypes.map((bt) => (
                  <span
                    key={bt}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '16px',
                      fontSize: '12px',
                      color: '#991b1b',
                      fontWeight: 500,
                    }}
                  >
                    <Bug size={13} />
                    {bt}
                    <X size={13} style={{ cursor: 'pointer' }} onClick={() => removeBugType(bt)} />
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <input
                  type="text"
                  placeholder="Thêm loại bug (vd: Security Bug)..."
                  value={newBugInput}
                  onChange={(e) => setNewBugInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addBugType()}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    fontSize: '13px',
                    borderRadius: RADII.md,
                    border: `1px solid ${COLORS.neutral[300]}`,
                  }}
                />
                <Button size="sm" variant="outlined" onClick={addBugType}>
                  <Plus size={14} /> Thêm
                </Button>
              </div>
            </div>

            {/* Critical Priorities */}
            <div>
              <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: COLORS.neutral.textPrimary }}>
                Độ ưu tiên tính là BUG NGHIÊM TRỌNG (Critical Priorities):
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '8px 0' }}>
                {(config.criticalPriorities || []).map((cp) => (
                  <span
                    key={cp}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      backgroundColor: '#fff7ed',
                      border: '1px solid #fed7aa',
                      borderRadius: '16px',
                      fontSize: '12px',
                      color: '#c2410c',
                      fontWeight: 500,
                    }}
                  >
                    <ShieldAlert size={13} />
                    {cp}
                    <X size={13} style={{ cursor: 'pointer' }} onClick={() => removePriority(cp)} />
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <input
                  type="text"
                  placeholder="Thêm độ ưu tiên (vd: Urgent)..."
                  value={newPriorityInput}
                  onChange={(e) => setNewPriorityInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPriority()}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    fontSize: '13px',
                    borderRadius: RADII.md,
                    border: `1px solid ${COLORS.neutral[300]}`,
                  }}
                />
                <Button size="sm" variant="outlined" onClick={addPriority}>
                  <Plus size={14} /> Thêm
                </Button>
              </div>
            </div>
          </Card>

          {/* 3. Cadence Default Times */}
          <Card style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Clock size={20} color="#0284c7" />
              <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
                3. Tham số Chu kỳ & Khoảng thời gian thu thập
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.medium, color: COLORS.neutral.textSecondary }}>
                  Số ngày báo trước hạn review (Lead Time):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={config.leadTimeDays ?? 7}
                    onChange={(e) => setConfig({ ...config, leadTimeDays: parseInt(e.target.value, 10) || 7 })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      borderRadius: RADII.md,
                      border: `1px solid ${COLORS.neutral[300]}`,
                    }}
                  />
                  <span style={{ fontSize: '12px', color: COLORS.neutral[500], whiteSpace: 'nowrap' }}>ngày</span>
                </div>
                <span style={{ fontSize: '11px', color: COLORS.neutral[400], marginTop: '2px', display: 'block' }}>
                  Hệ thống gắn cờ 'Đến hạn review' khi còn lại &lt;= số ngày này.
                </span>
              </div>

              <div>
                <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.medium, color: COLORS.neutral.textSecondary }}>
                  Lùi ngày mặc định (Default From Days):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="number"
                    min={30}
                    max={730}
                    value={config.defaultFromDays ?? 180}
                    onChange={(e) => setConfig({ ...config, defaultFromDays: parseInt(e.target.value, 10) || 180 })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      borderRadius: RADII.md,
                      border: `1px solid ${COLORS.neutral[300]}`,
                    }}
                  />
                  <span style={{ fontSize: '12px', color: COLORS.neutral[500], whiteSpace: 'nowrap' }}>ngày</span>
                </div>
                <span style={{ fontSize: '11px', color: COLORS.neutral[400], marginTop: '2px', display: 'block' }}>
                  Dùng khi nhân viên chưa từng có kỳ đánh giá hoàn tất trước đó.
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: AI & Testing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 4. Gemini AI Model & Prompt Template */}
          <Card style={{ padding: '20px', border: '1px solid #e0e7ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sparkles size={20} color="#4f46e5" />
              <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
                4. Cấu hình Gemini AI & Mẫu Prompt Đánh giá Task
              </h3>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.medium, color: COLORS.neutral.textSecondary }}>
                Mô hình Gemini (Model ID):
              </label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <select
                  value={['gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'].includes(config.geminiModel || '') ? config.geminiModel : 'custom'}
                  onChange={(e) => {
                    if (e.target.value !== 'custom') {
                      setConfig({ ...config, geminiModel: e.target.value });
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: RADII.md,
                    border: `1px solid ${COLORS.neutral[300]}`,
                    fontSize: '13px',
                    backgroundColor: '#fff',
                  }}
                >
                  <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite (Khuyên dùng: Siêu nhanh, Tiết kiệm)</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash (Nhanh & Ổn định)</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (Suy luận phức tạp nhất)</option>
                  <option value="custom">Tùy chỉnh khác...</option>
                </select>

                <input
                  type="text"
                  placeholder="Tên model (vd: gemini-2.5-flash)"
                  value={config.geminiModel || ''}
                  onChange={(e) => setConfig({ ...config, geminiModel: e.target.value })}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: RADII.md,
                    border: `1px solid ${COLORS.neutral[300]}`,
                    fontSize: '13px',
                  }}
                />
              </div>
              <span style={{ fontSize: '11px', color: COLORS.neutral[400], marginTop: '2px', display: 'block' }}>
                Khuyên dùng <code>gemini-2.0-flash-lite</code> để có tốc độ phản hồi tính theo giây khi phân tích hàng chục task.
              </span>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.medium, color: COLORS.neutral.textSecondary }}>
                  Chỉ đạo & Tiêu chí đánh giá AI (Prompt Tùy chỉnh):
                </label>
                <button
                  type="button"
                  title="Chèn biến tên nhân viên nếu muốn AI xưng hô/gọi tên nhân sự trong nhận xét"
                  onClick={() => insertPromptPlaceholder('{{memberName}}')}
                  style={{
                    padding: '2px 8px',
                    borderRadius: RADII.sm,
                    border: '1px solid #c7d2fe',
                    backgroundColor: '#eef2ff',
                    color: '#4338ca',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  + &#123;&#123;memberName&#125;&#125; (Tùy chọn)
                </button>
              </div>

              <textarea
                rows={10}
                value={config.aiTaskPromptTemplate || ''}
                onChange={(e) => setConfig({ ...config, aiTaskPromptTemplate: e.target.value })}
                placeholder="Nhập tiêu chí hoặc chỉ đạo đánh giá bằng ngôn ngữ tự nhiên (tiếng Việt)..."
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '12px',
                  borderRadius: RADII.md,
                  border: `1px solid ${COLORS.neutral[300]}`,
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                }}
              />

              <div style={{ fontSize: '11px', color: COLORS.neutral[600], marginTop: '8px', lineHeight: 1.5, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px' }}>
                💡 <b>Prompt hoàn toàn tự do (KHÔNG bắt buộc có biến, KHÔNG cần viết JSON):</b> Bạn chỉ cần viết hướng dẫn hoặc tiêu chí thẩm định mong muốn bằng ngôn ngữ tự nhiên. Hệ thống tự động trích xuất toàn bộ dữ liệu Jira thực tế (Mã task, Tên, Mô tả, Giờ log, Priority, Component,...) và cấu trúc dữ liệu trả về cho AI.
              </div>

              {/* 1 Mẫu Prompt AI Chuẩn duy nhất */}
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: RADII.md, flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} color="#9333ea" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#6b21a8' }}>
                      Mẫu Prompt Chuẩn Khuyến Nghị (Tech Lead & Solution Architect)
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#7e22ce', lineHeight: 1.4 }}>
                    Đánh giá chính xác từng task theo Độ phức tạp (1-5) và Tính đóng góp (1-5) với lập luận kỹ thuật chuyên sâu, không dùng câu từ sáo rỗng.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, aiTaskPromptTemplate: STANDARD_AI_TASK_PROMPT })}
                  style={{
                    padding: '7px 14px',
                    borderRadius: RADII.md,
                    border: '1px solid #7e22ce',
                    backgroundColor: '#7e22ce',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  <RotateCcw size={13} />
                  Áp dụng Mẫu Chuẩn
                </button>
              </div>
            </div>
          </Card>

          {/* 5. Live Testing Sandbox */}
          <Card style={{ padding: '20px', border: `1px solid ${COLORS.primary[200]}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Play size={20} color={COLORS.primary.DEFAULT} />
              <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
                5. Kiểm thử Script trực tiếp (Live Sandbox)
              </h3>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral[500] }}>
              Chạy thử nghiệm câu lệnh JQL và quy tắc phân loại với 1 nhân viên thực tế để xem ngay kết quả trả về từ Jira PIM mà không ghi vào cơ sở dữ liệu.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.medium, color: COLORS.neutral.textSecondary }}>
                  Chọn nhân viên thử nghiệm:
                </label>
                <select
                  value={testEmployeeCode}
                  onChange={(e) => setTestEmployeeCode(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '8px 12px',
                    borderRadius: RADII.md,
                    border: `1px solid ${COLORS.neutral[300]}`,
                    fontSize: '13px',
                  }}
                >
                  {members.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.name} ({m.code}) - {m.team}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.medium, color: COLORS.neutral.textSecondary }}>
                    Từ ngày (From Date):
                  </label>
                  <input
                    type="date"
                    value={testFromDate}
                    onChange={(e) => setTestFromDate(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '4px',
                      padding: '6px 10px',
                      borderRadius: RADII.md,
                      border: `1px solid ${COLORS.neutral[300]}`,
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.medium, color: COLORS.neutral.textSecondary }}>
                    Đến ngày (To Date):
                  </label>
                  <input
                    type="date"
                    value={testToDate}
                    onChange={(e) => setTestToDate(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '4px',
                      padding: '6px 10px',
                      borderRadius: RADII.md,
                      border: `1px solid ${COLORS.neutral[300]}`,
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <Button variant="primary" onClick={handleTest} disabled={testing} style={{ marginTop: '8px' }}>
                <Play size={16} style={{ marginRight: '6px' }} />
                {testing ? 'Đang chạy kiểm thử Jira...' : '▶ Chạy thử JQL & Xem kết quả'}
              </Button>
            </div>

            {testResult && (
              <div style={{ marginTop: '20px', borderTop: `1px solid ${COLORS.neutral[200]}`, paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: COLORS.neutral.textPrimary }}>
                  Kết quả cào được cho: {testResult.memberName} ({testResult.employeeCode})
                </h4>

                {/* Metrics mini cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ padding: '8px', backgroundColor: COLORS.neutral[50], borderRadius: RADII.sm, textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: COLORS.neutral[500] }}>Tổng Task</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.neutral.textPrimary }}>
                      {testResult.metrics.totalTasks}
                    </div>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: '#f0fdf4', borderRadius: RADII.sm, textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#15803d' }}>Hoàn thành</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#15803d' }}>
                      {testResult.metrics.completedTasks}
                    </div>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: '#eff6ff', borderRadius: RADII.sm, textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#1d4ed8' }}>Đúng hạn</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#1d4ed8' }}>
                      {testResult.metrics.onTimeRate}%
                    </div>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: '#fef2f2', borderRadius: RADII.sm, textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#b91c1c' }}>Tổng Bug</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#b91c1c' }}>
                      {testResult.metrics.totalBugs}
                    </div>
                  </div>
                </div>

                {/* Sample tasks list */}
                <div style={{ maxHeight: '220px', overflowY: 'auto', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.md }}>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: COLORS.neutral[100], textAlign: 'left' }}>
                        <th style={{ padding: '6px 10px' }}>Key</th>
                        <th style={{ padding: '6px 10px' }}>Tóm tắt</th>
                        <th style={{ padding: '6px 10px' }}>Loại</th>
                        <th style={{ padding: '6px 10px' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testResult.sampleIssues.map((iss) => (
                        <tr key={iss.key} style={{ borderBottom: `1px solid ${COLORS.neutral[100]}` }}>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 600 }}>{iss.key}</td>
                          <td style={{ padding: '6px 10px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {iss.summary}
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                backgroundColor: iss.isBug ? '#fee2e2' : '#e0f2fe',
                                color: iss.isBug ? '#b91c1c' : '#0369a1',
                                fontWeight: 500,
                              }}
                            >
                              {iss.issueType}
                            </span>
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                backgroundColor: iss.isCompleted ? '#dcfce7' : '#fef9c3',
                                color: iss.isCompleted ? '#15803d' : '#854d0e',
                              }}
                            >
                              {iss.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Full Width Section: Employee Cadence Management */}
      <Card style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '8px', color: '#16a34a' }}>
              <Users size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.bold, color: '#1e293b' }}>
                6. Quản lý Chu kỳ Đánh giá & Ngày Review của Nhân viên ({members.length} nhân sự)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: TYPOGRAPHY.fontSize.xs, color: '#64748b' }}>
                Mỗi nhân viên có thể có chu kỳ review riêng (3 tháng, 6 tháng, 12 tháng). Hệ thống tự động tính ngày đến hạn tiếp theo và thông báo cho Manager.
              </p>
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.md }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: `2px solid ${COLORS.neutral[200]}` }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Mã NV</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Họ và tên</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Team / Vị trí</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Blueprint User</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Chu kỳ Review</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Đến hạn tiếp theo</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.code} style={{ borderBottom: `1px solid ${COLORS.neutral[100]}` }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#1e293b' }}>
                    {m.code}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#334155' }}>
                    {m.name}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>
                    {m.team}{m.role ? ` · ${m.role}` : ''}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {m.blueprintUsername ? (
                      <span style={{ fontSize: '12px', background: '#ecfdf5', color: '#065f46', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
                        {m.blueprintUsername}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: RADII.sm,
                        border: `1px solid ${COLORS.neutral[200]}`,
                        backgroundColor: '#f8fafc',
                        color: '#334155',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      {getCadenceLabel(m.reviewCadenceMonths, m.reviewCadence)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>
                    {(m.nextReviewDueDate || m.nextReviewDate) ? new Date(m.nextReviewDueDate || m.nextReviewDate!).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {m.isDueForReview ? (
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <AlertCircle size={12} />
                        Đến hạn review
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: '#f0fdf4',
                          color: '#16a34a',
                          border: '1px solid #bbf7d0',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        Chưa đến hạn
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
