import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Challenge, ChallengeParticipation, Badge, EmployeeBadge, Reward, RewardRedemption } from '@/types';
import { useAuthStore } from './use-auth-store';
import { useConfigStore } from './use-config-store';
import { useNotificationStore } from './use-notification-store';

interface GamificationState {
  challenges: Challenge[];
  participations: ChallengeParticipation[];
  badges: Badge[];
  employeeBadges: EmployeeBadge[];
  rewards: Reward[];
  redemptions: RewardRedemption[];
  
  // Challenge Actions
  addChallenge: (challenge: Omit<Challenge, 'id' | 'createdAt' | 'status'> & { status?: Challenge['status'] }) => void;
  updateChallenge: (id: string, updates: Partial<Challenge>) => void;
  joinChallenge: (employeeId: string, challengeId: string) => void;
  updateChallengeProgress: (employeeId: string, challengeId: string, progress: number) => void;
  submitChallengeProof: (participationId: string, proof: string, proofData?: string) => void;
  approveChallengeParticipation: (participationId: string) => { success: boolean; error?: string };
  rejectChallengeParticipation: (participationId: string) => void;
  
  // Reward Actions
  addReward: (reward: Omit<Reward, 'id'>) => void;
  updateReward: (id: string, updates: Partial<Reward>) => void;
  redeemReward: (employeeId: string, rewardId: string) => { success: boolean; error?: string };
  deleteReward: (id: string) => void;
  
  // Badge Actions
  addBadge: (badge: Omit<Badge, 'id'>) => void;
  
  // Badge Engine
  evaluateBadges: (employeeId: string) => void;
}

const SEED_CHALLENGES: Challenge[] = [
  { id: 'chal-commute', title: 'Carbon-Free Commuting', categoryId: 'cat-eco-chal', description: 'Walk, cycle, carpool, or take public transit to work for 5 consecutive days. Upload a photo of your ticket/commute.', xpReward: 300, difficulty: 'Medium', evidenceRequired: true, deadline: new Date('2026-07-31').toISOString(), status: 'Active', createdAt: new Date('2026-07-01').toISOString() },
  { id: 'chal-plastic', title: 'Zero Single-Use Plastics', categoryId: 'cat-office-chal', description: 'Commit to using reusable bottles and food containers at the office. Take a photo of your reusable setup.', xpReward: 150, difficulty: 'Easy', evidenceRequired: true, deadline: new Date('2026-07-25').toISOString(), status: 'Active', createdAt: new Date('2026-07-01').toISOString() },
  { id: 'chal-energy', title: 'Eco Office Shutdown', categoryId: 'cat-office-chal', description: 'Turn off all monitors, desk lamps, and local power strips before leaving for the weekend.', xpReward: 100, difficulty: 'Easy', evidenceRequired: false, deadline: new Date('2026-07-15').toISOString(), status: 'Completed', createdAt: new Date('2026-07-01').toISOString() }
];

const SEED_PARTICIPATIONS: ChallengeParticipation[] = [
  { id: 'cpart-1', challengeId: 'chal-commute', employeeId: 'emp-charlie', progress: 60, approvalStatus: 'InProgress', xpAwarded: 0, createdAt: new Date('2026-07-05').toISOString() },
  { id: 'cpart-2', challengeId: 'chal-plastic', employeeId: 'emp-charlie', progress: 100, proof: 'Reusable bottle at desk.', approvalStatus: 'Submitted', xpAwarded: 0, createdAt: new Date('2026-07-06').toISOString() },
  { id: 'cpart-3', challengeId: 'chal-energy', employeeId: 'emp-bob', progress: 100, approvalStatus: 'Approved', xpAwarded: 100, completedAt: new Date('2026-07-15').toISOString(), createdAt: new Date('2026-07-14').toISOString() }
];

const SEED_BADGES: Badge[] = [
  { id: 'bdg-warrior', name: 'Eco Warrior', description: 'Earn over 1,000 XP in sustainability initiatives.', unlockRule: { type: 'xp_threshold', value: 1000 }, icon: 'ShieldAlert', xpBonus: 200 },
  { id: 'bdg-streak', name: 'Consistent Green', description: 'Maintain a 5-day interaction streak on the platform.', unlockRule: { type: 'streak_days', value: 5 }, icon: 'Zap', xpBonus: 150 },
  { id: 'bdg-champion', name: 'Challenge Champion', description: 'Complete 3 ESG challenges successfully.', unlockRule: { type: 'challenges_completed', value: 3 }, icon: 'Award', xpBonus: 300 }
];

const SEED_EMPLOYEE_BADGES: EmployeeBadge[] = [
  { id: 'eb-1', employeeId: 'emp-alice', badgeId: 'bdg-warrior', unlockedAt: new Date('2026-05-10').toISOString() },
  { id: 'eb-2', employeeId: 'emp-alice', badgeId: 'bdg-streak', unlockedAt: new Date('2026-05-15').toISOString() },
  { id: 'eb-3', employeeId: 'emp-bob', badgeId: 'bdg-warrior', unlockedAt: new Date('2026-06-20').toISOString() }
];

