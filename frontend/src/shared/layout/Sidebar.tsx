import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/shared/auth/auth-context';
import { useTheme } from '@/shared/theme';
import {
  LayoutDashboard,
  Users,
  CalendarRange,
  SlidersHorizontal,
  LayoutTemplate,
  FileSpreadsheet,
  UserCheck,
  ClipboardCheck,
  ShieldCheck,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  GitFork,
  Activity,
  BookOpen,
  Award,
  Mail,
} from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY, SHADOWS } from '@/shared/theme';
import { BrandLogo } from './BrandLogo';

export interface NavItemType {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

export interface NavSectionType {
  key?: string;
  title?: string;
  collapsible?: boolean;
  items: NavItemType[];
}

export interface SidebarProps {
  activeItemId?: string;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  onSelectItem?: (id: string) => void;
  onGenerateReport?: () => void;
}

const SIDEBAR_SECTIONS_STORAGE_KEY = 'kpi-sidebar-sections';

export const Sidebar: React.FC<SidebarProps> = ({
  activeItemId = 'dashboard',
  collapsed,
  defaultCollapsed = false,
  onToggleCollapse,
  onSelectItem,
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [toggleHovered, setToggleHovered] = useState(false);
  const [isCollapsedUncontrolled, setIsCollapsedUncontrolled] = useState(defaultCollapsed);
  const { user } = useAuth();
  const { isDark } = useTheme();

  const canViewConfig = user?.role === 'SYSTEM_ADMIN' || user?.role === 'HR_ADMIN';
  const isCollapsed = collapsed !== undefined ? collapsed : isCollapsedUncontrolled;

  // Track collapsed state per section key (true = folded/hidden)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_SECTIONS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore storage read errors
    }
    return {};
  });

  const handleToggle = () => {
    const nextState = !isCollapsed;
    if (collapsed === undefined) {
      setIsCollapsedUncontrolled(nextState);
    }
    onToggleCollapse?.(nextState);
  };

  const navSections: NavSectionType[] = useMemo(() => [
    {
      key: 'overview',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard size={18} />,
        },
        {
          id: 'user-guide',
          label: 'User Guide',
          icon: <BookOpen size={18} />,
        },
        {
          id: 'notification-preferences',
          label: 'Email Notifications',
          icon: <Mail size={18} />,
        },
      ],
    },
    {
      key: 'performance',
      title: 'Performance',
      collapsible: true,
      items: [
        {
          id: 'employee-search',
          label: 'Employee Search',
          icon: <Users size={18} />,
        },
        {
          id: 'team-evaluations',
          label: 'Team Reviews',
          icon: <UserCheck size={18} />,
        },
        {
          id: 'my-evaluations',
          label: 'My Evaluation',
          icon: <ClipboardCheck size={18} />,
        },
      ],
    },
    {
      key: 'reporting',
      title: 'Reporting',
      collapsible: true,
      items: [
        {
          id: 'kpi-summary',
          label: 'KPI Summary',
          icon: <Award size={18} />,
        },
        {
          id: 'my-report',
          label: 'My Report',
          icon: <ClipboardCheck size={18} />,
        },
        ...(user?.role === 'MANAGER' || canViewConfig
          ? [
              {
                id: 'team-report',
                label: 'Team Report',
                icon: <Users size={18} />,
              },
            ]
          : []),
        ...(canViewConfig
          ? [
              {
                id: 'org-report',
                label: 'Org Report',
                icon: <LayoutDashboard size={18} />,
              },
            ]
          : []),
      ],
    },
    ...(canViewConfig
      ? [
          {
            key: 'configuration',
            title: 'Configuration',
            collapsible: true,
            items: [
              {
                id: 'organization',
                label: 'Organization',
                icon: <Users size={18} />,
              },
              {
                id: 'cycles',
                label: 'Evaluation Cycles',
                icon: <CalendarRange size={18} />,
              },
              ...(user?.role === 'HR_ADMIN'
                ? [
                    {
                      id: 'calibration',
                      label: 'Calibration',
                      icon: <SlidersHorizontal size={18} />,
                    },
                  ]
                : []),
              {
                id: 'criteria',
                label: 'Criteria & Rules',
                icon: <SlidersHorizontal size={18} />,
              },
              {
                id: 'kpis',
                label: 'KPI Library',
                icon: <GitFork size={18} />,
              },
              {
                id: 'templates',
                label: 'Template Builder',
                icon: <LayoutTemplate size={18} />,
              },
              {
                id: 'imports',
                label: 'Import Center',
                icon: <FileSpreadsheet size={18} />,
              },
              {
                id: 'evaluation-data-imports',
                label: 'KPI Data Imports',
                icon: <FileSpreadsheet size={18} />,
              },
              {
                id: 'collectors',
                label: 'Auto Collect',
                icon: <Activity size={18} />,
              },
              {
                id: 'i18n',
                label: 'I18n Translation',
                icon: <SlidersHorizontal size={18} />,
              },
              {
                id: 'notification-templates',
                label: 'Email Templates',
                icon: <Mail size={18} />,
              },
              {
                id: 'notification-logs',
                label: 'Email Delivery Logs',
                icon: <Mail size={18} />,
              },
              {
                id: 'iam',
                label: 'Identity & Access',
                icon: <Shield size={18} />,
              },
              {
                id: 'audit-logs',
                label: 'Audit Log',
                icon: <ShieldCheck size={18} />,
              },
            ],
          },
        ]
      : []),
  ], [canViewConfig, user?.role]);

  // Auto-expand section if it contains the currently active item
  useEffect(() => {
    if (!activeItemId) return;
    const activeSection = navSections.find((sec) =>
      sec.items.some((it) => it.id === activeItemId)
    );
    if (activeSection?.key && collapsedSections[activeSection.key]) {
      setCollapsedSections((prev) => {
        const updated = { ...prev, [activeSection.key as string]: false };
        try {
          localStorage.setItem(SIDEBAR_SECTIONS_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore storage write errors
        }
        return updated;
      });
    }
  }, [activeItemId, navSections, collapsedSections]);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = !prev[key];
      const updated = { ...prev, [key]: next };
      try {
        localStorage.setItem(SIDEBAR_SECTIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage write errors
      }
      return updated;
    });
  };

  return (
    <aside
      style={{
        width: isCollapsed ? '72px' : '280px',
        minWidth: isCollapsed ? '72px' : '280px',
        height: '100%',
        backgroundColor: isDark ? '#111827' : COLORS.neutral.white,
        borderRight: `1px solid ${isDark ? '#1F2937' : COLORS.neutral.border}`,
        display: 'flex',
        flexDirection: 'column',
        padding: isCollapsed ? '20px 10px' : '20px 14px',
        boxSizing: 'border-box',
        transition:
          'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.22s cubic-bezier(0.4, 0, 0.2, 1), padding 0.22s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease, border-color 0.2s ease',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Floating Toggle Button directly on the border line */}
      <button
        onClick={handleToggle}
        onMouseEnter={() => setToggleHovered(true)}
        onMouseLeave={() => setToggleHovered(false)}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute',
          top: '24px',
          right: '-12px',
          width: '24px',
          height: '24px',
          borderRadius: RADII.full,
          border: `1px solid ${
            toggleHovered
              ? isDark
                ? '#6366F1'
                : COLORS.primary[300]
              : isDark
              ? '#374151'
              : COLORS.neutral.border
          }`,
          backgroundColor: toggleHovered
            ? isDark
              ? '#312E81'
              : COLORS.primary[50]
            : isDark
            ? '#1F2937'
            : COLORS.neutral.white,
          color: toggleHovered
            ? isDark
              ? '#A5B4FC'
              : COLORS.primary.DEFAULT
            : isDark
            ? '#9CA3AF'
            : COLORS.neutral.textSecondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: toggleHovered ? SHADOWS.md : SHADOWS.sm,
          transition: 'all 0.15s ease-in-out',
          zIndex: 20,
        }}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Top section: Brand Header & Divider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexShrink: 0 }}>
        {/* Brand Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            padding: isCollapsed ? '0' : '0 2px',
            minHeight: '38px',
          }}
        >
          <BrandLogo collapsed={isCollapsed} />
        </div>

        {/* Divider separating Logo and Menu */}
        <div
          style={{
            height: '1px',
            backgroundColor: isDark ? '#1F2937' : COLORS.neutral.border,
            width: '100%',
            opacity: 0.8,
          }}
        />
      </div>

      {/* Navigation Items Tree - Scrollable if content overflows */}
      <nav
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: '8px',
          paddingRight: isCollapsed ? '0' : '2px',
          scrollbarWidth: 'thin',
        }}
      >
        {navSections.map((section, sIdx) => {
          const sectionKey = section.key || `sec-${sIdx}`;
          const isSectionCollapsed = Boolean(section.collapsible && collapsedSections[sectionKey]);
          const containsActive = section.items.some((it) => it.id === activeItemId);

          return (
            <div key={sectionKey} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {/* Section Header (visible when expanded) */}
              {section.title && !isCollapsed && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => section.collapsible && toggleSection(sectionKey)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (section.collapsible) toggleSection(sectionKey);
                    }
                  }}
                  title={section.collapsible ? (isSectionCollapsed ? `Expand ${section.title}` : `Collapse ${section.title}`) : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: TYPOGRAPHY.fontFamily.body,
                    fontSize: '0.68rem',
                    fontWeight: TYPOGRAPHY.fontWeight.bold,
                    color: containsActive
                      ? isDark
                        ? '#A5B4FC'
                        : COLORS.primary.DEFAULT
                      : isDark
                      ? '#9CA3AF'
                      : COLORS.neutral.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '8px 10px 4px 10px',
                    userSelect: 'none',
                    cursor: section.collapsible ? 'pointer' : 'default',
                    borderRadius: RADII.md,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{section.title}</span>
                  {section.collapsible && (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: isDark ? '#9CA3AF' : COLORS.neutral.textMuted,
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      {isSectionCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    </span>
                  )}
                </div>
              )}

              {/* Separator between sections when whole sidebar is collapsed */}
              {section.title && isCollapsed && sIdx > 0 && (
                <div
                  style={{
                    height: '1px',
                    backgroundColor: isDark ? '#1F2937' : COLORS.neutral.border,
                    width: '32px',
                    margin: '6px auto',
                    opacity: 0.6,
                  }}
                />
              )}

              {/* Items inside section (rendered if not section-collapsed, or in whole-sidebar collapsed mode) */}
              {(!isSectionCollapsed || isCollapsed) && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {section.items.map((item) => {
                    const isActive = activeItemId === item.id;
                    const isHovered = hoveredItem === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelectItem?.(item.id)}
                        onMouseEnter={() => setHoveredItem(item.id)}
                        onMouseLeave={() => setHoveredItem(null)}
                        title={isCollapsed ? item.label : undefined}
                        aria-label={item.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: isCollapsed ? 'center' : 'flex-start',
                          gap: isCollapsed ? '0' : '10px',
                          padding: isCollapsed ? '8px 0' : '8px 10px',
                          borderRadius: RADII.lg,
                          border: 'none',
                          outline: 'none',
                          cursor: 'pointer',
                          backgroundColor: isActive
                            ? isDark
                              ? 'rgba(99, 102, 241, 0.18)'
                              : COLORS.primary[100]
                            : isHovered
                            ? isDark
                              ? 'rgba(255, 255, 255, 0.05)'
                              : COLORS.neutral[100]
                            : 'transparent',
                          color: isActive
                            ? isDark
                              ? '#A5B4FC'
                              : COLORS.primary[900]
                            : isDark
                            ? '#D1D5DB'
                            : COLORS.neutral.textSecondary,
                          fontFamily: TYPOGRAPHY.fontFamily.body,
                          fontSize: TYPOGRAPHY.fontSize.sm,
                          fontWeight: isActive
                            ? TYPOGRAPHY.fontWeight.semibold
                            : TYPOGRAPHY.fontWeight.medium,
                          textAlign: 'left',
                          transition: 'all 0.15s ease-in-out',
                          width: '100%',
                        }}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: RADII.md,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isActive
                              ? isDark
                                ? '#6366F1'
                                : COLORS.primary.DEFAULT
                              : 'transparent',
                            color: isActive
                              ? '#FFFFFF'
                              : isHovered
                              ? isDark
                                ? '#818CF8'
                                : COLORS.primary.DEFAULT
                              : isDark
                              ? '#9CA3AF'
                              : COLORS.neutral.textSecondary,
                            transition: 'all 0.15s ease',
                            flexShrink: 0,
                          }}
                        >
                          {item.icon}
                        </div>
                        {!isCollapsed && (
                          <span
                            style={{
                              flex: 1,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              letterSpacing: '-0.01em',
                            }}
                          >
                            {item.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
