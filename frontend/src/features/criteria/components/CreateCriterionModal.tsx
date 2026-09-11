import React, { useState } from 'react';
import { Button } from '../../../shared/ui/Button/Button';
import type { CreateCriterionDto } from '../domain/criteria-models';
import { AutoCodeButton } from '../../../shared/components/AutoCodeButton';
import { generateCode } from '../../../shared/utils/code-generator';

const DEFAULT_CATEGORIES = ['PERFORMANCE', 'CAPABILITY', 'CONTRIBUTION', 'BEHAVIOR'];

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
  const [category, setCategory] = useState<string>('PERFORMANCE');
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [error, setError] = useState<string | null>(null);

  // Category popup state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [categoryModalError, setCategoryModalError] = useState<string | null>(null);

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
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to create criterion');
    }
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryModalError(null);
    const cleaned = newCategoryInput
      .toUpperCase()
      .trim()
      .replace(/[\s-]+/g, '_')
      .replace(/[^A-Z0-9_]/g, '');

    if (!cleaned) {
      setCategoryModalError('Category name is required (letters and numbers only).');
      return;
    }

    if (!categories.includes(cleaned)) {
      setCategories((prev) => [...prev, cleaned]);
    }
    setCategory(cleaned);
    setNewCategoryInput('');
    setIsCategoryModalOpen(false);
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}
      >
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 8,
            width: 480,
            padding: '1.5rem',
            boxShadow:
              '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
        >
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 600 }}>
            Create New Criterion
          </h2>

          {error && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                borderRadius: 6,
                marginBottom: '1rem',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.25rem',
                }}
              >
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  Criterion Code <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <AutoCodeButton
                  onClick={() => {
                    const generated = generateCode('CRIT', name);
                    setCode(generated);
                  }}
                />
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g., QUALITY_SCORE"
                required
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: '0.25rem',
                }}
              >
                Criterion Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Quality Score"
                required
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.25rem',
                }}
              >
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#059669',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  <span>+ New Category</span>
                </button>
              </div>
              <select
                value={category}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setIsCategoryModalOpen(true);
                  } else {
                    setCategory(e.target.value);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  outline: 'none',
                }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__NEW__">+ Create New Category...</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: '0.25rem',
                }}
              >
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button
                type="button"
                variant="outlined"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* New Category Popup */}
      {isCategoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              width: 380,
              padding: '1.25rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', fontWeight: 600 }}>
              Add New Criterion Category
            </h3>
            {categoryModalError && (
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  borderRadius: 4,
                  marginBottom: '0.75rem',
                  fontSize: '0.8rem',
                }}
              >
                {categoryModalError}
              </div>
            )}
            <form onSubmit={handleCreateCategory}>
              <div style={{ marginBottom: '1rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    marginBottom: '0.25rem',
                  }}
                >
                  Category Name / Code *
                </label>
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  placeholder="e.g. INNOVATION or LEADERSHIP"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setNewCategoryInput('');
                    setCategoryModalError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Add Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
