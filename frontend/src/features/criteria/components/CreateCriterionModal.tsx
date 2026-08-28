import React, { useState } from 'react';
import { Button } from '../../../shared/ui/Button/Button';
import type { CreateCriterionDto } from '../domain/criteria-models';

interface CreateCriterionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCriterionDto) => Promise<void>;
  isSubmitting?: boolean;
}

export function CreateCriterionModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: CreateCriterionModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'PERFORMANCE' | 'BEHAVIOR' | 'CONTRIBUTION'>('PERFORMANCE');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim() || !name.trim()) {
      setError('Code and Name are required.');
      return;
    }
    
    try {
      await onSubmit({
        code: code.toUpperCase().trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        category,
      });
      // Reset form on success
      setCode('');
      setName('');
      setDescription('');
      setCategory('PERFORMANCE');
    } catch (err: any) {
      setError(err.message || 'Failed to create criterion');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: 8,
        width: 480,
        padding: '1.5rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 600 }}>Create New Criterion</h2>
        
        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Criterion Code <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g., QUALITY_SCORE"
              required
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                borderRadius: 6, border: '1px solid #d1d5db', outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Criterion Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Quality Score"
              required
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                borderRadius: 6, border: '1px solid #d1d5db', outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                borderRadius: 6, border: '1px solid #d1d5db', outline: 'none',
              }}
            >
              <option value="PERFORMANCE">Performance</option>
              <option value="BEHAVIOR">Behavior</option>
              <option value="CONTRIBUTION">Contribution</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                borderRadius: 6, border: '1px solid #d1d5db', outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
