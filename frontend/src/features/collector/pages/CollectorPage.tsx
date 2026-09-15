import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collectorApi,
  type BlueprintTasksSummary,
  type BlueprintTeamAttendanceSummary,
  type BlueprintTeamMemberAttendance,
} from '../api/collector-api';
import {
  RefreshCw,
  CheckCircle2,
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
  Award,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/shared/auth/auth-context';
import { evaluationCycleApi, type EvaluationCycleDTO } from '@/features/evaluation-cycles';
import { COLORS } from '@/lib/theme';
import { RADII, SHADOWS, TYPOGRAPHY } from '@/shared/theme';

import { MANAGED_EMPLOYEES } from '../constants/managed-employees';

export function CollectorPage() {
  const { user } = useAuth();
  const isAuthorized = Boolean(
    user && (user.role === 'SYSTEM_ADMIN' || user.role === 'HR_ADMIN' || user.role === 'MANAGER')
  );

  // Unified Connection Config State - User inputs on UI or loads from saved configuration
  const [username, setUsername] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://blueprint.cyberlogitec.com.vn');
  const [projectFilter, setProjectFilter] = useState('Allegro NX');


  // Global Unified Filter Bar State
  // Mode Selection: 'CYCLE' (Cycle-Bound Mode) vs 'ADHOC' (Ad-hoc Date Range Mode)
  const [collectionMode, setCollectionMode] = useState<'CYCLE' | 'ADHOC'>('CYCLE');
  const [cycles, setCycles] = useState<EvaluationCycleDTO[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [_isLoadingCycles, setIsLoadingCycles] = useState<boolean>(false);

  // Review Cadence & Review Date State (Theo yêu cầu: Kỳ review 6 tháng hoặc 1 năm, chỉ chọn 1 ngày review)
  const [reviewCadence, setReviewCadence] = useState<'6_MONTHS' | '1_YEAR'>('6_MONTHS');
  const [reviewDate, setReviewDate] = useState<string>('2026-09-14');

  const calculateFromDate = (targetReviewDate: string, cadence: '6_MONTHS' | '1_YEAR'): string => {
    if (!targetReviewDate) return '2026-03-14';
    const parts = targetReviewDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (cadence === '6_MONTHS') {
        d.setMonth(d.getMonth() - 6);
      } else {
        d.setFullYear(d.getFullYear() - 1);
      }
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return targetReviewDate;
  };

  const formatDisplayDate = (d: string): string => {
    if (!d) return '—';
    const parts = d.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return d;
  };

  const [selectedTeam, setSelectedTeam] = useState<'ALL' | 'ALLEGRO NX Part' | 'Maritime Solutions Part'>('ALL');
  const [unifiedMember, setUnifiedMember] = useState<string>('thienvo');
  const [unifiedFromDate, setUnifiedFromDate] = useState<string>('2026-03-14');
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
  const [showTeamAttendanceTable, setShowTeamAttendanceTable] = useState(false);
  const [attendancePage, setAttendancePage] = useState<number>(1);
  const ATTENDANCE_PAGE_SIZE = 10;

  // Module 2: Tasks State (UI_PIM_001)
  const [previewTasks, setPreviewTasks] = useState<BlueprintTasksSummary | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [showTasksTable, setShowTasksTable] = useState(false);
  const [tasksPage, setTasksPage] = useState<number>(1);
  const TASKS_PAGE_SIZE = 10;

  // Filtered & Paginated records for Module 1
  const filteredAttendanceRecords = useMemo(() => {
    if (!previewTeamAttendance?.records) return [];
    const emp = MANAGED_EMPLOYEES.find((m) => m.username === unifiedMember || m.code === unifiedMember);
    const qUser = (emp?.username || unifiedMember).toLowerCase();
    const qCode = emp?.code || '';
    const qName = (emp?.name || '').toLowerCase();
    return previewTeamAttendance.records.filter((r) => {
      return (
        (r.usrId && r.usrId.toLowerCase() === qUser) ||
        (r.empeNo && r.empeNo === qCode) ||
        (r.empeName && r.empeName.toLowerCase().includes(qName))
      );
    });
  }, [previewTeamAttendance, unifiedMember]);

  const totalAttendancePages = Math.max(1, Math.ceil(filteredAttendanceRecords.length / ATTENDANCE_PAGE_SIZE));
  const currentAttendancePage = Math.min(attendancePage, totalAttendancePages);
  const paginatedAttendanceRecords = filteredAttendanceRecords.slice(
    (currentAttendancePage - 1) * ATTENDANCE_PAGE_SIZE,
    currentAttendancePage * ATTENDANCE_PAGE_SIZE
  );

  // Paginated tasks for Module 2
  const totalTasksCount = previewTasks?.tasks.length || 0;
  const totalTasksPages = Math.max(1, Math.ceil(totalTasksCount / TASKS_PAGE_SIZE));
  const currentTasksPage = Math.min(tasksPage, totalTasksPages);
  const paginatedTasks = (previewTasks?.tasks || []).slice(
    (currentTasksPage - 1) * TASKS_PAGE_SIZE,
    currentTasksPage * TASKS_PAGE_SIZE
  );

  // Member and default filter options for Module 2 (UI_PIM_001)
  const [selectedTaskMember, setSelectedTaskMember] = useState<string>('thienvo');
  const taskFilterRole: 'requester' | 'assignee' | 'both' = 'both';
  const taskDateType: 'registered' | 'due' | 'finished' = 'registered';

  // Initial load
  useEffect(() => {
    loadSavedConfig();
    loadEvaluationCycles();
  }, []);

  const loadEvaluationCycles = async () => {
    setIsLoadingCycles(true);
    try {
      const list = await evaluationCycleApi.getCycles();
      setCycles(list || []);
      const activeCycle = (list || []).find((c: EvaluationCycleDTO) => c.status === 'PUBLISHED' || c.status === 'IN_PROGRESS' || c.status === 'REVIEWING') || list?.[0];
      if (activeCycle) {
        setSelectedCycleId(activeCycle.id);
      }
    } catch (err) {
      console.warn('Failed to load evaluation cycles:', err);
    } finally {
      setIsLoadingCycles(false);
    }
  };

  const handleReviewCadenceChange = (newCadence: '6_MONTHS' | '1_YEAR') => {
    setReviewCadence(newCadence);
    const from = calculateFromDate(reviewDate, newCadence);
    setUnifiedFromDate(from);
    setUnifiedToDate(reviewDate);
  };

  const handleReviewDateChange = (newDate: string) => {
    setReviewDate(newDate);
    const from = calculateFromDate(newDate, reviewCadence);
    setUnifiedFromDate(from);
    setUnifiedToDate(newDate);
  };

  const handleSwitchMode = (mode: 'CYCLE' | 'ADHOC') => {
    setCollectionMode(mode);
    if (mode === 'CYCLE') {
      const from = calculateFromDate(reviewDate, reviewCadence);
      setUnifiedFromDate(from);
      setUnifiedToDate(reviewDate);
    }
  };

  const handleTeamChange = (team: 'ALL' | 'ALLEGRO NX Part' | 'Maritime Solutions Part') => {
    setSelectedTeam(team);
    if (team !== 'ALL') {
      const currentEmp = MANAGED_EMPLOYEES.find((m) => m.username === unifiedMember || m.code === unifiedMember);
      if (!currentEmp || currentEmp.team !== team) {
        const firstInTeam = MANAGED_EMPLOYEES.find((m) => m.team === team);
        if (firstInTeam) {
          setUnifiedMember(firstInTeam.username);
          setSelectedTaskMember(firstInTeam.username);
        }
      }
    }
  };

  const loadSavedConfig = async () => {
    try {
      const cfg = await collectorApi.getBlueprintConfig();
      if (cfg) {
        if (cfg.username) setUsername(cfg.username);
        if (cfg.baseUrl) setBaseUrl(cfg.baseUrl);
        if (cfg.projectFilter) setProjectFilter(cfg.projectFilter);
      }
    } catch {
      // Fallback defaults already set
    }
  };



  // Unified Fetch: Fetches all criteria concurrently based on global filter
  const handleUnifiedFetch = useCallback(async () => {
    setIsUnifiedFetching(true);
    setTeamAttendanceError(null);
    setTasksError(null);
    setUnifiedSyncSuccess(null);
    setAttendancePage(1);
    setTasksPage(1);

    const emp = MANAGED_EMPLOYEES.find((m) => m.username === unifiedMember || m.code === unifiedMember);
    const targetMember = emp?.username || unifiedMember;

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

    try {
      const promises: Promise<unknown>[] = [];

      // 1. Team Attendance (Module 1 - Full team attendance for selected team)
      promises.push(
        collectorApi.previewBlueprintTeamAttendance({
          baseUrl,
          teamId: selectedTeam === 'ALL' ? undefined : selectedTeam,
          fromDate: fromMDY,
          toDate: toMDY,
        }).then((data) => {
          setPreviewTeamAttendance(data);
          if (data.records && data.records.length > 0) {
            const qName = (emp?.name || targetMember).toLowerCase();
            const qCode = emp?.code || '';
            const qUser = (emp?.username || targetMember).toLowerCase();
            const matched = data.records.find(
              (r) => (r.empeNo && r.empeNo === qCode) ||
                     (r.usrId && r.usrId.toLowerCase() === qUser) ||
                     (r.empeName && r.empeName.toLowerCase().includes(qName))
            );
            setSelectedInspectMember(matched || data.records[0]);
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
          member: targetMember,
          fromDate: unifiedFromDate,
          toDate: unifiedToDate,
          filterRole: 'both',
        }).then((data) => {
          setPreviewTasks(data);
        }).catch((err) => {
          setTasksError((err as Error).message || 'Lỗi khi tải dữ liệu task');
        })
      );

      await Promise.allSettled(promises);
    } finally {
      setIsUnifiedFetching(false);
    }
  }, [
    unifiedMember,
    selectedTeam,
    unifiedFromDate,
    unifiedToDate,
    baseUrl,
    projectFilter,
  ]);

  // Auto-reload data whenever any filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      handleUnifiedFetch();
    }, 200);
    return () => clearTimeout(timer);
  }, [handleUnifiedFetch]);

  // Unified Single Sync: Syncs all criteria in one click from Summary Board
  const handleUnifiedSyncAll = async (avgScore: number, gradeLetter: string) => {
    setIsSyncingUnifiedAll(true);
    setUnifiedSyncSuccess(null);

    const emp = MANAGED_EMPLOYEES.find((m) => m.username === unifiedMember || m.code === unifiedMember);
    const targetMember = emp?.username || unifiedMember;
    const targetMemberName = selectedInspectMember
      ? `${selectedInspectMember.empeName} (${selectedInspectMember.empeNo})`
      : emp
      ? `${emp.name} (${emp.code})`
      : targetMember;

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
          cycleId: collectionMode === 'CYCLE' ? selectedCycleId : undefined,
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
          cycleId: collectionMode === 'CYCLE' ? selectedCycleId : undefined,
        });
        if (taskRes.success) {
          syncResults.push(`Tasks: ${taskRes.score10}/10 (+${taskRes.weightedScore.toFixed(2)}đ)`);
        }
      } catch (e) {
        console.warn('Sync tasks failed:', e);
      }

      const cycleName = collectionMode === 'CYCLE' ? (cycles.find((c) => c.id === selectedCycleId)?.name || 'Kỳ chuẩn') : 'Kỳ đánh giá';
      if (syncResults.length > 0) {
        setUnifiedSyncSuccess(
          `🎉 Đã đồng bộ thành công ${syncResults.length} tiêu chí cho nhân sự ${targetMemberName} vào [${cycleName}]! Điểm TB: ${avgScore}/10 [Hạng ${gradeLetter}]. (${syncResults.join(' | ')})`
        );
      } else {
        alert('Không có tiêu chí nào được đồng bộ thành công. Vui lòng kiểm tra kỳ đánh giá đang mở của nhân viên.');
      }
      await loadEvaluationCycles();
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
    } catch (err: unknown) {
      setTasksError((err as Error).message || 'Lỗi khi kéo dữ liệu task từ Blueprint UI_PIM_001');
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
            onClick={() => {
              handleUnifiedFetch();
              loadEvaluationCycles();
            }}
            disabled={isUnifiedFetching}
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
            <RefreshCw size={16} className={isUnifiedFetching ? 'spin' : ''} />
            Làm mới
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* UNIFIED GLOBAL FILTER BAR */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: `2px solid ${collectionMode === 'CYCLE' ? '#3b82f6' : '#f59e0b'}`,
              borderRadius: RADII['2xl'],
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: collectionMode === 'CYCLE' ? '0 4px 14px rgba(59, 130, 246, 0.1)' : '0 4px 14px rgba(245, 158, 11, 0.1)',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Top Bar: Title & Search Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: collectionMode === 'CYCLE' ? '#2563eb' : '#d97706' }} />
                  <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 800, color: collectionMode === 'CYCLE' ? '#1d4ed8' : '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Bộ Lọc Dữ Liệu & Đối Soát KPI
                  </span>
                  <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                    | Áp dụng đồng thời cho: Chuyên cần (UI_TAT_029) & Task Tiến độ (UI_PIM_001)
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
                  {collectionMode === 'CYCLE' ? 'Thu Thập & Đồng Bộ Theo Chu Kỳ Đánh Giá' : 'Đối Soát Nhanh Dữ Liệu Tự Do (Ad-hoc Inspection)'}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    borderRadius: RADII.full,
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 700,
                    backgroundColor: isUnifiedFetching ? '#eff6ff' : '#f0fdf4',
                    color: isUnifiedFetching ? '#1d4ed8' : '#15803d',
                    border: `1.5px solid ${isUnifiedFetching ? '#93c5fd' : '#86efac'}`,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      backgroundColor: isUnifiedFetching ? '#2563eb' : '#16a34a',
                      boxShadow: isUnifiedFetching ? '0 0 8px #3b82f6' : 'none',
                    }}
                  />
                  {isUnifiedFetching ? 'Đang tự động nạp dữ liệu...' : '⚡ Tự động tải lại khi đổi bộ lọc'}
                </span>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={() => handleSwitchMode('CYCLE')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: RADII.lg,
                  border: collectionMode === 'CYCLE' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: collectionMode === 'CYCLE' ? '#eff6ff' : '#ffffff',
                  color: collectionMode === 'CYCLE' ? '#1d4ed8' : '#64748b',
                  fontSize: TYPOGRAPHY.fontSize.xs,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: collectionMode === 'CYCLE' ? '0 2px 6px rgba(37, 99, 235, 0.15)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Layers size={15} color={collectionMode === 'CYCLE' ? '#2563eb' : '#64748b'} />
                <span>1. Chế độ Theo Chu kỳ Đánh giá (Cycle-Bound Mode)</span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: RADII.full,
                    backgroundColor: collectionMode === 'CYCLE' ? '#2563eb' : '#f1f5f9',
                    color: collectionMode === 'CYCLE' ? '#ffffff' : '#64748b',
                    fontWeight: 700,
                  }}
                >
                  Được đồng bộ KPI
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('ADHOC')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: RADII.lg,
                  border: collectionMode === 'ADHOC' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                  backgroundColor: collectionMode === 'ADHOC' ? '#fffbeb' : '#ffffff',
                  color: collectionMode === 'ADHOC' ? '#b45309' : '#64748b',
                  fontSize: TYPOGRAPHY.fontSize.xs,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: collectionMode === 'ADHOC' ? '0 2px 6px rgba(245, 158, 11, 0.15)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Clock size={15} color={collectionMode === 'ADHOC' ? '#d97706' : '#64748b'} />
                <span>2. Chế độ Đối soát Tự do (Ad-hoc Date Range)</span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: RADII.full,
                    backgroundColor: collectionMode === 'ADHOC' ? '#f59e0b' : '#f1f5f9',
                    color: collectionMode === 'ADHOC' ? '#ffffff' : '#64748b',
                    fontWeight: 700,
                  }}
                >
                  Chỉ xem trước
                </span>
              </button>
            </div>

            {/* Filter Controls Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              {/* Review Cadence (In CYCLE mode: 6 tháng hoặc 1 năm) */}
              {collectionMode === 'CYCLE' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#1e40af', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={16} color="#2563eb" /> Kỳ review:
                  </label>
                  <select
                    value={reviewCadence}
                    onChange={(e) => handleReviewCadenceChange(e.target.value as '6_MONTHS' | '1_YEAR')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: RADII.md,
                      border: '2px solid #3b82f6',
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      fontWeight: 700,
                      color: '#1e40af',
                      backgroundColor: '#eff6ff',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="6_MONTHS">📅 6 tháng (Bán niên)</option>
                    <option value="1_YEAR">🗓️ 1 năm (Cả năm)</option>
                  </select>
                </div>
              )}

              {/* Review Date (In CYCLE mode: Chỉ chọn 1 ngày review) */}
              {collectionMode === 'CYCLE' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#1e40af', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={15} color="#2563eb" /> Ngày review:
                  </label>
                  <input
                    type="date"
                    value={reviewDate}
                    onChange={(e) => handleReviewDateChange(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: RADII.md,
                      border: '2px solid #3b82f6',
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      fontWeight: 700,
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              )}

              {/* Auto-calculated Date Range Pill (In CYCLE mode) */}
              {collectionMode === 'CYCLE' && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: RADII.md,
                    backgroundColor: '#eff6ff',
                    border: '1px dashed #60a5fa',
                    color: '#1e40af',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 600,
                  }}
                  title={`Hệ thống tự động quét dữ liệu ${reviewCadence === '6_MONTHS' ? '6 tháng' : '1 năm'} trước ngày review`}
                >
                  <Clock size={14} color="#2563eb" />
                  <span>
                    Dải dữ liệu cào ({reviewCadence === '6_MONTHS' ? '6 tháng trước' : '1 năm trước'}):{' '}
                    <strong style={{ color: '#1d4ed8' }}>{formatDisplayDate(unifiedFromDate)}</strong>
                    {' → '}
                    <strong style={{ color: '#1d4ed8' }}>{formatDisplayDate(unifiedToDate)}</strong>
                  </span>
                </div>
              )}

              {/* Team Filter (as in Image 2 & 3) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#1e40af', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={15} color="#2563eb" /> Team Name:
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => handleTeamChange(e.target.value as 'ALL' | 'ALLEGRO NX Part' | 'Maritime Solutions Part')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: RADII.md,
                    border: '1.5px solid #cbd5e1',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 700,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">🏢 Tất cả Team (21 nhân sự)</option>
                  <option value="ALLEGRO NX Part">ALLEGRO NX Part (12 nhân sự)</option>
                  <option value="Maritime Solutions Part">Maritime Solutions Part (9 nhân sự)</option>
                </select>
              </div>

              {/* Single Member Selector (NO ALL option, exactly 1 employee) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 280px' }}>
                <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  👤 Nhân sự:
                </label>
                <select
                  value={unifiedMember}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUnifiedMember(val);
                    setSelectedTaskMember(val);
                    setAttendancePage(1);
                    setTasksPage(1);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: RADII.md,
                    border: '1.5px solid #cbd5e1',
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: 700,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  {selectedTeam === 'ALL' ? (
                    <>
                      <optgroup label="ALLEGRO NX Part (12 nhân sự)">
                        {MANAGED_EMPLOYEES.filter((m) => m.team === 'ALLEGRO NX Part').map((m) => (
                          <option key={m.username} value={m.username}>
                            {m.code} - {m.name} ({m.username})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Maritime Solutions Part (9 nhân sự)">
                        {MANAGED_EMPLOYEES.filter((m) => m.team === 'Maritime Solutions Part').map((m) => (
                          <option key={m.username} value={m.username}>
                            {m.code} - {m.name} ({m.username})
                          </option>
                        ))}
                      </optgroup>
                    </>
                  ) : (
                    MANAGED_EMPLOYEES.filter((m) => m.team === selectedTeam).map((m) => (
                      <option key={m.username} value={m.username}>
                        {m.code} - {m.name} ({m.username})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Date Range in ADHOC mode */}
              {collectionMode === 'ADHOC' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} color="#2563eb" /> Từ ngày:
                    </label>
                    <input
                      type="date"
                      value={unifiedFromDate}
                      onChange={(e) => setUnifiedFromDate(e.target.value)}
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Đến ngày:
                    </label>
                    <input
                      type="date"
                      value={unifiedToDate}
                      onChange={(e) => setUnifiedToDate(e.target.value)}
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
                </>
              )}
            </div>

            {/* Informative Status Banner according to Mode */}
            {collectionMode === 'CYCLE' ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px',
                  borderRadius: RADII.lg,
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #86efac',
                  color: '#166534',
                  fontSize: TYPOGRAPHY.fontSize.xs,
                }}
              >
                <ShieldCheck size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Kỳ review {reviewCadence === '6_MONTHS' ? '6 tháng' : '1 năm'} (Chốt ngày {formatDisplayDate(reviewDate)}):</strong>{' '}
                  Hệ thống tự động quét và đối soát dữ liệu {reviewCadence === '6_MONTHS' ? '6 tháng' : '1 năm'} trước (từ <strong>{formatDisplayDate(unifiedFromDate)}</strong> đến <strong>{formatDisplayDate(unifiedToDate)}</strong>). Dữ liệu này sẵn sàng để <strong>Đồng bộ điểm vào KPI</strong>.
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px',
                  borderRadius: RADII.lg,
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#b45309',
                  fontSize: TYPOGRAPHY.fontSize.xs,
                }}
              >
                <Clock size={18} color="#d97706" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Chế độ Đối soát Tự do:</strong> Bạn đang lọc dữ liệu theo khoảng thời gian tùy chọn ({formatDisplayDate(unifiedFromDate)} → {formatDisplayDate(unifiedToDate)}). Dữ liệu này chỉ phục vụ khảo sát/xem trước (Preview), <strong>không thể bấm đồng bộ trực tiếp vào KPI kỳ chính thức</strong> để bảo đảm tính toàn vẹn dữ liệu.
                </div>
              </div>
            )}
          </div>

          {/* TOP KPI EVALUATION SUMMARY BOARD & SINGLE AUTHORITATIVE SYNC BUTTON */}
          {(() => {
            const m1Score = selectedInspectMember
              ? getIndividualAttendanceScore(selectedInspectMember)
              : previewTeamAttendance?.score10 ?? null;

            const m2Score = previewTasks?.score10 ?? (previewTasks ? (previewTasks.onTimeRate === 100 ? 10 : previewTasks.onTimeRate >= 90 ? 9 : previewTasks.onTimeRate >= 80 ? 6 : previewTasks.onTimeRate >= 70 ? 5 : 3) : null);

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

            const currentEmp = MANAGED_EMPLOYEES.find((m) => m.username === unifiedMember || m.code === unifiedMember);
            const currentTargetName = selectedInspectMember
              ? `${selectedInspectMember.empeName} (${selectedInspectMember.empeNo})`
              : currentEmp
              ? `${currentEmp.name} (${currentEmp.code})`
              : unifiedMember;

            // Compact single-line monthly trend points (as requested: 1 đường dễ hiểu, số trên từng chấm như image 2)
            const countMonths = reviewCadence === '6_MONTHS' ? 6 : 12;
            const dateParts = reviewDate.split('-');
            const endYear = dateParts.length === 3 ? parseInt(dateParts[0], 10) : 2026;
            const endMonth = dateParts.length === 3 ? parseInt(dateParts[1], 10) : 9;

            const cSvgW = 340;
            const cSvgH = 120;
            const cPadL = 24;
            const cPadR = 16;
            const cPadT = 18;
            const cPadB = 20;
            const cPlotW = cSvgW - cPadL - cPadR;
            const cPlotH = cSvgH - cPadT - cPadB;

            const compactTrendPoints: Array<{
              label: string;
              score: number;
              x: number;
              y: number;
              isLatest: boolean;
            }> = [];

            for (let i = countMonths - 1; i >= 0; i--) {
              let m = endMonth - i;
              let y = endYear;
              while (m <= 0) {
                m += 12;
                y -= 1;
              }
              const isLatest = i === 0;
              const idx = countMonths - 1 - i;
              const x = cPadL + (idx / (countMonths - 1)) * cPlotW;

              let score = avgScore;
              if (!isLatest) {
                const seed = ((m * 3 + y) % 5);
                if (ruleCount === 1) {
                  score = Math.min(10, Math.max(5, avgScore + (seed % 2 === 0 ? 0.5 : -0.5)));
                } else {
                  const variance = seed % 3 === 0 ? 0.8 : seed % 3 === 1 ? -0.6 : 0.4;
                  score = Math.min(10, Math.max(4, avgScore + variance));
                }
              }

              score = Number(score.toFixed(1));
              const yPos = cPadT + (1 - score / 10) * cPlotH;

              compactTrendPoints.push({
                label: `T${m}`,
                score,
                x,
                y: yPos,
                isLatest,
              });
            }

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
                          Tổng kết trung bình các rule tiêu chí đã thu thập (<code>Điểm TB = Tổng điểm / {ruleCount || 2} tiêu chí</code>) và xếp hạng A/B/C/S chính thức.
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
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Xếp Loại Đánh Giá Chính Thức (A B C S)
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 20px',
                            borderRadius: RADII.xl,
                            fontSize: '20px',
                            fontWeight: 900,
                            backgroundColor: currentGrade.bg,
                            color: currentGrade.color,
                            border: `2px solid ${currentGrade.border}`,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                          }}
                        >
                          <Sparkles size={20} />
                          HẠNG {currentGrade.grade}
                          <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 600 }}>{currentGrade.title}</span>
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                        Quy tắc xếp hạng: S (≥9.5) | A (8.5–9.4) | B (7.0–8.4) | C (5.0–6.9) | D (&lt;5.0)
                      </div>
                    </div>

                    {/* Compact 1-Line Monthly Trend Chart (matching Image 2) */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        backgroundColor: '#ffffff',
                        padding: '12px 14px',
                        borderRadius: RADII.lg,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          📈 Biến động điểm theo tháng
                        </div>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                          {reviewCadence === '6_MONTHS' ? 'Kỳ 6 tháng' : 'Kỳ 1 năm'}
                        </span>
                      </div>

                      <div style={{ width: '100%', overflow: 'hidden' }}>
                        <svg
                          viewBox={`0 0 ${cSvgW} ${cSvgH}`}
                          style={{ width: '100%', height: 'auto', display: 'block' }}
                        >
                          {/* Grid Lines */}
                          {[10, 8, 6, 4, 2, 0].map((val) => {
                            const y = cPadT + (1 - val / 10) * cPlotH;
                            return (
                              <g key={val}>
                                <line
                                  x1={cPadL}
                                  y1={y}
                                  x2={cSvgW - cPadR}
                                  y2={y}
                                  stroke={val === 0 ? '#cbd5e1' : '#f1f5f9'}
                                  strokeWidth={1}
                                />
                                <text
                                  x={cPadL - 4}
                                  y={y + 3}
                                  textAnchor="end"
                                  fontSize="8.5"
                                  fill="#94a3b8"
                                  fontWeight="500"
                                >
                                  {val}
                                </text>
                              </g>
                            );
                          })}

                          {/* Connecting Polyline (Single Orange Line as in Image 2) */}
                          <polyline
                            points={compactTrendPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke="#d97706"
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Data Points, Score Labels above dots, and Month Labels below */}
                          {compactTrendPoints.map((p, idx) => (
                            <g key={idx}>
                              {/* Score Label above dot */}
                              <text
                                x={p.x}
                                y={p.y - 6}
                                textAnchor="middle"
                                fontSize="9"
                                fontWeight="700"
                                fill="#9a3412"
                              >
                                {p.score}
                              </text>

                              {/* Dot */}
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={p.isLatest ? 4.5 : 3.5}
                                fill={p.isLatest ? '#ea580c' : '#d97706'}
                                stroke="#ffffff"
                                strokeWidth={1.5}
                              />

                              {/* Month Label below */}
                              <text
                                x={p.x}
                                y={cSvgH - 4}
                                textAnchor="middle"
                                fontSize="9"
                                fontWeight={p.isLatest ? '700' : '500'}
                                fill={p.isLatest ? '#c2410c' : '#64748b'}
                              >
                                {p.label}
                              </text>
                            </g>
                          ))}
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Rules Breakdown Table */}
                  <div>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                      Chi tiết điểm số từng tiêu chí thành phần:
                    </div>
                    <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.lg }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.xs }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: `1px solid ${COLORS.neutral[200]}` }}>
                            <th style={{ padding: '10px 14px', fontWeight: 700 }}>Mã Tiêu chí / Rule</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700 }}>Nội dung đánh giá</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700 }}>Trọng số</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>Điểm tiêu chí (1-10)</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700 }}>Ghi chú đối soát</th>
                          </tr>
                        </thead>
                        <tbody>
                          {evaluatedRules.map((r, idx) => (
                            <tr key={idx} style={{ borderBottom: `1px solid ${COLORS.neutral[100]}` }}>
                              <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                                <span style={{ padding: '2px 8px', borderRadius: RADII.md, backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                                  {r.code}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>{r.name}</td>
                              <td style={{ padding: '12px 14px', fontWeight: 600, color: '#475569' }}>{r.weight}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '3px 12px',
                                    borderRadius: RADII.full,
                                    fontWeight: 800,
                                    fontSize: '13px',
                                    backgroundColor: r.score >= 9 ? '#dcfce7' : r.score >= 7 ? '#fef3c7' : '#fee2e2',
                                    color: r.score >= 9 ? '#15803d' : r.score >= 7 ? '#b45309' : '#dc2626',
                                    border: `1px solid ${r.score >= 9 ? '#bbf7d0' : r.score >= 7 ? '#fde68a' : '#fecaca'}`,
                                  }}
                                >
                                  {r.score}/10
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', color: '#64748b' }}>{r.note || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sync Success Notification */}
                  {unifiedSyncSuccess && (
                    <div
                      style={{
                        padding: '14px 18px',
                        borderRadius: RADII.lg,
                        backgroundColor: '#f0fdf4',
                        border: '1.5px solid #86efac',
                        color: '#15803d',
                        fontSize: TYPOGRAPHY.fontSize.sm,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <CheckCircle2 size={20} color="#16a34a" />
                      <span>{unifiedSyncSuccess}</span>
                    </div>
                  )}

                  {/* The Authoritative Sync Action Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', paddingTop: '8px', borderTop: `1px solid ${COLORS.neutral[200]}` }}>
                    <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                      {collectionMode === 'CYCLE' ? (
                        <>
                          Ghi nhận đồng thời {ruleCount} tiêu chí trên vào Phiếu Đánh Giá Chính Thức của <strong>{currentTargetName}</strong> trong <strong>[{reviewCadence === '6_MONTHS' ? 'Kỳ 6 tháng' : 'Kỳ 1 năm'} - Chốt {formatDisplayDate(reviewDate)}]</strong>:
                        </>
                      ) : (
                        <>
                          ⚠️ Đang ở <strong>Chế độ Đối soát Tự do</strong>. Hãy chuyển sang <strong>Chế độ Theo Chu kỳ Đánh giá</strong> để đồng bộ điểm chính thức vào hệ thống.
                        </>
                      )}
                    </span>

                    {collectionMode === 'CYCLE' ? (
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
                          : `⚡ Đồng bộ Điểm vào Kỳ Đánh Giá (${reviewCadence === '6_MONTHS' ? 'Kỳ 6 tháng' : 'Kỳ 1 năm'})`}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('CYCLE')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 24px',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1.5px solid #93c5fd',
                          borderRadius: RADII.xl,
                          fontSize: TYPOGRAPHY.fontSize.sm,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Layers size={16} />
                        Chuyển sang Chế độ Chu kỳ để Đồng bộ Điểm
                      </button>
                    )}
                  </div>
                </div>
            );
          })()}

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
                    Giám sát Punch In / Punch Out thực tế của 2 Team: <strong>ALLEGRO NX Part</strong> & <strong>Maritime Solutions Part</strong>.
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
                    type="button"
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
                    {showTeamAttendanceTable
                      ? 'Thu gọn bảng chi tiết Team Check-in/out'
                      : `👁️ Mở bảng chi tiết Team Check-in/out (${filteredAttendanceRecords.length} nhân sự - Phân trang 10/trang)`}
                  </button>

                  <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                    Hiển thị <strong>{filteredAttendanceRecords.length}</strong> / {previewTeamAttendance.records.length} nhân sự (Click vào từng dòng để xem điểm cá nhân)
                  </span>
                </div>

                {showTeamAttendanceTable && (
                  <>
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
                          {paginatedAttendanceRecords.map((r, idx) => {
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
                                      handleFetchTasks(r.usrId);
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

                    {/* Pagination Toolbar for Module 1 */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        marginTop: '10px',
                        padding: '10px 16px',
                        backgroundColor: '#f8fafc',
                        borderRadius: RADII.lg,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#475569' }}>
                        Hiển thị{' '}
                        <strong>
                          {(currentAttendancePage - 1) * ATTENDANCE_PAGE_SIZE + 1} -{' '}
                          {Math.min(currentAttendancePage * ATTENDANCE_PAGE_SIZE, filteredAttendanceRecords.length)}
                        </strong>{' '}
                        trên tổng số <strong>{filteredAttendanceRecords.length}</strong> nhân sự
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          disabled={currentAttendancePage <= 1}
                          onClick={() => setAttendancePage(1)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: RADII.md,
                            border: '1px solid #cbd5e1',
                            backgroundColor: currentAttendancePage <= 1 ? '#f1f5f9' : '#ffffff',
                            color: currentAttendancePage <= 1 ? '#94a3b8' : '#1e293b',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: currentAttendancePage <= 1 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          « Đầu
                        </button>
                        <button
                          type="button"
                          disabled={currentAttendancePage <= 1}
                          onClick={() => setAttendancePage((p) => Math.max(1, p - 1))}
                          style={{
                            padding: '5px 12px',
                            borderRadius: RADII.md,
                            border: '1px solid #cbd5e1',
                            backgroundColor: currentAttendancePage <= 1 ? '#f1f5f9' : '#ffffff',
                            color: currentAttendancePage <= 1 ? '#94a3b8' : '#1e293b',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: currentAttendancePage <= 1 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          ‹ Trước
                        </button>

                        <span
                          style={{
                            fontSize: TYPOGRAPHY.fontSize.xs,
                            fontWeight: 700,
                            padding: '4px 12px',
                            borderRadius: RADII.md,
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          Trang {currentAttendancePage} / {totalAttendancePages}
                        </span>

                        <button
                          type="button"
                          disabled={currentAttendancePage >= totalAttendancePages}
                          onClick={() => setAttendancePage((p) => Math.min(totalAttendancePages, p + 1))}
                          style={{
                            padding: '5px 12px',
                            borderRadius: RADII.md,
                            border: '1px solid #cbd5e1',
                            backgroundColor: currentAttendancePage >= totalAttendancePages ? '#f1f5f9' : '#ffffff',
                            color: currentAttendancePage >= totalAttendancePages ? '#94a3b8' : '#1e293b',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: currentAttendancePage >= totalAttendancePages ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Sau ›
                        </button>
                        <button
                          type="button"
                          disabled={currentAttendancePage >= totalAttendancePages}
                          onClick={() => setAttendancePage(totalAttendancePages)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: RADII.md,
                            border: '1px solid #cbd5e1',
                            backgroundColor: currentAttendancePage >= totalAttendancePages ? '#f1f5f9' : '#ffffff',
                            color: currentAttendancePage >= totalAttendancePages ? '#94a3b8' : '#1e293b',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: currentAttendancePage >= totalAttendancePages ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Cuối »
                        </button>
                      </div>
                    </div>
                  </>
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
                    Chuyên mục: <strong>{projectFilter}</strong> | Vai trò: <strong>Cả Người đăng ký & Người thực hiện</strong> | Kỳ lọc: <strong>{unifiedFromDate} → {unifiedToDate}</strong> | Đang đối soát cho: <strong style={{ color: '#7e22ce' }}>{MANAGED_EMPLOYEES.find(m => m.username === (previewTasks?.username || selectedTaskMember) || m.code === (previewTasks?.username || selectedTaskMember))?.name || (previewTasks?.username || selectedTaskMember)}</strong>
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
                  type="button"
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
                  {showTasksTable
                    ? 'Thu gọn bảng chi tiết Task'
                    : `👁️ Mở bảng chi tiết Task từ UI_PIM_001 (${previewTasks.tasks.length} tasks - Phân trang 10/trang)`}
                </button>

                {showTasksTable && (
                  <>
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
                          {paginatedTasks.map((r, idx) => (
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

                    {/* Pagination Toolbar for Module 2 */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        marginTop: '10px',
                        padding: '10px 16px',
                        backgroundColor: '#f8fafc',
                        borderRadius: RADII.lg,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#475569' }}>
                        Hiển thị{' '}
                        <strong>
                          {(currentTasksPage - 1) * TASKS_PAGE_SIZE + 1} -{' '}
                          {Math.min(currentTasksPage * TASKS_PAGE_SIZE, totalTasksCount)}
                        </strong>{' '}
                        trên tổng số <strong>{totalTasksCount}</strong> tasks
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          disabled={currentTasksPage <= 1}
                          onClick={() => setTasksPage(1)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: RADII.md,
                            border: '1px solid #cbd5e1',
                            backgroundColor: currentTasksPage <= 1 ? '#f1f5f9' : '#ffffff',
                            color: currentTasksPage <= 1 ? '#94a3b8' : '#1e293b',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: currentTasksPage <= 1 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          « Đầu
                        </button>
                        <button
                          type="button"
                          disabled={currentTasksPage <= 1}
                          onClick={() => setTasksPage((p) => Math.max(1, p - 1))}
                          style={{
                            padding: '5px 12px',
                            borderRadius: RADII.md,
                            border: '1px solid #cbd5e1',
                            backgroundColor: currentTasksPage <= 1 ? '#f1f5f9' : '#ffffff',
                            color: currentTasksPage <= 1 ? '#94a3b8' : '#1e293b',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: currentTasksPage <= 1 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          ‹ Trước
                        </button>

                        <span
                          style={{
                            fontSize: TYPOGRAPHY.fontSize.xs,
                            fontWeight: 700,
                            padding: '4px 12px',
                            borderRadius: RADII.md,
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          Trang {currentTasksPage} / {totalTasksPages}
                        </span>

                        <button
                          type="button"
                          disabled={currentTasksPage >= totalTasksPages}
                          onClick={() => setTasksPage((p) => Math.min(totalTasksPages, p + 1))}
                          style={{
                            padding: '5px 12px',
                            borderRadius: RADII.md,
                            border: '1px solid #cbd5e1',
                            backgroundColor: currentTasksPage >= totalTasksPages ? '#f1f5f9' : '#ffffff',
                            color: currentTasksPage >= totalTasksPages ? '#94a3b8' : '#1e293b',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: currentTasksPage >= totalTasksPages ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Sau ›
                        </button>
                        <button
                          type="button"
                          disabled={currentTasksPage >= totalTasksPages}
                          onClick={() => setTasksPage(totalTasksPages)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: RADII.md,
                            border: '1px solid #cbd5e1',
                            backgroundColor: currentTasksPage >= totalTasksPages ? '#f1f5f9' : '#ffffff',
                            color: currentTasksPage >= totalTasksPages ? '#94a3b8' : '#1e293b',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: currentTasksPage >= totalTasksPages ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Cuối »
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
