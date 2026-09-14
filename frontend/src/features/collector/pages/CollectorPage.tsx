import { useState, useEffect } from 'react';
import {
  collectorApi,
  type CollectorDataSource,
  type CollectorJob,
  type CollectorRunLog,
  type BlueprintTasksSummary,
  type BlueprintVacationSummary,
  type BlueprintOrgTeam,
  type BlueprintTeamAttendanceSummary,
} from '../api/collector-api';
import {
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  Activity,
  User,
  Check,
  ClipboardCheck,
  Settings,
  Users,
  ChevronDown,
  ChevronUp,
  Save,
  Zap,
  FolderGit2,
  ShieldAlert,
  Search,
} from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { RADII, SHADOWS, TYPOGRAPHY } from '@/shared/theme';

export function CollectorPage() {
  const [activeTab, setActiveTab] = useState<'hub' | 'jobs' | 'logs'>('hub');

  // Unified Connection Config State - User inputs on UI or loads from saved configuration
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://blueprint.cyberlogitec.com.vn');
  const [month, setMonth] = useState('2026-09');
  const [projectFilter, setProjectFilter] = useState('Allegro NX');

  // UI state
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState<string | null>(null);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync All state
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllSuccess, setSyncAllSuccess] = useState<{
    totalScore: number;
    attendance: { score10: number; grade: string; weightedScore: number; comment: string };
    tasks: { totalTasks?: number; onTimeRate: number; score10: number; grade: string; weightedScore: number; comment: string };
  } | null>(null);
  const [syncAllError, setSyncAllError] = useState<string | null>(null);

  // Module 1: Daily Team Status State (UI_TAT_029 - Manager Team Check-in/out)
  const [isFetchingTeamAttendance, setIsFetchingTeamAttendance] = useState(false);
  const [previewTeamAttendance, setPreviewTeamAttendance] = useState<BlueprintTeamAttendanceSummary | null>(null);
  const [teamAttendanceError, setTeamAttendanceError] = useState<string | null>(null);
  const [isSyncingTeamAttendance, setIsSyncingTeamAttendance] = useState(false);
  const [teamAttendanceSyncSuccess, setTeamAttendanceSyncSuccess] = useState<string | null>(null);
  const [showTeamAttendanceTable, setShowTeamAttendanceTable] = useState(true);
  const [selectedTeamOrzId, setSelectedTeamOrzId] = useState<string>(''); // '' for All Teams (NX & Maritime)
  const [teamSearchDate, setTeamSearchDate] = useState<string>('09/14/2026');
  const [teamSearchEmployeeName, setTeamSearchEmployeeName] = useState<string>('');
  const [teamList, setTeamList] = useState<BlueprintOrgTeam[]>([
    { orzId: 'ATM202310170003', orzNm: 'ALLEGRO NX Part' },
    { orzId: 'ATM202310170004', orzNm: 'Maritime Solutions Part' },
  ]);
  const [syncingMemberEmpeNo, setSyncingMemberEmpeNo] = useState<string | null>(null);

  // Module 2: Tasks State (UI_PIM_001)
  const [isFetchingTasks, setIsFetchingTasks] = useState(false);
  const [previewTasks, setPreviewTasks] = useState<BlueprintTasksSummary | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [isSyncingTasks, setIsSyncingTasks] = useState(false);
  const [tasksSyncSuccess, setTasksSyncSuccess] = useState<string | null>(null);
  const [showTasksTable, setShowTasksTable] = useState(false);

  // Module 3: Vacation & Leave Discipline State (UI_TAT_011)
  const [isFetchingVacation, setIsFetchingVacation] = useState(false);
  const [previewVacation, setPreviewVacation] = useState<BlueprintVacationSummary | null>(null);
  const [vacationError, setVacationError] = useState<string | null>(null);
  const [isSyncingVacation, setIsSyncingVacation] = useState(false);
  const [vacationSyncSuccess, setVacationSyncSuccess] = useState<string | null>(null);
  const [showVacationTable, setShowVacationTable] = useState(false);
  const [vacationYear, setVacationYear] = useState<string>('2026');
  const [selectedVacationMember, setSelectedVacationMember] = useState<string>('khoadang');
  const [customVacationMember, setCustomVacationMember] = useState<string>('');

  // Member, Role, and Date filters for Module 2 (UI_PIM_001)
  const [selectedTaskMember, setSelectedTaskMember] = useState<string>('hieudao');
  const [customTaskMember, setCustomTaskMember] = useState<string>('');
  const [taskFilterRole, setTaskFilterRole] = useState<'requester' | 'assignee' | 'both'>('requester');
  const [taskDateType, setTaskDateType] = useState<'registered' | 'due' | 'finished'>('registered');
  const [taskFromDate, setTaskFromDate] = useState<string>('');
  const [taskToDate, setTaskToDate] = useState<string>('');
  const [taskMemberList, setTaskMemberList] = useState<Array<{ id: string; name: string; role: string }>>([
    { id: 'hieudao', name: 'Hieu Dao (hieudao)', role: 'Người đăng kí / Requester' },
    { id: 'thienvo', name: 'Thien Vo (thienvo)', role: 'Người đăng kí / Requester' },
    { id: 'diemtran', name: 'Diem Tran (diemtran)', role: 'Người đăng kí / Requester' },
    { id: 'anlt', name: 'Lê Trọng An (anlt)', role: 'Developer / Người đăng kí' },
    { id: 'khoadang', name: 'Khoa Đặng (khoadang)', role: 'Developer / Người đăng kí' },
    { id: 'kyluong', name: 'Lương Đình Kỳ (kyluong)', role: 'Senior Developer / Reviewer / PIC' },
    { id: 'tungha', name: 'Tung Ha (tungha)', role: 'Developer / PIC' },
    { id: 'ducnguyen', name: 'Duc Nguyen (ducnguyen)', role: 'Developer / PIC' },
    { id: 'hyle', name: 'Hy Le (hyle)', role: 'Developer / PIC' },
    { id: 'ngocnb', name: 'Ngoc Nguyen Ba (ngocnb)', role: 'Developer / PIC' },
    { id: 'phuocnt', name: 'Phuoc Nguyen Thanh (phuocnt)', role: 'Developer / PIC' },
  ]);

  // Scheduled Jobs & Logs State
  const [, setSources] = useState<CollectorDataSource[]>([]);
  const [jobs, setJobs] = useState<CollectorJob[]>([]);
  const [logs, setLogs] = useState<CollectorRunLog[]>([]);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [loadingGeneral, setLoadingGeneral] = useState(false);

  // Initial load
  useEffect(() => {
    loadSavedConfig();
    loadSourcesAndJobs();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const cfg = await collectorApi.getBlueprintConfig();
      if (cfg) {
        if (cfg.username) setUsername(cfg.username);
        if (cfg.password) setPassword(cfg.password);
        if (cfg.baseUrl) setBaseUrl(cfg.baseUrl);
        if (cfg.month) setMonth(cfg.month);
        if (cfg.projectFilter) setProjectFilter(cfg.projectFilter);
      }
      collectorApi.getBlueprintTeams().then((teams) => {
        if (Array.isArray(teams) && teams.length > 0) {
          setTeamList(teams);
        }
      }).catch(() => {});
      collectorApi.getBlueprintMembers().then((members) => {
        if (Array.isArray(members) && members.length > 0) {
          setTaskMemberList(members);
        }
      }).catch(() => {});
      // Automatically preview team attendance ONLY if credentials are saved
      if (cfg?.username && cfg?.password) {
        collectorApi.previewBlueprintTeamAttendance({
          username: cfg.username,
          password: cfg.password,
          baseUrl: cfg.baseUrl,
          fromDate: '09/14/2026',
          toDate: '09/14/2026',
        }).then((summary) => {
          setPreviewTeamAttendance(summary);
        }).catch(() => {});
      }
    } catch {
      // Fallback defaults already set
    }
  };

  const loadSourcesAndJobs = async () => {
    setLoadingGeneral(true);
    try {
      const [srcList, jobList, logList] = await Promise.all([
        collectorApi.listDataSources(),
        collectorApi.listJobs(),
        collectorApi.listLogs(30),
      ]);
      setSources(srcList);
      setJobs(jobList);
      setLogs(logList);
    } catch (err: unknown) {
      console.error('Failed to load collector data:', err);
    } finally {
      setLoadingGeneral(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!username.trim() || !password.trim()) {
      alert('Vui lòng nhập Tài khoản và Mật khẩu Blueprint trước khi lưu.');
      return;
    }
    setIsSavingConfig(true);
    setConfigSaveSuccess(null);
    try {
      await collectorApi.saveBlueprintConfig({
        username: username.trim(),
        password: password.trim(),
        baseUrl,
        month,
        projectFilter,
      });
      setConfigSaveSuccess('Đã lưu cấu hình kết nối thành công!');
      setTimeout(() => setConfigSaveSuccess(null), 4000);
    } catch (err: unknown) {
      alert(`Lỗi lưu cấu hình: ${(err as Error).message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    if (!username.trim() || !password.trim()) {
      setTestResult({ success: false, message: 'Vui lòng nhập Tài khoản và Mật khẩu Blueprint để kiểm tra kết nối.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await collectorApi.testConnection({ username: username.trim(), password: password.trim(), baseUrl });
      setTestResult(res);
    } catch (err: unknown) {
      setTestResult({ success: false, message: (err as Error).message || 'Kết nối thất bại' });
    } finally {
      setIsTesting(false);
    }
  };

  // 1-Click Sync All (Attendance + Tasks)
  const handleSyncAll = async () => {
    if (!username.trim() || !password.trim()) {
      setSyncAllError('Vui lòng nhập Tài khoản và Mật khẩu Blueprint ở phần Cấu hình kết nối bên trên trước khi đồng bộ.');
      return;
    }
    setIsSyncingAll(true);
    setSyncAllSuccess(null);
    setSyncAllError(null);
    try {
      const memberTarget = selectedTaskMember === 'custom' ? customTaskMember.trim() : selectedTaskMember;
      const res = await collectorApi.syncAllBlueprint({
        username: username.trim(),
        password: password.trim(),
        baseUrl,
        month,
        projectFilter,
        member: memberTarget || 'hieudao',
        filterRole: taskFilterRole,
        dateType: taskDateType,
        fromDate: taskFromDate,
        toDate: taskToDate,
      });
      if (res.success) {
        setSyncAllSuccess({
          totalScore: res.totalScore,
          attendance: res.attendance,
          tasks: {
            totalTasks: res.tasks.summary?.totalTasks,
            onTimeRate: res.tasks.onTimeRate,
            score10: res.tasks.score10,
            grade: res.tasks.grade,
            weightedScore: res.tasks.weightedScore,
            comment: res.tasks.comment,
          },
        });
        // Populate preview summaries
        handleFetchTeamAttendance();
        setPreviewTasks(res.tasks.summary);
      } else {
        setSyncAllError('Đồng bộ thất bại, vui lòng kiểm tra kỳ đánh giá của nhân viên.');
      }
      await loadSourcesAndJobs();
    } catch (err: unknown) {
      setSyncAllError(`Lỗi đồng bộ: ${(err as Error).message}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Module 1: Daily Team Status (UI_TAT_029) Handlers
  const handleFetchTeamAttendance = async (
    teamIdOverride?: string,
    dateOverride?: string,
    employeeOverride?: string
  ) => {
    if (!username.trim() || !password.trim()) {
      setTeamAttendanceError('Vui lòng nhập Tài khoản và Mật khẩu Blueprint ở phần Cấu hình kết nối bên trên trước khi lấy dữ liệu.');
      return;
    }
    setIsFetchingTeamAttendance(true);
    setTeamAttendanceError(null);
    try {
      const targetTeam = teamIdOverride !== undefined ? teamIdOverride : selectedTeamOrzId;
      const targetDate = dateOverride !== undefined ? dateOverride : teamSearchDate;
      const targetEmp = employeeOverride !== undefined ? employeeOverride : teamSearchEmployeeName;

      const data = await collectorApi.previewBlueprintTeamAttendance({
        username: username.trim(),
        password: password.trim(),
        baseUrl,
        teamId: targetTeam || undefined,
        fromDate: targetDate || undefined,
        toDate: targetDate || undefined,
        employeeName: targetEmp || undefined,
      });
      setPreviewTeamAttendance(data);
    } catch (err: unknown) {
      setTeamAttendanceError((err as Error).message || 'Lỗi khi kéo dữ liệu Daily Team Status từ Blueprint');
    } finally {
      setIsFetchingTeamAttendance(false);
    }
  };

  const handleSyncTeamAttendance = async (targetMember?: string, empeNo?: string) => {
    if (empeNo) setSyncingMemberEmpeNo(empeNo);
    else setIsSyncingTeamAttendance(true);
    setTeamAttendanceSyncSuccess(null);
    try {
      const res = await collectorApi.syncBlueprintTeamAttendance({
        username,
        password,
        baseUrl,
        teamId: selectedTeamOrzId || undefined,
        fromDate: teamSearchDate || undefined,
        toDate: teamSearchDate || undefined,
        targetMember: targetMember || undefined,
      });
      if (res.success) {
        setTeamAttendanceSyncSuccess(
          `🎉 Đã cập nhật vào KPI #18! Điểm chuyên cần nhóm: ${res.score10}/10 | Hạng: ${res.grade} | Trọng số: 4% (+${res.weightedScore.toFixed(2)}đ).`
        );
      }
      await loadSourcesAndJobs();
    } catch (err: unknown) {
      alert(`Lỗi đồng bộ: ${(err as Error).message}`);
    } finally {
      setIsSyncingTeamAttendance(false);
      setSyncingMemberEmpeNo(null);
    }
  };

  // Fetch Tasks preview only
  const handleFetchTasks = async (
    targetOverride?: string,
    roleOverride?: 'requester' | 'assignee' | 'both',
    fromOverride?: string,
    toOverride?: string,
    dateTypeOverride?: 'registered' | 'due' | 'finished'
  ) => {
    if (!username.trim() || !password.trim()) {
      setTasksError('Vui lòng nhập Tài khoản và Mật khẩu Blueprint ở phần Cấu hình kết nối bên trên trước khi xem dữ liệu.');
      return;
    }
    const memberTarget = targetOverride || (selectedTaskMember === 'custom' ? customTaskMember.trim() : selectedTaskMember);
    const roleTarget = roleOverride !== undefined ? roleOverride : taskFilterRole;
    const fromTarget = fromOverride !== undefined ? fromOverride : taskFromDate;
    const toTarget = toOverride !== undefined ? toOverride : taskToDate;
    const dateTypeTarget = dateTypeOverride !== undefined ? dateTypeOverride : taskDateType;

    setIsFetchingTasks(true);
    setTasksError(null);
    try {
      const data = await collectorApi.previewBlueprintTasks({
        username: username.trim(),
        password: password.trim(),
        projectFilter,
        member: memberTarget || 'hieudao',
        filterRole: roleTarget,
        dateType: dateTypeTarget,
        fromDate: fromTarget,
        toDate: toTarget,
      });
      setPreviewTasks(data);
      setShowTasksTable(true);
    } catch (err: unknown) {
      setTasksError((err as Error).message || 'Lỗi khi kéo dữ liệu task từ Blueprint UI_PIM_001');
    } finally {
      setIsFetchingTasks(false);
    }
  };

  // Quick sync Tasks only
  const handleSyncTasks = async () => {
    const memberTarget = selectedTaskMember === 'custom' ? customTaskMember.trim() : selectedTaskMember;
    setIsSyncingTasks(true);
    setTasksSyncSuccess(null);
    try {
      const res = await collectorApi.syncBlueprintTasks({
        username,
        password,
        projectFilter,
        member: memberTarget || 'hieudao',
        filterRole: taskFilterRole,
        dateType: taskDateType,
        fromDate: taskFromDate,
        toDate: taskToDate,
      });
      if (res.success) {
        const memberInfo = taskMemberList.find((m) => m.id === memberTarget);
        const displayName = memberInfo?.name || memberTarget;
        setTasksSyncSuccess(
          `🎉 Đã cập nhật vào KPI #1 cho ${displayName} (${memberTarget})! Điểm hệ 10: ${res.score10}/10 (KPI Cốt lõi ★, Hạng ${res.grade}) | Trọng số: 10% (+${res.weightedScore.toFixed(2)}đ).`
        );
      }
      await loadSourcesAndJobs();
    } catch (err: unknown) {
      alert(`Lỗi đồng bộ: ${(err as Error).message}`);
    } finally {
      setIsSyncingTasks(false);
    }
  };

  // Fetch Vacation & Discipline preview
  const handleFetchVacation = async (targetOverride?: string, yearOverride?: string) => {
    if (!username.trim() || !password.trim()) {
      setVacationError('Vui lòng nhập Tài khoản và Mật khẩu Blueprint ở phần Cấu hình kết nối bên trên trước khi xem dữ liệu.');
      return;
    }
    const memberTarget = targetOverride || (selectedVacationMember === 'custom' ? customVacationMember.trim() : selectedVacationMember);
    const yr = yearOverride || vacationYear;

    setIsFetchingVacation(true);
    setVacationError(null);
    try {
      const data = await collectorApi.previewBlueprintVacation({
        username: username.trim(),
        password: password.trim(),
        baseUrl,
        year: yr,
        member: memberTarget || 'khoadang',
      });
      setPreviewVacation(data);
      setShowVacationTable(true);
    } catch (err: unknown) {
      setVacationError((err as Error).message || 'Lỗi khi kéo dữ liệu nghỉ phép & kỷ luật từ Blueprint UI_TAT_011');
    } finally {
      setIsFetchingVacation(false);
    }
  };

  // Sync Vacation & Discipline
  const handleSyncVacation = async () => {
    const memberTarget = selectedVacationMember === 'custom' ? customVacationMember.trim() : selectedVacationMember;
    setIsSyncingVacation(true);
    setVacationSyncSuccess(null);
    try {
      const res = await collectorApi.syncBlueprintVacation({
        username,
        password,
        baseUrl,
        year: vacationYear,
        member: memberTarget || 'khoadang',
      });
      if (res.success) {
        const memberInfo = taskMemberList.find((m) => m.id === memberTarget);
        const displayName = memberInfo?.name || memberTarget;
        setVacationSyncSuccess(
          `🎉 Đã cập nhật vào KPI Kỷ luật & Văn hóa cho ${displayName} (${memberTarget})! Điểm hệ 10: ${res.score10}/10 (Hạng ${res.grade}) | Trọng số: 4% (+${res.weightedScore.toFixed(2)}đ).`
        );
      }
      await loadSourcesAndJobs();
    } catch (err: unknown) {
      alert(`Lỗi đồng bộ: ${(err as Error).message}`);
    } finally {
      setIsSyncingVacation(false);
    }
  };

  const handleTriggerRunJob = async (jobId: string) => {
    setRunningJobId(jobId);
    try {
      const res = await collectorApi.runJob(jobId);
      if (res.success) {
        alert(`Job thực thi thành công! Số bản ghi cập nhật: ${res.log.records_count}`);
      } else {
        alert(`Job thất bại: ${res.log.error_message || 'Unknown error'}`);
      }
      await loadSourcesAndJobs();
    } catch (err: unknown) {
      alert(`Lỗi: ${(err as Error).message}`);
    } finally {
      setRunningJobId(null);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: RADII['2xl'],
          padding: '28px 32px',
          color: COLORS.neutral.white,
          boxShadow: SHADOWS.lg,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: RADII.lg,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}
            >
              <Activity size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold }}>
              Auto Data Collector Hub
            </h1>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: TYPOGRAPHY.fontSize.sm, maxWidth: '650px' }}>
            Cấu hình kết nối một lần duy nhất để tự động thu thập toàn bộ dữ liệu KPI (Chuyên cần UI_TAT_028 & Task UI_PIM_001) và cập nhật trực tiếp vào phiếu đánh giá của nhân viên.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: isConfigOpen ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: RADII.lg,
              color: '#f8fafc',
              cursor: 'pointer',
              fontSize: TYPOGRAPHY.fontSize.sm,
              fontWeight: 500,
            }}
          >
            <Settings size={16} />
            {isConfigOpen ? 'Đóng cấu hình' : '⚙️ Cấu hình kết nối'}
          </button>

          <button
            onClick={loadSourcesAndJobs}
            disabled={loadingGeneral}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: RADII.lg,
              color: '#f8fafc',
              cursor: 'pointer',
              fontSize: TYPOGRAPHY.fontSize.sm,
              fontWeight: 500,
            }}
          >
            <RefreshCw size={16} className={loadingGeneral ? 'spin' : ''} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Global Connection Settings Panel (Collapsible) */}
      {isConfigOpen && (
        <div
          style={{
            backgroundColor: COLORS.neutral.white,
            borderRadius: RADII.xl,
            padding: '24px',
            boxShadow: SHADOWS.sm,
            border: `1px solid ${COLORS.neutral.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
                Cấu hình Nguồn Kết nối Chung (Blueprint CLV SSO)
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                Cấu hình tài khoản đăng nhập 1 lần duy nhất cho toàn bộ hệ thống. Tất cả API Chấm công (UI_TAT_028), Quản lý Task (UI_PIM_001) sẽ tự động sử dụng cấu hình này.
              </p>
            </div>

            {testResult && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: RADII.full,
                  backgroundColor: testResult.success ? '#ecfdf5' : '#fef2f2',
                  color: testResult.success ? '#059669' : '#dc2626',
                  fontSize: TYPOGRAPHY.fontSize.xs,
                  fontWeight: 500,
                  border: `1px solid ${testResult.success ? '#a7f3d0' : '#fecaca'}`,
                }}
              >
                {testResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {testResult.message}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: COLORS.neutral.textSecondary, marginBottom: '6px' }}>
                Tài khoản (Username)
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: COLORS.neutral[400] }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: RADII.md,
                    border: `1px solid ${COLORS.neutral.border}`,
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: COLORS.neutral.textSecondary, marginBottom: '6px' }}>
                Mật khẩu (Password)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: RADII.md,
                  border: `1px solid ${COLORS.neutral.border}`,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: COLORS.neutral.textSecondary, marginBottom: '6px' }}>
                Chuyên mục Task (Category UI_PIM_001)
              </label>
              <div style={{ position: 'relative' }}>
                <FolderGit2 size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: COLORS.neutral[400] }} />
                <input
                  type="text"
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  placeholder="Allegro NX"
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: RADII.md,
                    border: `1px solid ${COLORS.neutral.border}`,
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: COLORS.neutral.textSecondary, marginBottom: '6px' }}>
                Tháng chấm công (Month)
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: COLORS.neutral[400] }} />
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: RADII.md,
                    border: `1px solid ${COLORS.neutral.border}`,
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '8px', borderTop: `1px solid ${COLORS.neutral[100]}` }}>
            <button
              onClick={handleSaveConfig}
              disabled={isSavingConfig}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                backgroundColor: COLORS.primary.DEFAULT,
                color: COLORS.neutral.white,
                border: 'none',
                borderRadius: RADII.md,
                fontSize: TYPOGRAPHY.fontSize.sm,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Save size={14} />
              {isSavingConfig ? 'Đang lưu...' : '💾 Lưu cấu hình mặc định'}
            </button>

            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: COLORS.neutral.white,
                border: `1px solid ${COLORS.neutral.border}`,
                borderRadius: RADII.md,
                color: COLORS.neutral.textPrimary,
                fontSize: TYPOGRAPHY.fontSize.sm,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={isTesting ? 'spin' : ''} />
              {isTesting ? 'Đang kiểm tra...' : '⚡ Test Connection'}
            </button>

            {configSaveSuccess && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 500 }}>
                <CheckCircle2 size={16} /> {configSaveSuccess}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${COLORS.neutral.border}` }}>
        <button
          onClick={() => setActiveTab('hub')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'hub' ? `3px solid ${COLORS.primary.DEFAULT}` : '3px solid transparent',
            color: activeTab === 'hub' ? COLORS.primary.DEFAULT : COLORS.neutral.textSecondary,
            fontWeight: activeTab === 'hub' ? 600 : 500,
            fontSize: TYPOGRAPHY.fontSize.sm,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Zap size={16} />
          KPI Collector Hub (Thu thập Tích hợp)
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'jobs' ? `3px solid ${COLORS.primary.DEFAULT}` : '3px solid transparent',
            color: activeTab === 'jobs' ? COLORS.primary.DEFAULT : COLORS.neutral.textSecondary,
            fontWeight: activeTab === 'jobs' ? 600 : 500,
            fontSize: TYPOGRAPHY.fontSize.sm,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Layers size={16} />
          Lịch Cron tự động ({jobs.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'logs' ? `3px solid ${COLORS.primary.DEFAULT}` : '3px solid transparent',
            color: activeTab === 'logs' ? COLORS.primary.DEFAULT : COLORS.neutral.textSecondary,
            fontWeight: activeTab === 'logs' ? 600 : 500,
            fontSize: TYPOGRAPHY.fontSize.sm,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Clock size={16} />
          Nhật ký thực thi ({logs.length})
        </button>
      </div>

      {/* TAB 1: UNIFIED KPI COLLECTOR HUB */}
      {activeTab === 'hub' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Central 1-Click Action Card */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: `1.5px solid #cbd5e1`,
              borderRadius: RADII['2xl'],
              padding: '24px 28px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: SHADOWS.sm,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Unified Pipeline
                </span>
                <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                  | Tài khoản: <strong>{username}</strong> | Chuyên mục: <strong>{projectFilter}</strong> | Tháng: <strong>{month}</strong>
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
                Đồng bộ Toàn bộ KPI với 1 cú nhấp chuột
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                Hệ thống đăng nhập Blueprint một lần duy nhất, đồng thời thu thập <strong>Chuyên cần (UI_TAT_028)</strong> và <strong>48 Task dự án (UI_PIM_001)</strong>, tự động quy đổi thang điểm 10 và cập nhật phiếu đánh giá.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={handleSyncAll}
                disabled={isSyncingAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 24px',
                  backgroundColor: '#10b981',
                  color: COLORS.neutral.white,
                  border: 'none',
                  borderRadius: RADII.xl,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                }}
              >
                <Zap size={18} />
                {isSyncingAll ? 'Đang đồng bộ tất cả...' : '⚡ Thu thập & Đồng bộ Toàn bộ KPI'}
              </button>
            </div>
          </div>

          {/* Sync All Result Banner */}
          {syncAllSuccess && (
            <div
              style={{
                padding: '18px 24px',
                borderRadius: RADII.xl,
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: 700, fontSize: TYPOGRAPHY.fontSize.base }}>
                <CheckCircle2 size={20} color="#059669" />
                🎉 Đã cập nhật thành công toàn bộ KPI vào phiếu đánh giá của {username}!
              </div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: TYPOGRAPHY.fontSize.sm, color: '#047857', paddingTop: '4px' }}>
                <span>• <strong>KPI #18 (Thái độ 4%):</strong> {syncAllSuccess.attendance.score10}/10 (Hạng {syncAllSuccess.attendance.grade}) → +{syncAllSuccess.attendance.weightedScore.toFixed(2)}đ</span>
                <span>• <strong>KPI #1 (Tiến độ 10% - Cốt lõi ★):</strong> {syncAllSuccess.tasks.score10}/10 (Hạng {syncAllSuccess.tasks.grade}) → +{syncAllSuccess.tasks.weightedScore.toFixed(2)}đ ({syncAllSuccess.tasks.onTimeRate}% đúng hạn)</span>
                <span>• <strong>Tổng điểm đóng góp:</strong> <strong>+{syncAllSuccess.totalScore.toFixed(2)}đ</strong></span>
              </div>
            </div>
          )}

          {syncAllError && (
            <div
              style={{
                padding: '14px 20px',
                borderRadius: RADII.xl,
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: TYPOGRAPHY.fontSize.sm,
              }}
            >
              <AlertCircle size={18} />
              {syncAllError}
            </div>
          )}

          {/* MODULE 1: DAILY TEAM STATUS (UI_TAT_029 -> KPI #18) */}
          <div
            style={{
              backgroundColor: COLORS.neutral.white,
              borderRadius: RADII['2xl'],
              padding: '24px',
              boxShadow: SHADOWS.sm,
              border: `1px solid ${COLORS.neutral.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: RADII.lg,
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
                      Module 1: Daily Team Status (Face) - Điểm danh Nhóm Quản lý (UI_TAT_029)
                    </h3>
                    <span style={{ padding: '2px 8px', borderRadius: RADII.full, backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700 }}>
                      Áp dụng vào KPI #18 (Trọng số 4%)
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                    API <code>/api/dailyTeamStatusFace/searchAttendanceTime</code> | Giám sát Punch In / Punch Out thực tế của 2 Team: <strong>ALLEGRO NX Part</strong> & <strong>Maritime Solutions Part</strong>.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleFetchTeamAttendance()}
                  disabled={isFetchingTeamAttendance}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: COLORS.neutral.white,
                    border: `1px solid ${COLORS.neutral.border}`,
                    borderRadius: RADII.md,
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Search size={14} />
                  {isFetchingTeamAttendance ? 'Đang kéo...' : '🔍 Lấy dữ liệu Team Check-in'}
                </button>

                <button
                  onClick={() => handleSyncTeamAttendance()}
                  disabled={isSyncingTeamAttendance}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: COLORS.neutral.white,
                    border: 'none',
                    borderRadius: RADII.md,
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Check size={14} />
                  {isSyncingTeamAttendance ? 'Đang cập nhật...' : '⚡ Cập nhật KPI Chuyên cần Team (#18)'}
                </button>
              </div>
            </div>

            {/* Filter Bar styled faithfully like Blueprint UI_TAT_029 */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '14px 18px',
                borderRadius: RADII.xl,
                border: `1px solid #e2e8f0`,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              {/* Company */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: COLORS.neutral.textSecondary }}>Company:</span>
                <span
                  style={{
                    padding: '5px 10px',
                    backgroundColor: COLORS.neutral.white,
                    border: '1px solid #cbd5e1',
                    borderRadius: RADII.md,
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 600,
                    color: COLORS.neutral.textPrimary,
                  }}
                >
                  CyberLogitec Vietnam
                </span>
              </div>

              {/* Team Name Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: COLORS.neutral.textSecondary }}>Team Name:</span>
                <select
                  value={selectedTeamOrzId}
                  onChange={(e) => {
                    setSelectedTeamOrzId(e.target.value);
                    handleFetchTeamAttendance(e.target.value, teamSearchDate, teamSearchEmployeeName);
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    borderRadius: RADII.md,
                    border: '1px solid #cbd5e1',
                    backgroundColor: COLORS.neutral.white,
                    fontWeight: 600,
                    color: '#1e293b',
                    cursor: 'pointer',
                    minWidth: '220px',
                  }}
                >
                  <option value="">Tất cả Team quản lý (NX & Maritime - 21 mems)</option>
                  {teamList.map((t) => (
                    <option key={t.orzId} value={t.orzId}>
                      {t.orzNm} {t.orzId === 'ATM202310170003' ? '(12 mems)' : t.orzId === 'ATM202310170004' ? '(9 mems)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 200px' }}>
                <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: COLORS.neutral.textSecondary }}>Nhân viên:</span>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    value={teamSearchEmployeeName}
                    onChange={(e) => setTeamSearchEmployeeName(e.target.value)}
                    placeholder="Enter Employee's Name Or Employee Code..."
                    style={{
                      width: '100%',
                      padding: '6px 12px',
                      paddingLeft: '28px',
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      borderRadius: RADII.md,
                      border: '1px solid #cbd5e1',
                      backgroundColor: COLORS.neutral.white,
                      outline: 'none',
                    }}
                  />
                  <Search size={13} style={{ position: 'absolute', left: '9px', top: '8px', color: '#94a3b8' }} />
                </div>
              </div>

              {/* Date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: COLORS.neutral.textSecondary }}>Ngày:</span>
                <input
                  type="text"
                  value={teamSearchDate}
                  onChange={(e) => setTeamSearchDate(e.target.value)}
                  placeholder="MM/DD/YYYY"
                  style={{
                    width: '105px',
                    padding: '6px 10px',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    borderRadius: RADII.md,
                    border: '1px solid #cbd5e1',
                    backgroundColor: COLORS.neutral.white,
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                />
              </div>

              {/* Search Button */}
              <button
                onClick={() => handleFetchTeamAttendance()}
                disabled={isFetchingTeamAttendance}
                style={{
                  padding: '6px 18px',
                  backgroundColor: '#3b82f6',
                  color: COLORS.neutral.white,
                  border: 'none',
                  borderRadius: RADII.md,
                  fontSize: TYPOGRAPHY.fontSize.xs,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)',
                }}
              >
                Search
              </button>
            </div>

            {/* Success and Error messages */}
            {teamAttendanceSyncSuccess && (
              <div style={{ padding: '10px 14px', borderRadius: RADII.md, backgroundColor: '#ecfdf5', color: '#065f46', fontSize: TYPOGRAPHY.fontSize.xs, border: '1px solid #a7f3d0' }}>
                {teamAttendanceSyncSuccess}
              </div>
            )}
            {teamAttendanceError && (
              <div style={{ padding: '10px 14px', borderRadius: RADII.md, backgroundColor: '#fef2f2', color: '#991b1b', fontSize: TYPOGRAPHY.fontSize.xs, border: '1px solid #fecaca' }}>
                {teamAttendanceError}
              </div>
            )}

            {/* Team Attendance Metric Cards */}
            {previewTeamAttendance ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                <div style={{ backgroundColor: '#f0fdf4', padding: '14px 18px', borderRadius: RADII.lg, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#166534', fontWeight: 600 }}>Tỷ lệ đúng giờ nhóm</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#15803d', marginTop: '2px' }}>{previewTeamAttendance.punctualityRate}%</div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#166534', marginTop: '2px' }}>Mục tiêu: 100% check-in trước 08:30</div>
                </div>

                <div style={{ backgroundColor: '#f0fdf4', padding: '14px 18px', borderRadius: RADII.lg, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#166534', fontWeight: 600 }}>Quy đổi Thang 10 (4%)</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: '#15803d' }}>
                      {previewTeamAttendance.score10}/10
                    </span>
                    <span style={{ padding: '2px 6px', borderRadius: RADII.full, backgroundColor: '#15803d', color: '#fff', fontSize: '11px', fontWeight: 700 }}>
                      Hạng {previewTeamAttendance.grade}
                    </span>
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#166534', marginTop: '2px' }}>
                    Đóng góp: +{(previewTeamAttendance.score10 * 0.04).toFixed(2)}đ (4%)
                  </div>
                </div>

                <div style={{ backgroundColor: COLORS.neutral[50], padding: '14px 18px', borderRadius: RADII.lg, border: `1px solid ${COLORS.neutral[200]}` }}>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, fontWeight: 500 }}>Đúng giờ / Đi muộn</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>
                    {previewTeamAttendance.onTimeMembers}{' '}
                    <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 400, color: previewTeamAttendance.lateMembers > 0 ? '#dc2626' : COLORS.neutral.textSecondary }}>
                      / trễ {previewTeamAttendance.lateMembers}
                    </span>
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginTop: '2px' }}>
                    {previewTeamAttendance.lateMembers > 0 ? 'Phát hiện nhân viên check-in sau 08:30' : 'Tất cả nhân sự đúng giờ'}
                  </div>
                </div>

                <div style={{ backgroundColor: COLORS.neutral[50], padding: '14px 18px', borderRadius: RADII.lg, border: `1px solid ${COLORS.neutral[200]}` }}>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, fontWeight: 500 }}>Tổng quân số quản lý</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: COLORS.neutral.textPrimary, marginTop: '2px' }}>
                    {previewTeamAttendance.attendedMembers} / {previewTeamAttendance.totalMembers}
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginTop: '2px' }}>
                    Team: {previewTeamAttendance.teamName}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px', backgroundColor: COLORS.neutral[50], borderRadius: RADII.lg, color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.xs, textAlign: 'center' }}>
                {isFetchingTeamAttendance
                  ? `Đang nạp dữ liệu check-in/out của các Team quản lý (${username || 'Blueprint'})...`
                  : 'Chưa có dữ liệu Team check-in. Vui lòng nhập tài khoản và nhấn "Lấy dữ liệu Team Check-in" hoặc "Search".'}
              </div>
            )}

            {/* Table of Members Check In/Out (Faithfully matching UI_TAT_029 screenshot) */}
            {previewTeamAttendance && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <button
                    onClick={() => setShowTeamAttendanceTable(!showTeamAttendanceTable)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: COLORS.primary.DEFAULT,
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 0',
                    }}
                  >
                    {showTeamAttendanceTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showTeamAttendanceTable ? 'Ẩn bảng chi tiết Team Check-in/out' : `👁️ Xem bảng chi tiết Team Check-in/out (${previewTeamAttendance.records.length} nhân sự)`}
                  </button>

                  <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                    Hiển thị <strong>{previewTeamAttendance.records.filter((r) => {
                      if (!teamSearchEmployeeName) return true;
                      const q = teamSearchEmployeeName.toLowerCase();
                      return r.empeName.toLowerCase().includes(q) || r.empeNo.toLowerCase().includes(q);
                    }).length}</strong> / {previewTeamAttendance.records.length} nhân sự
                  </span>
                </div>

                {showTeamAttendanceTable && (
                  <div style={{ overflowX: 'auto', maxHeight: '420px', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.lg }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.xs }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9', borderBottom: `1px solid ${COLORS.neutral[300]}` }}>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>Organization</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>Employee Code</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>Name</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>Date</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>Punch In</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>Punch Out</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>Work Shift</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>Leave Type</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>Trạng thái</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#334155', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewTeamAttendance.records
                          .filter((r) => {
                            if (!teamSearchEmployeeName) return true;
                            const q = teamSearchEmployeeName.toLowerCase();
                            return r.empeName.toLowerCase().includes(q) || r.empeNo.toLowerCase().includes(q);
                          })
                          .map((r, idx) => {
                            const isLate = r.status === 'LATE';
                            return (
                              <tr
                                key={idx}
                                style={{
                                  borderBottom: `1px solid ${COLORS.neutral[100]}`,
                                  backgroundColor: idx % 2 === 0 ? COLORS.neutral.white : '#f8fafc',
                                }}
                              >
                                <td style={{ padding: '8px 14px', fontWeight: 500, color: '#334155' }}>{r.orzNm}</td>
                                <td style={{ padding: '8px 14px', fontWeight: 600, color: '#64748b' }}>{r.empeNo}</td>
                                <td style={{ padding: '8px 14px', fontWeight: 600, color: COLORS.neutral.textPrimary }}>{r.empeName}</td>
                                <td style={{ padding: '8px 14px', color: COLORS.neutral.textSecondary }}>{r.date}</td>
                                
                                {/* Punch In: Highlight in PINK if LATE (> 08:30) exactly like Blueprint UI_TAT_029 */}
                                <td style={{ padding: '8px 14px' }}>
                                  {r.punchIn ? (
                                    <span
                                      style={{
                                        display: 'inline-block',
                                        padding: isLate ? '3px 8px' : '2px 0px',
                                        borderRadius: RADII.sm,
                                        backgroundColor: isLate ? '#fbcfe8' : 'transparent', // Soft pink background matching screenshot
                                        color: isLate ? '#9d174d' : '#0f172a',
                                        fontWeight: isLate ? 700 : 600,
                                      }}
                                    >
                                      {r.punchIn}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#94a3b8' }}>—</span>
                                  )}
                                </td>

                                <td style={{ padding: '8px 14px', color: '#475569', fontWeight: 500 }}>
                                  {r.punchOut || '—'}
                                </td>
                                <td style={{ padding: '8px 14px', color: '#64748b' }}>{r.workShift}</td>
                                <td style={{ padding: '8px 14px', color: '#64748b' }}>{r.leaveType || '—'}</td>
                                <td style={{ padding: '8px 14px' }}>
                                  <span
                                    style={{
                                      padding: '2px 8px',
                                      borderRadius: RADII.full,
                                      backgroundColor: r.status === 'ON_TIME' ? '#dcfce7' : r.status === 'LATE' ? '#fecaca' : '#f1f5f9',
                                      color: r.status === 'ON_TIME' ? '#15803d' : r.status === 'LATE' ? '#991b1b' : '#475569',
                                      fontWeight: 600,
                                      fontSize: '11px',
                                    }}
                                  >
                                    {r.status === 'ON_TIME' ? 'Đúng giờ' : r.status === 'LATE' ? `Đi muộn ${r.lateMinutes}p` : r.status}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                                  <button
                                    onClick={() => handleSyncTeamAttendance(r.usrId || r.empeName, r.empeNo)}
                                    disabled={syncingMemberEmpeNo === r.empeNo}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: RADII.sm,
                                      backgroundColor: '#eff6ff',
                                      color: '#2563eb',
                                      border: '1px solid #bfdbfe',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {syncingMemberEmpeNo === r.empeNo ? 'Đang lưu...' : 'Đồng bộ KPI'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MODULE 2: TASKS (UI_PIM_001 -> KPI #1) */}
          <div
            style={{
              backgroundColor: COLORS.neutral.white,
              borderRadius: RADII['2xl'],
              padding: '24px',
              boxShadow: SHADOWS.sm,
              border: `1px solid ${COLORS.neutral.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: RADII.lg,
                    backgroundColor: '#faf5ff',
                    color: '#9333ea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
                      Module 2: Quản lý Task & Tiến độ (UI_PIM_001)
                    </h3>
                    <span style={{ padding: '2px 8px', borderRadius: RADII.full, backgroundColor: '#faf5ff', color: '#7e22ce', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700 }}>
                      Áp dụng vào KPI #1 (Trọng số 10% - Cốt lõi ★)
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                    API <code>/api/uiPim001/searchRequirement</code> | Chuyên mục: <strong>{projectFilter}</strong> | Đang đối soát cho: <strong style={{ color: '#7e22ce' }}>{taskMemberList.find(m => m.id === (previewTasks?.username || selectedTaskMember))?.name || (previewTasks?.username || selectedTaskMember)} ({previewTasks?.username || selectedTaskMember})</strong>
                  </p>
                </div>
              </div>

              {/* FILTER TOOLBAR: MEMBER + ROLE + DATE RANGE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* MEMBER SELECTOR DROPDOWN */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#faf5ff',
                      padding: '6px 12px',
                      borderRadius: RADII.md,
                      border: '1.5px solid #c084fc',
                      boxShadow: '0 1px 3px rgba(147, 51, 234, 0.1)',
                    }}
                  >
                    <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                      <Users size={15} color="#9333ea" /> Thành viên:
                    </label>
                    <select
                      value={selectedTaskMember}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedTaskMember(val);
                        if (val !== 'custom') {
                          handleFetchTasks(val);
                        }
                      }}
                      style={{
                        padding: '5px 10px',
                        borderRadius: RADII.md,
                        border: '1px solid #a855f7',
                        fontSize: TYPOGRAPHY.fontSize.xs,
                        fontWeight: 700,
                        color: '#581c87',
                        backgroundColor: '#ffffff',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {taskMemberList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.role ? `— ${m.role}` : ''}
                        </option>
                      ))}
                      <option value="custom">-- Nhập username khác --</option>
                    </select>

                    {selectedTaskMember === 'custom' && (
                      <input
                        type="text"
                        placeholder="Username..."
                        value={customTaskMember}
                        onChange={(e) => setCustomTaskMember(e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: RADII.md,
                          border: '1px solid #cbd5e1',
                          fontSize: TYPOGRAPHY.fontSize.xs,
                          width: '120px',
                          outline: 'none',
                        }}
                      />
                    )}
                  </div>

                  {/* ROLE FILTER: Requester vs Assignee vs Both */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#f8fafc',
                      padding: '6px 12px',
                      borderRadius: RADII.md,
                      border: '1.5px solid #cbd5e1',
                    }}
                  >
                    <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                      Lọc theo vai trò:
                    </span>
                    <select
                      value={taskFilterRole}
                      onChange={(e) => {
                        const val = e.target.value as 'requester' | 'assignee' | 'both';
                        setTaskFilterRole(val);
                        handleFetchTasks(undefined, val);
                      }}
                      style={{
                        padding: '5px 10px',
                        borderRadius: RADII.md,
                        border: '1px solid #94a3b8',
                        fontSize: TYPOGRAPHY.fontSize.xs,
                        fontWeight: 700,
                        color: '#0f172a',
                        backgroundColor: '#ffffff',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="requester">📌 Người đăng kí (Requester - Chuẩn UI_PIM_001)</option>
                      <option value="assignee">👤 Người thực hiện (Assignee / PIC)</option>
                      <option value="both">🔄 Cả hai (Tất cả vai trò)</option>
                    </select>
                  </div>

                  {/* DATE RANGE FILTER: Từ ngày - Đến ngày */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#f0fdf4',
                      padding: '6px 12px',
                      borderRadius: RADII.md,
                      border: '1.5px solid #86efac',
                    }}
                  >
                    <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#166534', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} color="#16a34a" /> Lọc theo:
                    </span>
                    <select
                      value={taskDateType}
                      onChange={(e) => {
                        const val = e.target.value as 'registered' | 'due' | 'finished';
                        setTaskDateType(val);
                        handleFetchTasks(undefined, undefined, undefined, undefined, val);
                      }}
                      style={{
                        padding: '3px 6px',
                        borderRadius: RADII.sm,
                        border: '1px solid #86efac',
                        fontSize: TYPOGRAPHY.fontSize.xs,
                        fontWeight: 700,
                        color: '#166534',
                        backgroundColor: '#ffffff',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="registered">📅 Ngày đăng kí (Registered)</option>
                      <option value="due">⏰ Hạn chót (Due Date)</option>
                      <option value="finished">🏁 Ngày hoàn thành (Finished)</option>
                    </select>
                    <label style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>Từ</label>
                    <input
                      type="date"
                      value={taskFromDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTaskFromDate(val);
                        handleFetchTasks(undefined, undefined, val, taskToDate);
                      }}
                      style={{
                        padding: '4px 6px',
                        borderRadius: RADII.sm,
                        border: '1px solid #86efac',
                        fontSize: TYPOGRAPHY.fontSize.xs,
                        outline: 'none',
                        backgroundColor: '#ffffff',
                      }}
                    />
                    <label style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>Đến</label>
                    <input
                      type="date"
                      value={taskToDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTaskToDate(val);
                        handleFetchTasks(undefined, undefined, taskFromDate, val);
                      }}
                      style={{
                        padding: '4px 6px',
                        borderRadius: RADII.sm,
                        border: '1px solid #86efac',
                        fontSize: TYPOGRAPHY.fontSize.xs,
                        outline: 'none',
                        backgroundColor: '#ffffff',
                      }}
                    />

                    {/* Quick date presets */}
                    <button
                      type="button"
                      onClick={() => {
                        setTaskFromDate('2026-09-01');
                        setTaskToDate('2026-09-30');
                        handleFetchTasks(undefined, undefined, '2026-09-01', '2026-09-30');
                      }}
                      style={{
                        padding: '3px 8px',
                        borderRadius: RADII.sm,
                        border: '1px solid #86efac',
                        backgroundColor: '#dcfce7',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#15803d',
                        cursor: 'pointer',
                      }}
                    >
                      Tháng 9/2026
                    </button>
                    {(taskFromDate || taskToDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setTaskFromDate('');
                          setTaskToDate('');
                          handleFetchTasks(undefined, undefined, '', '');
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: RADII.sm,
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f1f5f9',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        ✕ Xóa lọc ngày
                      </button>
                    )}
                  </div>

                  {/* ACTION BUTTONS */}
                  <button
                    onClick={() => handleFetchTasks()}
                    disabled={isFetchingTasks}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      backgroundColor: COLORS.primary.DEFAULT,
                      color: COLORS.neutral.white,
                      border: 'none',
                      borderRadius: RADII.md,
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Play size={12} />
                    {isFetchingTasks ? 'Đang kéo...' : '🔍 Lọc Task (UI_PIM_001)'}
                  </button>

                  <button
                    onClick={handleSyncTasks}
                    disabled={isSyncingTasks}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: COLORS.neutral.white,
                      border: 'none',
                      borderRadius: RADII.md,
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Check size={12} />
                    {isSyncingTasks ? 'Đang cập nhật...' : '⚡ Cập nhật KPI #1'}
                  </button>
                </div>
              </div>
            </div>

            {tasksSyncSuccess && (
              <div style={{ padding: '10px 14px', borderRadius: RADII.md, backgroundColor: '#ecfdf5', color: '#065f46', fontSize: TYPOGRAPHY.fontSize.xs, border: '1px solid #a7f3d0' }}>
                {tasksSyncSuccess}
              </div>
            )}
            {tasksError && (
              <div style={{ padding: '10px 14px', borderRadius: RADII.md, backgroundColor: '#fef2f2', color: '#991b1b', fontSize: TYPOGRAPHY.fontSize.xs, border: '1px solid #fecaca' }}>
                {tasksError}
              </div>
            )}

            {/* Tasks Metric Cards */}
            {previewTasks ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                <div style={{ backgroundColor: previewTasks.onTimeRate >= 90 ? '#f0fdf4' : '#fffbeb', padding: '14px 18px', borderRadius: RADII.lg, border: `1px solid ${previewTasks.onTimeRate >= 90 ? '#bbf7d0' : '#fde68a'}` }}>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: previewTasks.onTimeRate >= 90 ? '#166534' : '#b45309', fontWeight: 600 }}>Tỷ lệ đúng hạn</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: previewTasks.onTimeRate >= 90 ? '#15803d' : '#d97706', marginTop: '2px' }}>{previewTasks.onTimeRate}%</div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginTop: '2px' }}>Mục tiêu chuẩn: ≥ 90%</div>
                </div>

                <div style={{ backgroundColor: '#f0fdf4', padding: '14px 18px', borderRadius: RADII.lg, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#166534', fontWeight: 600 }}>Quy đổi Thang 10 (KPI Cốt lõi ★: 10%)</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: '#15803d' }}>
                      {previewTasks.onTimeRate === 100 ? 10 : previewTasks.onTimeRate >= 90 ? 9 : previewTasks.onTimeRate >= 80 ? 6 : previewTasks.onTimeRate >= 70 ? 5 : 3}/10
                    </span>
                    <span style={{ padding: '2px 6px', borderRadius: RADII.full, backgroundColor: '#15803d', color: '#fff', fontSize: '11px', fontWeight: 700 }}>
                      Hạng {previewTasks.onTimeRate === 100 ? 'S' : previewTasks.onTimeRate >= 90 ? 'A' : previewTasks.onTimeRate >= 80 ? 'B' : previewTasks.onTimeRate >= 70 ? 'C' : 'D'}
                    </span>
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#166534', marginTop: '2px' }}>
                    Đóng góp: +{((previewTasks.onTimeRate === 100 ? 10 : previewTasks.onTimeRate >= 90 ? 9 : previewTasks.onTimeRate >= 80 ? 6 : previewTasks.onTimeRate >= 70 ? 5 : 3) * 0.10).toFixed(2)}đ (10%)
                  </div>
                </div>

                <div style={{ backgroundColor: COLORS.neutral[50], padding: '14px 18px', borderRadius: RADII.lg, border: `1px solid ${COLORS.neutral[200]}` }}>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, fontWeight: 500 }}>Tổng số Task đã giao</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: COLORS.neutral.textPrimary, marginTop: '2px' }}>
                    {previewTasks.totalTasks} <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 400, color: COLORS.neutral.textSecondary }}>(Xong: {previewTasks.completedTasks})</span>
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginTop: '2px' }}>Chuyên mục: {previewTasks.projectName}</div>
                </div>

                <div style={{ backgroundColor: COLORS.neutral[50], padding: '14px 18px', borderRadius: RADII.lg, border: `1px solid ${COLORS.neutral[200]}` }}>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, fontWeight: 500 }}>Đúng hạn vs Trễ hạn</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>
                    {previewTasks.onTimeTasks} <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: '#ef4444' }}>/ trễ {previewTasks.delayedTasks}</span>
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginTop: '2px' }}>Dựa trên delayProc từ Blueprint</div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px', backgroundColor: COLORS.neutral[50], borderRadius: RADII.lg, color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.xs, textAlign: 'center' }}>
                Chưa tải danh sách task. Bấm <strong>"🔍 Lấy danh sách Task"</strong> hoặc <strong>"⚡ Thu thập & Đồng bộ Toàn bộ KPI"</strong> ở trên để nạp 48 task của {username}.
              </div>
            )}

            {/* Toggle Tasks Details */}
            {previewTasks && (
              <div>
                <button
                  onClick={() => setShowTasksTable(!showTasksTable)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: COLORS.primary.DEFAULT,
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 0',
                  }}
                >
                  {showTasksTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showTasksTable ? 'Ẩn bảng chi tiết Task' : `👁️ Xem bảng chi tiết 48 Task từ UI_PIM_001 (${previewTasks.tasks.length} tasks - Khớp Image 2)`}
                </button>

                {showTasksTable && (
                  <div style={{ marginTop: '10px', overflowX: 'auto', maxHeight: '400px', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.lg }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.xs }}>
                      <thead>
                        <tr style={{ backgroundColor: COLORS.neutral[50], borderBottom: `1px solid ${COLORS.neutral[200]}` }}>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Mã Req</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Tiêu đề Task</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Người đăng kí (Requester)</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Người thực hiện (Assignee)</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Ngày đăng kí</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Chuyên mục</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Hạn chót (Due Date)</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Hoàn thành (Phase Due)</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Trạng thái</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Đánh giá</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewTasks.tasks.map((r, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${COLORS.neutral[100]}`, backgroundColor: r.isOnTime ? COLORS.neutral.white : '#fff5f5' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: COLORS.primary.DEFAULT }}>{r.seqNo || r.id}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 500, maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.title}>
                              {r.title}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: RADII.full, backgroundColor: '#fef3c7', color: '#92400e', fontSize: '11px', fontWeight: 600 }}>
                                ✍️ {r.requester || '—'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: RADII.full, backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '11px', fontWeight: 600 }}>
                                👤 {r.assignee || '—'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', color: COLORS.neutral.textSecondary, fontSize: '11px', whiteSpace: 'nowrap' }}>
                              {r.registeredDate || '—'}
                            </td>
                            <td style={{ padding: '8px 12px', color: COLORS.neutral.textSecondary }}>{r.category}</td>
                            <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{r.plannedDue || '—'}</td>
                            <td style={{ padding: '8px 12px', fontWeight: r.actualFinish ? 500 : 400, whiteSpace: 'nowrap' }}>{r.actualFinish || '—'}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ padding: '2px 6px', borderRadius: RADII.sm, backgroundColor: r.status === 'Finished' ? '#eff6ff' : '#fef3c7', color: r.status === 'Finished' ? '#1d4ed8' : '#b45309', fontWeight: 500 }}>
                                {r.status}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: RADII.full,
                                  backgroundColor: r.isOnTime ? '#dcfce7' : '#fee2e2',
                                  color: r.isOnTime ? '#15803d' : '#b91c1c',
                                  fontWeight: 600,
                                }}
                              >
                                {r.isOnTime ? 'Đúng hạn' : 'Trễ hạn'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MODULE 3: VACATION, LEAVE & DISCIPLINE (UI_TAT_011) */}
          <div
            style={{
              backgroundColor: COLORS.neutral.white,
              borderRadius: RADII.xl,
              border: '1px solid #a7f3d0',
              boxShadow: SHADOWS.sm,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #059669, #10b981, #06b6d4)',
              }}
            />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: RADII.lg,
                    backgroundColor: '#ecfdf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#059669',
                  }}
                >
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
                      Module 3: Nghỉ phép & Kỷ luật Lao động (UI_TAT_011)
                    </h3>
                    <span style={{ padding: '2px 8px', borderRadius: RADII.full, backgroundColor: '#ecfdf5', color: '#047857', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700 }}>
                      MỚI - Đánh giá Nội quy & Chấp hành
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                    API <code>/api/checkInOut/getAnnualVacationProfile</code> & <code>searchAunualDedunctionHis</code> | Đang đối soát cho:{' '}
                    <strong style={{ color: '#047857' }}>
                      {taskMemberList.find((m) => m.id === (previewVacation?.username || selectedVacationMember))?.name || (previewVacation?.username || selectedVacationMember)} (
                      {previewVacation?.username || selectedVacationMember})
                    </strong>
                  </p>
                </div>
              </div>

              {/* TOOLBAR CONTROLS: YEAR + MEMBER + BUTTONS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* YEAR SELECTOR */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#f0fdf4',
                    padding: '6px 12px',
                    borderRadius: RADII.md,
                    border: '1px solid #86efac',
                  }}
                >
                  <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#166534', whiteSpace: 'nowrap' }}>
                    <Calendar size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                    Năm:
                  </label>
                  <select
                    value={vacationYear}
                    onChange={(e) => {
                      const yr = e.target.value;
                      setVacationYear(yr);
                      handleFetchVacation(undefined, yr);
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: RADII.md,
                      border: '1px solid #4ade80',
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      fontWeight: 700,
                      color: '#14532d',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="2026">2026 (Hiện tại)</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                </div>

                {/* MEMBER SELECTOR */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#f0fdf4',
                    padding: '6px 12px',
                    borderRadius: RADII.md,
                    border: '1px solid #86efac',
                  }}
                >
                  <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#166534', whiteSpace: 'nowrap' }}>
                    <Users size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                    Nhân viên:
                  </label>
                  <select
                    value={selectedVacationMember}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedVacationMember(val);
                      if (val !== 'custom') {
                        handleFetchVacation(val);
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: RADII.md,
                      border: '1px solid #4ade80',
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      fontWeight: 700,
                      color: '#14532d',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {taskMemberList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                    <option value="custom">-- Nhập username khác --</option>
                  </select>

                  {selectedVacationMember === 'custom' && (
                    <input
                      type="text"
                      placeholder="Username..."
                      value={customVacationMember}
                      onChange={(e) => setCustomVacationMember(e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: RADII.md,
                        border: '1px solid #86efac',
                        fontSize: TYPOGRAPHY.fontSize.xs,
                        width: '110px',
                        outline: 'none',
                      }}
                    />
                  )}
                </div>

                {/* ACTION BUTTONS */}
                <button
                  onClick={() => handleFetchVacation()}
                  disabled={isFetchingVacation}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: RADII.md,
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 600,
                    border: 'none',
                    cursor: isFetchingVacation ? 'not-allowed' : 'pointer',
                    opacity: isFetchingVacation ? 0.7 : 1,
                  }}
                >
                  <RefreshCw size={14} className={isFetchingVacation ? 'animate-spin' : ''} />
                  {isFetchingVacation ? 'Đang kéo...' : 'Lấy dữ liệu Nghỉ phép'}
                </button>

                <button
                  onClick={handleSyncVacation}
                  disabled={isSyncingVacation}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: RADII.md,
                    backgroundColor: '#047857',
                    color: '#ffffff',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 600,
                    border: 'none',
                    cursor: isSyncingVacation ? 'not-allowed' : 'pointer',
                    opacity: isSyncingVacation ? 0.7 : 1,
                    boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)',
                  }}
                >
                  <Play size={14} />
                  {isSyncingVacation ? 'Đang lưu...' : 'Cập nhật KPI Kỷ luật'}
                </button>
              </div>
            </div>

            {/* NOTIFICATIONS */}
            {vacationSyncSuccess && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  borderRadius: RADII.md,
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  border: '1px solid #6ee7b7',
                }}
              >
                <CheckCircle2 size={18} color="#059669" />
                {vacationSyncSuccess}
              </div>
            )}

            {vacationError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  borderRadius: RADII.md,
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  border: '1px solid #fca5a5',
                }}
              >
                <AlertCircle size={18} color="#dc2626" />
                {vacationError}
              </div>
            )}

            {/* SUMMARY STATS & DASHBOARD */}
            {previewVacation ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {/* STAT 1: ANNUAL VACATION */}
                <div
                  style={{
                    backgroundColor: '#f0fdf4',
                    padding: '14px 18px',
                    borderRadius: RADII.lg,
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#166534', fontWeight: 600 }}>🌴 Phép năm đã dùng</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#15803d', marginTop: '2px' }}>
                    {previewVacation.annualVacationDays} <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 500 }}>ngày</span>
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginTop: '4px' }}>
                    Năm {previewVacation.year} | Nghỉ bù: {previewVacation.compensatoryTimeDays} ngày
                  </div>
                </div>

                {/* STAT 2: ABSENT WITHOUT PAY */}
                <div
                  style={{
                    backgroundColor: previewVacation.absentWithoutPayDays === 0 ? '#f0fdf4' : '#fee2e2',
                    padding: '14px 18px',
                    borderRadius: RADII.lg,
                    border: `1px solid ${previewVacation.absentWithoutPayDays === 0 ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      color: previewVacation.absentWithoutPayDays === 0 ? '#166534' : '#991b1b',
                      fontWeight: 600,
                    }}
                  >
                    🚫 Nghỉ không lương (Without Pay)
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: previewVacation.absentWithoutPayDays === 0 ? '#15803d' : '#dc2626',
                      marginTop: '2px',
                    }}
                  >
                    {previewVacation.absentWithoutPayDays} <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 500 }}>ngày</span>
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginTop: '4px' }}>
                    {previewVacation.absentWithoutPayDays === 0 ? '✨ Không vi phạm nghỉ không phép' : '⚠️ Vi phạm nội quy công ty'}
                  </div>
                </div>

                {/* STAT 3: LATE IN / EARLY OUT */}
                <div
                  style={{
                    backgroundColor: previewVacation.lateInEarlyOutCount === 0 ? '#f0fdf4' : '#fffbeb',
                    padding: '14px 18px',
                    borderRadius: RADII.lg,
                    border: `1px solid ${previewVacation.lateInEarlyOutCount === 0 ? '#bbf7d0' : '#fde68a'}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      color: previewVacation.lateInEarlyOutCount === 0 ? '#166534' : '#b45309',
                      fontWeight: 600,
                    }}
                  >
                    ⏰ Đi muộn / Về sớm (Bị trừ phép)
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: previewVacation.lateInEarlyOutCount === 0 ? '#15803d' : '#d97706',
                      marginTop: '2px',
                    }}
                  >
                    {previewVacation.lateInEarlyOutCount} <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 500 }}>lần</span>
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginTop: '4px' }}>
                    {previewVacation.lateInEarlyOutCount === 0 ? '✨ Đúng giờ giấc quy định' : 'Có ghi nhận khấu trừ phép'}
                  </div>
                </div>

                {/* STAT 4: DISCIPLINE KPI SCORE */}
                <div
                  style={{
                    backgroundColor: '#ecfdf5',
                    padding: '14px 18px',
                    borderRadius: RADII.lg,
                    border: '1px solid #6ee7b7',
                    boxShadow: '0 1px 3px rgba(5, 150, 105, 0.1)',
                  }}
                >
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#047857', fontWeight: 600 }}>🏆 Điểm Kỷ luật quy đổi (Hệ 10)</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 800, color: '#065f46' }}>{previewVacation.score10}/10</span>
                    <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#047857', backgroundColor: '#a7f3d0', padding: '2px 8px', borderRadius: RADII.full }}>
                      Hạng {previewVacation.grade} (Bậc {previewVacation.suggestedLevel}/5)
                    </span>
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#047857', fontWeight: 600, marginTop: '4px' }}>
                    Đóng góp: +{(previewVacation.score10 * 0.04).toFixed(2)}đ (4% Văn hóa)
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#f9fafb',
                  padding: '24px',
                  borderRadius: RADII.lg,
                  border: `1px dashed ${COLORS.neutral.border}`,
                  textAlign: 'center',
                  color: COLORS.neutral.textSecondary,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                }}
              >
                Nhấn "<strong>Lấy dữ liệu Nghỉ phép</strong>" để kiểm tra số ngày phép năm, số ngày nghỉ không lương và nhật ký vi phạm đi muộn/về sớm của thành viên từ Blueprint UI_TAT_011.
              </div>
            )}

            {/* DETAILS TOGGLE & TABLES */}
            {previewVacation && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => setShowVacationTable(!showVacationTable)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: RADII.md,
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #86efac',
                      color: '#166534',
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {showVacationTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showVacationTable
                      ? 'Ẩn bảng chi tiết Nghỉ phép & Khấu trừ'
                      : `👁️ Xem bảng chi tiết Nghỉ phép & Khấu trừ (${previewVacation.vacationDetails.length} danh mục / ${previewVacation.deductions.length} nhật ký vi phạm)`}
                  </button>
                  <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                    Tổng số mục vi phạm: <strong style={{ color: previewVacation.absentWithoutPayDays + previewVacation.lateInEarlyOutCount > 0 ? '#dc2626' : '#166534' }}>{previewVacation.absentWithoutPayDays + previewVacation.lateInEarlyOutCount}</strong>
                  </span>
                </div>

                {showVacationTable && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                    {/* TABLE 1: VACATION DETAIL */}
                    <div style={{ border: `1px solid ${COLORS.neutral.border}`, borderRadius: RADII.lg, overflow: 'hidden' }}>
                      <div style={{ backgroundColor: '#f0fdf4', padding: '10px 14px', fontWeight: 700, fontSize: TYPOGRAPHY.fontSize.xs, color: '#166534', borderBottom: `1px solid ${COLORS.neutral.border}` }}>
                        📋 Chi tiết ngày nghỉ theo loại phép (UI_TAT_011)
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: TYPOGRAPHY.fontSize.xs }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb', borderBottom: `1px solid ${COLORS.neutral.border}` }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: COLORS.neutral.textSecondary }}>Loại ngày phép (Leave Type)</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', color: COLORS.neutral.textSecondary }}>Số ngày đã dùng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewVacation.vacationDetails.length === 0 ? (
                            <tr>
                              <td colSpan={2} style={{ padding: '16px', textAlign: 'center', color: COLORS.neutral.textSecondary }}>
                                Không có ghi nhận ngày phép nào.
                              </td>
                            </tr>
                          ) : (
                            previewVacation.vacationDetails.map((v, idx) => (
                              <tr key={idx} style={{ borderBottom: `1px solid ${COLORS.neutral.border}` }}>
                                <td style={{ padding: '8px 12px', fontWeight: 500 }}>{v.leaveType}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                  {v.days} ngày
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* TABLE 2: DEDUCTION & LATE HISTORY */}
                    <div style={{ border: `1px solid ${COLORS.neutral.border}`, borderRadius: RADII.lg, overflow: 'hidden' }}>
                      <div style={{ backgroundColor: '#fef2f2', padding: '10px 14px', fontWeight: 700, fontSize: TYPOGRAPHY.fontSize.xs, color: '#991b1b', borderBottom: `1px solid ${COLORS.neutral.border}` }}>
                        ⚠️ Nhật ký khấu trừ phép & Vi phạm giờ giấc (searchAunualDedunctionHis)
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: TYPOGRAPHY.fontSize.xs }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb', borderBottom: `1px solid ${COLORS.neutral.border}` }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: COLORS.neutral.textSecondary }}>Thời gian</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: COLORS.neutral.textSecondary }}>Nội dung vi phạm / Ghi chú</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', color: COLORS.neutral.textSecondary }}>Trừ phép</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewVacation.deductions.length === 0 ? (
                            <tr>
                              <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: '#166534', fontWeight: 500 }}>
                                ✨ Không có nhật ký vi phạm hay khấu trừ phép nào trong năm {previewVacation.year}!
                              </td>
                            </tr>
                          ) : (
                            previewVacation.deductions.map((d, idx) => (
                              <tr key={idx} style={{ borderBottom: `1px solid ${COLORS.neutral.border}` }}>
                                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: COLORS.neutral.textSecondary }}>{d.date || '—'}</td>
                                <td style={{ padding: '8px 12px', fontWeight: 500, color: d.comment.toLowerCase().includes('late') ? '#d97706' : COLORS.neutral.textPrimary }}>
                                  {d.comment}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                                  {d.days}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SCHEDULED COLLECTOR JOBS */}
      {activeTab === 'jobs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              backgroundColor: COLORS.neutral.white,
              borderRadius: RADII.xl,
              border: `1px solid ${COLORS.neutral.border}`,
              boxShadow: SHADOWS.sm,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${COLORS.neutral.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: 600, color: COLORS.neutral.textPrimary }}>
                  Danh sách Cron Jobs tự động thu thập
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                  Quản lý tần suất chạy ngầm (node-cron) và kích hoạt thủ công bất kỳ lúc nào.
                </p>
              </div>
            </div>

            {jobs.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: COLORS.neutral.textSecondary }}>
                Chưa có job nào được tạo.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.sm }}>
                <thead>
                  <tr style={{ backgroundColor: COLORS.neutral[50], borderBottom: `1px solid ${COLORS.neutral.border}` }}>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Tên Job</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Nguồn</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Tiêu chí KPI đích</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Lịch Cron</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Lần chạy gần nhất</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id} style={{ borderBottom: `1px solid ${COLORS.neutral[100]}` }}>
                      <td style={{ padding: '12px 20px', fontWeight: 600 }}>{j.name}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: RADII.sm, backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600 }}>
                          {j.source_name || j.source_type || 'BLUEPRINT'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: TYPOGRAPHY.fontSize.xs }}>
                        <span style={{ padding: '2px 8px', borderRadius: RADII.sm, backgroundColor: '#f0fdf4', color: '#15803d', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                          {j.cron_expression || '*/30 * * * *'} (Mỗi 30 phút)
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        {j.last_run_at ? (
                          <span style={{ color: j.last_status === 'SUCCESS' ? '#10b981' : '#ef4444', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 500 }}>
                            {new Date(j.last_run_at).toLocaleString()} ({j.last_status})
                          </span>
                        ) : (
                          <span style={{ color: COLORS.neutral[400], fontSize: TYPOGRAPHY.fontSize.xs }}>Chưa chạy</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <button
                          onClick={() => handleTriggerRunJob(j.id)}
                          disabled={runningJobId === j.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            backgroundColor: COLORS.primary.DEFAULT,
                            color: COLORS.neutral.white,
                            border: 'none',
                            borderRadius: RADII.md,
                            fontSize: TYPOGRAPHY.fontSize.xs,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Play size={12} />
                          {runningJobId === j.id ? 'Đang chạy...' : '⚡ Run Now'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EXECUTION LOGS */}
      {activeTab === 'logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              backgroundColor: COLORS.neutral.white,
              borderRadius: RADII.xl,
              border: `1px solid ${COLORS.neutral.border}`,
              boxShadow: SHADOWS.sm,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${COLORS.neutral.border}` }}>
              <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: 600, color: COLORS.neutral.textPrimary }}>
                Lịch sử thực thi (Collector Execution Logs)
              </h3>
            </div>

            {logs.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: COLORS.neutral.textSecondary }}>
                Chưa có log thực thi nào.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.sm }}>
                <thead>
                  <tr style={{ backgroundColor: COLORS.neutral[50], borderBottom: `1px solid ${COLORS.neutral.border}` }}>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Thời gian</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Job</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Trạng thái</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Bản ghi</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Chi tiết / Tóm tắt</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: `1px solid ${COLORS.neutral[100]}` }}>
                      <td style={{ padding: '12px 20px', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                        {new Date(log.started_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 20px', fontWeight: 600 }}>{log.job_name || 'Collector Job'}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: RADII.full,
                            backgroundColor: log.status === 'SUCCESS' ? '#ecfdf5' : '#fef2f2',
                            color: log.status === 'SUCCESS' ? '#059669' : '#dc2626',
                            fontSize: TYPOGRAPHY.fontSize.xs,
                            fontWeight: 600,
                          }}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', fontWeight: 600 }}>{log.records_count}</td>
                      <td style={{ padding: '12px 20px', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                        {log.error_message ? (
                          <span style={{ color: '#dc2626' }}>{log.error_message}</span>
                        ) : log.summary ? (
                          JSON.stringify(log.summary).slice(0, 100)
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
