import { useState, useEffect } from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';

export interface KpiFormData {
  kpiId?: string; // empty if creating
  code: string;
  name: string;
  description: string;
}

interface KpiFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: KpiFormData) => Promise<void>;
  initialData?: KpiFormData | null;
  isSubmitting: boolean;
}

export function KpiFormModal({ isOpen, onClose, onSubmit, initialData, isSubmitting }: KpiFormModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setCode(initialData.code);
        setName(initialData.name);
        setDescription(initialData.description || '');
      } else {
        setCode('');
        setName('');
        setDescription('');
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!code.trim()) newErrors.code = 'Code is required';
    if (!name.trim()) newErrors.name = 'Name is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit({
      kpiId: initialData?.kpiId,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim(),
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: RADII.md,
    border: `1px solid ${COLORS.neutral[300]}`, fontSize: '0.875rem',
    fontFamily: TYPOGRAPHY.fontFamily.body, boxSizing: 'border-box',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.8125rem', fontWeight: 500,
    color: COLORS.neutral.textSecondary, marginBottom: '4px',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: COLORS.neutral.white, borderRadius: RADII['2xl'],
        padding: '32px', width: '480px', maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <h2 style={{ margin: '0 0 24px', fontSize: '1.125rem', fontWeight: 700, color: COLORS.neutral.textPrimary }}>
          {initialData ? 'Edit KPI' : 'Create New KPI'}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>KPI Code <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              disabled={!!initialData} // Usually cannot change code after creation
              placeholder="e.g. QUALITY_01"
              style={{ ...inputStyle, borderColor: errors.code ? '#ef4444' : COLORS.neutral[300], background: initialData ? '#f3f4f6' : '#fff' }}
            />
            {errors.code && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#ef4444' }}>{errors.code}</p>}
          </div>
          <div>
            <label style={labelStyle}>KPI Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Code Quality"
              style={{ ...inputStyle, borderColor: errors.name ? '#ef4444' : COLORS.neutral[300] }}
            />
            {errors.name && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#ef4444' }}>{errors.name}</p>}
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional description..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 20px', borderRadius: RADII.md, border: `1px solid ${COLORS.neutral[300]}`,
                background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                color: COLORS.neutral.textPrimary,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 20px', borderRadius: RADII.md, border: 'none',
                backgroundColor: COLORS.primary.DEFAULT, color: COLORS.neutral.white,
                cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600,
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save KPI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
