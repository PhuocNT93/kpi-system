import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { evaluationApi } from '../api/evaluation-api';
import { employeeSearchApi } from '@/features/organization/api/employee-search.api';
import { COLORS } from '@/lib/theme';
import { RADII, SHADOWS, TYPOGRAPHY } from '@/shared/theme';
import {
  ArrowUpRight,
  ChevronDown,
  Search,
} from 'lucide-react';
import { useAuth } from '@/shared/auth/auth-context';
import { type TeamEvaluation, buildEvaluationScoringSummary } from '../domain/evaluation-models';
import type { EmployeeSearchResult } from '@/features/organization/api/employee-search.api';
import { EvaluationOverviewPanel } from '../components/EvaluationOverviewPanel';
import { EvaluationScoreSummaryPanel } from '../components/EvaluationScoreSummaryPanel';
import { PersonalDevelopmentPlanPanel } from '../components/PersonalDevelopmentPlanPanel';

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
      title: 'Suggestions / Requests',
      desc: 'What support, resources, training or opportunities would help you grow?',
      accent: COLORS.secondary.DEFAULT,
      value: 'Access to strategy workshops, stakeholder shadowing, and a quarterly coaching session.',
    },
  ]);

  const { data: myEvaluations } = useQuery({
    queryKey: ['my-evaluations'],
    queryFn: evaluationApi.getMyEvaluations,
  });

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
    : myEvaluations?.[0]?.evaluation.evaluation_id;

  const selectedTeamEvaluation = useMemo(() => {
    if (!isHrAdmin || !activeEvaluationId) {
      return null;
    }

    return teamEvaluations.find((item) => item.evaluation.evaluation_id === activeEvaluationId) ?? null;
  }, [activeEvaluationId, isHrAdmin, teamEvaluations]);

  const selectedEmployeeId = selectedTeamEvaluation?.employee?.employee_id ?? myEvaluations?.[0]?.employee?.employee_id;
  const selectedManagerId = selectedTeamEvaluation?.evaluation.manager_id_snapshot ?? null;

  const { data: employeeProfiles } = useQuery<EmployeeSearchResult>({
    queryKey: ['employee-profiles', selectedEmployeeId],
    queryFn: () => employeeSearchApi.search({ employeeId: selectedEmployeeId, size: 1 }),
    enabled: Boolean(selectedEmployeeId),
  });

  const selectedEmployeeProfile = employeeProfiles?.employees?.[0];

  const { data: managerProfiles } = useQuery<EmployeeSearchResult>({
    queryKey: ['employee-manager-profile', selectedManagerId],
    queryFn: () => employeeSearchApi.search({ employeeId: selectedManagerId ?? undefined, size: 1 }),
    enabled: Boolean(selectedManagerId),
  });

  const selectedManagerProfile = managerProfiles?.employees?.[0];

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
          title: 'Suggestions / Requests',
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

  const activeCycle = selectedTeamEvaluation?.cycle ?? myEvaluations?.[0]?.cycle;

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

  const selectedEmployee = selectedTeamEvaluation?.employee ?? myEvaluations?.[0]?.employee;
  const enrichedEmployee = {
    ...selectedEmployee,
    join_date: selectedEmployeeProfile?.joinDate ?? selectedEmployee?.join_date,
    next_review_due_date: selectedEmployee?.next_review_due_date,
    employee_code: selectedEmployeeProfile?.employeeCode ?? selectedEmployee?.employee_code,
    full_name: selectedEmployeeProfile?.fullName ?? selectedEmployee?.full_name,
    email: selectedEmployeeProfile?.email ?? selectedEmployee?.email,
    created_at: selectedEmployee?.created_at,
  };
  const selectedEvaluation = isHrAdmin ? selectedTeamEvaluation?.evaluation : myEvaluations?.[0]?.evaluation;
  const profileFacts = [
    ['Joined', formatDisplayDate(enrichedEmployee.join_date ?? enrichedEmployee.created_at)],
    ['Previous Review', formatDisplayDate(selectedEvaluation?.approved_at ?? selectedEvaluation?.submitted_at)],
    ['Next Review', formatDisplayDate(enrichedEmployee.next_review_due_date ?? activeCycle?.end_date)],
    ['Current Level', selectedEmployeeProfile?.role.name || enrichedEmployee.role_name || 'N/A'],
    ['Team', selectedEmployeeProfile?.team.name || enrichedEmployee.team_name || 'N/A'],
    ['Manager', selectedManagerProfile?.fullName || selectedEmployeeProfile?.manager?.name || 'N/A'],
  ];

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

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at top left, rgba(124,58,237,0.08), transparent 30%), #F7F8FC',
        padding: '24px',
        color: COLORS.neutral.textPrimary,
        fontFamily: TYPOGRAPHY.fontFamily.body,
      }}
    >
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {isHrAdmin && (
          <section style={panelStyle}>
            <div style={sectionHeadingStyle}>
              <div>
                <div style={eyebrowStyle}>Admin / HR Workspace</div>
                <h2 style={sectionTitleStyle}>Select an employee with an evaluation</h2>
              </div>
              <div style={{ color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm }}>
                {filteredTeamEvaluations.length} employees matched
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'grid', gap: '14px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} color={COLORS.neutral[400]} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Search by employee name, code, email, or cycle..."
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: RADII.xl,
                    border: `1px solid ${COLORS.neutral[200]}`,
                    background: COLORS.neutral.white,
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gap: '10px', maxHeight: '280px', overflow: 'auto', paddingRight: '4px' }}>
                {filteredTeamEvaluations.length === 0 ? (
                  <div style={{ padding: '16px', borderRadius: RADII.xl, border: `1px dashed ${COLORS.neutral[200]}`, color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm }}>
                    No employees match your search.
                  </div>
                ) : (
                  filteredTeamEvaluations.map((item) => {
                    const isSelected = item.evaluation.evaluation_id === activeEvaluationId;
                    return (
                      <button
                        key={item.evaluation.evaluation_id}
                        type="button"
                        onClick={() => setSelectedEvaluationId(item.evaluation.evaluation_id)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          width: '100%',
                          padding: '14px 16px',
                          borderRadius: RADII.xl,
                          border: `1px solid ${isSelected ? COLORS.primary.DEFAULT : COLORS.neutral[200]}`,
                          background: isSelected ? 'rgba(99,102,241,0.06)' : COLORS.neutral.white,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: TYPOGRAPHY.fontWeight.semibold, color: COLORS.neutral.textPrimary }}>
                            {item.employee?.full_name || 'Team Member'}
                          </div>
                          <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginTop: '4px' }}>
                            {item.employee?.employee_code} • {item.employee?.role_name || 'Member'} • {item.cycle?.name || 'Current cycle'}
                          </div>
                        </div>
                        <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: isSelected ? COLORS.primary.DEFAULT : COLORS.neutral.textSecondary, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
                          {item.evaluation.status}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        )}

        <section style={panelStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={avatarStyle}>{(selectedTeamEvaluation?.employee?.full_name || 'Alex Nguyen').split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
              <div>
                <div style={{ fontSize: TYPOGRAPHY.fontSize['3xl'], fontWeight: TYPOGRAPHY.fontWeight.extrabold, marginBottom: '6px' }}>
                  {selectedTeamEvaluation?.employee?.full_name || 'Alex Nguyen'}
                </div>
                <div style={metaLineStyle}>Employee ID: {selectedTeamEvaluation?.employee?.employee_code || ''}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {profileFacts.map(([label, value]) => (
                <div key={label} style={miniFactCardStyle}>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>{label}</div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, marginTop: '6px' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={{ ...panelStyle, padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <div style={eyebrowStyle}>Overall Evaluation</div>
                <h2 style={{ margin: '8px 0', fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold }}>How am I performing overall?</h2>
                <div style={{ color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm }}>You are currently performing above the expected level for your role.</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={positiveBadgeStyle}><ArrowUpRight size={15} /> +6% vs previous review</div>
                <div style={{ marginTop: '10px', fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>Status: <strong style={{ color: COLORS.neutral.textPrimary }}>Strong Performance</strong></div>
              </div>
            </div>

            <EvaluationOverviewPanel score={scoreFormula.totalRawScoreValue} cycleProgress={cycleProgress} />
          </div>

          <EvaluationScoreSummaryPanel score={scoreFormula.totalScore} grouped={scoreFormula.grouped} />
        </section>
      
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px', alignItems: 'stretch' }}>
              {[
                {
                  rank: 'B',
                  label: 'Need Improvement',
                  range: '< 3',
                  tone: COLORS.semantic.warning.DEFAULT,
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(239,68,68,0.10))',
                  border: 'rgba(239,68,68,0.35)',
                  description: 'Nhân viên mới cần thời gian catch up hoặc nhân viên cũ nhưng vẫn chưa đạt yêu cầu.',
                  badge: 'BÁO ĐỘNG',
                },
                {
                  rank: 'A',
                  label: 'Meet Expectation',
                  range: '3 - 4.4',
                  tone: COLORS.semantic.success.DEFAULT,
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(16,185,129,0.08))',
                  border: 'rgba(34,197,94,0.30)',
                  description: 'Đại đa số nhân viên hoàn thành tốt công việc và đạt mức kỳ vọng.',
                  badge: 'AN TOÀN',
                },
                {
                  rank: 'S',
                  label: 'Exceed Expectation',
                  range: '> 4.5',
                  tone: COLORS.primary.DEFAULT,
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.12))',
                  border: 'rgba(99,102,241,0.32)',
                  description: 'Chỉ những người thực sự xuất sắc và vượt kỳ vọng rõ rệt.',
                  badge: 'TỐT',
                },
              ].map((level) => {
                const isActive = currentRank === level.rank;
                return (
                <div
                  key={level.rank}
                  style={{
                    borderRadius: RADII['2xl'],
                    padding: isActive ? '22px' : '15px',
                    border: `1px solid ${level.border}`,
                    background: level.background,
                    boxShadow: isActive ? (level.rank === 'B' ? '0 22px 52px rgba(239,68,68,0.18)' : level.rank === 'A' ? '0 22px 52px rgba(34,197,94,0.16)' : '0 22px 52px rgba(99,102,241,0.18)') : '0 10px 24px rgba(15,23,42,0.06)',
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: isActive ? 1 : 0.55,
                    transform: isActive ? 'translateY(-6px) scale(1.04)' : 'scale(0.94)',
                    transition: 'transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease',
                    minHeight: '100%',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                      <div style={{ width: isActive ? '60px' : '44px', height: isActive ? '60px' : '44px', borderRadius: '18px', display: 'grid', placeItems: 'center', background: `${level.tone}18`, color: level.tone, border: `1px solid ${level.border}`, opacity: isActive ? 1 : 0.72, flexShrink: 0 }}>
                        <span style={{ fontSize: isActive ? TYPOGRAPHY.fontSize['3xl'] : TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.extrabold, lineHeight: 1 }}>{level.rank}</span>
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: isActive ? '4px 10px' : '3px 8px', borderRadius: RADII.full, background: `${level.tone}14`, color: level.tone, fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.semibold, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: isActive ? 1 : 0.68, whiteSpace: 'nowrap' }}>
                          {level.badge}
                        </div>
                        <div style={{ marginTop: '8px', fontSize: isActive ? TYPOGRAPHY.fontSize['2xl'] : TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary, opacity: isActive ? 1 : 0.72, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{level.label}</div>
                        <div style={{ marginTop: '4px', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, opacity: isActive ? 1 : 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Range rank: {level.range}</div>
                      </div>
                    </div>

                    <div style={{ minWidth: '72px', textAlign: 'right', opacity: isActive ? 1 : 0.4, flexShrink: 0 }}>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>Level</div>
                      <div style={{ marginTop: '6px', fontSize: isActive ? TYPOGRAPHY.fontSize['3xl'] : TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.extrabold, color: level.tone }}>{level.rank}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '14px', display: 'grid', gap: '10px', opacity: isActive ? 1 : 0.45 }}>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textPrimary, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{level.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>Mức ưu tiên</div>
                      <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: level.tone, whiteSpace: 'nowrap' }}>{level.rank === 'B' ? 'Cần xử lý ngay' : level.rank === 'A' ? 'Ổn định' : 'Nổi bật'}</div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
        </section>

        <section style={panelStyle}>
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

        <PersonalDevelopmentPlanPanel
          blocks={developmentBlocks}
          isSaving={saveDevelopmentBlocksMutation.isPending}
          isSaved={saved}
          canSave={!!activeEvaluationId}
          onSave={() => saveDevelopmentBlocksMutation.mutate()}
          onChangeBlock={updateDevelopmentBlock}
        />

      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: COLORS.neutral.white,
  border: `1px solid ${COLORS.neutral[200]}`,
  borderRadius: RADII['2xl'],
  boxShadow: SHADOWS.card,
  padding: '22px',
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
  width: '96px',
  height: '96px',
  borderRadius: '28px',
  display: 'grid',
  placeItems: 'center',
  fontSize: TYPOGRAPHY.fontSize['2xl'],
  fontWeight: TYPOGRAPHY.fontWeight.extrabold,
  color: COLORS.primary.DEFAULT,
  background: 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(139,92,246,0.16))',
  border: `1px solid ${COLORS.primary[100]}`,
};

const metaLineStyle: React.CSSProperties = {
  fontSize: TYPOGRAPHY.fontSize.sm,
  color: COLORS.neutral.textSecondary,
  marginTop: '4px',
};

const miniFactCardStyle: React.CSSProperties = {
  border: `1px solid ${COLORS.neutral[200]}`,
  borderRadius: RADII.xl,
  padding: '14px',
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
