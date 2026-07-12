import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Employee, UserRole } from '@/types';

interface AuthState {
  currentUser: Employee | null;
  activeRole: UserRole;
  setCurrentUser: (user: Employee) => void;
  setActiveRole: (role: UserRole) => void;
  mockEmployees: Employee[];
  switchUserByRole: (role: UserRole) => void;
}

const SEED_EMPLOYEES: Employee[] = [
  {
    id: 'emp-alice',
    name: 'Alice Smith',
    email: 'alice@ecosphere.com',
    role: 'Admin',
    departmentId: 'dept-esg',
    xp: 2500,
    totalPoints: 1800,
    streakDays: 12,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    createdAt: new Date('2026-01-10').toISOString(),
  },
  {
    id: 'emp-bob',
    name: 'Bob Jones',
    email: 'bob@ecosphere.com',
    role: 'DepartmentHead',
    departmentId: 'dept-ops',
    xp: 1400,
    totalPoints: 950,
    streakDays: 5,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    createdAt: new Date('2026-02-15').toISOString(),
  },
  {
    id: 'emp-charlie',
    name: 'Charlie Brown',
    email: 'charlie@ecosphere.com',
    role: 'Employee',
    departmentId: 'dept-rd',
    xp: 450,
    totalPoints: 300,
    streakDays: 3,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    createdAt: new Date('2026-03-20').toISOString(),
  }
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: SEED_EMPLOYEES[0],
      activeRole: 'Admin',
      mockEmployees: SEED_EMPLOYEES,
      setCurrentUser: (user) => set({ currentUser: user, activeRole: user.role }),
      setActiveRole: (role) => set({ activeRole: role }),
      switchUserByRole: (role) => {
        const match = get().mockEmployees.find((e) => e.role === role);
        if (match) {
          set({ currentUser: match, activeRole: role });
        }
      },
    }),
    {
      name: 'ecosphere-auth-storage',
    }
  )
);
