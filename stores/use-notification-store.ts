import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Notification } from '@/types';

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (userId: string) => void;
  clearNotifications: (userId: string) => void;
  pushSubscription: PushSubscription | null;
  setPushSubscription: (sub: PushSubscription | null) => void;
}

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'not-1',
    userId: 'emp-charlie',
    type: 'badge_unlock',
    title: '🏆 Welcome to EcoSphere',
    message: 'Start participating in CSR activities and Eco challenges to earn XP, level up, and redeem rewards!',
    read: false,
    createdAt: new Date('2026-07-10').toISOString(),
  },
  {
    id: 'not-2',
    userId: 'emp-bob',
    type: 'compliance_issue',
    title: '⚠️ Action Required: Compliance Issue',
    message: 'A compliance issue "Waste sorting at Warehouse B" was assigned to you and is due by 2026-07-30.',
    read: false,
    createdAt: new Date('2026-07-11').toISOString(),
  },
  {
    id: 'not-3',
    userId: 'emp-alice',
    type: 'csr_approval',
    title: '📝 Pending Approvals',
    message: 'Charlie Brown submitted proof for "City Park Reforestation" and is waiting for your review.',
    read: false,
    createdAt: new Date('2026-07-12').toISOString(),
  }
];

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: SEED_NOTIFICATIONS,
      pushSubscription: null,
      
      addNotification: (notification) =>
        set((state) => {
          const newNot: Notification = {
            ...notification,
            id: `not-${Math.random().toString(36).substr(2, 9)}`,
            read: false,
            createdAt: new Date().toISOString(),
          };
          return {
            notifications: [newNot, ...state.notifications],
          };
        }),
        
      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
        
      markAllAsRead: (userId) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.userId === userId ? { ...n, read: true } : n
          ),
        })),
        
      clearNotifications: (userId) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.userId !== userId),
        })),
        
      setPushSubscription: (sub) => set({ pushSubscription: sub }),
    }),
    {
      name: 'ecosphere-notifications-storage',
    }
  )
);
