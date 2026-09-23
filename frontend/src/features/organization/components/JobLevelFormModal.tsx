import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateJobLevel, useUpdateJobLevel } from '../hooks/useJobLevels';
import { useReviewCadences } from '../hooks/useReviewCadences';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgJobLevel } from '../domain/organization-models';
import { AutoCodeButton } from '../../../shared/components/AutoCodeButton';
import { generateCode } from '../../../shared/utils/code-generator';
import { useTheme } from '../../../shared/theme';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';

const createSchema = z.object({
  code: z.string().min(1, 'Level code is required').max(50, 'Code must be 50 characters or less'),
  name: z.string().min(1, 'Level name is required').max(100, 'Name must be 100 characters or less'),
  rank: z.number().int().min(1, 'Rank must be at least 1').max(100, 'Rank is too high'),
  defaultReviewCadenceId: z.string().nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1, 'Level name is required').max(100, 'Name must be 100 characters or less'),
  rank: z.number().int().min(1, 'Rank must be at least 1').max(100, 'Rank is too high'),
  defaultReviewCadenceId: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;

interface JobLevelFormModalProps {
  isOpen: boolean;
  level?: OrgJobLevel;
  onClose: () => void;
}

export function JobLevelFormModal({ isOpen, level, onClose }: JobLevelFormModalProps) {
  const isEditMode = level !== undefined;
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();
  const createMutation = useCreateJobLevel();
  const updateMutation = useUpdateJobLevel();
  const { data: cadences } = useReviewCadences({ active: true });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateFormValues | UpdateFormValues>({
    resolver: zodResolver(isEditMode ? updateSchema : createSchema),
    defaultValues: level
      ? {
          name: level.name,
          rank: level.rank,
          active: level.isActive,
          defaultReviewCadenceId: level.defaultReviewCadenceId ?? null,
        }
      : { code: '', name: '', rank: 1, defaultReviewCadenceId: null },
  });

  useEffect(() => {
    if (isOpen) {
      reset(
        level
          ? {
              name: level.name,
              rank: level.rank,
              active: level.isActive,
              defaultReviewCadenceId: level.defaultReviewCadenceId ?? null,
            }
          : { code: '', name: '', rank: 1, defaultReviewCadenceId: null },
      );
      createMutation.reset();
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, level?.id]);

  if (!isOpen) return null;

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditMode) {
        const updateVals = values as UpdateFormValues;
        await updateMutation.mutateAsync({
          id: level.id,
          data: {
            name: updateVals.name,
            rank: updateVals.rank,
            active: updateVals.active,
            default_review_cadence_id: updateVals.defaultReviewCadenceId || null,
          },
        });
      } else {
        const createVals = values as CreateFormValues;
        await createMutation.mutateAsync({
          code: createVals.code,
          name: createVals.name,
          rank: createVals.rank,
          default_review_cadence_id: createVals.defaultReviewCadenceId || null,
        });
      }
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const apiErr = err as { code: string; message: string };
        if (apiErr.code === 'DUPLICATE_JOB_LEVEL_CODE') {
          setError('code' as keyof CreateFormValues, {
            message: 'This job level code is already in use.',
          });
        }
        if (apiErr.code === 'LEVEL_HAS_ACTIVE_EMPLOYEES' || apiErr.code === 'JOB_LEVEL_HAS_ACTIVE_EMPLOYEES') {
          setError('active' as keyof UpdateFormValues, {
            message: apiErr.message,
          });
        }
      }
    }
  });

  const inputStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: `1px solid ${isDark ? '#475569' : '#d1d5db'}`,
    borderRadius: '6px',
    fontSize: '0.875rem',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#f8fafc' : '#111827',
  };

  const labelStyle: React.CSSProperties = {
    fontWeight: 500,
    fontSize: '0.875rem',
    color: isDark ? '#e2e8f0' : '#374151',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-form-dialog-title"
      className="org-modal-overlay"
    >
      <div
        className="org-modal-card"
        style={{
          background: isDark ? '#1e293b' : '#ffffff',
          boxShadow: isDark ? '0 20px 25px -5px rgba(0,0,0,0.5)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
        }}
      >
        <h2
          id="level-form-dialog-title"
          style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#111827' }}
        >
          {isEditMode ? t('edit_level_title', 'Edit Job Level') : t('create_level_title', 'Create Job Level')}
        </h2>

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isEditMode && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label htmlFor="level-code" style={labelStyle}>
                  {t('level_code', 'Job Level Code')} *
                </label>
                <AutoCodeButton
                  onClick={() => {
                    const code = generateCode('LVL', watch('name'));
                    setValue('code' as keyof CreateFormValues, code);
                  }}
                />
              </div>
              <input
                id="level-code"
                type="text"
                aria-required="true"
                {...register('code' as keyof CreateFormValues)}
                style={inputStyle}
              />
              {(errors as Record<string, { message?: string }>).code && (
                <span role="alert" style={{ color: '#dc2626', fontSize: '0.8125rem', marginTop: '0.25rem', display: 'block' }}>
                  {(errors as Record<string, { message?: string }>).code?.message}
                </span>
              )}
            </div>
          )}

          <div>
            <label htmlFor="level-name" style={{ ...labelStyle, display: 'block', marginBottom: '0.25rem' }}>
              {t('level_name', 'Job Level Name')} *
            </label>
            <input
              id="level-name"
              type="text"
              aria-required="true"
              {...register('name')}
              style={inputStyle}
            />
            {errors.name && (
              <span role="alert" style={{ color: '#dc2626', fontSize: '0.8125rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.name.message}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="level-rank" style={{ ...labelStyle, display: 'block', marginBottom: '0.25rem' }}>
              {t('level_rank', 'Rank (lower is more senior)')} *
            </label>
            <input
              id="level-rank"
              type="number"
              aria-required="true"
              {...register('rank', { valueAsNumber: true })}
              style={inputStyle}
            />
            {errors.rank && (
              <span role="alert" style={{ color: '#dc2626', fontSize: '0.8125rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.rank.message}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="level-cadence" style={{ ...labelStyle, display: 'block', marginBottom: '0.25rem' }}>
              {t('default_review_cadence', 'Default Review Cadence')}
            </label>
            <select
              id="level-cadence"
              {...register('defaultReviewCadenceId')}
              style={inputStyle}
            >
              <option value="">{t('cadence_inherit_default', '— None (inherit system default) —')}</option>
              {cadences?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.intervalMonths} {c.intervalMonths === 1 ? t('month', 'month') : t('months', 'months')})
                  {c.isSystemDefault ? ` [${t('system_default_badge', 'Default')}]` : ''}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280', marginTop: '0.25rem', display: 'block' }}>
              {t('cadence_hint', 'Employees at this job level will use this review cadence unless overridden individually.')}
            </span>
          </div>

          {isEditMode && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  id="level-active"
                  type="checkbox"
                  {...register('active' as keyof UpdateFormValues)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="level-active" style={{ ...labelStyle, cursor: 'pointer' }}>
                  {t('status_active', 'Active')}
                </label>
              </div>
              {(errors as Record<string, { message?: string }>).active && (
                <span role="alert" style={{ color: '#dc2626', fontSize: '0.8125rem', marginTop: '0.25rem', display: 'block' }}>
                  {(errors as Record<string, { message?: string }>).active?.message}
                </span>
              )}
            </div>
          )}

          {mutationError && Object.keys(errors).length === 0 && (
            <span role="alert" style={{ color: '#dc2626', fontSize: '0.8125rem', display: 'block' }}>
              {(mutationError as { message?: string })?.message || 'An error occurred'}
            </span>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={onClose} disabled={isPending}>
              {t('btn_cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('btn_saving', 'Saving…') : isEditMode ? t('btn_save', 'Save Changes') : t('btn_create_level', 'Create Job Level')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
