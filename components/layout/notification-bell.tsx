'use client';

import React from 'react';
import { useNotificationStore } from '@/stores/use-notification-store';
import { useAuthStore } from '@/stores/use-auth-store';
import { Bell, Check, Award, ShieldAlert, FileText, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

export function NotificationBell() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const { notifications, markAsRead, markAllAsRead, clearNotifications } = useNotificationStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const userNotifications = notifications.filter((n) => n.userId === currentUser.id);
  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'badge_unlock':
        return <Award className="h-4 w-4 text-amber-500" />;
      case 'compliance_issue':
        return <ShieldAlert className="h-4 w-4 text-rose-600" />;
      case 'csr_approval':
        return <Globe className="h-4 w-4 text-emerald-600" />;
      case 'policy_reminder':
        return <FileText className="h-4 w-4 text-sky-600" />;
      default:
        return <Bell className="h-4 w-4 text-[#72796d]" />;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#e8e3cb] bg-[#ffffff]/50 backdrop-blur-sm text-[#41493e] transition-all hover:bg-[#f4eedb] hover:text-[#003a03]"
        aria-label="Toggle notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#003a03] text-[9px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 z-50 w-80 rounded-xl border border-[#e8e3cb] bg-[#fff9e6] p-4 shadow-xl text-[#1e1c11]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#e8e3cb]/60 pb-3 mb-3">
              <div>
                <h3 className="font-semibold text-sm text-[#003a03]">Notifications</h3>
                <p className="text-[10px] text-[#72796d]">{unreadCount} unread alerts</p>
              </div>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead(currentUser.id)}
                    className="text-[10px] font-bold text-[#2e6b27] hover:underline"
                  >
                    Read All
                  </button>
                )}
                {userNotifications.length > 0 && (
                  <button
                    onClick={() => clearNotifications(currentUser.id)}
                    className="text-[10px] font-bold text-[#72796d] hover:text-[#41493e]"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-[#b2ad81]/50">
              {userNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-8 w-8 text-[#b2ad81] mb-2" />
                  <p className="text-xs text-[#72796d] font-semibold">All caught up!</p>
                  <p className="text-[10px] text-[#72796d]/80">No new alerts received.</p>
                </div>
              ) : (
                userNotifications.map((not) => (
                  <div
                    key={not.id}
                    className={cn(
                      "flex gap-3 rounded-lg p-2.5 transition-all text-xs border border-transparent",
                      not.read ? "bg-[#f4eedb]/30 opacity-70" : "bg-[#ffffff]/60 border-[#e8e3cb]/50 shadow-sm"
                    )}
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f4eedb]">
                      {getNotificationIcon(not.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={cn("font-medium text-[#1e1c11] truncate", !not.read && "text-[#003a03] font-semibold")}>
                          {not.title}
                        </p>
                        {!not.read && (
                          <button
                            onClick={() => markAsRead(not.id)}
                            className="text-[#2e6b27] hover:text-[#003a03] rounded p-0.5"
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-[#41493e] mt-0.5 text-[11px] leading-relaxed break-words">{not.message}</p>
                      <span className="block mt-1 text-[9px] text-[#72796d] font-bold uppercase tracking-wider">
                        {new Date(not.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
