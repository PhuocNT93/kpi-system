import { useState, useEffect } from 'react';
import {
  collectorApi,
  type CollectorDataSource,
  type CollectorJob,
  type CollectorRunLog,
  type BlueprintTasksSummary,
  type BlueprintVacationSummary,
  type BlueprintTeamAttendanceSummary,
  type BlueprintTeamMemberAttendance,
} from '../api/collector-api';
import {
  RefreshCw,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  Activity,
  User,
  ClipboardCheck,
  Users,
  ChevronDown,
  ChevronUp,
  Zap,
  ShieldAlert,
  ShieldCheck,
  Search,
  Award,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/shared/auth/auth-context';
import { COLORS } from '@/lib/theme';
import { RADII, SHADOWS, TYPOGRAPHY } from '@/shared/theme';

export function CollectorPage() {
  const { user } = useAuth();
  const isAuthorized = Boolean(
    user && (user.role === 'SYSTEM_ADMIN' || user.role === 'HR_ADMIN' || user.role === 'MANAGER')
  );

  const [activeTab, setActiveTab] = useState<'hub' | 'jobs' | 'logs'>('hub');

  // Unified Connection Config State - User inputs on UI or loads from saved configuration
  const [username, setUsername] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://blueprint.cyberlogitec.com.vn');
  const [projectFilter, setProjectFilter] = useState('Allegro NX');


  // Global Unified Filter Bar State
  const [unifiedMember, setUnifiedMember] = useState<string>('ALL');
  const [customUnifiedMember, setCustomUnifiedMember] = useState<string>('');
  const [unifiedFromDate, setUnifiedFromDate] = useState<string>('2026-09-01');
  const [unifiedToDate, setUnifiedToDate] = useState<string>('2026-09-14');
  const [isUnifiedFetching, setIsUnifiedFetching] = useState<boolean>(false);
  const [selectedInspectMember, setSelectedInspectMember] = useState<BlueprintTeamMemberAttendance | null>(null);

  // Bottom Summary & Unified Single Sync State
  const [isSyncingUnifiedAll, setIsSyncingUnifiedAll] = useState<boolean>(false);
  const [unifiedSyncSuccess, setUnifiedSyncSuccess] = useState<string | null>(null);

  // Helper: Individual Attendance Score (1-10 strictly)
  const getIndividualAttendanceScore = (r: BlueprintTeamMemberAttendance): number => {
    if (r.status === 'ON_TIME' || r.status === 'LEAVE') return 10;
    if (r.status === 'LATE') {
      if (r.lateMinutes <= 5) return 9;
      if (r.lateMinutes <= 15) return 8;
      if (r.lateMinutes <= 30) return 6;
      return 4;
    }
    if (r.status === 'ABSENT') return 0;
    return 10;
  };

  // Module 1: Daily Team Status State (UI_TAT_029 - Manager Team Check-in/out)
  const [previewTeamAttendance, setPreviewTeamAttendance] = useState<BlueprintTeamAttendanceSummary | null>(null);
  const [teamAttendanceError, setTeamAttendanceError] = useState<string | null>(null);
  const [showTeamAttendanceTable, setShowTeamAttendanceTable] = useState(true);

  // Module 2: Tasks State (UI_PIM_001)
  const [previewTasks, setPreviewTasks] = useState<BlueprintTasksSummary | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [showTasksTable, setShowTasksTable] = useState(false);

  // Module 3: Vacation & Leave Discipline State (UI_TAT_011)
  const [previewVacation, setPreviewVacation] = useState<BlueprintVacationSummary | null>(null);
  const [vacationError, setVacationError] = useState<string | null>(null);
  const [showVacationTable, setShowVacationTable] = useState(false);
  const [selectedVacationMember, setSelectedVacationMember] = useState<string>('khoadang');

  // Member and default filter options for Module 2 (UI_PIM_001)
  const [selectedTaskMember, setSelectedTaskMember] = useState<string>('hieudao');
  const taskFilterRole: 'requester' | 'assignee' | 'both' = 'both';
  const taskDateType: 'registered' | 'due' | 'finished' = 'registered';
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
        if (cfg.baseUrl) setBaseUrl(cfg.baseUrl);
        if (cfg.projectFilter) setProjectFilter(cfg.projectFilter);
      }
      collectorApi.getBlueprintMembers().then((members) => {
        if (Array.isArray(members) && members.length > 0) {
          setTaskMemberList(members);
        }
      }).catch(() => {});
      // Automatically preview team attendance for default range (09/01/2026 - 09/14/2026) using server-side credentials
      collectorApi.previewBlueprintTeamAttendance({
        fromDate: '09/01/2026',
        toDate: '09/14/2026',
      }).then((summary) => {
        setPreviewTeamAttendance(summary);
      }).catch(() => {});
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


  // Unified Fetch: Fetches all criteria concurrently based on global filter
  const handleUnifiedFetch = async () => {
    setIsUnifiedFetching(true);
    setTeamAttendanceError(null);
    setTasksError(null);
    setVacationError(null);
    setUnifiedSyncSuccess(null);

    const targetMember = unifiedMember === 'custom' ? customUnifiedMember.trim() : unifiedMember;

    const formatDateToMDY = (d: string) => {
      if (!d) return '09/14/2026';
      if (d.includes('/')) return d;
      const parts = d.split('-');
      if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}/${parts[0]}`;
      }
      return d;
    };

    const fromMDY = formatDateToMDY(unifiedFromDate);
    const toMDY = formatDateToMDY(unifiedToDate);
    const yr = unifiedToDate ? unifiedToDate.split('-')[0] : '2026';

    try {
      const promises: Promise<unknown>[] = [];

      // 1. Team Attendance (Module 1)
      promises.push(
        collectorApi.previewBlueprintTeamAttendance({
          baseUrl,
          teamId: undefined,
          fromDate: fromMDY,
          toDate: toMDY,
          employeeName: targetMember !== 'ALL' ? targetMember : undefined,
        }).then((data) => {
          setPreviewTeamAttendance(data);
          if (targetMember !== 'ALL' && data.records && data.records.length > 0) {
            setSelectedInspectMember(data.records[0]);
          } else {
            setSelectedInspectMember(null);
          }
        }).catch((err) => {
          setTeamAttendanceError((err as Error).message || 'Lỗi khi tải dữ liệu chuyên cần');
        })
      );

      // 2. Tasks & Progress (Module 2)
      promises.push(
        collectorApi.previewBlueprintTasks({
          baseUrl,
          projectFilter,
          member: targetMember !== 'ALL' ? targetMember : undefined,
          fromDate: unifiedFromDate,
          toDate: unifiedToDate,
          filterRole: 'both',
        }).then((data) => {
          setPreviewTasks(data);
          setShowTasksTable(true);
        }).catch((err) => {
          setTasksError((err as Error).message || 'Lỗi khi tải dữ liệu task');
        })
      );

      // 3. Vacation & Discipline (Module 3)
      const vacUser = targetMember !== 'ALL' ? targetMember : 'khoadang';
      promises.push(
        collectorApi.previewBlueprintVacation({
          baseUrl,
          year: yr,
          member: vacUser,
          fromDate: unifiedFromDate,
          toDate: unifiedToDate,
        }).then((data) => {
          setPreviewVacation(data);
          setShowVacationTable(true);
        }).catch((err) => {
          setVacationError((err as Error).message || 'Lỗi khi tải dữ liệu nghỉ phép');
        })
      );

      await Promise.allSettled(promises);
    } finally {
      setIsUnifiedFetching(false);
    }
  };

  // Unified Single Sync: Syncs all criteria in one click from Summary Board
  const handleUnifiedSyncAll = async (avgScore: number, gradeLetter: string) => {
    setIsSyncingUnifiedAll(true);
    setUnifiedSyncSuccess(null);

    const targetMember = selectedInspectMember
      ? (selectedInspectMember.usrId || selectedInspectMember.empeName)
      : (unifiedMember !== 'ALL' ? (unifiedMember === 'custom' ? customUnifiedMember : unifiedMember) : 'hieudao');

    const targetMemberName = selectedInspectMember ? selectedInspectMember.empeName : targetMember;

    const formatDateToMDY = (d: string) => {
      if (!d) return '09/14/2026';
      if (d.includes('/')) return d;
      const parts = d.split('-');
      if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}/${parts[0]}`;
      }
      return d;
    };

    const fromMDY = formatDateToMDY(unifiedFromDate);
    const toMDY = formatDateToMDY(unifiedToDate);
    const yr = unifiedToDate ? unifiedToDate.split('-')[0] : '2026';

    try {
      const syncResults: string[] = [];

      // 1. Sync Attendance
      try {
        const attRes = await collectorApi.syncBlueprintTeamAttendance({
          baseUrl,
          teamId: undefined,
          fromDate: fromMDY,
          toDate: toMDY,
          targetMember: targetMember,
        });
        if (attRes.success) {
          syncResults.push(`Chuyên cần: ${attRes.score10}/10 (+${attRes.weightedScore.toFixed(2)}đ)`);
        }
      } catch (e) {
        console.warn('Sync attendance failed:', e);
      }

      // 2. Sync Tasks
      try {
        const taskRes = await collectorApi.syncBlueprintTasks({
          projectFilter,
          member: targetMember,
          filterRole: taskFilterRole,
          dateType: taskDateType,
          fromDate: unifiedFromDate,
          toDate: unifiedToDate,
        });
        if (taskRes.success) {
          syncResults.push(`Tasks: ${taskRes.score10}/10 (+${taskRes.weightedScore.toFixed(2)}đ)`);
        }
      } catch (e) {
        console.warn('Sync tasks failed:', e);
      }

      // 3. Sync Vacation
      try {
        const vacRes = await collectorApi.syncBlueprintVacation({
          baseUrl,
          year: yr,
          member: targetMember,
          fromDate: unifiedFromDate,
          toDate: unifiedToDate,
        });
        if (vacRes.success) {
          syncResults.push(`Kỷ luật: ${vacRes.score10}/10 (+${vacRes.weightedScore.toFixed(2)}đ)`);
        }
      } catch (e) {
        console.warn('Sync vacation failed:', e);
      }

      if (syncResults.length > 0) {
        setUnifiedSyncSuccess(
          `🎉 Đã đồng bộ thành công ${syncResults.length} tiêu chí cho nhân sự ${targetMemberName}! Điểm TB: ${avgScore}/10 [Hạng ${gradeLetter}]. (${syncResults.join(' | ')})`
        );
      } else {
        alert('Không có tiêu chí nào được đồng bộ thành công. Vui lòng kiểm tra kỳ đánh giá đang mở của nhân viên.');
      }
      await loadSourcesAndJobs();
    } catch (err: unknown) {
      alert(`Lỗi đồng bộ: ${(err as Error).message}`);
    } finally {
      setIsSyncingUnifiedAll(false);
    }
  };

  // Fetch Tasks preview (used when clicking row in attendance table)
  const handleFetchTasks = async (targetOverride?: string) => {
    const memberTarget = targetOverride || selectedTaskMember || 'hieudao';

    setTasksError(null);
    try {
      const data = await collectorApi.previewBlueprintTasks({
        baseUrl,
        projectFilter,
        member: memberTarget,
        filterRole: taskFilterRole,
        dateType: taskDateType,
        fromDate: unifiedFromDate,
        toDate: unifiedToDate,
      });
      setPreviewTasks(data);
      setShowTasksTable(true);
    } catch (err: unknown) {
      setTasksError((err as Error).message || 'Lỗi khi kéo dữ liệu task từ Blueprint UI_PIM_001');
    }
  };

  // Fetch Vacation & Discipline preview (used when clicking row in attendance table)
  const handleFetchVacation = async (targetOverride?: string) => {
    const memberTarget = targetOverride || selectedVacationMember || 'khoadang';
    const yr = unifiedToDate ? unifiedToDate.split('-')[0] : '2026';

    setVacationError(null);
    try {
      const data = await collectorApi.previewBlueprintVacation({
        baseUrl,
        year: yr,
        member: memberTarget,
        fromDate: unifiedFromDate,
        toDate: unifiedToDate,
      });
      setPreviewVacation(data);
      setShowVacationTable(true);
    } catch (err: unknown) {
      setVacationError((err as Error).message || 'Lỗi khi kéo dữ liệu nghỉ phép & kỷ luật từ Blueprint UI_TAT_011');
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

  // RBAC Access Control Guard
  if (!isAuthorized) {
    return (
      <div style={{ padding: '60px 24px', maxWidth: '820px', margin: '60px auto', backgroundColor: COLORS.neutral.white, borderRadius: RADII.xl, boxShadow: SHADOWS.md, textAlign: 'center', border: '1px solid #fee2e2' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#dc2626' }}>
          <ShieldAlert size={36} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
          Quyền truy cập tính năng Blueprint SSO bị giới hạn
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, maxWidth: '580px', margin: '0 auto 20px auto' }}>
          Tính năng thu thập dữ liệu KPI tự động từ cổng Blueprint CLV được bảo vệ an toàn. Chỉ các tài khoản Quản lý (Manager) hoặc Quản trị hệ thống (System Admin) được ủy quyền mới có thể kích hoạt và sử dụng.
        </p>
        <div style={{ display: 'inline-block', padding: '14px 22px', backgroundColor: '#f8fafc', borderRadius: RADII.lg, border: '1px solid #e2e8f0', fontSize: '13px', color: '#475569', textAlign: 'left', marginBottom: '24px' }}>
          <div><strong>Tài khoản hiện tại:</strong> {user ? `${user.name} (${user.email}) - Vai trò: ${user.role}` : 'Chưa đăng nhập'}</div>
          <div style={{ marginTop: '6px', color: '#dc2626', fontSize: '12px' }}>
            ⚠️ Tài khoản hiện tại không có quyền truy cập tính năng này. Vui lòng đăng nhập bằng tài khoản Quản lý hoặc Quản trị viên (ví dụ tài khoản của anh Kỳ: <code>kyld.manager@kpi.com</code> hoặc <code>kyld.admin@kpi.com</code>).
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '16px 0 32px 0', display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: RADII.full,
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#93c5fd',
              fontSize: TYPOGRAPHY.fontSize.xs,
              fontWeight: 500,
            }}
          >
            <ShieldCheck size={14} style={{ color: '#60a5fa' }} />
            <span>Người vận hành: <strong style={{ color: '#fff' }}>{user?.name || user?.email}</strong> ({user?.role})</span>
          </div>


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
          {/* UNIFIED GLOBAL FILTER BAR */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: `2px solid #93c5fd`,
              borderRadius: RADII['2xl'],
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#2563eb' }} />
                  <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Bộ Lọc Chung Dữ Liệu KPI
                  </span>
                  <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                    | Áp dụng đồng thời cho tất cả tiêu chí: Chuyên cần, Task & Tiến độ, Nghỉ phép & Kỷ luật
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
                  Lọc Dữ Liệu & Đối Soát Tiêu Chí KPI Tự Động
                </h3>
              </div>

              <button
                onClick={handleUnifiedFetch}
                disabled={isUnifiedFetching}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: '#2563eb',
                  color: COLORS.neutral.white,
                  border: 'none',
                  borderRadius: RADII.xl,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  fontWeight: 700,
                  cursor: isUnifiedFetching ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  opacity: isUnifiedFetching ? 0.7 : 1,
                  transition: 'all 0.2s',
                }}
              >
                <Search size={16} className={isUnifiedFetching ? 'spin' : ''} />
                {isUnifiedFetching ? 'Đang lọc & thu thập tất cả tiêu chí...' : '🔍 Lọc & Thu thập toàn bộ tiêu chí'}
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                paddingTop: '8px',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              {/* Member Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 280px' }}>
                <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} color="#2563eb" /> Nhân sự:
                </label>
                <select
                  value={unifiedMember}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUnifiedMember(val);
                    if (val !== 'custom') {
                      if (val !== 'ALL') {
                        setSelectedTaskMember(val);
                        setSelectedVacationMember(val);
                        const matchRec = previewTeamAttendance?.records.find(
                          (r) => r.empeNo === val || r.usrId === val || r.empeName.toLowerCase().includes(val.toLowerCase())
                        );
                        if (matchRec) setSelectedInspectMember(matchRec);
                      } else {
                        setSelectedInspectMember(null);
                      }
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: RADII.md,
                    border: '1px solid #94a3b8',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">👥 Tất cả thành viên ({previewTeamAttendance ? previewTeamAttendance.records.length : 21} nhân sự)</option>
                  {taskMemberList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                  <option value="custom">-- Nhập mã / username khác --</option>
                </select>

                {unifiedMember === 'custom' && (
                  <input
                    type="text"
                    placeholder="Mã NV / Username..."
                    value={customUnifiedMember}
                    onChange={(e) => setCustomUnifiedMember(e.target.value)}
                    style={{
                      width: '140px',
                      padding: '7px 10px',
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      borderRadius: RADII.md,
                      border: '1px solid #94a3b8',
                      backgroundColor: '#ffffff',
                    }}
                  />
                )}
              </div>

              {/* Date Range: From Date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={15} color="#2563eb" /> Từ ngày:
                </label>
                <input
                  type="date"
                  value={unifiedFromDate}
                  onChange={(e) => {
                    setUnifiedFromDate(e.target.value);
                  }}
                  style={{
                    padding: '7px 10px',
                    borderRadius: RADII.md,
                    border: '1px solid #94a3b8',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 600,
                    backgroundColor: '#ffffff',
                  }}
                />
              </div>

              {/* Date Range: To Date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Đến ngày:
                </label>
                <input
                  type="date"
                  value={unifiedToDate}
                  onChange={(e) => {
                    setUnifiedToDate(e.target.value);
                  }}
                  style={{
                    padding: '7px 10px',
                    borderRadius: RADII.md,
                    border: '1px solid #94a3b8',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 600,
                    backgroundColor: '#ffffff',
                  }}
                />
              </div>

              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setUnifiedFromDate('2026-09-01');
                    setUnifiedToDate('2026-09-14');
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: RADII.md,
                    border: '1px solid #bfdbfe',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Kỳ Tháng 9/2026
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUnifiedFromDate('2026-09-14');
                    setUnifiedToDate('2026-09-14');
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: RADII.md,
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Hôm nay (14/09)
                </button>
              </div>
            </div>
          </div>

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

            </div>

            {/* Error message */}
            {teamAttendanceError && (
              <div style={{ padding: '10px 14px', borderRadius: RADII.md, backgroundColor: '#fef2f2', color: '#991b1b', fontSize: TYPOGRAPHY.fontSize.xs, border: '1px solid #fecaca' }}>
                {teamAttendanceError}
              </div>
            )}

            {/* Individual Inspect Banner if selected */}
            {selectedInspectMember && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 18px',
                  backgroundColor: '#eff6ff',
                  border: '1.5px solid #93c5fd',
                  borderRadius: RADII.xl,
                  boxShadow: '0 2px 6px rgba(59, 130, 246, 0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} />
                  </div>
                  <div>
                    <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#1e40af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      👤 Đang xem điểm chuyên cần cá nhân
                    </span>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 700, color: '#1e3a8a' }}>
                      {selectedInspectMember.empeName} <span style={{ fontWeight: 500, color: '#475569' }}>(Mã NV: {selectedInspectMember.empeNo} | {selectedInspectMember.orzNm})</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedInspectMember(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #bfdbfe',
                    borderRadius: RADII.md,
                    color: '#1d4ed8',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✕ Xem lại toàn nhóm
                </button>
              </div>
            )}

            {/* Team / Individual Attendance Metric Cards */}
            {previewTeamAttendance ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                {selectedInspectMember ? (
                  // INDIVIDUAL INSPECTION CARDS
                  <>
                    <div style={{ backgroundColor: selectedInspectMember.status === 'ON_TIME' ? '#f0fdf4' : '#fff1f2', padding: '14px 18px', borderRadius: RADII.lg, border: `1px solid ${selectedInspectMember.status === 'ON_TIME' ? '#bbf7d0' : '#fecdd3'}` }}>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: selectedInspectMember.status === 'ON_TIME' ? '#166534' : '#9f1239', fontWeight: 600 }}>Trạng thái Check-in cá nhân</div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: selectedInspectMember.status === 'ON_TIME' ? '#15803d' : '#e11d48', marginTop: '2px' }}>
                        {selectedInspectMember.status === 'ON_TIME' ? 'Đúng giờ' : selectedInspectMember.status === 'LATE' ? `Đi muộn ${selectedInspectMember.lateMinutes}p` : selectedInspectMember.status === 'LEAVE' ? 'Nghỉ phép' : 'Vắng mặt'}
                      </div>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginTop: '2px' }}>
                        Punch In lúc: <strong>{selectedInspectMember.punchIn || 'Chưa ghi nhận'}</strong>
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#f0fdf4', padding: '14px 18px', borderRadius: RADII.lg, border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#166534', fontWeight: 600 }}>Điểm Chuyên cần cá nhân (4%)</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 700, color: '#15803d' }}>
                          {getIndividualAttendanceScore(selectedInspectMember)}/10
                        </span>
                      </div>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#166534', marginTop: '2px' }}>
                        Đóng góp: +{(getIndividualAttendanceScore(selectedInspectMember) * 0.04).toFixed(2)}đ (4% KPI #18)
                      </div>
                    </div>

                    <div style={{ backgroundColor: COLORS.neutral[50], padding: '14px 18px', borderRadius: RADII.lg, border: `1px solid ${COLORS.neutral[200]}` }}>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, fontWeight: 500 }}>Punch In / Punch Out thực tế</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: COLORS.neutral.textPrimary, marginTop: '4px' }}>
                        {selectedInspectMember.punchIn || '—'} / {selectedInspectMember.punchOut || '—'}
                      </div>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginTop: '2px' }}>
                        Ca làm việc: {selectedInspectMember.workShift}
                      </div>
                    </div>

                    <div style={{ backgroundColor: COLORS.neutral[50], padding: '14px 18px', borderRadius: RADII.lg, border: `1px solid ${COLORS.neutral[200]}` }}>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, fontWeight: 500 }}>Đơn vị & Loại phép</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.neutral.textPrimary, marginTop: '4px' }}>
                        {selectedInspectMember.leaveType || 'Làm việc bình thường'}
                      </div>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginTop: '2px' }}>
                        Bộ phận: {selectedInspectMember.orzNm}
                      </div>
                    </div>
                  </>
                ) : (
                  // TEAM OVERVIEW CARDS (Strictly 1-10, NO letter grade)
                  <>
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
                  </>
                )}
              </div>
            ) : (
              <div style={{ padding: '16px', backgroundColor: COLORS.neutral[50], borderRadius: RADII.lg, color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.xs, textAlign: 'center' }}>
                {isUnifiedFetching
                  ? `Đang nạp dữ liệu check-in/out của các Team quản lý (${username || 'Blueprint'})...`
                  : 'Chưa có dữ liệu Team check-in. Vui lòng nhấn "Lọc & Thu thập toàn bộ tiêu chí" ở bộ lọc chung bên trên.'}
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
                      if (unifiedMember === 'ALL') return true;
                      const q = (unifiedMember === 'custom' ? customUnifiedMember : unifiedMember).toLowerCase().trim();
                      if (!q) return true;
                      return r.empeName.toLowerCase().includes(q) || r.empeNo.toLowerCase().includes(q) || (r.usrId && r.usrId.toLowerCase().includes(q));
                    }).length}</strong> / {previewTeamAttendance.records.length} nhân sự (Click vào từng dòng để xem điểm cá nhân)
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
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#334155', textAlign: 'center' }}>Điểm chuyên cần (1-10)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewTeamAttendance.records
                          .filter((r) => {
                            if (unifiedMember === 'ALL') return true;
                            const q = (unifiedMember === 'custom' ? customUnifiedMember : unifiedMember).toLowerCase().trim();
                            if (!q) return true;
                            return r.empeName.toLowerCase().includes(q) || r.empeNo.toLowerCase().includes(q) || (r.usrId && r.usrId.toLowerCase().includes(q));
                          })
                          .map((r, idx) => {
                            const isLate = r.status === 'LATE';
                            const indScore = getIndividualAttendanceScore(r);
                            const isSelected = selectedInspectMember?.empeNo === r.empeNo;
                            return (
                              <tr
                                key={idx}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedInspectMember(null);
                                  } else {
                                    setSelectedInspectMember(r);
                                    if (r.usrId) {
                                      setSelectedTaskMember(r.usrId);
                                      setSelectedVacationMember(r.usrId);
                                      handleFetchTasks(r.usrId);
                                      handleFetchVacation(r.usrId);
                                    }
                                  }
                                }}
                                title="Click để chọn và xem điểm số của nhân sự này"
                                style={{
                                  cursor: 'pointer',
                                  borderBottom: `1px solid ${COLORS.neutral[100]}`,
                                  backgroundColor: isSelected ? '#eff6ff' : idx % 2 === 0 ? COLORS.neutral.white : '#f8fafc',
                                  outline: isSelected ? '2px solid #3b82f6' : 'none',
                                  outlineOffset: '-1px',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <td style={{ padding: '8px 14px', fontWeight: 500, color: '#334155' }}>{r.orzNm}</td>
                                <td style={{ padding: '8px 14px', fontWeight: 600, color: '#64748b' }}>{r.empeNo}</td>
                                <td style={{ padding: '8px 14px', fontWeight: 600, color: isSelected ? '#1d4ed8' : COLORS.neutral.textPrimary }}>
                                  {r.empeName}
                                  {isSelected && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#2563eb', fontWeight: 700 }}>(Đang chọn)</span>}
                                </td>
                                <td style={{ padding: '8px 14px', color: COLORS.neutral.textSecondary }}>{r.date}</td>
                                
                                {/* Punch In: Highlight in PINK if LATE (> 08:30) exactly like Blueprint UI_TAT_029 */}
                                <td style={{ padding: '8px 14px' }}>
                                  {r.punchIn ? (
                                    <span
                                      style={{
                                        display: 'inline-block',
                                        padding: isLate ? '3px 8px' : '2px 0px',
                                        borderRadius: RADII.sm,
                                        backgroundColor: isLate ? '#fbcfe8' : 'transparent',
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
                                      backgroundColor:
                                        r.leaveType === 'Holiday'
                                          ? '#ede9fe'
                                          : r.leaveType === 'Weekend'
                                          ? '#f1f5f9'
                                          : r.status === 'ON_TIME'
                                          ? '#dcfce7'
                                          : r.status === 'LATE'
                                          ? '#fecaca'
                                          : '#f1f5f9',
                                      color:
                                        r.leaveType === 'Holiday'
                                          ? '#6d28d9'
                                          : r.leaveType === 'Weekend'
                                          ? '#64748b'
                                          : r.status === 'ON_TIME'
                                          ? '#15803d'
                                          : r.status === 'LATE'
                                          ? '#991b1b'
                                          : '#475569',
                                      fontWeight: 600,
                                      fontSize: '11px',
                                    }}
                                  >
                                    {r.leaveType === 'Holiday'
                                      ? 'Nghỉ lễ'
                                      : r.leaveType === 'Weekend'
                                      ? 'Cuối tuần'
                                      : r.status === 'ON_TIME'
                                      ? 'Đúng giờ'
                                      : r.status === 'LATE'
                                      ? `Đi muộn ${r.lateMinutes}p`
                                      : r.status}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: '3px 10px',
                                      borderRadius: RADII.full,
                                      fontWeight: 700,
                                      fontSize: '12px',
                                      backgroundColor: indScore >= 9 ? '#dcfce7' : indScore >= 7 ? '#fef3c7' : '#fee2e2',
                                      color: indScore >= 9 ? '#15803d' : indScore >= 7 ? '#b45309' : '#dc2626',
                                      border: `1px solid ${indScore >= 9 ? '#bbf7d0' : indScore >= 7 ? '#fde68a' : '#fecaca'}`,
                                    }}
                                  >
                                    {indScore}/10
                                  </span>
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
                    API <code>/api/uiPim001/searchRequirement</code> | Chuyên mục: <strong>{projectFilter}</strong> | Vai trò: <strong>Cả Người đăng ký & Người thực hiện</strong> | Kỳ lọc: <strong>{unifiedFromDate} → {unifiedToDate}</strong> | Đang đối soát cho: <strong style={{ color: '#7e22ce' }}>{taskMemberList.find(m => m.id === (previewTasks?.username || selectedTaskMember))?.name || (previewTasks?.username || selectedTaskMember)}</strong>
                  </p>
                </div>
              </div>
            </div>

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
                            <td style={{ padding: '8px 12px', fontWeight: 500, maxWidth: '480px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.title}>
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
                      {taskMemberList.find((m) => m.id === (previewVacation?.username || selectedVacationMember))?.name || (previewVacation?.username || selectedVacationMember)}
                    </strong>
                  </p>
                </div>
              </div>
            </div>

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
                    ⏰ Đi muộn / Về sớm (Trừ phép trong kỳ)
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
                    {previewVacation.lateInEarlyOutCount === 0 ? `✨ Đúng giờ quy định (${unifiedFromDate} → ${unifiedToDate})` : `Ghi nhận trong kỳ (${unifiedFromDate} → ${unifiedToDate})`}
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
                Vui lòng nhấn "<strong>Lọc & Thu thập toàn bộ tiêu chí</strong>" ở bộ lọc chung bên trên để kiểm tra số ngày phép năm, số ngày nghỉ không lương và nhật ký vi phạm đi muộn/về sớm của thành viên từ Blueprint UI_TAT_011.
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
                        ⚠️ Nhật ký khấu trừ phép & Vi phạm giờ giấc trong kỳ lọc ({unifiedFromDate} → {unifiedToDate})
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
                                ✨ Không có nhật ký vi phạm hay khấu trừ phép nào trong khoảng thời gian từ {unifiedFromDate} đến {unifiedToDate}! (Kỳ năm {previewVacation.year})
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

          {/* BOTTOM KPI EVALUATION SUMMARY BOARD & SINGLE AUTHORITATIVE SYNC BUTTON */}
          {(() => {
            const m1Score = selectedInspectMember
              ? getIndividualAttendanceScore(selectedInspectMember)
              : previewTeamAttendance?.score10 ?? null;

            const m2Score = previewTasks?.score10 ?? (previewTasks ? (previewTasks.onTimeRate === 100 ? 10 : previewTasks.onTimeRate >= 90 ? 9 : previewTasks.onTimeRate >= 80 ? 6 : previewTasks.onTimeRate >= 70 ? 5 : 3) : null);

            const m3Score = previewVacation?.score10 ?? null;

            const evaluatedRules: Array<{
              name: string;
              code: string;
              weight: string;
              score: number;
              note: string;
            }> = [];

            if (m1Score !== null && m1Score !== undefined) {
              evaluatedRules.push({
                name: 'Chuyên cần & Kỷ luật giờ giấc (Daily Check-in UI_TAT_029)',
                code: 'RULE #18',
                weight: '4%',
                score: m1Score,
                note: selectedInspectMember
                  ? `Nhân sự: ${selectedInspectMember.empeName} (${selectedInspectMember.status === 'ON_TIME' ? 'Đúng giờ' : selectedInspectMember.status === 'LATE' ? `Trễ ${selectedInspectMember.lateMinutes}p` : selectedInspectMember.status})`
                  : `Tỷ lệ đúng giờ nhóm đạt ${previewTeamAttendance?.punctualityRate}% (${previewTeamAttendance?.onTimeMembers}/${previewTeamAttendance?.attendedMembers} đúng giờ)`,
              });
            }

            if (m2Score !== null && m2Score !== undefined) {
              evaluatedRules.push({
                name: 'Tiến độ & Chất lượng hoàn thành Task (UI_PIM_001)',
                code: 'RULE #1 (Cốt lõi ★)',
                weight: '10%',
                score: m2Score,
                note: previewTasks
                  ? `Tỷ lệ đúng hạn: ${previewTasks.onTimeRate}% (${previewTasks.onTimeTasks}/${previewTasks.totalTasks} tasks đúng hạn)`
                  : '',
              });
            }

            if (m3Score !== null && m3Score !== undefined) {
              evaluatedRules.push({
                name: 'Kỷ luật lao động & Tuân thủ nghỉ phép (UI_TAT_011)',
                code: 'VĂN HÓA',
                weight: '4%',
                score: m3Score,
                note: previewVacation
                  ? `Phép năm: ${previewVacation.annualVacationDays} ngày | Không lương: ${previewVacation.absentWithoutPayDays} ngày | Trừ phép: ${previewVacation.lateInEarlyOutCount} lần`
                  : '',
              });
            }

            const ruleCount = evaluatedRules.length;
            const avgScore = ruleCount > 0
              ? Number((evaluatedRules.reduce((sum, r) => sum + r.score, 0) / ruleCount).toFixed(2))
              : 0;

            const getGrade = (score: number) => {
              if (score >= 9.5) return { grade: 'S', title: 'Xuất sắc', color: '#15803d', bg: '#dcfce7', border: '#86efac' };
              if (score >= 8.5) return { grade: 'A', title: 'Hoàn thành tốt', color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' };
              if (score >= 7.0) return { grade: 'B', title: 'Đạt yêu cầu', color: '#b45309', bg: '#fef3c7', border: '#fde68a' };
              if (score >= 5.0) return { grade: 'C', title: 'Cần cải thiện', color: '#c2410c', bg: '#ffedd5', border: '#fed7aa' };
              return { grade: 'D', title: 'Chưa đạt', color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5' };
            };

            const currentGrade = getGrade(avgScore);

            const currentTargetName = selectedInspectMember
              ? `${selectedInspectMember.empeName} (${selectedInspectMember.empeNo})`
              : unifiedMember !== 'ALL'
              ? (taskMemberList.find((m) => m.id === unifiedMember)?.name || unifiedMember)
              : 'Toàn thể Team quản lý (21 nhân sự)';

            return (
              <div
                style={{
                  backgroundColor: COLORS.neutral.white,
                  borderRadius: RADII['2xl'],
                  padding: '28px 32px',
                  boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
                  border: '2px solid #3b82f6',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                }}
              >
                {/* Top Header of Summary Board */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: RADII.xl,
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)',
                      }}
                    >
                      <Award size={26} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
                          Bảng Tổng Hợp Đánh Giá Điểm KPI & Xếp Loại
                        </h2>
                        <span style={{ padding: '3px 10px', borderRadius: RADII.full, backgroundColor: '#dbeafe', color: '#1e40af', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700 }}>
                          Summary Board
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                        Tổng kết trung bình các rule tiêu chí đã thu thập (<code>Điểm TB = Tổng điểm / {ruleCount || 3} tiêu chí</code>) và xếp hạng A/B/C/S chính thức.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, fontWeight: 500 }}>
                      Đối tượng đánh giá:
                    </span>
                    <span
                      style={{
                        padding: '6px 14px',
                        borderRadius: RADII.lg,
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontWeight: 700,
                        fontSize: TYPOGRAPHY.fontSize.xs,
                      }}
                    >
                      👤 {currentTargetName}
                    </span>
                  </div>
                </div>

                {/* Summary Metric Showcase */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    backgroundColor: '#f8fafc',
                    padding: '20px 24px',
                    borderRadius: RADII.xl,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {/* Big Score Display */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Điểm Trung Bình Tất Cả Tiêu Chí ({ruleCount} Rule)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
                      <span style={{ fontSize: '42px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }}>
                        {ruleCount > 0 ? avgScore : '—'}
                      </span>
                      <span style={{ fontSize: '20px', fontWeight: 700, color: '#64748b' }}>/ 10</span>
                    </div>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#64748b', marginTop: '6px' }}>
                      {ruleCount > 0
                        ? `Tổng điểm: ${evaluatedRules.reduce((s, r) => s + r.score, 0)}đ ÷ ${ruleCount} tiêu chí = ${avgScore}đ`
                        : 'Chưa có tiêu chí nào được tải dữ liệu'}
                    </div>
                  </div>

                  {/* Official Letter Grade Badge */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Xếp Loại Đánh Giá Chính Thức (A B C S)
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {ruleCount > 0 ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 20px',
                            borderRadius: RADII.xl,
                            backgroundColor: currentGrade.bg,
                            border: `2px solid ${currentGrade.border}`,
                            boxShadow: `0 4px 12px ${currentGrade.border}`,
                          }}
                        >
                          <Sparkles size={22} color={currentGrade.color} />
                          <span style={{ fontSize: '24px', fontWeight: 900, color: currentGrade.color }}>
                            HẠNG {currentGrade.grade}
                          </span>
                          <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 700, color: currentGrade.color, borderLeft: `1px solid ${currentGrade.border}`, paddingLeft: '8px' }}>
                            {currentGrade.title}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: TYPOGRAPHY.fontSize.sm }}>Chưa xác định xếp loại</span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                      Quy tắc xếp hạng: S (≥9.5) | A (8.5-9.4) | B (7.0-8.4) | C (5.0-6.9) | D (&lt;5.0)
                    </div>
                  </div>
                </div>

                {/* Breakdown Table */}
                <div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#334155', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Chi tiết Điểm Số Từng Tiêu Chí Thành Phần:
                  </div>
                  <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.lg }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.xs }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9', borderBottom: `1px solid ${COLORS.neutral[300]}` }}>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>Mã Tiêu chí / Rule</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>Nội dung đánh giá</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>Trọng số</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#334155', textAlign: 'center' }}>Điểm tiêu chí (1-10)</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>Ghi chú đối soát</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evaluatedRules.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: COLORS.neutral.textSecondary }}>
                              Vui lòng sử dụng thanh "Bộ Lọc Chung Dữ Liệu KPI" phía trên và bấm "Lọc & Thu thập toàn bộ tiêu chí" để đối soát điểm.
                            </td>
                          </tr>
                        ) : (
                          evaluatedRules.map((rule, idx) => (
                            <tr
                              key={idx}
                              style={{
                                borderBottom: `1px solid ${COLORS.neutral[100]}`,
                                backgroundColor: idx % 2 === 0 ? COLORS.neutral.white : '#f8fafc',
                              }}
                            >
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e40af' }}>
                                <span style={{ padding: '2px 8px', borderRadius: RADII.sm, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                  {rule.code}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', fontWeight: 600, color: COLORS.neutral.textPrimary }}>
                                {rule.name}
                              </td>
                              <td style={{ padding: '10px 14px', fontWeight: 600, color: '#475569' }}>
                                {rule.weight}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '3px 12px',
                                    borderRadius: RADII.full,
                                    fontWeight: 800,
                                    fontSize: '13px',
                                    backgroundColor: rule.score >= 9 ? '#dcfce7' : rule.score >= 7 ? '#fef3c7' : '#fee2e2',
                                    color: rule.score >= 9 ? '#15803d' : rule.score >= 7 ? '#b45309' : '#dc2626',
                                    border: `1px solid ${rule.score >= 9 ? '#86efac' : rule.score >= 7 ? '#fde68a' : '#fca5a5'}`,
                                  }}
                                >
                                  {rule.score}/10
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', color: COLORS.neutral.textSecondary, fontSize: '11px' }}>
                                {rule.note || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sync Notification if success */}
                {unifiedSyncSuccess && (
                  <div
                    style={{
                      padding: '14px 20px',
                      borderRadius: RADII.xl,
                      backgroundColor: '#ecfdf5',
                      border: '1.5px solid #a7f3d0',
                      color: '#065f46',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={20} color="#059669" />
                    {unifiedSyncSuccess}
                  </div>
                )}

                {/* The ONE AND ONLY Sync Action Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', paddingTop: '8px', borderTop: `1px solid ${COLORS.neutral[200]}` }}>
                  <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                    Nhấn nút bên cạnh để ghi nhận đồng thời cả {ruleCount} tiêu chí trên vào Phiếu Đánh Giá Chính Thức của <strong>{currentTargetName}</strong>:
                  </span>
                  <button
                    onClick={() => handleUnifiedSyncAll(avgScore, currentGrade.grade)}
                    disabled={isSyncingUnifiedAll || evaluatedRules.length === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '14px 28px',
                      backgroundColor: evaluatedRules.length === 0 ? '#94a3b8' : '#10b981',
                      color: COLORS.neutral.white,
                      border: 'none',
                      borderRadius: RADII.xl,
                      fontSize: TYPOGRAPHY.fontSize.base,
                      fontWeight: 700,
                      cursor: isSyncingUnifiedAll || evaluatedRules.length === 0 ? 'not-allowed' : 'pointer',
                      boxShadow: evaluatedRules.length === 0 ? 'none' : '0 4px 16px rgba(16, 185, 129, 0.4)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Zap size={20} />
                    {isSyncingUnifiedAll
                      ? 'Đang đồng bộ tất cả tiêu chí...'
                      : `⚡ Đồng bộ tất cả tiêu chí vào Phiếu Đánh Giá KPI`}
                  </button>
                </div>
              </div>
            );
          })()}
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
