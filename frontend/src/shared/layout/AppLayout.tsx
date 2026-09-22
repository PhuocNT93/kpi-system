import React, { useState, useEffect } from 'react';
import { COLORS } from '@/lib/theme';
import { useTheme } from '@/shared/theme';
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
  const { isDark } = useTheme();
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectMenuItem = (id: string) => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
    onSelectMenuItem?.(id);
  };

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: isDark ? '#0B0F19' : COLORS.neutral.surfaceSubtle,
        color: isDark ? '#F9FAFB' : COLORS.neutral.textPrimary,
        transition: 'background-color 0.2s ease',
        position: 'relative',
      }}
    >
      {/* Mobile Backdrop & Drawer */}
      {isMobile && mobileMenuOpen && (
        <>
          <div
            className="layout-sidebar-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
            data-testid="sidebar-backdrop"
          />
          <Sidebar
            activeItemId={activeMenuItem}
            isMobileDrawer={true}
            onCloseMobileDrawer={() => setMobileMenuOpen(false)}
            onSelectItem={handleSelectMenuItem}
            onGenerateReport={onGenerateReport}
          />
        </>
      )}

      {/* Desktop / Tablet Left Sidebar */}
      {!isMobile && (
        <Sidebar
          activeItemId={activeMenuItem}
          collapsed={sidebarCollapsed}
          defaultCollapsed={defaultSidebarCollapsed}
          onToggleCollapse={onToggleSidebarCollapse}
          onSelectItem={handleSelectMenuItem}
          onGenerateReport={onGenerateReport}
        />
      )}

      {/* Main Content Area Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: isDark ? '#0B0F19' : COLORS.neutral.surfaceSubtle,
          transition: 'background-color 0.2s ease',
          minWidth: 0,
        }}
      >
        {/* Top Header */}
        <Header
          title={pageTitle}
          subtitle={pageSubtitle}
          actions={headerActions}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          isMobileMenuOpen={mobileMenuOpen}
        />

        {/* Scrollable Main Body Content Slot with Responsive Padding */}
        <main className="app-layout-main">
          {children}
        </main>

        {/* Bottom Action / Footer Bar */}
        <FooterActionBar {...footerProps} />
      </div>
    </div>
  );
};
