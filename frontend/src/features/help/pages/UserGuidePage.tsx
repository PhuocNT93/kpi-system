import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { useEffect, useRef } from 'react';
import userGuideContent from '@/assets/user-guide.md?raw';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';

const Mermaid = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });
    if (ref.current) {
      mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart)
        .then(({ svg }: { svg: string }) => {
          if (ref.current) ref.current.innerHTML = svg;
        })
        .catch((e: unknown) => {
          console.error('Mermaid rendering error', e);
        });
    }
  }, [chart]);

  return <div ref={ref} style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }} />;
};

export function UserGuidePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
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
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ inline, className, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean; node?: unknown }) {
                const match = /language-(\w+)/.exec(className || '');
                if (!inline && match && match[1] === 'mermaid') {
                  return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                }
                const { node: _node, ...restProps } = props;
                return (
                  <code className={className} {...restProps}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {userGuideContent}
          </ReactMarkdown>
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
