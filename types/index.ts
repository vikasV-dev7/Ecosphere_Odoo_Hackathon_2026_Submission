// Core Domain Types for EcoSphere Platform

export type UserRole = 'Admin' | 'DepartmentHead' | 'Employee';

export interface Department {
  id: string;
  name: string;
  code: string;
  head: string; // Email of the head
  parentId?: string | null;
  employeeCount: number;
  status: 'Active' | 'Inactive';
}

export interface Category {
  id: string;
  name: string;
  type: 'CSR_Activity' | 'Challenge' | 'Emission_Category';
  status: 'Active' | 'Inactive';
}

export interface EmissionFactor {
  id: string;
  name: string;
  category: 'Purchase' | 'Manufacturing' | 'Expense' | 'Fleet';
  unit: string;
  factorValue: number;
  description?: string | null;
  status: 'Active' | 'Inactive';
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  esgProfile?: any;
  status: 'Active' | 'Inactive';
}

export interface Goal {
  id: string;
  name: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string; // ISO String
  departmentId?: string | null;
  status: 'Active' | 'Completed' | 'Overdue';
}

export interface Policy {
  id: string;
  title: string;
  content: string;
  version: string;
  effectiveDate: string; // ISO String
  status: 'Active' | 'Archived';
}

export interface PolicyAcknowledgement {
  id: string;
  policyId: string;
  employeeId: string;
  acknowledgedAt?: string | null;
  dueDate: string; // ISO String
  status: 'Pending' | 'Acknowledged' | 'Overdue';
  reminderSent: boolean;
}

export interface Audit {
  id: string;
  departmentId: string;
  policyId?: string | null;
  auditor: string;
  findings: string;
  score?: number | null; // 0-100
  date: string; // ISO String
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

export interface ComplianceIssue {
  id: string;
  auditId: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  owner: string; // Employee ID or name
  dueDate: string; // ISO String
  status: 'Open' | 'Resolved' | 'Overdue';
  createdAt: string; // ISO String
}

export interface Challenge {
  id: string;
  title: string;
  categoryId: string;
  description: string;
  xpReward: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  evidenceRequired: boolean;
  deadline?: string | null; // ISO String
  status: 'Draft' | 'Active' | 'UnderReview' | 'Completed' | 'Archived';
  createdAt: string; // ISO String
}

export interface ChallengeParticipation {
  id: string;
  challengeId: string;
  employeeId: string;
  progress: number; // 0-100
  proof?: string | null; // Text or file link
  proofData?: string | null; // base64
  approvalStatus: 'InProgress' | 'Submitted' | 'Approved' | 'Rejected';
  xpAwarded: number;
  completedAt?: string | null;
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  unlockRule: {
    type: 'xp_threshold' | 'challenges_completed' | 'streak_days' | 'events_joined';
    value: number;
  };
  icon: string; // SVG code or Icon name
  xpBonus: number;
}

export interface EmployeeBadge {
  id: string;
  employeeId: string;
  badgeId: string;
  unlockedAt: string; // ISO String
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  stock: number;
  status: 'Active' | 'Inactive';
}

export interface RewardRedemption {
  id: string;
  employeeId: string;
  rewardId: string;
  pointsSpent: number;
  redeemedAt: string; // ISO String
  status: 'Pending' | 'Fulfilled' | 'Cancelled';
}

export interface Employee {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  departmentId: string;
  xp: number;
  totalPoints: number;
  streakDays: number;
  avatar?: string | null;
  createdAt: string;
}

export interface CarbonTransaction {
  id: string;
  departmentId: string;
  emissionFactorId: string;
  sourceType: 'Purchase' | 'Manufacturing' | 'Expense' | 'Fleet';
  sourceId?: string | null;
  quantity: number;
  totalEmissions: number; // quantity * factor.factorValue
  date: string; // ISO String
  autoCalculated: boolean;
  notes?: string | null;
}

export interface CSRActivity {
  id: string;
  title: string;
  categoryId: string;
  description: string;
  date: string; // ISO String
  location?: string | null;
  maxParticipants: number;
  xpReward: number;
  pointsReward: number;
  status: 'Upcoming' | 'Active' | 'Completed' | 'Cancelled';
  proofRequired: boolean;
}

export interface EmployeeParticipation {
  id: string;
  employeeId: string;
  activityId: string;
  proof?: string | null;
  proofData?: string | null; // base64
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  pointsEarned: number;
  xpEarned: number;
  completionDate?: string | null;
  createdAt: string;
}

export interface DepartmentScore {
  id: string;
  departmentId: string;
  period: string; // YYYY-MM
  environmentalScore: number;
  socialScore: number;
  governanceScore: number;
  totalScore: number;
  carbonTotal: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'badge_unlock' | 'compliance_issue' | 'csr_approval' | 'policy_reminder' | 'challenge_deadline';
  title: string;
  message: string;
  read: boolean;
  data?: any;
  createdAt: string; // ISO String
}

export interface ESGConfig {
  orgName: string;
  envWeight: number;
  socialWeight: number;
  govWeight: number;
  autoEmissionCalc: boolean;
  evidenceRequired: boolean;
  autoBadgeAward: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
}
