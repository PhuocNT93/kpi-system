import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import userGuideContent from '@/assets/user-guide.md?raw';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';

export function UserGuidePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', maxWidth: '900px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div
        style={{
          backgroundColor: COLORS.neutral.white,
          borderRadius: RADII.xl,
          border: `1px solid ${COLORS.neutral[200]}`,
          padding: '32px 40px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div className="user-guide-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{userGuideContent}</ReactMarkdown>
        </div>
      </div>

      <style>
        {`
          .user-guide-content h1 {
            font-family: ${TYPOGRAPHY.fontFamily.headline};
            font-size: ${TYPOGRAPHY.fontSize['2xl']};
            font-weight: ${TYPOGRAPHY.fontWeight.bold};
            color: ${COLORS.neutral.textPrimary};
            margin: 24px 0 8px;
          }
          .user-guide-content h1:first-child { margin-top: 0; }
          .user-guide-content h2 {
            font-size: ${TYPOGRAPHY.fontSize.xl};
            font-weight: ${TYPOGRAPHY.fontWeight.bold};
            color: ${COLORS.neutral.textPrimary};
            margin: 32px 0 12px;
            padding-top: 16px;
            border-top: 1px solid ${COLORS.neutral[200]};
          }
          .user-guide-content h3 {
            font-size: ${TYPOGRAPHY.fontSize.lg};
            font-weight: ${TYPOGRAPHY.fontWeight.semibold};
            color: ${COLORS.neutral.textPrimary};
            margin: 20px 0 8px;
          }
          .user-guide-content h4 {
            font-size: ${TYPOGRAPHY.fontSize.base};
            font-weight: ${TYPOGRAPHY.fontWeight.semibold};
            color: ${COLORS.neutral.textPrimary};
            margin: 16px 0 8px;
          }
          .user-guide-content p, .user-guide-content li {
            font-size: ${TYPOGRAPHY.fontSize.sm};
            color: ${COLORS.neutral.textPrimary};
            line-height: 1.6;
          }
          .user-guide-content blockquote {
            margin: 12px 0;
            padding: 10px 16px;
            border-left: 3px solid ${COLORS.primary.DEFAULT};
            background-color: ${COLORS.neutral[50]};
            border-radius: ${RADII.md};
            color: ${COLORS.neutral.textSecondary};
            font-size: ${TYPOGRAPHY.fontSize.sm};
          }
          .user-guide-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: ${TYPOGRAPHY.fontSize.sm};
          }
          .user-guide-content th, .user-guide-content td {
            border: 1px solid ${COLORS.neutral[200]};
            padding: 8px 12px;
            text-align: left;
          }
          .user-guide-content th {
            background-color: ${COLORS.neutral[50]};
            font-weight: ${TYPOGRAPHY.fontWeight.semibold};
          }
          .user-guide-content code {
            background-color: ${COLORS.neutral[100]};
            border-radius: ${RADII.sm};
            padding: 1px 5px;
            font-size: 0.85em;
          }
          .user-guide-content pre {
            background-color: ${COLORS.neutral[900]};
            color: ${COLORS.neutral.white};
            border-radius: ${RADII.md};
            padding: 12px 16px;
            overflow-x: auto;
          }
          .user-guide-content pre code {
            background-color: transparent;
            padding: 0;
            color: inherit;
          }
        `}
      </style>
    </div>
  );
}
