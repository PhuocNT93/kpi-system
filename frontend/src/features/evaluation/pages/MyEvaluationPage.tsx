import { useState } from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, SHADOWS, TYPOGRAPHY } from '@/shared/theme';
import {
  ArrowUpRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  Download,
  PenLine,
  Share2,
  Target,
  Trophy,
  Zap,
  CircleGauge,
} from 'lucide-react';

export function MyEvaluationPage() {
  const [openCriterion, setOpenCriterion] = useState(0);
  const [saved] = useState(true);

  const criteria = [
    {
      title: 'Performance & Delivery',
      score: 88,
      weight: '40% of overall evaluation',
      status: 'Excellent',
      accent: COLORS.semantic.success.DEFAULT,
      kpis: [
        { label: 'Project Delivery', score: 92, previous: 89 },
        { label: 'Quality of Work', score: 87, previous: 84 },
        { label: 'Deadline Management', score: 85, previous: 82 },
        { label: 'Business Impact', score: 88, previous: 86 },
      ],
    },
    {
      title: 'Collaboration',
      score: 81,
      weight: '25% of overall evaluation',
      status: 'Strong',
      accent: COLORS.primary.DEFAULT,
      kpis: [
        { label: 'Communication', score: 84, previous: 80 },
        { label: 'Teamwork', score: 82, previous: 79 },
        { label: 'Cross-functional Collaboration', score: 78, previous: 75 },
      ],
    },
    {
      title: 'Professional Growth',
      score: 76,
      weight: '20% of overall evaluation',
      status: 'Meets Expectations',
      accent: COLORS.semantic.warning.DEFAULT,
      kpis: [
        { label: 'Skill Development', score: 80, previous: 74 },
        { label: 'Knowledge Sharing', score: 72, previous: 70 },
        { label: 'Learning Initiative', score: 76, previous: 71 },
      ],
    },
    {
      title: 'Leadership & Ownership',
      score: 79,
      weight: '15% of overall evaluation',
      status: 'Solid',
      accent: COLORS.secondary.DEFAULT,
      kpis: [
        { label: 'Ownership', score: 82, previous: 77 },
        { label: 'Decision Making', score: 77, previous: 73 },
        { label: 'Mentoring', score: 78, previous: 75 },
      ],
    },
  ];

  const metrics = [
    { label: 'Overall Score', value: '82%', delta: '+6%', icon: CircleGauge, color: COLORS.primary.DEFAULT },
    { label: 'KPI Achievement', value: '86%', delta: '+4%', icon: Target, color: COLORS.semantic.success.DEFAULT },
    { label: 'Competency Score', value: '79%', delta: '+3%', icon: Brain, color: COLORS.semantic.warning.DEFAULT },
    { label: 'Growth Score', value: '+12%', delta: '+2%', icon: Zap, color: COLORS.secondary.DEFAULT },
  ];

  const progress = (value: number) => `${Math.max(0, Math.min(100, value))}%`;

  const profileFacts = [
    ['Joined', '12 Mar 2021'],
    ['Previous Review', '15 Sep 2025'],
    ['Next Review', '15 Sep 2026'],
    ['Current Level', 'Senior'],
    ['Team', 'Product Design'],
    ['Manager', 'Sarah Tran'],
  ];

  const developmentBlocks = [
    {
      title: 'Objective(s)',
      desc: 'What do you want to achieve during the next review period?',
      accent: COLORS.primary.DEFAULT,
      value: 'Lead a cross-functional discovery initiative and improve product storytelling.',
      count: '86 / 200',
    },
    {
      title: 'Achievements',
      desc: 'What have you accomplished during this review period?',
      accent: COLORS.semantic.success.DEFAULT,
      value: 'Delivered a redesign that increased activation, and mentored two junior designers.',
      count: '112 / 200',
    },
    {
      title: 'Need Improvement',
      desc: 'What skills, behaviors or areas would you like to improve?',
      accent: COLORS.semantic.warning.DEFAULT,
      value: 'Sharpen prioritization for ambiguous roadmap requests and improve delegation.',
      count: '94 / 200',
    },
    {
      title: 'Suggestions / Requests',
      desc: 'What support, resources, training or opportunities would help you grow?',
      accent: COLORS.secondary.DEFAULT,
      value: 'Access to strategy workshops, stakeholder shadowing, and a quarterly coaching session.',
      count: '98 / 200',
    },
  ];

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
        <header style={headerStyle}>
          <div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary, marginBottom: '8px' }}>Performance &gt; My Evaluation</div>
            <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 4vw, 2.75rem)', lineHeight: 1.05, fontWeight: TYPOGRAPHY.fontWeight.extrabold }}>My Evaluation</h1>
            <p style={{ margin: '10px 0 0', color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.base }}>Track your performance, growth and development journey.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={statusBadgeStyle}>In Progress</span>
            <span style={{ color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm }}>Last saved 2 min ago</span>
            <button style={headerButtonStyle}><Download size={16} /> Download Report</button>
            <button style={headerButtonStyle}><Share2 size={16} /> Share</button>
          </div>
        </header>

        <section style={panelStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={avatarStyle}>AN</div>
              <div>
                <div style={{ fontSize: TYPOGRAPHY.fontSize['3xl'], fontWeight: TYPOGRAPHY.fontWeight.extrabold, marginBottom: '6px' }}>Alex Nguyen</div>
                <div style={metaLineStyle}>Employee ID: EMP-10284</div>
                <div style={metaLineStyle}>Senior Product Designer</div>
                <div style={metaLineStyle}>Product Design Team</div>
                <div style={metaLineStyle}>Manager: Sarah Tran</div>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.95fr', gap: '24px', alignItems: 'center', marginTop: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={ringShellStyle}>
                  <div style={ringInnerStyle}>
                    <div style={{ fontSize: 'clamp(4rem, 7vw, 5.5rem)', lineHeight: 1, fontWeight: TYPOGRAPHY.fontWeight.extrabold, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 55%, #8B5CF6 100%)', WebkitBackgroundClip: 'text', color: 'transparent' }}>82%</div>
                    <div style={{ marginTop: '8px', fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Overall Evaluation</div>
                    <div style={{ marginTop: '10px', color: COLORS.semantic.success[700], fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>Previous review: 76%</div>
                    <div style={{ color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm }}>Current review: 82%</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={timelineCardStyle}>
                  <div style={eyebrowStyle}>2026 Performance Review Cycle</div>
                  <div style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
                    {[
                      ['12 Aug 2026', 'Review Started', true],
                      ['20 Aug 2026', 'Self Evaluation', true],
                      ['05 Sep 2026', 'Manager Review', true],
                      ['15 Sep 2026', 'Current Date', true],
                      ['30 Sep 2026', 'Final Review', false],
                    ].map(([date, title, active], index) => (
                      <div key={String(title)} style={{ display: 'grid', gridTemplateColumns: '96px 24px 1fr', gap: '12px', alignItems: 'center' }}>
                        <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>{date as string}</div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <div style={{ width: active ? '14px' : '10px', height: active ? '14px' : '10px', borderRadius: RADII.full, background: active ? COLORS.primary.DEFAULT : COLORS.neutral[300], boxShadow: active && index === 3 ? '0 0 0 6px rgba(124,58,237,0.14)' : 'none' }} />
                        </div>
                        <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: active && index === 3 ? TYPOGRAPHY.fontWeight.bold : TYPOGRAPHY.fontWeight.medium, color: active ? COLORS.neutral.textPrimary : COLORS.neutral.textSecondary }}>{title as string}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: TYPOGRAPHY.fontSize.sm, marginBottom: '8px' }}>
                      <span style={{ fontWeight: TYPOGRAPHY.fontWeight.semibold }}>68% of review period completed</span>
                      <span style={{ color: COLORS.neutral.textSecondary }}>Start Date ━━━●━━━ End Date</span>
                    </div>
                    <div style={progressTrackStyle}>
                      <div style={{ ...progressFillStyle, width: '68%' }} />
                      <div style={{ ...progressMarkerStyle, left: '68%' }} />
                    </div>
                  </div>
                </div>

                <div style={trendCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={eyebrowStyle}>Trend</div>
                      <div style={{ marginTop: '6px', fontWeight: TYPOGRAPHY.fontWeight.semibold }}>Performance is trending upward</div>
                    </div>
                    <Trophy size={20} color={COLORS.semantic.success.DEFAULT} />
                  </div>
                  <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', alignItems: 'end', height: '92px' }}>
                    {[56, 58, 63, 67, 74, 82].map((value) => (
                      <div key={value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '100%', height: `${value}%`, minHeight: '18px', borderRadius: '14px 14px 6px 6px', background: 'linear-gradient(180deg, rgba(99,102,241,0.35) 0%, rgba(124,58,237,0.95) 100%)' }} />
                        <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>{value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            {metrics.map(({ label, value, delta, icon: Icon, color }) => (
              <div key={label} style={{ ...panelStyle, padding: '18px 18px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: RADII.lg, display: 'grid', placeItems: 'center', background: `${color}14`, color }}><Icon size={18} /></div>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>{label}</div>
                  </div>
                  <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.semantic.success[700], fontWeight: TYPOGRAPHY.fontWeight.semibold }}>{delta}</span>
                </div>
                <div style={{ marginTop: '12px', fontSize: '2rem', fontWeight: TYPOGRAPHY.fontWeight.extrabold }}>{value}</div>
                <div style={{ marginTop: '10px', height: '6px', borderRadius: RADII.full, background: COLORS.neutral[100], overflow: 'hidden' }}>
                  <div style={{ width: label === 'Growth Score' ? '78%' : label === 'Overall Score' ? '82%' : label === 'KPI Achievement' ? '86%' : '79%', height: '100%', background: `linear-gradient(90deg, ${COLORS.primary.DEFAULT}, ${COLORS.secondary.DEFAULT})` }} />
                </div>
              </div>
            ))}
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
                        <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>{String(index + 1).padStart(2, '0')} — {item.weight}</div>
                        <div style={{ fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>{item.title}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.extrabold }}>{item.score}%</div>
                        <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: item.accent }}>{item.status}</div>
                      </div>
                      <ChevronDown size={18} style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                    </div>
                  </button>

                  <div style={{ padding: '0 20px 18px', maxHeight: expanded ? '500px' : '0', overflow: 'hidden', transition: 'max-height 0.25s ease' }}>
                    <div style={progressTrackStyle}>
                      <div style={{ ...progressFillStyle, width: progress(item.score), background: `linear-gradient(90deg, ${item.accent}, ${COLORS.primary.DEFAULT})` }} />
                    </div>
                    <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
                      {item.kpis.map((kpi) => (
                        <div key={kpi.label} style={kpiRowStyle}>
                          <div>
                            <div style={{ fontWeight: TYPOGRAPHY.fontWeight.semibold }}>{kpi.label}</div>
                            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>Previous review: {kpi.previous}%</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: TYPOGRAPHY.fontWeight.bold }}>{kpi.score}%</div>
                            <div style={{ width: '120px', marginTop: '6px' }}>
                              <div style={progressTrackStyle}><div style={{ ...progressFillStyle, width: progress(kpi.score), background: `linear-gradient(90deg, ${COLORS.primary.DEFAULT}, ${COLORS.semantic.success.DEFAULT})` }} /></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div style={{ border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII['2xl'], padding: '18px' }}>
              <div style={eyebrowStyle}>Performance comparison</div>
              <div style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
                {criteria.map((item) => (
                  <div key={item.title} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 220px) minmax(0, 1fr) 64px', gap: '12px', alignItems: 'center' }}>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textPrimary }}>{item.title}</div>
                    <div style={progressTrackStyle}><div style={{ ...progressFillStyle, width: progress(item.score), background: `linear-gradient(90deg, ${item.accent}, ${COLORS.primary.DEFAULT})` }} /></div>
                    <div style={{ fontWeight: TYPOGRAPHY.fontWeight.bold, textAlign: 'right' }}>{item.score}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII['2xl'], padding: '18px' }}>
              <div style={eyebrowStyle}>Mini visual profile</div>
              <div style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
                {[
                  ['Delivery', 88],
                  ['Collaboration', 81],
                  ['Growth', 76],
                  ['Leadership', 79],
                ].map(([label, score]) => (
                  <div key={String(label)} style={{ display: 'grid', gridTemplateColumns: '88px 1fr 40px', gap: '10px', alignItems: 'center' }}>
                    <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>{label as string}</div>
                    <div style={{ width: '100%', height: '10px', borderRadius: RADII.full, background: COLORS.neutral[100], overflow: 'hidden' }}>
                      <div style={{ width: `${score}%`, height: '100%', borderRadius: RADII.full, background: 'linear-gradient(90deg, #6366F1, #8B5CF6)' }} />
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: TYPOGRAPHY.fontWeight.semibold }}>{score as number}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section style={panelStyle}>
          <div style={sectionHeadingStyle}>
            <div>
              <div style={eyebrowStyle}>Personal Development Plan</div>
              <h2 style={sectionTitleStyle}>Personal Development Plan</h2>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: COLORS.semantic.success[700], fontSize: TYPOGRAPHY.fontSize.sm }}>
              <CheckCircle2 size={16} /> {saved ? 'Saved' : 'Saving...'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
            {developmentBlocks.map((block) => (
              <div key={block.title} style={{ border: `1px solid ${COLORS.neutral[200]}`, borderTop: `4px solid ${block.accent}`, borderRadius: RADII['2xl'], padding: '18px', background: COLORS.neutral.white }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: RADII.lg, display: 'grid', placeItems: 'center', background: `${block.accent}14`, color: block.accent }}><PenLine size={16} /></div>
                      <div>
                        <div style={{ fontWeight: TYPOGRAPHY.fontWeight.semibold }}>{block.title}</div>
                        <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>{block.desc}</div>
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>{saved ? 'Autosaved' : 'Saving...'}</span>
                </div>
                <div style={{ marginTop: '14px', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.xl, padding: '14px', minHeight: '120px', background: COLORS.neutral[50] }}>
                  <div style={{ color: COLORS.neutral.textPrimary, fontSize: TYPOGRAPHY.fontSize.sm, lineHeight: 1.6 }}>{block.value}</div>
                </div>
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                  <span>Character count</span>
                  <span>{block.count}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={panelStyle}>
          <div style={sectionHeadingStyle}>
            <div>
              <div style={eyebrowStyle}>Growth Focus</div>
              <h2 style={sectionTitleStyle}>Development Progress</h2>
            </div>
            <div style={{ color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm }}>Target date: 15 Dec 2026</div>
          </div>

          <div style={{ marginTop: '18px', display: 'grid', gap: '14px' }}>
            {[
              ['Product Strategy', 82, '85%', '82%'],
              ['Leadership', 68, '80%', '68%'],
              ['Communication', 76, '82%', '76%'],
            ].map(([label, current, target, progressValue]) => (
              <div key={String(label)} style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 200px) minmax(0, 1fr) 100px', gap: '12px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: TYPOGRAPHY.fontWeight.semibold }}>{label as string}</div>
                  <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>Current level → Target level</div>
                </div>
                <div style={progressTrackStyle}><div style={{ ...progressFillStyle, width: `${current}%`, background: 'linear-gradient(90deg, #6366F1, #22C55E)' }} /></div>
                <div style={{ textAlign: 'right', fontWeight: TYPOGRAPHY.fontWeight.bold }}>{progressValue as string} / {target as string}</div>
              </div>
            ))}
          </div>
        </section>
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

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};

const headerButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 14px',
  borderRadius: RADII.full,
  border: `1px solid ${COLORS.neutral[200]}`,
  background: COLORS.neutral.white,
  color: COLORS.neutral.textPrimary,
  fontSize: TYPOGRAPHY.fontSize.sm,
  fontWeight: TYPOGRAPHY.fontWeight.semibold,
};

const statusBadgeStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: RADII.full,
  background: COLORS.semantic.warning[50],
  color: COLORS.semantic.warning[700],
  fontSize: TYPOGRAPHY.fontSize.sm,
  fontWeight: TYPOGRAPHY.fontWeight.semibold,
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

const ringShellStyle: React.CSSProperties = {
  width: '320px',
  height: '320px',
  borderRadius: '50%',
  padding: '20px',
  background: 'conic-gradient(#6366F1 0deg, #7C3AED 220deg, #22C55E 290deg, #E5E7EB 290deg 360deg)',
  boxShadow: '0 18px 50px rgba(99,102,241,0.16)',
};

const ringInnerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  border: `1px solid ${COLORS.neutral[100]}`,
};

const timelineCardStyle: React.CSSProperties = {
  border: `1px solid ${COLORS.neutral[200]}`,
  borderRadius: RADII['2xl'],
  padding: '18px',
  background: 'linear-gradient(180deg, #FFFFFF 0%, #FBFBFF 100%)',
};

const trendCardStyle: React.CSSProperties = {
  border: `1px solid ${COLORS.neutral[200]}`,
  borderRadius: RADII['2xl'],
  padding: '18px',
  background: COLORS.neutral.white,
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

const progressMarkerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  width: '18px',
  height: '18px',
  transform: 'translate(-50%, -50%)',
  borderRadius: RADII.full,
  background: COLORS.primary.DEFAULT,
  boxShadow: '0 0 0 5px rgba(99,102,241,0.14)',
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
