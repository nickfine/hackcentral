/**
 * NotificationCenter Component for HD26Forge
 * Displays a dropdown notification center with unread count badge
 * Supports category filtering (All, Invites, Activity, System)
 * 
 * Adapted from HD26AI for Forge Custom UI environment.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, Users, Activity, Settings, Inbox } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { cn } from '../../lib/design-system';

// Notification categories for filtering
const NOTIFICATION_CATEGORIES = [
  { id: 'all', label: 'All', icon: Inbox },
  { id: 'invites', label: 'Invites', icon: Users, types: ['TEAM_INVITE', 'JOIN_REQUEST'] },
  { id: 'activity', label: 'Activity', icon: Activity, types: ['PHASE_CHANGE', 'TEAM_UPDATE'] },
  { id: 'system', label: 'System', icon: Settings, types: ['REMINDER', 'ANNOUNCEMENT'] },
];

function NotificationCenter({ 
  notifications = [], 
  unreadCount = 0, 
  onMarkAsRead, 
  onMarkAllAsRead, 
  onNavigate,
  loading = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const dropdownRef = useRef(null);

  // Filter notifications by category
  const filteredNotifications = useMemo(() => {
    if (activeCategory === 'all') return notifications;
    const category = NOTIFICATION_CATEGORIES.find(c => c.id === activeCategory);
    if (!category?.types) return notifications;
    return notifications.filter(n => category.types.includes(n.type));
  }, [notifications, activeCategory]);

  // Count unread per category
  const categoryUnreadCounts = useMemo(() => {
    const counts = { all: unreadCount };
    NOTIFICATION_CATEGORIES.forEach(cat => {
      if (cat.types) {
        counts[cat.id] = notifications.filter(n => !n.read && cat.types.includes(n.type)).length;
      }
    });
    return counts;
  }, [notifications, unreadCount]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification) => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }

    if (notification.actionUrl && onNavigate) {
      // Parse actionUrl to determine navigation
      // Format: "marketplace" or "teams?teamId=xxx"
      const [view, query] = notification.actionUrl.split('?');
      const params = query ? Object.fromEntries(new URLSearchParams(query)) : {};
      onNavigate(view, params);
    }

    setIsOpen(false);
  };

  const formatTime = (createdAt) => {
    const now = new Date();
    const time = new Date(createdAt);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'TEAM_INVITE':
        return '👥';
      case 'JOIN_REQUEST':
        return '✋';
      case 'PHASE_CHANGE':
        return '🔄';
      case 'REMINDER':
        return '⏰';
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'hover:bg-arena-elevated',
          isOpen && 'bg-arena-elevated'
        )}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5 text-text-secondary" aria-hidden="true" />
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-xs font-bold rounded-full flex items-center justify-center"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-arena-card border-2 border-arena-border rounded-lg shadow-xl z-50 max-h-[480px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-arena-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-text-secondary" aria-hidden="true" />
              <span className="font-bold text-sm text-text-primary">Notifications</span>
              {unreadCount > 0 && (
                <Badge className="bg-error text-white text-xs">{unreadCount}</Badge>
              )}
            </div>
            {unreadCount > 0 && onMarkAllAsRead && (
              <button
                type="button"
                onClick={() => {
                  onMarkAllAsRead();
                }}
                className="text-xs text-brand hover:text-brand/80 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="px-2 py-2 border-b border-arena-border flex gap-1 overflow-x-auto">
            {NOTIFICATION_CATEGORIES.map((category) => {
              const Icon = category.icon;
              const count = categoryUnreadCounts[category.id] || 0;
              const isActive = activeCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                    isActive
                      ? 'bg-brand/20 text-brand'
                      : 'text-arena-secondary hover:bg-arena-elevated hover:text-text-primary'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {category.label}
                  {count > 0 && category.id !== 'all' && (
                    <span className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                      isActive ? 'bg-brand text-white' : 'bg-arena-elevated text-arena-secondary'
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Notifications List */}
          <div 
            className="overflow-y-auto flex-1"
            role="region"
            aria-label="Notification list"
            aria-live="polite"
          >
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-brand border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-arena-muted">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-3xl mb-2">
                  {activeCategory === 'invites' ? '👥' : 
                   activeCategory === 'activity' ? '📊' : 
                   activeCategory === 'system' ? '⚙️' : '📭'}
                </div>
                <p className="text-sm font-medium text-text-secondary mb-1">
                  {activeCategory === 'all' ? 'No notifications yet' :
                   activeCategory === 'invites' ? 'No team invites' :
                   activeCategory === 'activity' ? 'No activity updates' :
                   'No system notifications'}
                </p>
                <p className="text-xs text-arena-muted">
                  {activeCategory === 'invites' ? 'Team invitations will appear here' :
                   activeCategory === 'activity' ? 'Phase changes and updates will appear here' :
                   activeCategory === 'system' ? 'Reminders and announcements will appear here' :
                   'You\'re all caught up!'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-arena-border">
                {filteredNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'w-full px-4 py-3 text-left hover:bg-arena-elevated transition-colors',
                      !notification.read && 'bg-arena-elevated/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0',
                        notification.type === 'TEAM_INVITE' || notification.type === 'JOIN_REQUEST'
                          ? 'bg-blue-500/20'
                          : notification.type === 'PHASE_CHANGE' || notification.type === 'TEAM_UPDATE'
                          ? 'bg-emerald-500/20'
                          : 'bg-amber-500/20'
                      )}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className={cn(
                            'text-sm font-semibold',
                            !notification.read ? 'text-text-primary' : 'text-arena-secondary'
                          )}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-brand rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-arena-muted mb-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-arena-muted">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
