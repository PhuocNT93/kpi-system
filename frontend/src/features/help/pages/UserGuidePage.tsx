import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { useEffect, useRef, useState, useMemo } from 'react';
import userGuideContent from '@/assets/user-guide.md?raw';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { useTheme } from '@/shared/theme';
import { LOCALE_CHANGE_EVENT } from '@/shared/i18n/ui-i18n';

const Mermaid = ({ chart, isDark = false }: { chart: string; isDark?: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      themeVariables: isDark
        ? {
          darkMode: true,
          background: '#111827',
          primaryColor: '#1E293B',
          primaryTextColor: '#F8FAFC',
          primaryBorderColor: '#6366F1',
          lineColor: '#94A3B8',
          secondaryColor: '#0F172A',
          tertiaryColor: '#1E293B',
          edgeLabelBackground: '#0F172A',
          nodeTextColor: '#F8FAFC',
          mainBkg: '#1E293B',
          nodeBorder: '#6366F1',
          clusterBkg: '#0F172A',
          clusterBorder: '#334155',
          defaultLinkColor: '#94A3B8',
          titleColor: '#F8FAFC',
        }
        : {
          darkMode: false,
          primaryColor: '#EEF2FF',
          primaryTextColor: '#1E1B4B',
          primaryBorderColor: '#6366F1',
          lineColor: '#64748B',
          edgeLabelBackground: '#FFFFFF',
          nodeTextColor: '#1E1B4B',
          mainBkg: '#EEF2FF',
          nodeBorder: '#6366F1',
          clusterBkg: '#F8FAFC',
          clusterBorder: '#CBD5E1',
          defaultLinkColor: '#64748B',
          titleColor: '#0F172A',
        },
    });

    if (ref.current) {
      ref.current.innerHTML = '';
      mermaid
        .render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart)
        .then(({ svg }: { svg: string }) => {
          if (ref.current) ref.current.innerHTML = svg;
        })
        .catch((e: unknown) => {
          console.error('Mermaid rendering error', e);
        });
    }
  }, [chart, isDark]);

  return <div ref={ref} style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }} />;
};

