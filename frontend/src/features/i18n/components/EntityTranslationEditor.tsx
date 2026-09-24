/* eslint-disable @typescript-eslint/no-explicit-any */

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
import { MASTER_ENTITY_TYPES } from './entity-translation-constants';
import { useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';


interface Props {
  initialEntityType?: string;
  initialEntityId?: string;
}

export const EntityTranslationEditor: React.FC<Props> = ({
  initialEntityType = 'DEPARTMENT',
  initialEntityId = '',
}) => {
  const { isDark } = useTheme();
  const { t } = useUiTranslation();
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
  const locales: string[] = useMemo(() => localesData ?? [], [localesData]);

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
        background: isDark ? '#111827' : '#ffffff',
        borderRadius: 8,
        border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Entity Selection Panel */}
      <div
        style={{
          background: isDark ? '#1e293b' : '#f8fafc',
          borderRadius: 6,
          padding: '1rem',
          border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Search Mode Toggle Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, paddingBottom: '0.5rem', overflowX: 'auto' }}>
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
              background: searchMode === 'GLOBAL' ? (isDark ? '#111827' : '#fff') : 'transparent',
              color: searchMode === 'GLOBAL' ? (isDark ? '#60a5fa' : '#1d4ed8') : (isDark ? '#94a3b8' : '#64748b'),
              fontWeight: searchMode === 'GLOBAL' ? 700 : 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            🔍 {t('i18n.global_search_tab', 'Global Search All Items (Search across ALL Categories)')}
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
              background: searchMode === 'CATEGORY' ? (isDark ? '#111827' : '#fff') : 'transparent',
              color: searchMode === 'CATEGORY' ? (isDark ? '#60a5fa' : '#1d4ed8') : (isDark ? '#94a3b8' : '#64748b'),
              fontWeight: searchMode === 'CATEGORY' ? 700 : 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            📂 {t('i18n.category_search_tab', 'Browse by Specific Category (Filter by Category)')}
          </button>
        </div>

        {/* Global Search Mode */}
        {searchMode === 'GLOBAL' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#e2e8f0' : '#334155' }}>
              {t('i18n.global_search_label', 'Search across all master data items in the entire system:')}
            </label>

            {isGlobalLoading ? (
              <LoadingSpinner label={t('i18n.loading_global', 'Loading all master data items from backend...')} />
            ) : globalEntitiesError ? (
              <ErrorAlert error={globalEntitiesError} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Search Input */}
                <input
                  type="text"
                  placeholder={t('i18n.global_search_placeholder', "Type to search anything (e.g. 'Phòng Nhân Sự', 'Manager', 'KPI', 'Chất lượng')...")}
                  value={globalSearchTerm}
                  onChange={(e) => setGlobalSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 6,
                    border: '1px solid #3b82f6',
                    fontSize: '0.875rem',
                    outline: 'none',
                    background: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)',
                    boxSizing: 'border-box',
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
                    border: `1px solid ${isDark ? '#475569' : '#94a3b8'}`,
                    fontSize: '0.875rem',
                    background: isDark ? '#0f172a' : '#fff',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">
                    -- {t('i18n.choose_item', 'Choose an item')} ({filteredGlobalEntities.length} {t('i18n.matching_found', 'matching found')}) --
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
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#e2e8f0' : '#334155' }}>
                1. {t('i18n.select_entity_type', 'Select Entity Type')}
              </label>
              <select
                value={entityType}
                onChange={(e) => handleTypeChange(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 6,
                  border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                  fontSize: '0.875rem',
                  outline: 'none',
                  background: isDark ? '#0f172a' : '#fff',
                  color: isDark ? '#f8fafc' : '#0f172a',
                }}
              >
                {MASTER_ENTITY_TYPES.map((tItem) => (
                  <option key={tItem.value} value={tItem.value}>
                    {tItem.label}
                  </option>
                ))}
              </select>
            </div>

            {/* List Selection Mode */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#e2e8f0' : '#334155' }}>
                2. {t('i18n.choose_item_to_translate', 'Choose Item to Translate')}
              </label>

              {isCategoryLoading ? (
                <LoadingSpinner label={`${t('i18n.loading', 'Loading')} ${entityType}...`} />
              ) : categoryEntitiesError ? (
                <ErrorAlert error={categoryEntitiesError} />
              ) : categoryEntities && categoryEntities.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Search Filter input */}
                  <input
                    type="text"
                    placeholder={`${t('common.search', 'Search')} ${entityType}...`}
                    value={categorySearchTerm}
                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.75rem',
                      borderRadius: 6,
                      border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                      fontSize: '0.8125rem',
                      outline: 'none',
                      background: isDark ? '#0f172a' : '#fff',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      boxSizing: 'border-box',
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
                      border: `1px solid ${isDark ? '#475569' : '#94a3b8'}`,
                      fontSize: '0.875rem',
                      background: isDark ? '#0f172a' : '#fff',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">-- {t('i18n.choose_item', 'Choose an item')} ({filteredCategoryEntities.length} {t('i18n.available', 'available')}) --</option>
                    {filteredCategoryEntities.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.code ? `(${item.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b', padding: '0.5rem 0' }}>
                  {t('i18n.no_records', 'No master data records found for')} <code>{entityType}</code>.
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
            background: isDark ? '#1e3a5f' : '#eff6ff',
            border: `1px solid ${isDark ? '#2563eb' : '#bfdbfe'}`,
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
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: isDark ? '#bfdbfe' : '#1e40af' }}>
              {t('i18n.translating', 'Translating')}: {selectedEntityObj ? `${selectedEntityObj.name} ${selectedEntityObj.code ? `(${selectedEntityObj.code})` : ''}` : t('i18n.selected_item', 'Selected Item')}
            </div>
            <div style={{ fontSize: '0.75rem', color: isDark ? '#93c5fd' : '#3b82f6', marginTop: 2 }}>
              {t('i18n.category', 'Category')}: <code>{entityType}</code>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
                    background: isOk ? (isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7') : (isDark ? 'rgba(234, 179, 8, 0.2)' : '#fef3c7'),
                    color: isOk ? (isDark ? '#86efac' : '#166534') : (isDark ? '#fde047' : '#92400e'),
                    border: `1px solid ${isOk ? (isDark ? '#166534' : '#86efac') : (isDark ? '#854d0e' : '#fde68a')}`,
                  }}
                >
                  {loc.toUpperCase()}: {st?.filled}/{st?.total} {isOk ? '✓' : isEn ? `⚠️ ${t('i18n.required', 'Required')}` : '⚠️'}
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
            backgroundColor: feedback.type === 'success' ? (isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5') : (isDark ? 'rgba(220, 38, 38, 0.2)' : '#fef2f2'),
            color: feedback.type === 'success' ? (isDark ? '#6ee7b7' : '#065f46') : (isDark ? '#fca5a5' : '#991b1b'),
            border: `1px solid ${feedback.type === 'success' ? (isDark ? '#059669' : '#a7f3d0') : (isDark ? '#dc2626' : '#fecaca')}`,
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Content Area */}
      {localesLoading ? (
        <LoadingSpinner label={t('i18n.loading_locales', 'Loading supported locales...')} />
      ) : fetchError ? (
        <ErrorAlert error={fetchError} onRetry={refetch} />
      ) : !selectedEntityId ? (
        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.875rem' }}>
          👈 {t('i18n.select_prompt', 'Select an item from the list above to manage its translations.')}
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
            <span style={{ fontSize: '0.8125rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              {t('i18n.rule12_notice', "Rule 12: English ('en') is mandatory baseline for all fields.")}
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button size="sm" variant="outlined" onClick={handleCopyEnglishToOthers}>
                {t('i18n.auto_fill_en', 'Auto-fill English to empty languages')}
              </Button>
              <Button size="sm" variant="outlined" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? t('common.refreshing', 'Refreshing...') : t('common.refresh', 'Refresh')}
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
              background: isDark ? '#1e293b' : '#f1f5f9',
              padding: '0.5rem 0.75rem',
              borderRadius: 6,
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', whiteSpace: 'nowrap' }}>
              ➕ {t('i18n.add_field', 'Add Field to Translate')}:
            </span>
            <input
              type="text"
              placeholder={t('i18n.add_field_placeholder', 'e.g. description, short_name, summary')}
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '0.3rem 0.6rem',
                borderRadius: 4,
                border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                background: isDark ? '#0f172a' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            />
            <Button size="sm" type="submit" disabled={!newFieldName.trim()}>
              {t('i18n.add_field_btn', 'Add Field Row')}
            </Button>
          </form>

          {/* Translation Matrix Table */}
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, borderRadius: 6 }}>
            <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: isDark ? '#1e293b' : '#f8fafc', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                  <th style={{ textAlign: 'left', padding: '0.625rem 0.75rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', width: '180px' }}>
                    {t('i18n.field_name', 'Field Name')}
                  </th>
                  {locales.map((loc) => (
                    <th key={loc} style={{ textAlign: 'left', padding: '0.625rem 0.75rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569' }}>
                      {loc.toUpperCase()}{' '}
                      {loc === 'en' ? (
                        <span style={{ color: '#ef4444', fontWeight: 700 }} title="Required Baseline">
                          * {t('i18n.required', 'Required')}
                        </span>
                      ) : (
                        <span style={{ color: isDark ? '#94a3b8' : '#94a3b8', fontWeight: 400 }}>({t('i18n.optional', 'Optional')})</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fieldNames.map((field) => (
                  <tr key={field} style={{ borderBottom: `1px solid ${isDark ? '#1f2937' : '#f1f5f9'}` }}>
                    <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <code>{field}</code>
                        <button
                          type="button"
                          title={`Remove '${field}' row`}
                          onClick={() => handleRemoveField(field)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: isDark ? '#94a3b8' : '#94a3b8',
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
                            border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                            background: isDark ? '#0f172a' : '#ffffff',
                            color: isDark ? '#f8fafc' : '#0f172a',
                            fontSize: '0.875rem',
                            outline: 'none',
                            boxSizing: 'border-box',
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
              {upsert.isPending ? t('common.saving', 'Saving...') : t('i18n.save_translations', 'Save Translations')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityTranslationEditor;