const SEED_REWARDS: Reward[] = [
  { id: 'rew-mug', name: 'Recycled Bamboo Coffee Mug', description: 'EcoSphere branded double-walled insulated travel mug made from 100% recycled bamboo fiber.', pointsRequired: 150, stock: 25, status: 'Active' },
  { id: 'rew-tote', name: 'Organic Cotton Tote Bag', description: 'Heavy-duty organic canvas tote bag with reinforced handles, perfect for grocery shopping.', pointsRequired: 100, stock: 40, status: 'Active' },
  { id: 'rew-cert', name: 'Sapling Planting Dedication', description: 'A sapling planted in your name in our reforestation zone, complete with physical coordinates and certificate.', pointsRequired: 300, stock: 100, status: 'Active' },
  { id: 'rew-remote', name: 'Extra Work From Home Day', description: 'Voucher for one additional remote work day (requires department manager approval).', pointsRequired: 500, stock: 5, status: 'Active' }
];

const SEED_REDEMPTIONS: RewardRedemption[] = [
  { id: 'rdm-1', employeeId: 'emp-alice', rewardId: 'rew-tote', pointsSpent: 100, redeemedAt: new Date('2026-06-01').toISOString(), status: 'Fulfilled' },
  { id: 'rdm-2', employeeId: 'emp-bob', rewardId: 'rew-mug', pointsSpent: 150, redeemedAt: new Date('2026-07-02').toISOString(), status: 'Fulfilled' }
];

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      challenges: SEED_CHALLENGES,
      participations: SEED_PARTICIPATIONS,
      badges: SEED_BADGES,
      employeeBadges: SEED_EMPLOYEE_BADGES,
      rewards: SEED_REWARDS,
      redemptions: SEED_REDEMPTIONS,
      
      addChallenge: (chal) =>
        set((state) => ({
          challenges: [
            ...state.challenges,
            {
              ...chal,
              id: `chal-${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date().toISOString(),
              status: chal.status || 'Draft',
            },
          ],
        })),
        
      updateChallenge: (id, updates) =>
        set((state) => ({
          challenges: state.challenges.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
        
      joinChallenge: (employeeId, challengeId) =>
        set((state) => {
          const chal = state.challenges.find((c) => c.id === challengeId);
          if (!chal || chal.status !== 'Active') return {};
          
          const exists = state.participations.some((p) => p.employeeId === employeeId && p.challengeId === challengeId);
          if (exists) return {};
          
          const newPart: ChallengeParticipation = {
            id: `cpart-${Math.random().toString(36).substr(2, 9)}`,
            challengeId,
            employeeId,
            progress: 0,
            approvalStatus: 'InProgress',
            xpAwarded: 0,
            createdAt: new Date().toISOString(),
          };
          return {
            participations: [newPart, ...state.participations],
          };
        }),
        
      updateChallengeProgress: (employeeId, challengeId, progress) =>
        set((state) => ({
          participations: state.participations.map((p) =>
            p.employeeId === employeeId && p.challengeId === challengeId
              ? { ...p, progress: Math.min(100, Math.max(0, progress)) }
              : p
          ),
        })),
        
      submitChallengeProof: (id, proof, proofData) =>
        set((state) => ({
          participations: state.participations.map((p) =>
            p.id === id
              ? {
                  ...p,
                  proof,
                  proofData,
                  progress: 100,
                  approvalStatus: 'Submitted',
                }
              : p
          ),
        })),
        
      approveChallengeParticipation: (id) => {
        const part = get().participations.find((p) => p.id === id);
        if (!part) return { success: false, error: 'Participation record not found' };
        
        const chal = get().challenges.find((c) => c.id === part.challengeId);
        if (!chal) return { success: false, error: 'Challenge not found' };
        
        const config = useConfigStore.getState().config;
        
        // Business Rule 2: Evidence Requirement
        if (config.evidenceRequired && chal.evidenceRequired && !part.proof && !part.proofData) {
          return { success: false, error: 'Evidence required per organization policy' };
        }
        
        const xpAwarded = chal.xpReward;
        
        set((state) => ({
          participations: state.participations.map((p) =>
            p.id === id
              ? {
                  ...p,
                  approvalStatus: 'Approved',
                  xpAwarded,
                  completedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
        
        // Update employee XP and points
        const authStore = useAuthStore.getState();
        const updatedEmployees = authStore.mockEmployees.map((emp) => {
          if (emp.id === part.employeeId) {
            const nextXp = emp.xp + xpAwarded;
            const updated = {
              ...emp,
              xp: nextXp,
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
        
        // Evaluate badges
        if (config.autoBadgeAward) {
          get().evaluateBadges(part.employeeId);
        }
        
        return { success: true };
      },
      
      rejectChallengeParticipation: (id) =>
        set((state) => ({
          participations: state.participations.map((p) =>
            p.id === id ? { ...p, approvalStatus: 'Rejected' } : p
          ),
        })),
        
      addReward: (reward) =>
        set((state) => ({
          rewards: [
            ...state.rewards,
            { ...reward, id: `rew-${Math.random().toString(36).substr(2, 9)}` },
          ],
        })),
        
      updateReward: (id, updates) =>
        set((state) => ({
          rewards: state.rewards.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),
        
      deleteReward: (id) =>
        set((state) => ({
          rewards: state.rewards.filter((r) => r.id !== id),
        })),

      addBadge: (badge) =>
        set((state) => ({
          badges: [
            ...state.badges,
            { ...badge, id: `bdg-${Math.random().toString(36).substr(2, 9)}` },
          ],
        })),
        
      redeemReward: (employeeId, rewardId) => {
        const reward = get().rewards.find((r) => r.id === rewardId);
        if (!reward || reward.status !== 'Active') return { success: false, error: 'Reward is not available' };
        
        // Business Rule 6: Reward Redemption
        const authStore = useAuthStore.getState();
        const employee = authStore.mockEmployees.find((e) => e.id === employeeId);
        
        if (!employee) return { success: false, error: 'Employee not found' };
        
        if (employee.totalPoints < reward.pointsRequired) {
          return { success: false, error: 'Insufficient points balance' };
        }
        
        if (reward.stock <= 0) {
          return { success: false, error: 'Reward is out of stock' };
        }
        
        // Atomic deduction
        set((state) => ({
          rewards: state.rewards.map((r) =>
            r.id === rewardId ? { ...r, stock: r.stock - 1 } : r
          ),
          redemptions: [
            {
              id: `rdm-${Math.random().toString(36).substr(2, 9)}`,
              employeeId,
              rewardId,
              pointsSpent: reward.pointsRequired,
              redeemedAt: new Date().toISOString(),
              status: 'Fulfilled',
            },
            ...state.redemptions,
          ],
        }));
        
        // Update employee points
        const updatedEmployees = authStore.mockEmployees.map((emp) => {
          if (emp.id === employeeId) {
            const nextPoints = emp.totalPoints - reward.pointsRequired;
            const updated = {
              ...emp,
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
        
        // Create in-app notification
        useNotificationStore.getState().addNotification({
          userId: employeeId,
          type: 'badge_unlock', // general type
          title: 'Reward Redeemed!',
          message: `You successfully redeemed "${reward.name}" for ${reward.pointsRequired} points.`,
        });
        
        return { success: true };
      },
      
      evaluateBadges: (employeeId) => {
        const authStore = useAuthStore.getState();
        const employee = authStore.mockEmployees.find((e) => e.id === employeeId);
        if (!employee) return;
        
        const state = get();
        const earnedBadges = state.employeeBadges.filter((eb) => eb.employeeId === employeeId);
        const earnedBadgeIds = new Set(earnedBadges.map((eb) => eb.badgeId));
        
        const completedChallengesCount = state.participations.filter(
          (p) => p.employeeId === employeeId && p.approvalStatus === 'Approved'
        ).length;
        
        let unlockedAny = false;
        const newEmployeeBadges = [...state.employeeBadges];
        let employeeXpBonus = 0;
        
        state.badges.forEach((badge) => {
          // Skip if already earned
          if (earnedBadgeIds.has(badge.id)) return;
          
          let meetsCondition = false;
          if (badge.unlockRule.type === 'xp_threshold') {
            meetsCondition = employee.xp >= badge.unlockRule.value;
          } else if (badge.unlockRule.type === 'challenges_completed') {
            meetsCondition = completedChallengesCount >= badge.unlockRule.value;
          } else if (badge.unlockRule.type === 'streak_days') {
            meetsCondition = employee.streakDays >= badge.unlockRule.value;
          }
          
          if (meetsCondition) {
            unlockedAny = true;
            employeeXpBonus += badge.xpBonus;
            
            newEmployeeBadges.push({
              id: `eb-${Math.random().toString(36).substr(2, 9)}`,
              employeeId,
              badgeId: badge.id,
              unlockedAt: new Date().toISOString(),
            });
            
            // Add notification
            setTimeout(() => {
              useNotificationStore.getState().addNotification({
                userId: employeeId,
                type: 'badge_unlock',
                title: '🏆 New Badge Unlocked!',
                message: `Congratulations! You unlocked the "${badge.name}" badge and earned a bonus of +${badge.xpBonus} XP!`,
                data: { badgeId: badge.id, confetti: true },
              });
            }, 0);
          }
        });
        
        if (unlockedAny) {
          set({ employeeBadges: newEmployeeBadges });
          
          // Add XP bonus to employee
          const updatedEmployees = authStore.mockEmployees.map((emp) => {
            if (emp.id === employeeId) {
              const updated = {
                ...emp,
                xp: emp.xp + employeeXpBonus,
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
        }
      },
    }),
    {
      name: 'ecosphere-gamification-storage',
    }
  )
);
