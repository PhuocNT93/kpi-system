import React from 'react';
import type { EvaluationLevel } from '../domain/template-models';
import { Button } from '../../../shared/ui/Button/Button';

interface LevelEditorProps {
  levels: EvaluationLevel[];
  onChange: (levels: EvaluationLevel[]) => void;
  isReadOnly?: boolean;
}

export function LevelEditor({ levels, onChange, isReadOnly = false }: LevelEditorProps) {
  const handleUpdate = (index: number, field: keyof EvaluationLevel, value: any) => {
    if (isReadOnly) return;
    const updated = [...levels];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleAddLevel = () => {
    if (isReadOnly) return;
    const newNo = levels.length + 1;
    const newLevel: EvaluationLevel = {
      id: `level-${Date.now()}`,
      code: `LEVEL_${newNo}`,
      levelNumber: newNo,
      name: `Level ${newNo}`,
      description: '',
      scoreValue: newNo,
    };
    onChange([...levels, newLevel]);
  };

  const handleRemoveLevel = (index: number) => {
    if (isReadOnly || levels.length <= 1) return;
    const updated = levels.filter((_, i) => i !== index);
    // Re-index level numbers
    const reindexed = updated.map((lvl, idx) => ({
      ...lvl,
      levelNumber: idx + 1,
      code: `LEVEL_${idx + 1}`,
    }));
    onChange(reindexed);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#111827' }}>
          Evaluation Levels ({levels.length})
        </h4>
        {!isReadOnly && (
          <Button size="sm" variant="outlined" onClick={handleAddLevel}>
            + Add Level
          </Button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {levels.map((lvl, idx) => (
          <div
            key={lvl.id || idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#e5e7eb',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#374151',
              }}
            >
              {lvl.levelNumber}
            </span>

            <input
              type="text"
              value={lvl.name}
              disabled={isReadOnly}
              onChange={(e) => handleUpdate(idx, 'name', e.target.value)}
              placeholder="Level name"
              style={{
                flex: 1,
                padding: '0.25rem 0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: 4,
                fontSize: '0.8125rem',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Score:</span>
              <input
                type="number"
                step="0.1"
                value={lvl.scoreValue}
                disabled={isReadOnly}
                onChange={(e) => handleUpdate(idx, 'scoreValue', parseFloat(e.target.value) || 0)}
                style={{
                  width: 60,
                  padding: '0.25rem 0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  fontSize: '0.8125rem',
                }}
              />
            </div>

            {!isReadOnly && levels.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveLevel(idx)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  padding: '0.25rem',
                }}
                title="Remove level"
              >
                🗑
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
