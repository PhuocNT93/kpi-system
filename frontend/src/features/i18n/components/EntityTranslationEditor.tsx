import React, { useMemo, useState } from 'react';
import {
  useLocales,
  useMasterEntities,
  useAllMasterEntities,
  useEntityTranslations,
  useUpsertEntityTranslations,
  type MasterEntityOption,
  type GlobalMasterEntityOption,
  type TranslationsMap,
} from '../api/use-i18n';
import { Button } from '@/shared/ui/Button/Button';
import { LoadingSpinner, ErrorAlert } from '@/shared/components/ui';

export const MASTER_ENTITY_TYPES = [
  { value: 'DEPARTMENT', label: 'Department (Phòng ban)', defaultFields: ['name'] },
  { value: 'TEAM', label: 'Team (Nhóm / Đội)', defaultFields: ['name'] },
  { value: 'ROLE', label: 'Role (Chức danh / Vai trò)', defaultFields: ['name'] },
  { value: 'JOB_LEVEL', label: 'Job Level (Cấp bậc công việc)', defaultFields: ['name'] },
  { value: 'REVIEW_CADENCE', label: 'Review Cadence (Chu kỳ đánh giá)', defaultFields: ['name'] },
  { value: 'CRITERION', label: 'Criterion (Tiêu chí đánh giá)', defaultFields: ['name', 'description'] },
  { value: 'CRITERION_LEVEL', label: 'Criterion Level (Mức độ tiêu chí)', defaultFields: ['label'] },
  { value: 'EVALUATION_TEMPLATE', label: 'Evaluation Template (Mẫu đánh giá)', defaultFields: ['name', 'description'] },
];

interface Props {
  initialEntityType?: string;
  initialEntityId?: string;
}

