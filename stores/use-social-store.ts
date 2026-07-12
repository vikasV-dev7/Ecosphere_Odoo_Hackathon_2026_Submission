import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CSRActivity, EmployeeParticipation, Category } from '@/types';
import { useAuthStore } from './use-auth-store';
import { useConfigStore } from './use-config-store';

interface SocialState {
  categories: Category[];
  csrActivities: CSRActivity[];
  participations: EmployeeParticipation[];
  
  // Category Actions
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  
  // CSR Activity Actions
  addCSRActivity: (activity: Omit<CSRActivity, 'id' | 'status'> & { status?: CSRActivity['status'] }) => void;
  updateCSRActivity: (id: string, updates: Partial<CSRActivity>) => void;
  deleteCSRActivity: (id: string) => void;
  
  // Participation Actions
  joinActivity: (employeeId: string, activityId: string) => void;
  submitProof: (participationId: string, proof: string, proofData?: string) => void;
  approveParticipation: (participationId: string, adminName: string) => { success: boolean; error?: string };
  rejectParticipation: (participationId: string) => void;
}

const SEED_CATEGORIES: Category[] = [
  { id: 'cat-comm', name: 'Community Outreach', type: 'CSR_Activity', status: 'Active' },
  { id: 'cat-well', name: 'Employee Health & Wellbeing', type: 'CSR_Activity', status: 'Active' },
  { id: 'cat-env-act', name: 'Environmental Volunteering', type: 'CSR_Activity', status: 'Active' },
  { id: 'cat-eco-chal', name: 'Eco-Living Challenges', type: 'Challenge', status: 'Active' },
  { id: 'cat-office-chal', name: 'Green Office Challenges', type: 'Challenge', status: 'Active' },
];

const SEED_ACTIVITIES: CSRActivity[] = [
  {
    id: 'act-beach',
    title: 'Coastal Clean-up Drive',
    categoryId: 'cat-env-act',
    description: 'Help clean plastic waste and debris from our local coastline. Gloves and garbage bags will be provided.',
    date: new Date('2026-07-28').toISOString(),
    location: 'Sunset Beach Coast',
    maxParticipants: 50,
    xpReward: 200,
    pointsReward: 150,
    status: 'Upcoming',
    proofRequired: true,
  },
  {
    id: 'act-trees',
    title: 'City Park Reforestation',
    categoryId: 'cat-env-act',
    description: 'Planting native saplings in urban park boundaries to enhance tree canopy cover.',
    date: new Date('2026-07-10').toISOString(),
    location: 'Metro Central Park',
    maxParticipants: 30,
    xpReward: 150,
    pointsReward: 100,
    status: 'Completed',
    proofRequired: true,
  },
  {
    id: 'act-mentor',
    title: 'Youth Coding Mentorship',
    categoryId: 'cat-comm',
    description: 'Introduce basic programming and web development to underprivileged school children.',
    date: new Date('2026-07-24').toISOString(),
    location: 'Community Tech Labs',
    maxParticipants: 10,
    xpReward: 300,
    pointsReward: 200,
    status: 'Active',
    proofRequired: false,
  }
];

const SEED_PARTICIPATIONS: EmployeeParticipation[] = [
  {
    id: 'part-1',
    employeeId: 'emp-charlie',
    activityId: 'act-trees',
    proof: 'Completed planting 5 saplings in Zone B.',
    proofData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    approvalStatus: 'Pending',
    pointsEarned: 0,
    xpEarned: 0,
    createdAt: new Date('2026-07-11').toISOString(),
  },
  {
    id: 'part-2',
    employeeId: 'emp-bob',
    activityId: 'act-mentor',
    proof: 'Mentored 3 children for Scratch programming.',
    approvalStatus: 'Approved',
    pointsEarned: 200,
    xpEarned: 300,
    completionDate: new Date('2026-07-24').toISOString(),
    createdAt: new Date('2026-07-23').toISOString(),
  }
];

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
      categories: SEED_CATEGORIES,
      csrActivities: SEED_ACTIVITIES,
      participations: SEED_PARTICIPATIONS,
      
      addCategory: (cat) =>
        set((state) => ({
          categories: [...state.categories, { ...cat, id: `cat-${Math.random().toString(36).substr(2, 9)}` }],
        })),
        
      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
        
      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        })),
        
      addCSRActivity: (act) =>
        set((state) => ({
          csrActivities: [
            ...state.csrActivities,
            {
              ...act,
              id: `act-${Math.random().toString(36).substr(2, 9)}`,
              status: act.status || 'Upcoming',
            },
          ],
        })),
        
      updateCSRActivity: (id, updates) =>
        set((state) => ({
          csrActivities: state.csrActivities.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),
        
      deleteCSRActivity: (id) =>
        set((state) => ({
          csrActivities: state.csrActivities.filter((a) => a.id !== id),
        })),
        
      joinActivity: (employeeId, activityId) =>
        set((state) => {
          // Check if already joined
          const exists = state.participations.some((p) => p.employeeId === employeeId && p.activityId === activityId);
          if (exists) return {};
          
          const newPart: EmployeeParticipation = {
            id: `part-${Math.random().toString(36).substr(2, 9)}`,
            employeeId,
            activityId,
            approvalStatus: 'Pending',
            pointsEarned: 0,
            xpEarned: 0,
            createdAt: new Date().toISOString(),
          };
          return {
            participations: [newPart, ...state.participations],
          };
        }),
        
      submitProof: (id, proof, proofData) =>
        set((state) => ({
          participations: state.participations.map((p) =>
            p.id === id ? { ...p, proof, proofData, approvalStatus: 'Pending' } : p
          ),
        })),
        
      approveParticipation: (id) => {
        const config = useConfigStore.getState().config;
        const part = get().participations.find((p) => p.id === id);
        
        if (!part) return { success: false, error: 'Participation record not found' };
        
        // Business Rule 2: Evidence Requirement
        if (config.evidenceRequired && part.activityId) {
          const act = get().csrActivities.find((a) => a.id === part.activityId);
          if (act?.proofRequired && !part.proof && !part.proofData) {
            return { success: false, error: 'Evidence required per organization policy' };
          }
        }
        
        const act = get().csrActivities.find((a) => a.id === part.activityId);
        const xpEarned = act ? act.xpReward : 50;
        const pointsEarned = act ? act.pointsReward : 50;
        
        set((state) => ({
          participations: state.participations.map((p) =>
            p.id === id
              ? {
                  ...p,
                  approvalStatus: 'Approved',
                  xpEarned,
                  pointsEarned,
                  completionDate: new Date().toISOString(),
                }
              : p
          ),
        }));
        
        // Award XP and Points to employee
        const authStore = useAuthStore.getState();
        const updatedEmployees = authStore.mockEmployees.map((emp) => {
          if (emp.id === part.employeeId) {
            const nextXp = emp.xp + xpEarned;
            const nextPoints = emp.totalPoints + pointsEarned;
            const updated = {
              ...emp,
              xp: nextXp,
              totalPoints: nextPoints,
            };
            
            if (authStore.currentUser?.id === emp.id) {
              setTimeout(() => {
                authStore.setCurrentUser(updated);
              }, 0);
            }
            return updated;
          }
          return emp;
        });
        
        useAuthStore.setState({ mockEmployees: updatedEmployees });
        
        return { success: true };
      },
      
      rejectParticipation: (id) =>
        set((state) => ({
          participations: state.participations.map((p) =>
            p.id === id ? { ...p, approvalStatus: 'Rejected' } : p
          ),
        })),
    }),
    {
      name: 'ecosphere-social-storage',
    }
  )
);
