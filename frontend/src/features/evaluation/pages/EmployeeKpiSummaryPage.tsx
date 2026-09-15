import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Calendar,
  Lock,
  AlertCircle,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
} from 'lucide-react';
import { useEmployeeKpiSummary } from '../hooks/useEmployeeKpiSummary';
import { useEvaluationCyclesQuery } from '../../evaluation-cycles/hooks/use-evaluation-cycles';

export function EmployeeKpiSummaryPage() {
  const { id: employeeId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const cycleParam = searchParams.get('evaluation_cycle_id') || searchParams.get('evaluationCycleId') || '';
  const [selectedCycleId, setSelectedCycleId] = useState(cycleParam);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Fetch cycles list to populate cycle selector
  const { data: cyclesData } = useEvaluationCyclesQuery();
  const cycles = Array.isArray(cyclesData) ? cyclesData : [];

  // Effective cycle ID: param or first cycle from list
  const activeCycleId = selectedCycleId || (cycles.length > 0 ? (cycles[0].id || '') : '');

  // Query KPI summary
  const { data: summary, isLoading, isError, error, refetch } = useEmployeeKpiSummary(
    employeeId,
    activeCycleId
  );

  const handleCycleChange = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    setSearchParams({ evaluation_cycle_id: cycleId }, { replace: true });
  };

  const isOfficialWeighted = summary?.officialScoreField === 'overall_weighted_score';

  return (
    <div
      style={{
        padding: '24px',
        maxWidth: '1200px',
        margin: '0 auto',
        color: 'var(--text-primary)',
        minHeight: '100vh',
      }}
    >
      {/* Top navigation */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => navigate('/admin/employees/search')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            padding: '6px 0',
          }}
        >
          <ArrowLeft size={16} /> Back to Employee Search
        </button>

        {/* Cycle selector */}
        {cycles.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cycle:</span>
            <select
              value={activeCycleId}
              onChange={(e) => handleCycleChange(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.code}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            padding: '48px',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'inline-block', marginBottom: '16px' }}>
            <Award size={36} className="animate-spin" style={{ color: '#4F46E5' }} />
          </div>
          <h3 style={{ margin: '0 0 8px' }}>Loading Employee KPI Summary...</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Fetching persisted evaluation snapshot and score breakdown.
          </p>
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <AlertCircle size={40} style={{ color: '#EF4444', margin: '0 auto 16px' }} />
          <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>Unable to Load KPI Summary</h2>
          <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
            {(error as Error)?.message ||
              'Access denied or evaluation summary not found for this employee and cycle.'}
          </p>
          <button
            onClick={() => refetch()}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            Retry Request
          </button>
        </div>
      )}

      {/* Summary Content */}
      {!isLoading && !isError && summary && (
        <>
          {/* Employee & Evaluation Header Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '20px' }}>
              {/* Employee Info */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    backgroundColor: '#4F46E51A',
                    color: '#4F46E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.25rem',
                  }}
                >
                  {summary.employee.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
                    {summary.employee.fullName}
                  </h1>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>Code: <strong>{summary.employee.employeeCode}</strong></span>
                    <span>•</span>
                    <span>{summary.employee.email}</span>
                    <span>•</span>
                    <span>Dept: {summary.employee.department?.name || '—'}</span>
                    <span>•</span>
                    <span>Team: {summary.employee.team?.name || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Evaluation Status & Locked Badge */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {summary.evaluation.isLocked && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(107, 114, 128, 0.1)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <Lock size={12} /> Locked Snapshot
                    </span>
                  )}
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      color: '#10B981',
                      border: '1px solid #10B98133',
                    }}
                  >
                    {summary.evaluation.status}
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Cycle: {summary.evaluation.cycleName}
                </span>
              </div>
            </div>
          </div>

          {/* Official Score Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            {/* Main Official Score Banner */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '12px',
                border: '2px solid #4F46E5',
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.08)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  padding: '4px 14px',
                  borderBottomLeftRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                <Sparkles size={12} /> Official Score of Record
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>
                {isOfficialWeighted ? 'OVERALL WEIGHTED SCORE' : 'OVERALL SCORE'}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '3rem', fontWeight: 800, color: '#4F46E5', lineHeight: 1 }}>
                  {summary.officialScoreValue != null ? summary.officialScoreValue.toFixed(2) : 'N/A'}
                </span>
                <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  / 5.00
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <Info size={14} style={{ color: '#4F46E5' }} />
                <span>
                  Official field:{' '}
                  <code style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {summary.officialScoreField}
                  </code>{' '}
                  (persisted frozen snapshot)
                </span>
              </div>
            </div>

            {/* Score Comparison & Audit Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 600 }}>
                  Score Breakdown & Audit Log
                </h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Raw Average Score:
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {summary.overallScore != null ? summary.overallScore.toFixed(2) : '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Weighted Final Score:
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#4F46E5' }}>
                    {summary.overallWeightedScore != null ? summary.overallWeightedScore.toFixed(2) : '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    KPI Evaluation Items:
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {summary.kpiItems.length}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px' }}>
                Approved at:{' '}
                {summary.evaluation.approvedAt
                  ? new Date(summary.evaluation.approvedAt).toLocaleDateString()
                  : 'Pending approval'}
              </div>
            </div>
          </div>

          {/* KPI Items Section */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                  Evaluated KPI Items & Criteria
                </h2>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Detailed historical snapshot of criterion metrics, reviewer comments, and evidence.
                </p>
              </div>
            </div>

            {summary.kpiItems.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No evaluated KPI items available in this cycle.
              </div>
            ) : (
              <div>
                {summary.kpiItems.map((item, index) => {
                  const isExpanded = expandedItemId === item.evaluationItemId;
                  return (
                    <div
                      key={item.evaluationItemId || index}
                      style={{
                        borderBottom: index < summary.kpiItems.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      }}
                    >
                      {/* Main Item Row */}
                      <div
                        onClick={() => setExpandedItemId(isExpanded ? null : item.evaluationItemId)}
                        style={{
                          padding: '16px 24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? 'var(--bg-surface-subtle)' : 'transparent',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(79, 70, 229, 0.1)',
                              color: '#4F46E5',
                            }}
                          >
                            {item.criterionCode}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                              {item.criterionName}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                              <span>Category: {item.category}</span>
                              <span>•</span>
                              <span>Weight: {item.weight}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Scores & Level */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Level
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                              {item.resolvedLevel != null ? `Level ${item.resolvedLevel}` : '—'}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Raw Score
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                              {item.rawScore != null ? item.rawScore.toFixed(2) : '—'}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', minWidth: '70px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Weighted
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#4F46E5' }}>
                              {item.weightedScore != null ? item.weightedScore.toFixed(2) : '—'}
                            </div>
                          </div>

                          <div style={{ color: 'var(--text-secondary)', paddingLeft: '8px' }}>
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>
                      </div>

                      {/* Detail Accordion Panel */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: '20px 24px',
                            backgroundColor: 'var(--bg-canvas)',
                            borderTop: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                            {/* Measurement Snapshot */}
                            <div
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                borderRadius: '8px',
                                border: '1px solid var(--border-subtle)',
                                padding: '16px',
                              }}
                            >
                              <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                Measurement Snapshot
                              </h4>
                              {item.measurement ? (
                                <div style={{ fontSize: '0.9rem' }}>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {item.measurement.key || 'Metric'}
                                  </div>
                                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#4F46E5', margin: '4px 0' }}>
                                    {item.measurement.value != null ? item.measurement.value : '—'}{' '}
                                    {item.measurement.unit || ''}
                                  </div>
                                  {item.measurement.source && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      Source: {item.measurement.source}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                  No automated measurement attached.
                                </p>
                              )}
                            </div>

                            {/* Reviewer & Rationale */}
                            <div
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                borderRadius: '8px',
                                border: '1px solid var(--border-subtle)',
                                padding: '16px',
                              }}
                            >
                              <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                Reviewer & Rationale
                              </h4>
                              {item.reviewer && (
                                <div style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>Reviewer: </span>
                                  <strong>{item.reviewer.name || item.reviewer.id}</strong>
                                  {item.reviewer.reviewDate && (
                                    <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
                                      ({new Date(item.reviewer.reviewDate).toLocaleDateString()})
                                    </span>
                                  )}
                                </div>
                              )}
                              {item.comment && (
                                <div style={{ marginBottom: '6px', fontSize: '0.85rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>Comment: </span>
                                  <span>{item.comment}</span>
                                </div>
                              )}
                              {item.rationale && (
                                <div style={{ fontSize: '0.85rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>Rationale: </span>
                                  <span>{item.rationale}</span>
                                </div>
                              )}
                              {!item.reviewer && !item.comment && !item.rationale && (
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                  No reviewer comments recorded.
                                </p>
                              )}
                            </div>

                            {/* Evidence List */}
                            <div
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                borderRadius: '8px',
                                border: '1px solid var(--border-subtle)',
                                padding: '16px',
                                gridColumn: '1 / -1',
                              }}
                            >
                              <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                Evidence Artifacts ({item.evidence.length})
                              </h4>
                              {item.evidence.length === 0 ? (
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                  No evidence documents or links submitted.
                                </p>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                                  {item.evidence.map((ev) => (
                                    <div
                                      key={ev.evidenceId}
                                      style={{
                                        padding: '10px 14px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-subtle)',
                                        backgroundColor: 'var(--bg-canvas)',
                                      }}
                                    >
                                      <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FileText size={14} style={{ color: '#4F46E5' }} />
                                        <span>{ev.title}</span>
                                      </div>
                                      {ev.evidenceUrl && (
                                        <div style={{ marginTop: '4px' }}>
                                          <a
                                            href={ev.evidenceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                              color: '#4F46E5',
                                              fontSize: '0.8rem',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              textDecoration: 'none',
                                            }}
                                          >
                                            View Artifact <ExternalLink size={12} />
                                          </a>
                                        </div>
                                      )}
                                      {ev.rationale && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                          {ev.rationale}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
