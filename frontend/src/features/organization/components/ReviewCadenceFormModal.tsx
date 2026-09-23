import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateReviewCadence, useUpdateReviewCadence } from '../hooks/useReviewCadences';
import { Button } from '../../../shared/ui/Button/Button';
import type { OrgReviewCadence } from '../domain/organization-models';
import { AutoCodeButton } from '../../../shared/components/AutoCodeButton';
import { generateCode } from '../../../shared/utils/code-generator';
import { useTheme } from '../../../shared/theme';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';

const createSchema = z.object({
  code: z.string().min(1, 'Cadence code is required').max(30, 'Code must be 30 characters or less'),
  name: z.string().min(1, 'Cadence name is required').max(100, 'Name must be 100 characters or less'),
  intervalMonths: z.number().int().min(1, 'Interval must be at least 1 month').max(120, 'Interval must not exceed 120 months'),
  isSystemDefault: z.boolean(),
});

const updateSchema = z.object({
  name: z.string().min(1, 'Cadence name is required').max(100, 'Name must be 100 characters or less'),
  intervalMonths: z.number().int().min(1, 'Interval must be at least 1 month').max(120, 'Interval must not exceed 120 months'),
  isSystemDefault: z.boolean(),
  active: z.boolean().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;

interface ReviewCadenceFormModalProps {
  isOpen: boolean;
  cadence?: OrgReviewCadence;
  onClose: () => void;
}

export function ReviewCadenceFormModal({ isOpen, cadence, onClose }: ReviewCadenceFormModalProps) {
  const isEditMode = cadence !== undefined;
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();

  const createMutation = useCreateReviewCadence();
  const updateMutation = useUpdateReviewCadence();

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
    defaultValues: cadence
      ? {
          name: cadence.name,
          intervalMonths: cadence.intervalMonths,
          isSystemDefault: cadence.isSystemDefault,
          active: cadence.isActive,
        }
      : { code: '', name: '', intervalMonths: 6, isSystemDefault: false },
  });

  useEffect(() => {
    if (isOpen) {
      reset(
        cadence
          ? {
              name: cadence.name,
              intervalMonths: cadence.intervalMonths,
              isSystemDefault: cadence.isSystemDefault,
              active: cadence.isActive,
            }
          : { code: '', name: '', intervalMonths: 6, isSystemDefault: false },
      );
      createMutation.reset();
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, cadence?.id]);

  if (!isOpen) return null;

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditMode) {
        const updateVals = values as unknown as UpdateFormValues;
        await updateMutation.mutateAsync({
          id: cadence.id,
          data: {
            name: updateVals.name,
            interval_months: updateVals.intervalMonths,
            is_system_default: updateVals.isSystemDefault,
            active: updateVals.active,
          },
        });
      } else {
        const createVals = values as unknown as CreateFormValues;
        await createMutation.mutateAsync({
          code: createVals.code,
          name: createVals.name,
          interval_months: createVals.intervalMonths,
          is_system_default: createVals.isSystemDefault,
        });
      }
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const apiErr = err as { code: string; message: string };
        if (apiErr.code === 'DUPLICATE_CODE') {
          setError('code' as keyof CreateFormValues, {
            message: 'This cadence code is already in use.',
          });
        }
        if (apiErr.code === 'SYSTEM_DEFAULT_EXISTS') {
          setError('isSystemDefault' as keyof CreateFormValues, {
            message: apiErr.message || 'A system-default cadence already exists. Unset it first.',
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
      aria-labelledby="cadence-form-dialog-title"
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
          id="cadence-form-dialog-title"
          style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#111827' }}
        >
          {isEditMode ? t('edit_cadence_title', 'Edit Review Cadence') : t('create_cadence_title', 'Create Review Cadence')}
        </h2>

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isEditMode && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label htmlFor="cadence-code" style={labelStyle}>
                  {t('cadence_code', 'Cadence Code')} *
                </label>
                <AutoCodeButton
                  onClick={() => {
                    const code = generateCode('RC', watch('name'));
                    setValue('code' as keyof CreateFormValues, code);
                  }}
                />
              </div>
              <input
                id="cadence-code"
                type="text"
                placeholder="e.g. SEMI_ANNUAL"
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
            <label htmlFor="cadence-name" style={{ ...labelStyle, display: 'block', marginBottom: '0.25rem' }}>
              {t('cadence_name', 'Cadence Name')} *
            </label>
            <input
              id="cadence-name"
              type="text"
              placeholder="e.g. Semi-Annual (6 months)"
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
            <label htmlFor="cadence-interval" style={{ ...labelStyle, display: 'block', marginBottom: '0.25rem' }}>
              {t('cadence_interval', 'Interval in Months')} *
            </label>
            <input
              id="cadence-interval"
              type="number"
              min={1}
              max={120}
              aria-required="true"
              {...register('intervalMonths', { valueAsNumber: true })}
              style={inputStyle}
            />
            {errors.intervalMonths && (
              <span role="alert" style={{ color: '#dc2626', fontSize: '0.8125rem', marginTop: '0.25rem', display: 'block' }}>
                {errors.intervalMonths.message}
              </span>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                id="cadence-system-default"
                type="checkbox"
                {...register('isSystemDefault')}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="cadence-system-default" style={{ ...labelStyle, cursor: 'pointer' }}>
                {t('system_default', 'System Default Cadence')}
              </label>
            </div>
            <p style={{ margin: '0.25rem 0 0 1.5rem', fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#6b7280' }}>
              {t('system_default_hint', 'Applied as the organization-wide fallback when no job level default or employee override is specified.')}
            </p>
            {(errors as Record<string, { message?: string }>).isSystemDefault && (
              <span role="alert" style={{ color: '#dc2626', fontSize: '0.8125rem', marginTop: '0.25rem', display: 'block' }}>
                {(errors as Record<string, { message?: string }>).isSystemDefault?.message}
              </span>
            )}
          </div>

          {isEditMode && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  id="cadence-active"
                  type="checkbox"
                  {...register('active' as keyof UpdateFormValues)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="cadence-active" style={{ ...labelStyle, cursor: 'pointer' }}>
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
              {isPending ? t('btn_saving', 'Saving…') : isEditMode ? t('btn_save', 'Save Changes') : t('btn_create_cadence', 'Create Cadence')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
