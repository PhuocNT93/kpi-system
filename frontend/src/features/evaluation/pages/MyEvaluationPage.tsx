import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { evaluationApi } from '../api/evaluation-api';
import { employeeSearchApi } from '@/features/organization/api/employee-search.api';
import { COLORS } from '@/lib/theme';
import { RADII, SHADOWS, TYPOGRAPHY } from '@/shared/theme';
import { ArrowUpRight, BarChart3, ChevronDown, ListChecks, PenLine } from 'lucide-react';
import { SubTabs, type SubTabItem } from '@/shared/ui/SubTabs/SubTabs';
import { useAuth } from '@/shared/auth/auth-context';
import { type TeamEvaluation, buildEvaluationScoringSummary, deriveFormulaSourceLabel } from '../domain/evaluation-models';
import type { EmployeeSearchResult } from '@/features/organization/api/employee-search.api';
import { EvaluationOverviewPanel } from '../components/EvaluationOverviewPanel';
import { EvaluationScoreSummaryPanel } from '../components/EvaluationScoreSummaryPanel';
import { PersonalDevelopmentPlanPanel } from '../components/PersonalDevelopmentPlanPanel';
import { EvaluationPickerList, type EvaluationPickerItem } from '../components/EvaluationPickerList';

type EvaluationSectionId = 'overall' | 'criteria' | 'personal';

const EVALUATION_SECTIONS: SubTabItem<EvaluationSectionId>[] = [
  { id: 'overall', label: 'Overall', icon: <BarChart3 size={15} /> },
  { id: 'criteria', label: 'Criteria', icon: <ListChecks size={15} /> },
  { id: 'personal', label: 'Personal Development', icon: <PenLine size={15} /> },
];

type DevelopmentBlock = {
  title: string;
  desc: string;
  accent: string;
  value: string;
};