export const EntityTranslationEditor: React.FC<Props> = ({
  initialEntityType = 'DEPARTMENT',
  initialEntityId = '',
}) => {
  const [searchMode, setSearchMode] = useState<'GLOBAL' | 'CATEGORY'>('GLOBAL');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [entityType, setEntityType] = useState(initialEntityType);
  const [selectedEntityId, setSelectedEntityId] = useState(initialEntityId);
  const [selectedGlobalItem, setSelectedGlobalItem] = useState<GlobalMasterEntityOption | null>(null);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [newFieldName, setNewFieldName] = useState('');

  // 1. Locales list from backend
  const { data: localesData, isLoading: localesLoading } = useLocales();
  const locales: string[] = localesData ?? [];

  // 2. Global master entities across ALL categories
  const {
    data: allMasterEntities,
    isLoading: isGlobalLoading,
    error: globalEntitiesError,
  } = useAllMasterEntities(searchMode === 'GLOBAL');

  // 3. Category-specific master entities
  const {
    data: categoryEntities,
    isLoading: isCategoryLoading,
    error: categoryEntitiesError,
  } = useMasterEntities(searchMode === 'CATEGORY' ? entityType : '');

  // 4. Entity Translations for selected entity
  const {
    data: translations,
    refetch,
    isFetching,
    error: fetchError,
  } = useEntityTranslations(entityType, selectedEntityId);

  const [localValues, setLocalValues] = useState<TranslationsMap>({});
  const [feedback, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const upsert = useUpsertEntityTranslations();

  // Reset custom fields when entity selection changes
  React.useEffect(() => {
    setCustomFields([]);
    setNewFieldName('');
  }, [selectedEntityId, entityType]);

  // Populate localValues when fetched translations change
  React.useEffect(() => {
    if (translations) {
      setLocalValues(translations);
    } else {
      setLocalValues({});
    }
  }, [translations]);

  // Selected master entity details object
  const selectedEntityObj = useMemo(() => {
    if (searchMode === 'GLOBAL' && selectedGlobalItem) {
      return selectedGlobalItem;
    }
    if (categoryEntities) {
      return categoryEntities.find((e) => e.id === selectedEntityId) || null;
    }
    return null;
  }, [searchMode, selectedGlobalItem, categoryEntities, selectedEntityId]);

  // Filtered global entities
  const filteredGlobalEntities = useMemo(() => {
    if (!allMasterEntities) return [];
    if (!globalSearchTerm.trim()) return allMasterEntities;
    const term = globalSearchTerm.toLowerCase();
    return allMasterEntities.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.code.toLowerCase().includes(term) ||
        e.entityType.toLowerCase().includes(term) ||
        e.entityLabel.toLowerCase().includes(term)
    );
  }, [allMasterEntities, globalSearchTerm]);

  // Filtered category entities
  const filteredCategoryEntities = useMemo(() => {
    if (!categoryEntities) return [];
    if (!categorySearchTerm.trim()) return categoryEntities;
    const term = categorySearchTerm.toLowerCase();
    return categoryEntities.filter(
      (e) => e.name.toLowerCase().includes(term) || e.code.toLowerCase().includes(term)
    );
  }, [categoryEntities, categorySearchTerm]);

  function handleSelectGlobalItem(item: GlobalMasterEntityOption) {
    setEntityType(item.entityType);
    setSelectedEntityId(item.id);
    setSelectedGlobalItem(item);
    setToast(null);
  }

  function handleTypeChange(newType: string) {
    setEntityType(newType);
    setSelectedEntityId('');
    setSelectedGlobalItem(null);
    setCategorySearchTerm('');
    setToast(null);
  }

  function handleSelectCategoryItem(item: MasterEntityOption) {
    setSelectedEntityId(item.id);
    setSelectedGlobalItem(null);
    setToast(null);
  }

  // Determine field names based on existing translations, default fields, or user-added custom fields
  const fieldNames = useMemo(() => {
    const fields = new Set<string>();
    if (translations) {
      for (const locale of Object.keys(translations)) {
        const localeMap = translations[locale] ?? {};
        for (const f of Object.keys(localeMap)) fields.add(f);
      }
    }
    if (fields.size === 0) {
      const match = MASTER_ENTITY_TYPES.find((e) => e.value === entityType);
      const defaults = match ? match.defaultFields : ['name'];
      defaults.forEach((f) => fields.add(f));
    }
    customFields.forEach((f) => fields.add(f));
    return Array.from(fields).sort();
  }, [translations, entityType, customFields]);

  // Translation completion status by locale
  const localeStatusMap = useMemo(() => {
    const status: Record<string, { total: number; filled: number; complete: boolean }> = {};
    for (const loc of locales) {
      let filled = 0;
      for (const field of fieldNames) {
        if (localValues[loc]?.[field]?.trim()) {
          filled++;
        }
      }
      status[loc] = {
        total: fieldNames.length,
        filled,
        complete: fieldNames.length > 0 && filled === fieldNames.length,
      };
    }
    return status;
  }, [locales, fieldNames, localValues]);

  function handleChange(field: string, locale: string, value: string) {
    setLocalValues((prev) => ({
      ...prev,
      [locale]: { ...(prev[locale] || {}), [field]: value },
    }));
  }

  function handleCopyEnglishToOthers() {
    const enMap = localValues['en'] || {};
    setLocalValues((prev) => {
      const updated = { ...prev };
      for (const loc of locales) {
        if (loc === 'en') continue;
        const locMap = { ...(updated[loc] || {}) };
        for (const f of fieldNames) {
          if (!locMap[f] && enMap[f]) {
            locMap[f] = enMap[f];
          }
        }
        updated[loc] = locMap;
      }
      return updated;
    });
    setToast({
      type: 'success',
      message: 'Copied English baseline values into empty fields for other languages.',
    });
  }

  function handleAddCustomField(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const field = newFieldName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!field) return;
    if (fieldNames.includes(field)) {
      setToast({ type: 'error', message: `Field '${field}' already exists in translation matrix.` });
      return;
    }
    setCustomFields((prev) => [...prev, field]);
    setNewFieldName('');
    setToast({ type: 'success', message: `Added new field '${field}' to translation matrix.` });
  }

  function handleRemoveField(fieldToRemove: string) {
    setCustomFields((prev) => prev.filter((f) => f !== fieldToRemove));
    setLocalValues((prev) => {
      const updated = { ...prev };
      for (const loc of Object.keys(updated)) {
        if (updated[loc]) {
          const locMap = { ...updated[loc] };
          delete locMap[fieldToRemove];
          updated[loc] = locMap;
        }
      }
      return updated;
    });
    setToast({ type: 'success', message: `Removed field '${fieldToRemove}' from translation matrix.` });
  }

  async function handleSave() {
    setToast(null);

    // Rule 12 Baseline 'en' requirement in LLD
    const enValues = localValues['en'] || {};
    const missingEnFields = fieldNames.filter((f) => !enValues[f] || !enValues[f].trim());

    if (missingEnFields.length > 0) {
      setToast({
        type: 'error',
        message: `English ('en') baseline is required for field(s): ${missingEnFields.join(', ')}.`,
      });
      return;
    }

    try {
      await upsert.mutateAsync({
        entityType,
        entityId: selectedEntityId,
        body: localValues,
      });
      setToast({ type: 'success', message: 'Translations successfully saved and audit logged!' });
      await refetch();
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to save translations.' });
    }
  }

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {/* Entity Selection Panel */}
      <div
        style={{
          background: '#f8fafc',
          borderRadius: 6,
          padding: '1rem',
          border: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Search Mode Toggle Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
          <button
            type="button"
            onClick={() => {
              setSearchMode('GLOBAL');
              setToast(null);
            }}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '6px 6px 0 0',
              border: '1px solid',
              borderColor: searchMode === 'GLOBAL' ? '#3b82f6' : 'transparent',
              background: searchMode === 'GLOBAL' ? '#fff' : 'transparent',
              color: searchMode === 'GLOBAL' ? '#1d4ed8' : '#64748b',
              fontWeight: searchMode === 'GLOBAL' ? 700 : 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            🔍 Global Search All Items (Search across ALL Categories)
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchMode('CATEGORY');
              setToast(null);
            }}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '6px 6px 0 0',
              border: '1px solid',
              borderColor: searchMode === 'CATEGORY' ? '#3b82f6' : 'transparent',
              background: searchMode === 'CATEGORY' ? '#fff' : 'transparent',
              color: searchMode === 'CATEGORY' ? '#1d4ed8' : '#64748b',
              fontWeight: searchMode === 'CATEGORY' ? 700 : 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            📂 Browse by Specific Category (Filter by Category)
          </button>
        </div>

        {/* Global Search Mode */}
        {searchMode === 'GLOBAL' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
              Search across all master data items in the entire system:
            </label>

            {isGlobalLoading ? (
              <LoadingSpinner label="Loading all master data items from backend..." />
            ) : globalEntitiesError ? (
              <ErrorAlert error={globalEntitiesError} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Search Input */}
                <input
                  type="text"
                  placeholder="Type to search anything (e.g. 'Phòng Nhân Sự', 'Manager', 'KPI', 'Chất lượng')..."
                  value={globalSearchTerm}
                  onChange={(e) => setGlobalSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 6,
                    border: '1px solid #3b82f6',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)',
                  }}
                />

                {/* Items Dropdown */}
                <select
                  value={selectedEntityId}
                  onChange={(e) => {
                    const found = allMasterEntities?.find((m) => m.id === e.target.value);
                    if (found) handleSelectGlobalItem(found);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 6,
                    border: '1px solid #94a3b8',
                    fontSize: '0.875rem',
                    background: '#fff',
                    outline: 'none',
                  }}
                >
                  <option value="">
                    -- Choose an item ({filteredGlobalEntities.length} matching found) --
                  </option>
                  {filteredGlobalEntities.map((item) => (
                    <option key={`${item.entityType}-${item.id}`} value={item.id}>
                      [{item.entityType}] {item.name} {item.code ? `(${item.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          /* Category Selection Mode */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Entity Type Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                1. Select Entity Type
              </label>
              <select
                value={entityType}
                onChange={(e) => handleTypeChange(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  outline: 'none',
                  background: '#fff',
                }}
              >
                {MASTER_ENTITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* List Selection Mode */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                2. Choose Item to Translate
              </label>

              {isCategoryLoading ? (
                <LoadingSpinner label={`Loading ${entityType} list...`} />
              ) : categoryEntitiesError ? (
                <ErrorAlert error={categoryEntitiesError} />
              ) : categoryEntities && categoryEntities.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Search Filter input */}
                  <input
                    type="text"
                    placeholder={`Search ${entityType} by name or code...`}
                    value={categorySearchTerm}
                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.75rem',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8125rem',
                      outline: 'none',
                    }}
                  />

                  {/* Entity Dropdown Select */}
                  <select
                    value={selectedEntityId}
                    onChange={(e) => {
                      const found = categoryEntities.find((m) => m.id === e.target.value);
                      if (found) handleSelectCategoryItem(found);
                      else setSelectedEntityId(e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 6,
                      border: '1px solid #94a3b8',
                      fontSize: '0.875rem',
                      background: '#fff',
                      outline: 'none',
                    }}
                  >
                    <option value="">-- Choose an item ({filteredCategoryEntities.length} available) --</option>
                    {filteredCategoryEntities.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.code ? `(${item.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ fontSize: '0.875rem', color: '#64748b', padding: '0.5rem 0' }}>
                  No master data records found for <code>{entityType}</code>. Try creating one in the administration setup first.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Entity Info Banner */}
      {selectedEntityId && (
        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 6,
            padding: '0.75rem 1rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e40af' }}>
              Translating: {selectedEntityObj ? `${selectedEntityObj.name} ${selectedEntityObj.code ? `(${selectedEntityObj.code})` : ''}` : 'Selected Item'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: 2 }}>
              Category: <code>{entityType}</code>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {locales.map((loc) => {
              const st = localeStatusMap[loc];
              const isEn = loc === 'en';
              const isOk = st?.complete;
              return (
                <span
                  key={loc}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.5rem',
                    borderRadius: 12,
                    background: isOk ? '#dcfce7' : '#fef3c7',
                    color: isOk ? '#166534' : '#92400e',
                    border: `1px solid ${isOk ? '#86efac' : '#fde68a'}`,
                  }}
                >
                  {loc.toUpperCase()}: {st?.filled}/{st?.total} {isOk ? '✓' : isEn ? '⚠️ Required' : '⚠️'}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Feedback Message */}
      {feedback && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 6,
            fontSize: '0.875rem',
            backgroundColor: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: feedback.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Content Area */}
      {localesLoading ? (
        <LoadingSpinner label="Loading supported locales..." />
      ) : fetchError ? (
        <ErrorAlert error={fetchError} onRetry={refetch} />
      ) : !selectedEntityId ? (
        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
          👈 Select an item from the list above to manage its translations.
        </div>
      ) : (
        <div>
          {/* Rules & Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              gap: 8,
            }}
          >
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              Rule 12: English (<code>'en'</code>) is mandatory baseline for all fields.
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" variant="outlined" onClick={handleCopyEnglishToOthers}>
                Auto-fill English to empty languages
              </Button>
              <Button size="sm" variant="outlined" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Add Custom Field Bar */}
          <form
            onSubmit={handleAddCustomField}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#f1f5f9',
              padding: '0.5rem 0.75rem',
              borderRadius: 6,
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
              ➕ Add Field to Translate:
            </span>
            <input
              type="text"
              placeholder="e.g. description, short_name, summary"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              style={{
                flex: 1,
                padding: '0.3rem 0.6rem',
                borderRadius: 4,
                border: '1px solid #cbd5e1',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            />
            <Button size="sm" type="submit" disabled={!newFieldName.trim()}>
              Add Field Row
            </Button>
          </form>

          {/* Translation Matrix Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '0.625rem 0.75rem', fontWeight: 600, color: '#475569', width: '180px' }}>
                    Field Name
                  </th>
                  {locales.map((loc) => (
                    <th key={loc} style={{ textAlign: 'left', padding: '0.625rem 0.75rem', fontWeight: 600, color: '#475569' }}>
                      {loc.toUpperCase()}{' '}
                      {loc === 'en' ? (
                        <span style={{ color: '#dc2626', fontWeight: 700 }} title="Required Baseline">
                          * Required
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fieldNames.map((field) => (
                  <tr key={field} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600, color: '#1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <code>{field}</code>
                        <button
                          type="button"
                          title={`Remove '${field}' row`}
                          onClick={() => handleRemoveField(field)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            padding: '0 4px',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                    {locales.map((loc) => (
                      <td key={loc} style={{ padding: '0.375rem 0.75rem' }}>
                        <input
                          type="text"
                          placeholder={loc === 'en' ? `English ${field} (required)` : `Translation in ${loc}`}
                          value={(localValues[loc] && localValues[loc][field]) ?? ''}
                          onChange={(e) => handleChange(field, loc, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.375rem 0.625rem',
                            borderRadius: 4,
                            border: '1px solid #cbd5e1',
                            fontSize: '0.875rem',
                            outline: 'none',
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Bar */}
          <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? 'Saving...' : 'Save Translations'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityTranslationEditor;