export function UserGuidePage() {
  const { isDark } = useTheme();
  const [selectedLang, setSelectedLang] = useState<'vi' | 'en'>(() => {
    try {
      const appLocale = localStorage.getItem('kpi_locale') || localStorage.getItem('preferred_locale');
      if (appLocale === 'en') return 'en';
      return 'vi';
    } catch {
      return 'vi';
    }
  });

  useEffect(() => {
    const handleLocaleChange = (e: CustomEvent<string>) => {
      if (e.detail === 'en' || e.detail === 'vi') {
        setSelectedLang(e.detail);
      }
    };
    window.addEventListener(LOCALE_CHANGE_EVENT as unknown as string, handleLocaleChange as EventListener);
    return () => {
      window.removeEventListener(LOCALE_CHANGE_EVENT as unknown as string, handleLocaleChange as EventListener);
    };
  }, []);

  const renderedContent = useMemo(() => {
    const parts = userGuideContent.split('<!-- LANGUAGE_SPLIT -->');
    const viPart = (parts[0] || '').trim();
    const enPart = (parts[1] || '').trim();

    return selectedLang === 'en' ? enPart : viPart;
  }, [selectedLang]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div
        style={{
          backgroundColor: isDark ? '#111827' : COLORS.neutral.white,
          borderRadius: RADII.xl,
          marginTop: '16px',
          border: `1px solid ${isDark ? '#374151' : COLORS.neutral[200]}`,
          padding: '32px 40px',
          boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div className={`user-guide-content ${isDark ? 'dark-theme' : ''}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ inline, className, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean; node?: unknown }) {
                const match = /language-(\w+)/.exec(className || '');
                if (!inline && match && match[1] === 'mermaid') {
                  return <Mermaid chart={String(children).replace(/\n$/, '')} isDark={isDark} />;
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
            {renderedContent}
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
          .user-guide-content.dark-theme h1,
          .user-guide-content.dark-theme h2,
          .user-guide-content.dark-theme h3,
          .user-guide-content.dark-theme h4 {
            color: #F9FAFB;
          }
          .user-guide-content.dark-theme h2 {
            border-top-color: #374151;
          }
          .user-guide-content.dark-theme p,
          .user-guide-content.dark-theme li {
            color: #E5E7EB;
          }
          .user-guide-content.dark-theme blockquote {
            background-color: #1F2937;
            color: #9CA3AF;
            border-left-color: ${COLORS.primary.DEFAULT};
          }
          .user-guide-content.dark-theme th,
          .user-guide-content.dark-theme td {
            border-color: #374151;
            color: #E5E7EB;
          }
          .user-guide-content.dark-theme th {
            background-color: #1F2937;
            color: #F9FAFB;
          }
          .user-guide-content.dark-theme code {
            background-color: #374151;
            color: #F3F4F6;
          }
          .user-guide-content.dark-theme a {
            color: #60A5FA;
          }

          /* Mermaid dark mode overrides */
          .user-guide-content.dark-theme .node rect,
          .user-guide-content.dark-theme .node polygon,
          .user-guide-content.dark-theme .node circle {
            fill: #1E293B !important;
            stroke: #6366F1 !important;
            stroke-width: 1.5px !important;
          }
          .user-guide-content.dark-theme .node .label,
          .user-guide-content.dark-theme .node text,
          .user-guide-content.dark-theme .node span,
          .user-guide-content.dark-theme .node div,
          .user-guide-content.dark-theme .nodeLabel {
            color: #F8FAFC !important;
            fill: #F8FAFC !important;
            font-weight: 500 !important;
          }
          .user-guide-content.dark-theme .edgeLabel,
          .user-guide-content.dark-theme .edgeLabel span,
          .user-guide-content.dark-theme .edgeLabel p,
          .user-guide-content.dark-theme .edgeLabel div,
          .user-guide-content.dark-theme .edgeLabel text {
            color: #E2E8F0 !important;
            fill: #E2E8F0 !important;
            background-color: #0F172A !important;
          }
          .user-guide-content.dark-theme .edgeLabel rect {
            fill: #0F172A !important;
            opacity: 0.9 !important;
          }
          .user-guide-content.dark-theme .edgePath .path {
            stroke: #94A3B8 !important;
            stroke-width: 1.5px !important;
          }
          .user-guide-content.dark-theme .marker,
          .user-guide-content.dark-theme marker path {
            fill: #94A3B8 !important;
            stroke: #94A3B8 !important;
          }

          /* Mermaid light mode overrides */
          .user-guide-content:not(.dark-theme) .node rect,
          .user-guide-content:not(.dark-theme) .node polygon,
          .user-guide-content:not(.dark-theme) .node circle {
            fill: #EEF2FF !important;
            stroke: #6366F1 !important;
            stroke-width: 1.5px !important;
          }
          .user-guide-content:not(.dark-theme) .node .label,
          .user-guide-content:not(.dark-theme) .node text,
          .user-guide-content:not(.dark-theme) .node span,
          .user-guide-content:not(.dark-theme) .node div,
          .user-guide-content:not(.dark-theme) .nodeLabel {
            color: #1E1B4B !important;
            fill: #1E1B4B !important;
            font-weight: 500 !important;
          }
          .user-guide-content:not(.dark-theme) .edgeLabel,
          .user-guide-content:not(.dark-theme) .edgeLabel span,
          .user-guide-content:not(.dark-theme) .edgeLabel p,
          .user-guide-content:not(.dark-theme) .edgeLabel div {
            color: #1E293B !important;
            fill: #1E293B !important;
            background-color: #FFFFFF !important;
          }
          .user-guide-content:not(.dark-theme) .edgeLabel rect {
            fill: #FFFFFF !important;
            opacity: 0.9 !important;
          }
          .user-guide-content:not(.dark-theme) .edgePath .path {
            stroke: #64748B !important;
            stroke-width: 1.5px !important;
          }
          .user-guide-content:not(.dark-theme) .marker,
          .user-guide-content:not(.dark-theme) marker path {
            fill: #64748B !important;
            stroke: #64748B !important;
          }
        `}
      </style>
    </div>
  );
}