export function MyEvaluationPage() {
  const { user } = useAuth();
  const isHrAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  const [openCriterion, setOpenCriterion] = useState(0);
  const [activeSection, setActiveSection] = useState<EvaluationSectionId>('overall');
  const [saved] = useState(true);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const [developmentBlocks, setDevelopmentBlocks] = useState<DevelopmentBlock[]>([
    {
      title: 'Objective(s)',
      desc: 'What do you want to achieve during the next review period?',
      accent: COLORS.primary.DEFAULT,
      value: 'Lead a cross-functional discovery initiative and improve product storytelling.',
    },
    {
      title: 'Achievements',
      desc: 'What have you accomplished during this review period?',
      accent: COLORS.semantic.success.DEFAULT,
      value: 'Delivered a redesign that increased activation, and mentored two junior designers.',
    },
    {
      title: 'Need Improvement',
      desc: 'What skills, behaviors or areas would you like to improve?',
      accent: COLORS.semantic.warning.DEFAULT,
      value: 'Sharpen prioritization for ambiguous roadmap requests and improve delegation.',
    },
    {
      title: 'Suggestion',
      desc: 'What support, resources, training or opportunities would help you grow?',
      accent: COLORS.secondary.DEFAULT,
      value: 'Access to strategy workshops, stakeholder shadowing, and a quarterly coaching session.',
    },
  ]);

  const { data: myEvaluations } = useQuery({
    queryKey: ['my-evaluations'],
    queryFn: evaluationApi.getMyEvaluations,
  });

  const selfEvaluations = useMemo(() => myEvaluations ?? [], [myEvaluations]);

  useEffect(() => {
    if (isHrAdmin) {
      return;
    }

    if (!selectedEvaluationId && selfEvaluations.length > 0) {
      setSelectedEvaluationId(selfEvaluations[0].evaluation.evaluation_id);
      return;
    }

    if (selectedEvaluationId && !selfEvaluations.some((item) => item.evaluation.evaluation_id === selectedEvaluationId)) {
      setSelectedEvaluationId(selfEvaluations[0]?.evaluation.evaluation_id ?? null);
    }
  }, [isHrAdmin, selectedEvaluationId, selfEvaluations]);

  const { data: teamEvaluations = [] } = useQuery({
    queryKey: ['team-evaluations', 'my-evaluation-picker'],
    queryFn: evaluationApi.getTeamEvaluations,
    enabled: isHrAdmin,
  });

  const filteredTeamEvaluations = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) {
      return teamEvaluations;
    }

    return teamEvaluations.filter((item: TeamEvaluation) => {
      return (
        item.employee?.full_name?.toLowerCase().includes(term) ||
        item.employee?.employee_code?.toLowerCase().includes(term) ||
        item.employee?.email?.toLowerCase().includes(term) ||
        item.cycle?.name?.toLowerCase().includes(term)
      );
    });
  }, [employeeSearch, teamEvaluations]);

  useEffect(() => {
    if (!isHrAdmin) {
      return;
    }

    if (!selectedEvaluationId && filteredTeamEvaluations.length > 0) {
      setSelectedEvaluationId(filteredTeamEvaluations[0].evaluation.evaluation_id);
      return;
    }

    if (selectedEvaluationId && !teamEvaluations.some((item) => item.evaluation.evaluation_id === selectedEvaluationId)) {
      setSelectedEvaluationId(filteredTeamEvaluations[0]?.evaluation.evaluation_id ?? teamEvaluations[0]?.evaluation.evaluation_id ?? null);
    }
  }, [filteredTeamEvaluations, isHrAdmin, selectedEvaluationId, teamEvaluations]);

  const activeEvaluationId = isHrAdmin
    ? selectedEvaluationId ?? filteredTeamEvaluations[0]?.evaluation.evaluation_id
    : selectedEvaluationId ?? selfEvaluations[0]?.evaluation.evaluation_id;

  const selectedSelfEvaluation = useMemo(() => {
    if (isHrAdmin) {
      return null;
    }

    return selfEvaluations.find((item) => item.evaluation.evaluation_id === (selectedEvaluationId ?? selfEvaluations[0]?.evaluation.evaluation_id)) ?? null;
  }, [isHrAdmin, selfEvaluations, selectedEvaluationId]);

  const selectedTeamEvaluation = useMemo(() => {
    if (!isHrAdmin || !activeEvaluationId) {
      return null;
    }

    return teamEvaluations.find((item) => item.evaluation.evaluation_id === activeEvaluationId) ?? null;
  }, [activeEvaluationId, isHrAdmin, teamEvaluations]);

  const selectedEmployeeId = selectedTeamEvaluation?.employee?.employee_id ?? selectedSelfEvaluation?.employee?.employee_id ?? selfEvaluations[0]?.employee?.employee_id;
  const selectedManagerId = selectedTeamEvaluation?.evaluation.manager_id_snapshot ?? null;

  const { data: employeeProfiles } = useQuery<EmployeeSearchResult>({
    queryKey: ['employee-profiles', selectedEmployeeId],
    queryFn: () => employeeSearchApi.search({ employeeId: selectedEmployeeId, size: 1 }),
    enabled: Boolean(selectedEmployeeId),
  });

  // The search endpoint may return other employees in scope, so only trust a row whose id matches.
  const selectedEmployeeProfile = employeeProfiles?.employees?.find((profile) => profile.employeeId === selectedEmployeeId);

  const { data: managerProfiles } = useQuery<EmployeeSearchResult>({
    queryKey: ['employee-manager-profile', selectedManagerId],
    queryFn: () => employeeSearchApi.search({ employeeId: selectedManagerId ?? undefined, size: 1 }),
    enabled: Boolean(selectedManagerId),
  });

  const selectedManagerProfile = managerProfiles?.employees?.find((profile) => profile.employeeId === selectedManagerId);

  const { data: evaluationDetail } = useQuery({
    queryKey: ['evaluation-detail', activeEvaluationId],
    queryFn: () => evaluationApi.getEvaluationDetail(activeEvaluationId!),
    enabled: !!activeEvaluationId,
  });

  useEffect(() => {
    if (!evaluationDetail?.development_blocks || evaluationDetail.development_blocks.length === 0) {
      return;
    }

    setDevelopmentBlocks(
      evaluationDetail.development_blocks.map((block, index) => ({
        title: block.title,
        desc: block.desc ?? '',
        accent: block.accent ?? [COLORS.primary.DEFAULT, COLORS.semantic.success.DEFAULT, COLORS.semantic.warning.DEFAULT, COLORS.secondary.DEFAULT][index % 4],
        value: String(block.value ?? '').slice(0, 2000),
      })),
    );
  }, [activeEvaluationId, evaluationDetail]);

  useEffect(() => {
    if (!evaluationDetail?.development_blocks || evaluationDetail.development_blocks.length === 0) {
      setDevelopmentBlocks([
        {
          title: 'Objective(s)',
          desc: 'What do you want to achieve during the next review period?',
          accent: COLORS.primary.DEFAULT,
          value: 'Lead a cross-functional discovery initiative and improve product storytelling.',
        },
        {
          title: 'Achievements',
          desc: 'What have you accomplished during this review period?',
          accent: COLORS.semantic.success.DEFAULT,
          value: 'Delivered a redesign that increased activation, and mentored two junior designers.',
        },
        {
          title: 'Need Improvement',
          desc: 'What skills, behaviors or areas would you like to improve?',
          accent: COLORS.semantic.warning.DEFAULT,
          value: 'Sharpen prioritization for ambiguous roadmap requests and improve delegation.',
        },
        {
          title: 'Suggestion',
          desc: 'What support, resources, training or opportunities would help you grow?',
          accent: COLORS.secondary.DEFAULT,
          value: 'Access to strategy workshops, stakeholder shadowing, and a quarterly coaching session.',
        },
      ]);
    }
  }, [activeEvaluationId, evaluationDetail]);

  const scoreFormula = useMemo(() => buildEvaluationScoringSummary(evaluationDetail), [evaluationDetail]);
  const criteria = scoreFormula.criteria;


  const currentRank = useMemo(() => {
    if (scoreFormula.totalScore > 4.5) {
      return 'S';
    }

    if (scoreFormula.totalScore >= 3) {
      return 'A';
    }

    return 'B';
  }, [scoreFormula.totalScore]);

  const progress = (value: number) => `${Math.max(0, Math.min(100, value))}%`;

  const activeCycle = selectedTeamEvaluation?.cycle ?? selectedSelfEvaluation?.cycle ?? selfEvaluations[0]?.cycle;

  const cycleProgress = useMemo(() => {
    if (!activeCycle?.start_date || !activeCycle?.end_date) {
      return { percentage: 0, label: 'N/A', dateLabel: 'Không có mốc thời gian' };
    }

    const startTime = new Date(activeCycle.start_date).getTime();
    const endTime = new Date(activeCycle.end_date).getTime();
    const nowTime = Date.now();

    if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
      return { percentage: 0, label: 'N/A', dateLabel: 'Không có mốc thời gian' };
    }

    const percentage = Math.max(0, Math.min(100, ((nowTime - startTime) / (endTime - startTime)) * 100));
    const startLabel = new Date(activeCycle.start_date).toLocaleDateString('vi-VN');
    const endLabel = new Date(activeCycle.end_date).toLocaleDateString('vi-VN');

    return {
      percentage,
      label: `${Math.round(percentage)}%`,
      dateLabel: `${startLabel} - ${endLabel}`,
    };
  }, [activeCycle]);

  const formatDisplayDate = (value: string | null | undefined) => {
    if (!value) {
      return 'N/A';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'N/A';
    }

    return parsed.toLocaleDateString('vi-VN');
  };

  const selectedEmployee = selectedTeamEvaluation?.employee ?? selectedSelfEvaluation?.employee ?? selfEvaluations[0]?.employee;
  const selfEmployee = selectedSelfEvaluation?.employee;
  const selfEvaluation = selectedSelfEvaluation?.evaluation;
  const enrichedEmployee = {
    ...selectedEmployee,
    ...selfEmployee,
    join_date: selectedEmployeeProfile?.joinDate ?? selectedEmployee?.join_date ?? selfEmployee?.join_date,
    next_review_due_date: selectedEmployee?.next_review_due_date ?? selfEmployee?.next_review_due_date,
    employee_code: selectedEmployee?.employee_code ?? selfEmployee?.employee_code ?? selectedEmployeeProfile?.employeeCode,
    full_name: selectedEmployee?.full_name ?? selfEmployee?.full_name ?? selectedEmployeeProfile?.fullName,
    email: selectedEmployee?.email ?? selfEmployee?.email ?? selectedEmployeeProfile?.email,
    created_at: selectedEmployee?.created_at ?? selfEmployee?.created_at,
  };
  const selectedEvaluation = isHrAdmin ? selectedTeamEvaluation?.evaluation : selfEvaluation;
  const selectedEvaluationStatus = selectedEvaluation?.status ?? 'OPEN';
  const selectedEvaluationStatusLabel =
    selectedEvaluationStatus === 'SUBMITTED'
      ? 'Đã nộp tự đánh giá - Chờ quản lý'
      : selectedEvaluationStatus === 'MANAGER_REVIEW'
      ? 'Quản lý đang đánh giá'
      : selectedEvaluationStatus === 'APPROVED'
      ? 'Đã duyệt'
      : selectedEvaluationStatus === 'PUBLISHED'
      ? 'Đã công bố'
      : selectedEvaluationStatus === 'LOCKED'
      ? 'Đã khóa'
      : 'Chưa nộp';
  const selectedEvaluationStatusStyle: React.CSSProperties =
    selectedEvaluationStatus === 'SUBMITTED'
      ? { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }
      : selectedEvaluationStatus === 'MANAGER_REVIEW'
      ? { background: '#fff7ed', color: '#b45309', border: '1px solid #fed7aa' }
      : selectedEvaluationStatus === 'APPROVED' || selectedEvaluationStatus === 'PUBLISHED'
      ? { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }
      : selectedEvaluationStatus === 'LOCKED'
      ? { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }
      : { background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' };
  const officialScore = evaluationDetail?.official_score ?? scoreFormula.totalScore;

  // Derive which formula level is being applied (Team / Dept / Global) — must come after enrichedEmployee
  const formulaSourceLabel = useMemo(() => {
    if (!evaluationDetail) return undefined;
    const teamName = enrichedEmployee?.team_name ?? null;
    return deriveFormulaSourceLabel(evaluationDetail, teamName);
  }, [evaluationDetail, enrichedEmployee?.team_name]);

  const profileFacts = [
    ['Joined', formatDisplayDate(enrichedEmployee.join_date ?? enrichedEmployee.created_at)],
    ['Previous Review', formatDisplayDate(selectedEvaluation?.approved_at ?? selectedEvaluation?.submitted_at)],
    ['Next Review', formatDisplayDate(enrichedEmployee.next_review_due_date ?? activeCycle?.end_date)],
    ['Current Level', selectedEmployeeProfile?.role.name || enrichedEmployee.role_name || 'N/A'],
  ];
  const teamName = selectedEmployeeProfile?.team.name || enrichedEmployee.team_name || 'N/A';
  const leaderName = selectedManagerProfile?.fullName || selectedEmployeeProfile?.manager?.name || 'N/A';

  const updateDevelopmentBlock = (index: number, value: string) => {
    setDevelopmentBlocks((current) =>
      current.map((block, blockIndex) =>
        blockIndex === index ? { ...block, value: value.slice(0, 2000) } : block,
      ),
    );
  };

  const saveDevelopmentBlocksMutation = useMutation({
    mutationFn: async () => {
      if (!activeEvaluationId) {
        throw new Error('Missing evaluation id');
      }

      await evaluationApi.saveDevelopmentBlocks(activeEvaluationId, developmentBlocks);
    },
  });

  const isDevelopmentPlanComplete = useMemo(() => {
    return developmentBlocks.length > 0 && developmentBlocks.every((block) => String(block.value ?? '').trim().length > 0);
  }, [developmentBlocks]);

  const selfSubmitMutation = useMutation({
    mutationFn: async () => {
      if (!activeEvaluationId) {
        throw new Error('Missing evaluation id');
      }

      await evaluationApi.submitEvaluation(activeEvaluationId);
    },
    onSuccess: () => {
      window.location.reload();
    },
  });

  const filteredSelfEvaluations = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) {
      return selfEvaluations;
    }

    return selfEvaluations.filter((item) => (
      item.cycle?.name?.toLowerCase().includes(term) ||
      item.employee?.full_name?.toLowerCase().includes(term) ||
      item.employee?.employee_code?.toLowerCase().includes(term)
    ));
  }, [employeeSearch, selfEvaluations]);

  const pickerItems: EvaluationPickerItem[] = isHrAdmin
    ? filteredTeamEvaluations.map((item) => ({
        id: item.evaluation.evaluation_id,
        title: item.employee?.full_name || 'N/A',
        subtitle: [item.employee?.employee_code, item.employee?.role_name, item.cycle?.name].filter(Boolean).join(' • '),
        status: item.evaluation.status,
      }))
    : filteredSelfEvaluations.map((item) => ({
        id: item.evaluation.evaluation_id,
        title: item.cycle?.name || 'N/A',
        subtitle: [item.employee?.employee_code, item.employee?.full_name].filter(Boolean).join(' • '),
        status: item.evaluation.status,
      }));

  const displayName = enrichedEmployee.full_name || 'N/A';
  const displayInitials = enrichedEmployee.full_name
    ? enrichedEmployee.full_name.split(' ').filter(Boolean).map((part) => part[0]).slice(-2).join('').toUpperCase()
    : '—';
  const currentLevel = LEVELS.find((level) => level.rank === currentRank) ?? LEVELS[1];

  return (
    <div style={{ color: COLORS.neutral.textPrimary, fontFamily: TYPOGRAPHY.fontFamily.body, marginTop: '12px', flex: '1 0 auto', display: 'flex', flexDirection: 'column' }}>
      <div className="my-eval-layout" style={{ flex: '1 0 auto' }}>
        <div className="my-eval-picker-slot">
          <EvaluationPickerList
            items={pickerItems}
            activeId={activeEvaluationId}
            searchValue={employeeSearch}
            searchPlaceholder="Search"
            emptyLabel={isHrAdmin ? 'No employees match your search.' : 'No evaluations found.'}
            onSearchChange={setEmployeeSearch}
            onSelect={setSelectedEvaluationId}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          {/* Each tab body grows so the detail column reaches the bottom of the viewport. */}
          <section style={{ ...panelStyle, padding: '12px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', minWidth: 0 }}>
                <div style={avatarStyle}>{displayInitials}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginBottom: '2px', lineHeight: 1.4 }}>
                    Team: <strong style={{ color: COLORS.neutral.textPrimary }}>{teamName}</strong>
                    <span style={{ margin: '0 6px', color: COLORS.neutral[400] }}>/</span>
                    Leader: <strong style={{ color: COLORS.neutral.textPrimary }}>{leaderName}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.extrabold, lineHeight: 1.25 }}>{displayName}</div>
                    <span
                      title={selectedEvaluationStatusLabel}
                      style={{ ...selectedEvaluationStatusStyle, padding: '4px 10px', borderRadius: RADII.full, fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.semibold }}
                    >
                      {selectedEvaluationStatus}
                    </span>
                  </div>
                  <div style={metaLineStyle}>Employee ID: {enrichedEmployee.employee_code || 'N/A'}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                {profileFacts.map(([label, value]) => (
                  <div key={label} style={miniFactCardStyle}>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>{label}</div>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.bold, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <SubTabs<EvaluationSectionId>
            items={EVALUATION_SECTIONS}
            value={activeSection}
            onChange={setActiveSection}
            ariaLabel="Evaluation sections"
            flush
          />

          {activeSection === 'overall' && (
            <>
              <section style={{ flex: '1 0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
                <div style={{ ...panelStyle, padding: '14px 18px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', minWidth: 0 }}>
                      <h2 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold }}>Overall Evaluation</h2>
                      <div style={positiveBadgeStyle}><ArrowUpRight size={15} /> +6% vs previous review</div>
                    </div>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary, whiteSpace: 'nowrap' }}>Status: <strong style={{ color: COLORS.neutral.textPrimary }}>{currentLevel.label}</strong></div>
                  </div>

                  <EvaluationOverviewPanel score={officialScore} cycleProgress={cycleProgress} />
                </div>

                <EvaluationScoreSummaryPanel
                  score={officialScore}
                  grouped={scoreFormula.grouped}
                  formulaSource={formulaSourceLabel}
                  compact
                  note={currentLevel.description}
                />
              </section>

              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'stretch' }}>
                {LEVELS.map((level) => {
                  const isActive = currentRank === level.rank;
                  return (
                    <div
                      key={level.rank}
                      style={{
                        borderRadius: RADII['2xl'],
                        padding: '10px 14px',
                        border: `1px solid ${isActive ? level.tone : level.border}`,
                        background: level.background,
                        boxShadow: isActive ? level.activeShadow : '0 6px 16px rgba(15,23,42,0.05)',
                        opacity: isActive ? 1 : 0.7,
                        transition: 'opacity 0.2s ease, box-shadow 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: RADII.md, display: 'grid', placeItems: 'center', background: `${level.tone}18`, color: level.tone, border: `1px solid ${level.border}`, flexShrink: 0 }}>
                            <span style={{ fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.extrabold, lineHeight: 1 }}>{level.rank}</span>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: level.tone, fontWeight: TYPOGRAPHY.fontWeight.semibold, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{level.badge}</div>
                            <div style={{ fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary, lineHeight: 1.2 }}>{level.label}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, whiteSpace: 'nowrap' }}>Level · {level.range}</div>
                      </div>
                      <div title={level.description} style={{ marginTop: '6px', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textPrimary, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{level.description}</div>
                    </div>
                  );
                })}
              </section>
            </>
          )}

          {activeSection === 'criteria' && (
            <section style={{ ...panelStyle, flex: '1 0 auto' }}>
              <div style={sectionHeadingStyle}>
                <div>
                  <div style={eyebrowStyle}>Evaluation Criteria</div>
                  <h2 style={sectionTitleStyle}>Understand how your overall evaluation is calculated.</h2>
                </div>
                <div style={{ color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm }}>90–100% Excellent · 80–89% Strong · 70–79% Meets Expectations · Below 70% Needs Attention</div>
              </div>

              <div style={{ display: 'grid', gap: '14px', marginTop: '18px' }}>
                {criteria.map((item, index) => {
                  const expanded = openCriterion === index;
                  return (
                    <div key={item.title} style={{ border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII['2xl'], overflow: 'hidden', background: COLORS.neutral.white }}>
                      <button onClick={() => setOpenCriterion(expanded ? -1 : index)} style={accordionButtonStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: RADII.full, background: item.accent }} />
                          <div>
                            <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>{String(index + 1).padStart(2, '0')} — {item.weightValue}</div>
                            <div style={{ fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>{item.title}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.extrabold }}>{item.scoreValue} pts</div>
                            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>Raw {item.rawScoreValue}</div>
                            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: item.accent }}>{item.status}</div>
                          </div>
                          <ChevronDown size={18} style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                        </div>
                      </button>

                      <div style={{ padding: '0 20px 18px', maxHeight: expanded ? '500px' : '0', overflow: 'hidden', transition: 'max-height 0.25s ease' }}>
                        <div style={progressTrackStyle}>
                          <div style={{ ...progressFillStyle, width: progress(item.rawScore), background: `linear-gradient(90deg, ${item.accent}, ${COLORS.primary.DEFAULT})` }} />
                        </div>
                        <div style={{ display: 'grid', gap: '10px', paddingTop: '8px' }}>
                          {item.kpis.map((kpi) => (
                            <div key={`${item.title}-${kpi.label}`} style={{ ...kpiRowStyle, gridTemplateColumns: 'minmax(0, 1fr) 120px 64px' }}>
                              <div>
                                <div style={{ fontWeight: TYPOGRAPHY.fontWeight.semibold }}>{kpi.label}</div>
                                <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>{kpi.weightValue} {kpi.weight}</div>
                              </div>
                              <div style={progressTrackStyle}>
                                <div style={{ ...progressFillStyle, width: progress(kpi.rawScore), background: `linear-gradient(90deg, ${COLORS.primary.DEFAULT}, ${COLORS.semantic.success.DEFAULT})` }} />
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: TYPOGRAPHY.fontWeight.bold }}>{kpi.score}%</div>
                                <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>Score {kpi.scoreValue}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {activeSection === 'personal' && (
            <>
              <PersonalDevelopmentPlanPanel
                blocks={developmentBlocks}
                isSaving={saveDevelopmentBlocksMutation.isPending}
                isSaved={saved}
                canSave={!!activeEvaluationId}
                showSubmit={!isHrAdmin}
                canSubmit={!isHrAdmin && isDevelopmentPlanComplete && selectedEvaluation?.status !== 'SUBMITTED'}
                submitLabel={selfSubmitMutation.isPending ? 'Đang nộp...' : 'Nộp tự đánh giá'}
                submitDisabledReason={
                  !isDevelopmentPlanComplete
                    ? 'Hãy hoàn tất đầy đủ Personal Development Plan trước khi nộp tự đánh giá.'
                    : selectedEvaluation?.status === 'SUBMITTED'
                    ? 'Bản tự đánh giá đã được nộp.'
                    : undefined
                }
                onSave={() => saveDevelopmentBlocksMutation.mutate()}
                onSubmit={() => selfSubmitMutation.mutate()}
                onChangeBlock={updateDevelopmentBlock}
                fill
              />

              {!isHrAdmin && !isDevelopmentPlanComplete && (
                <div style={{ marginTop: '-8px', fontSize: TYPOGRAPHY.fontSize.xs, color: '#b45309' }}>
                  Hãy điền đầy đủ cả 4 mục PDP thì nút nộp mới được mở.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const LEVELS = [
  {
    rank: 'B',
    label: 'Needs Attention',
    range: '< 3',
    tone: COLORS.semantic.warning.DEFAULT,
    background: 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(239,68,68,0.08))',
    border: 'rgba(239,68,68,0.30)',
    activeShadow: '0 16px 36px rgba(239,68,68,0.16)',
    description: 'Nhân viên mới cần thời gian catch up hoặc nhân viên cũ nhưng vẫn chưa đạt yêu cầu.',
    badge: 'BÁO ĐỘNG',
  },
  {
    rank: 'A',
    label: 'Good Standing',
    range: '3 - 4.4',
    tone: COLORS.semantic.success.DEFAULT,
    background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.06))',
    border: 'rgba(34,197,94,0.28)',
    activeShadow: '0 16px 36px rgba(34,197,94,0.14)',
    description: 'Đại đa số nhân viên hoàn thành tốt công việc và đạt mức kỳ vọng.',
    badge: 'AN TOÀN',
  },
  {
    rank: 'S',
    label: 'Exceeds Expectations',
    range: '> 4.5',
    tone: COLORS.primary.DEFAULT,
    background: 'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(139,92,246,0.10))',
    border: 'rgba(99,102,241,0.30)',
    activeShadow: '0 16px 36px rgba(99,102,241,0.16)',
    description: 'Chỉ những người thực sự xuất sắc và vượt kỳ vọng rõ rệt.',
    badge: 'VƯỢT MONG ĐỢI',
  },
] as const;

const panelStyle: React.CSSProperties = {
  background: COLORS.neutral.white,
  border: `1px solid ${COLORS.neutral[200]}`,
  borderRadius: RADII['2xl'],
  boxShadow: SHADOWS.card,
  padding: '18px',
};

const positiveBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  borderRadius: RADII.full,
  background: COLORS.semantic.success[50],
  color: COLORS.semantic.success[700],
  fontSize: TYPOGRAPHY.fontSize.sm,
  fontWeight: TYPOGRAPHY.fontWeight.semibold,
};

const avatarStyle: React.CSSProperties = {
  width: '56px',
  height: '56px',
  borderRadius: '18px',
  flexShrink: 0,
  display: 'grid',
  placeItems: 'center',
  fontSize: TYPOGRAPHY.fontSize.lg,
  fontWeight: TYPOGRAPHY.fontWeight.extrabold,
  color: COLORS.primary.DEFAULT,
  background: 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(139,92,246,0.16))',
  border: `1px solid ${COLORS.primary[100]}`,
};

const metaLineStyle: React.CSSProperties = {
  fontSize: TYPOGRAPHY.fontSize.xs,
  color: COLORS.neutral.textSecondary,
  marginTop: '2px',
};

const miniFactCardStyle: React.CSSProperties = {
  border: `1px solid ${COLORS.neutral[200]}`,
  borderRadius: RADII.lg,
  padding: '8px 12px',
  background: COLORS.neutral[50],
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: TYPOGRAPHY.fontSize.xs,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: COLORS.primary.DEFAULT,
  fontWeight: TYPOGRAPHY.fontWeight.semibold,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: TYPOGRAPHY.fontSize['2xl'],
  fontWeight: TYPOGRAPHY.fontWeight.bold,
};

const sectionHeadingStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};

const progressTrackStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '10px',
  borderRadius: RADII.full,
  background: COLORS.neutral[100],
  overflow: 'hidden',
};

const progressFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: RADII.full,
};

const accordionButtonStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'center',
  padding: '18px 20px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  textAlign: 'left',
};

const kpiRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 150px',
  gap: '12px',
  alignItems: 'center',
  padding: '12px 14px',
  borderRadius: RADII.xl,
  background: COLORS.neutral[50],
  border: `1px solid ${COLORS.neutral[200]}`,
};
