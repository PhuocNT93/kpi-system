import React, { useState } from 'react';
import { useAuth } from '@/shared/auth/AuthContext';
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
  ChevronRight
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
  title?: string;
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

export const Sidebar: React.FC<SidebarProps> = ({
  activeItemId = 'dashboard',
  collapsed,
  defaultCollapsed = false,
  onToggleCollapse,
  onSelectItem
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [toggleHovered, setToggleHovered] = useState(false);
  const [isCollapsedUncontrolled, setIsCollapsedUncontrolled] = useState(defaultCollapsed);
  const { user } = useAuth();
  
  const canViewConfig = user?.role === 'SYSTEM_ADMIN' || user?.role === 'HR_ADMIN';

  const isCollapsed = collapsed !== undefined ? collapsed : isCollapsedUncontrolled;

  const handleToggle = () => {
    const nextState = !isCollapsed;
    if (collapsed === undefined) {
      setIsCollapsedUncontrolled(nextState);
    }
    onToggleCollapse?.(nextState);
  };

  const navSections: NavSectionType[] = [
    {
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard size={18} />
        }
      ]
    },
    ...(canViewConfig ? [{
      title: 'Configuration',
      items: [
        {
          id: 'organization',
          label: 'Organization',
          icon: <Users size={18} />
        },
        {
          id: 'cycles',
          label: 'Evaluation Cycles',
          icon: <CalendarRange size={18} />
        },
        {
          id: 'criteria',
          label: 'Criteria & Rules',
          icon: <SlidersHorizontal size={18} />
        },
        {
          id: 'templates',
          label: 'Template Builder',
          icon: <LayoutTemplate size={18} />
        },
        {
          id: 'import-center',
          label: 'Import Center',
          icon: <FileSpreadsheet size={18} />
        },
        {
          id: 'iam',
          label: 'Identity & Access',
          icon: <Shield size={18} />
        },
        {
          id: 'audit-logs',
          label: 'Audit Log',
          icon: <ShieldCheck size={18} />
        }
      ]
    }] : []),
    {
      title: 'Performance',
      items: [
        {
          id: 'team-evaluations',
          label: 'Team Reviews',
          icon: <UserCheck size={18} />
        },
        {
          id: 'my-evaluations',
          label: 'My Evaluation',
          icon: <ClipboardCheck size={18} />
        }
      ]
    }
  ];

  return (
    <aside
      style={{
        width: isCollapsed ? '72px' : '280px',
        minWidth: isCollapsed ? '72px' : '280px',
        height: '100%',
        backgroundColor: COLORS.neutral.white,
        borderRight: `1px solid ${COLORS.neutral.border}`,
        display: 'flex',
        flexDirection: 'column',
        padding: isCollapsed ? '20px 10px' : '20px 14px',
        boxSizing: 'border-box',
        transition:
          'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.22s cubic-bezier(0.4, 0, 0.2, 1), padding 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: 10
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
          border: `1px solid ${toggleHovered ? COLORS.primary[300] : COLORS.neutral.border}`,
          backgroundColor: toggleHovered ? COLORS.primary[50] : COLORS.neutral.white,
          color: toggleHovered ? COLORS.primary.DEFAULT : COLORS.neutral.textSecondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: toggleHovered ? SHADOWS.md : SHADOWS.sm,
          transition: 'all 0.15s ease-in-out',
          zIndex: 20
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
            minHeight: '38px'
          }}
        >
          <BrandLogo collapsed={isCollapsed} />
        </div>

        {/* Divider separating Logo and Menu */}
        <div
          style={{
            height: '1px',
            backgroundColor: COLORS.neutral.border,
            width: '100%',
            opacity: 0.8
          }}
        />
      </div>

      {/* Navigation Items Tree - Scrollable if content overflows */}
      <nav
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: '8px',
          paddingRight: isCollapsed ? '0' : '2px',
          scrollbarWidth: 'thin'
        }}
      >
        {navSections.map((section, sIdx) => (
          <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Section Header (only visible when expanded) */}
            {section.title && !isCollapsed && (
              <div
                style={{
                  fontFamily: TYPOGRAPHY.fontFamily.body,
                  fontSize: '0.68rem',
                  fontWeight: TYPOGRAPHY.fontWeight.semibold,
                  color: COLORS.neutral.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '6px 12px 2px 12px',
                  userSelect: 'none'
                }}
              >
                {section.title}
              </div>
            )}

            {/* Separator between sections when collapsed */}
            {section.title && isCollapsed && sIdx > 0 && (
              <div
                style={{
                  height: '1px',
                  backgroundColor: COLORS.neutral.border,
                  width: '32px',
                  margin: '4px auto',
                  opacity: 0.5
                }}
              />
            )}

            {/* Items inside section */}
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
                    padding: isCollapsed ? '8px 0' : '9px 12px',
                    borderRadius: RADII.lg,
                    border: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                    backgroundColor: isActive
                      ? COLORS.primary[100]
                      : isHovered
                      ? COLORS.neutral[100]
                      : 'transparent',
                    color: isActive ? COLORS.primary[900] : COLORS.neutral.textSecondary,
                    fontFamily: TYPOGRAPHY.fontFamily.body,
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    fontWeight: isActive
                      ? TYPOGRAPHY.fontWeight.semibold
                      : TYPOGRAPHY.fontWeight.medium,
                    textAlign: 'left',
                    transition: 'all 0.15s ease-in-out',
                    width: '100%'
                  }}
                >
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: RADII.md,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isActive ? COLORS.primary.DEFAULT : 'transparent',
                      color: isActive
                        ? COLORS.primary.foreground
                        : isHovered
                        ? COLORS.primary.DEFAULT
                        : COLORS.neutral.textSecondary,
                      transition: 'all 0.15s ease',
                      flexShrink: 0
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
                        letterSpacing: '-0.01em'
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
};
