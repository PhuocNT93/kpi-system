import React from 'react';
import {
  ExternalLink,
  FileText,
  Image,
  Link as LinkIcon,
  File,
  Clock,
  CheckCircle2,
  AlertCircle,
  Archive,
} from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, SHADOWS } from '@/shared/theme';
import type { FinalEvidenceItem } from '@/features/reports/types/reports.types';
import type { EvaluationDataImportEvidence } from '../api/evaluation-data-import.types';

export type DisplayEvidenceItem = FinalEvidenceItem | EvaluationDataImportEvidence;

interface EvidenceViewerProps {
  evidences: DisplayEvidenceItem[];
  emptyMessage?: string;
}

interface NormalizedEvidence {
  id: string;
  title: string;
  itemType: string;
  itemUrl?: string | null;
  itemFileRef?: string | null;
  description?: string | null;
  isSuperseded: boolean;
  supersededBy?: string | null;
  supersededAt?: string | null;
  supersedeReason?: string | null;
  createdAt: string;
}

function normalizeEvidence(item: DisplayEvidenceItem, index: number): NormalizedEvidence {
  const isFinal = 'id' in item;
  const isImport = 'staging_evidence_id' in item;

  const id = isFinal ? item.id : (isImport ? item.staging_evidence_id : `evidence-${index}`);
  const title = item.title;
  const itemType = isFinal ? item.type : (isImport ? item.evidence_type : 'EXTERNAL_REF');
  const itemUrl = isFinal ? item.url : (isImport ? item.evidence_url : null);
  const itemFileRef = isFinal ? item.fileReference : (isImport ? item.file_reference : null);
  const description = item.description;
  const isSuperseded = isFinal && item.status === 'SUPERSEDED';
  const supersededBy = isFinal ? item.supersededBy : null;
  const supersededAt = isFinal ? item.supersededAt : null;
  const supersedeReason = isFinal ? item.supersedeReason : null;
  const createdAt = isFinal ? item.createdAt : (isImport ? item.created_at : new Date().toISOString());

  return {
    id,
    title,
    itemType,
    itemUrl,
    itemFileRef,
    description,
    isSuperseded,
    supersededBy,
    supersededAt,
    supersedeReason,
    createdAt,
  };
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({
  evidences,
  emptyMessage = 'No evidence items attached.',
}) => {
  if (!evidences || evidences.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          backgroundColor: COLORS.neutral[50],
          borderRadius: RADII.lg,
          border: `1px dashed ${COLORS.neutral[300]}`,
          color: COLORS.neutral.textSecondary,
          fontSize: TYPOGRAPHY.fontSize.sm,
        }}
      >
        <FileText
          size={32}
          color={COLORS.neutral[400]}
          style={{ margin: '0 auto 8px', display: 'block' }}
        />
        {emptyMessage}
      </div>
    );
  }

  const getEvidenceIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'URL':
        return <LinkIcon size={16} color={COLORS.primary[600]} />;
      case 'SCREENSHOT':
      case 'IMAGE':
        return <Image size={16} color="#7c3aed" />;
      case 'DOCUMENT':
        return <FileText size={16} color="#2563eb" />;
      case 'FILE':
        return <File size={16} color="#059669" />;
      default:
        return <ExternalLink size={16} color={COLORS.neutral[600]} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {evidences.map((rawItem, idx) => {
        const item = normalizeEvidence(rawItem, idx);

        return (
          <div
            key={item.id}
            style={{
              padding: '14px 16px',
              backgroundColor: item.isSuperseded ? COLORS.neutral[50] : COLORS.neutral.white,
              borderRadius: RADII.lg,
              border: `1px solid ${item.isSuperseded ? COLORS.neutral[200] : COLORS.neutral[300]}`,
              boxShadow: item.isSuperseded ? 'none' : SHADOWS.sm,
              opacity: item.isSuperseded ? 0.75 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: RADII.sm,
                    backgroundColor: COLORS.neutral[100],
                  }}
                >
                  {getEvidenceIcon(item.itemType)}
                </span>
                <span
                  style={{
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    fontWeight: TYPOGRAPHY.fontWeight.semibold,
                    color: item.isSuperseded ? COLORS.neutral.textSecondary : COLORS.neutral.textPrimary,
                    textDecoration: item.isSuperseded ? 'line-through' : 'none',
                  }}
                >
                  {item.title}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: TYPOGRAPHY.fontWeight.medium,
                    padding: '2px 8px',
                    borderRadius: RADII.full,
                    backgroundColor: COLORS.neutral[100],
                    color: COLORS.neutral.textSecondary,
                    textTransform: 'uppercase',
                  }}
                >
                  {item.itemType}
                </span>
              </div>

              {/* Status pill */}
              <div>
                {item.isSuperseded ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: TYPOGRAPHY.fontWeight.semibold,
                      padding: '2px 8px',
                      borderRadius: RADII.full,
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a',
                    }}
                  >
                    <Archive size={12} />
                    SUPERSEDED
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: TYPOGRAPHY.fontWeight.semibold,
                      padding: '2px 8px',
                      borderRadius: RADII.full,
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <CheckCircle2 size={12} />
                    ACTIVE
                  </span>
                )}
              </div>
            </div>

            {/* Description or Rationale */}
            {item.description && (
              <p
                style={{
                  margin: '4px 0 8px 0',
                  fontSize: TYPOGRAPHY.fontSize.xs,
                  color: COLORS.neutral.textSecondary,
                  lineHeight: '1.4',
                }}
              >
                {item.description}
              </p>
            )}

            {/* Links or references */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center',
                marginTop: '6px',
                fontSize: TYPOGRAPHY.fontSize.xs,
              }}
            >
              {item.itemUrl && (
                <a
                  href={item.itemUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: COLORS.primary.DEFAULT,
                    textDecoration: 'none',
                    fontWeight: TYPOGRAPHY.fontWeight.medium,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  <ExternalLink size={12} />
                  Open Link
                </a>
              )}

              {item.itemFileRef && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: COLORS.neutral.textSecondary,
                    backgroundColor: COLORS.neutral[100],
                    padding: '2px 8px',
                    borderRadius: RADII.sm,
                    fontFamily: 'monospace',
                  }}
                >
                  <File size={12} />
                  {item.itemFileRef}
                </span>
              )}

              {item.createdAt && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: COLORS.neutral[400],
                  }}
                >
                  <Clock size={12} />
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Superseded info notice if applicable */}
            {item.isSuperseded && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: RADII.md,
                  fontSize: '11px',
                  color: '#92400e',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div>
                    <strong>Superseded</strong>
                    {item.supersededAt && ` on ${new Date(item.supersededAt).toLocaleString()}`}
                    {item.supersededBy && ` by evidence: ${item.supersededBy}`}
                  </div>
                  {item.supersedeReason && <div>Reason: {item.supersedeReason}</div>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
