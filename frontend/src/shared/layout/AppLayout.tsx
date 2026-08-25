import React from 'react';
import { COLORS } from '@/lib/theme';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FooterActionBar, type FooterActionBarProps } from './FooterActionBar';

export interface AppLayoutProps {
  children?: React.ReactNode;
  activeMenuItem?: string;
  sidebarCollapsed?: boolean;
  defaultSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: (collapsed: boolean) => void;
  pageTitle?: string;
  pageSubtitle?: string;
  headerActions?: React.ReactNode;
  footerProps?: FooterActionBarProps;
  onSelectMenuItem?: (id: string) => void;
  onGenerateReport?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeMenuItem = 'evaluation-config',
  sidebarCollapsed,
  defaultSidebarCollapsed = false,
  onToggleSidebarCollapse,
  pageTitle = 'Configure Evaluation',
  pageSubtitle,
  headerActions,
  footerProps,
  onSelectMenuItem,
  onGenerateReport
}) => {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: COLORS.neutral.surfaceSubtle
      }}
    >
      {/* Left Sidebar with Expand/Collapse capability */}
      <Sidebar
        activeItemId={activeMenuItem}
        collapsed={sidebarCollapsed}
        defaultCollapsed={defaultSidebarCollapsed}
        onToggleCollapse={onToggleSidebarCollapse}
        onSelectItem={onSelectMenuItem}
        onGenerateReport={onGenerateReport}
      />

      {/* Main Content Area Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: COLORS.neutral.surfaceSubtle
        }}
      >
        {/* Top Header */}
        <Header
          title={pageTitle}
          subtitle={pageSubtitle}
          actions={headerActions}
        />

        {/* Scrollable Main Body Content Slot */}
        <main
          style={{
            flex: 1,
            padding: '0 32px 24px 32px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {children}
        </main>

        {/* Bottom Action / Footer Bar */}
        <FooterActionBar {...footerProps} />
      </div>
    </div>
  );
};
