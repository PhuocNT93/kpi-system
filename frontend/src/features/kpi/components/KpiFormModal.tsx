import { useState, useEffect } from 'react';
import type { Kpi, KpiCreateDTO, KpiUpdateDTO } from '../api/kpi-api';
import { useCreateKpiMutation, useUpdateKpiMutation } from '../api/use-kpi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingKpi?: Kpi | null;
}

export function KpiFormModal({ isOpen, onClose, editingKpi }: Props) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const createMutation = useCreateKpiMutation();
  const updateMutation = useUpdateKpiMutation();

  const isEditing = Boolean(editingKpi);
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (editingKpi) {
      setCode(editingKpi.code);
      setName(editingKpi.name);
      setDescription(editingKpi.description || '');
    } else {
      setCode('');
      setName('');
      setDescription('');
    }
    setError('');
  }, [editingKpi, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isEditing && editingKpi) {
        const dto: KpiUpdateDTO = { name, description: description || null };
        await updateMutation.mutateAsync({ id: editingKpi.kpiId, dto });
      } else {
        const dto: KpiCreateDTO = { code, name, description: description || null };
        await createMutation.mutateAsync(dto);
      }
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save KPI');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: 12, padding: '2rem',
        width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
          {isEditing ? 'Edit KPI' : 'Create New KPI'}
        </h2>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: '1rem', color: '#dc2626', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isEditing && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.875rem', fontWeight: 500 }}>
                Code <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. DELIVERY_SPEED"
                required
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
              />
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                Uppercase letters, numbers, underscores, or hyphens only.
              </p>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.875rem', fontWeight: 500 }}>
              Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Delivery Speed"
              required
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.875rem', fontWeight: 500 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #d1d5db', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{ padding: '8px 20px', borderRadius: 6, border: 'none', backgroundColor: '#4f46e5', color: '#fff', cursor: isPending ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: isPending ? 0.7 : 1 }}
            >
              {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create KPI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
