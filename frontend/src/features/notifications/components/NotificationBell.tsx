import React, { useState, useEffect, useRef, useContext } from 'react';
import { useTheme, RADII } from '@/shared/theme';
import { AuthContext } from '@/shared/auth/auth-context';
import { Bell, Check, CheckCheck, Mail, MailOpen, Settings, RefreshCw } from 'lucide-react';
import { notificationApi } from '../api/notification-api';
import type { NotificationLog } from '../types/notification-types';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

export const NotificationBell: React.FC = () => {
  const { isDark } = useTheme();
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [hoveredToggle, setHoveredToggle] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Fetch notifications
  const fetchNotifications = React.useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await notificationApi.getMyNotifications(30);
      setNotifications(data.items);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('[NotificationBell] Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Polling every 60s for new notifications
      const timer = setInterval(fetchNotifications, 60000);
      return () => clearInterval(timer);
    }
  }, [user, fetchNotifications]);

  // Toggle read / unread status on click
  const handleToggleRead = async (e: React.MouseEvent, item: NotificationLog) => {
    e.stopPropagation();
    const willBeRead = !item.readAt;

    // Optimistic state update
    setNotifications((prev) =>
      prev.map((n) =>
        n.notificationLogId === item.notificationLogId
          ? { ...n, readAt: willBeRead ? new Date().toISOString() : null }
          : n
      )
    );
    setUnreadCount((prev) => (willBeRead ? Math.max(0, prev - 1) : prev + 1));

    try {
      await notificationApi.toggleNotificationRead(item.notificationLogId, willBeRead);
    } catch (err) {
      console.error('[NotificationBell] Error toggling notification read status:', err);
      // Revert on failure
      fetchNotifications();
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      await notificationApi.markAllNotificationsRead();
    } catch (err) {
      console.error('[NotificationBell] Error marking all notifications as read:', err);
      fetchNotifications();
    }
  };

  if (!user) return null;

  const displayedNotifications =
    filter === 'UNREAD'
      ? notifications.filter((n) => !n.readAt)
      : notifications;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        onMouseEnter={() => setHoveredToggle(true)}
        onMouseLeave={() => setHoveredToggle(false)}
        title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
        aria-label="Notifications"
        aria-expanded={isOpen}
        style={{
          position: 'relative',
          width: '38px',
          height: '38px',
          borderRadius: RADII.lg,
          border: `1px solid ${
            hoveredToggle || isOpen
              ? isDark
                ? '#4B5563'
                : '#CBD5E1'
              : isDark
              ? '#374151'
              : '#E2E8F0'
          }`,
          backgroundColor: isDark
            ? hoveredToggle || isOpen
              ? '#374151'
              : '#1F2937'
            : hoveredToggle || isOpen
            ? '#F1F5F9'
            : '#FFFFFF',
          color: isDark ? '#E5E7EB' : '#475569',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.18s ease-in-out',
          boxShadow: hoveredToggle || isOpen ? '0 2px 4px rgba(0, 0, 0, 0.08)' : 'none',
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              borderRadius: '9999px',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${isDark ? '#111827' : '#FFFFFF'}`,
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Quick View Notification Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '380px',
            maxWidth: '90vw',
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderRadius: RADII.lg,
            border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
            boxShadow: isDark
              ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
              : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
            zIndex: 100,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Popover Header */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: `1px solid ${isDark ? '#334155' : '#F1F5F9'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '15px', color: isDark ? '#F8FAFC' : '#0F172A' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
                    color: '#EF4444',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={fetchNotifications}
                title="Refresh"
                style={{
                  background: 'none',
                  border: 'none',
                  color: isDark ? '#94A3B8' : '#64748B',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: RADII.sm,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  title="Mark all as read"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3B82F6',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 6px',
                    borderRadius: RADII.sm,
                  }}
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div
            style={{
              display: 'flex',
              padding: '8px 16px',
              gap: '8px',
              backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
              borderBottom: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
            }}
          >
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                backgroundColor: filter === 'ALL' ? (isDark ? '#334155' : '#E2E8F0') : 'transparent',
                color: filter === 'ALL' ? (isDark ? '#F8FAFC' : '#0F172A') : (isDark ? '#94A3B8' : '#64748B'),
              }}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('UNREAD')}
              style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                backgroundColor: filter === 'UNREAD' ? (isDark ? '#334155' : '#E2E8F0') : 'transparent',
                color: filter === 'UNREAD' ? (isDark ? '#F8FAFC' : '#0F172A') : (isDark ? '#94A3B8' : '#64748B'),
              }}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div
            style={{
              maxHeight: '360px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {loading && notifications.length === 0 ? (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: isDark ? '#94A3B8' : '#64748B',
                  fontSize: '13px',
                }}
              >
                Loading notifications...
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div
                style={{
                  padding: '40px 16px',
                  textAlign: 'center',
                  color: isDark ? '#94A3B8' : '#64748B',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <MailOpen size={32} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                <span style={{ fontSize: '13px' }}>
                  {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
                </span>
              </div>
            ) : (
              displayedNotifications.map((item) => {
                const isRead = Boolean(item.readAt);

                return (
                  <div
                    key={item.notificationLogId}
                    onClick={(e) => handleToggleRead(e, item)}
                    title={isRead ? 'Click to mark as unread' : 'Click to mark as read'}
                    style={{
                      padding: '12px 16px',
                      borderBottom: `1px solid ${isDark ? '#334155' : '#F1F5F9'}`,
                      backgroundColor: isRead
                        ? 'transparent'
                        : isDark
                        ? 'rgba(59, 130, 246, 0.08)'
                        : 'rgba(59, 130, 246, 0.04)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDark
                        ? 'rgba(255, 255, 255, 0.06)'
                        : 'rgba(0, 0, 0, 0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isRead
                        ? 'transparent'
                        : isDark
                        ? 'rgba(59, 130, 246, 0.08)'
                        : 'rgba(59, 130, 246, 0.04)';
                    }}
                  >
                    {/* Unread indicator dot */}
                    <div style={{ paddingTop: '5px' }}>
                      <span
                        style={{
                          display: 'block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: isRead ? 'transparent' : '#3B82F6',
                          border: isRead ? `1px solid ${isDark ? '#64748B' : '#CBD5E1'}` : 'none',
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: isRead ? 400 : 600,
                          color: isDark ? '#F1F5F9' : '#0F172A',
                          lineHeight: 1.4,
                          marginBottom: '4px',
                          wordBreak: 'break-word',
                        }}
                      >
                        {item.subjectRendered}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '11px',
                          color: isDark ? '#94A3B8' : '#64748B',
                        }}
                      >
                        <span
                          style={{
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 500,
                            backgroundColor: isDark ? '#334155' : '#F1F5F9',
                            color: isDark ? '#CBD5E1' : '#475569',
                          }}
                        >
                          {item.notificationType}
                        </span>
                        <span>{formatRelativeTime(item.createdAt)}</span>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleRead(e, item)}
                      title={isRead ? 'Mark as unread' : 'Mark as read'}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isRead ? (isDark ? '#64748B' : '#94A3B8') : '#3B82F6',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: RADII.sm,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isRead ? <Mail size={15} /> : <Check size={15} />}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Popover Footer */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: `1px solid ${isDark ? '#334155' : '#F1F5F9'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: isDark ? '#1E293B' : '#FAFAFA',
              fontSize: '12px',
            }}
          >
            <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              Click item to toggle read/unread
            </span>
            <a
              href="/notifications/preferences"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
                window.location.href = '/notifications/preferences';
              }}
              style={{
                color: '#3B82F6',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 500,
              }}
            >
              <Settings size={13} />
              Preferences
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
