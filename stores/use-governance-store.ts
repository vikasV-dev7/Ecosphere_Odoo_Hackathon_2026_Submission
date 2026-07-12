import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Policy, PolicyAcknowledgement, Audit, ComplianceIssue } from '@/types';

interface GovernanceState {
  policies: Policy[];
  acknowledgements: PolicyAcknowledgement[];
  audits: Audit[];
  complianceIssues: ComplianceIssue[];
  
  // Policy CRUD
  addPolicy: (policy: Omit<Policy, 'id'>) => void;
  updatePolicy: (id: string, updates: Partial<Policy>) => void;
  
  // Acknowledgement actions
  createAcknowledgementsForEmployees: (policyId: string, employeeIds: string[], dueDate: string) => void;
  acknowledgePolicy: (employeeId: string, policyId: string) => void;
  sendReminder: (acknowledgementId: string) => void;
  
  // Audit CRUD
  addAudit: (audit: Omit<Audit, 'id' | 'status'> & { status?: Audit['status'] }) => void;
  updateAudit: (id: string, updates: Partial<Audit>) => void;
  
  // Compliance Issue CRUD
  addComplianceIssue: (issue: Omit<ComplianceIssue, 'id' | 'createdAt' | 'status'>) => void;
  updateComplianceIssue: (id: string, updates: Partial<ComplianceIssue>) => void;
  checkOverdueIssues: () => void;
}

const SEED_POLICIES: Policy[] = [
  {
    id: 'pol-conduct',
    title: 'Code of Sustainable Conduct',
    content: 'EcoSphere Corp is committed to minimizing our environmental impact and fostering a diverse, inclusive workplace. All employees must participate in waste separation, shut down electrical devices when leaving, and adhere to environmental parameters defined in our charter.',
    version: 'v1.4',
    effectiveDate: new Date('2026-01-01').toISOString(),
    status: 'Active',
  },
  {
    id: 'pol-procure',
    title: 'Green Procurement Policy',
    content: 'All purchase transactions exceeding $1,000 must verify the supplier\'s ESG credentials. Preference must be given to suppliers with certified zero-carbon manufacturing, fair trade certifications, or local supply chains within 200 miles.',
    version: 'v2.1',
    effectiveDate: new Date('2026-03-15').toISOString(),
    status: 'Active',
  },
  {
    id: 'pol-travel',
    title: 'Sustainable Business Travel Guide',
    content: 'Employees must favor train transit over airline flights for any trips under 300 miles. When flights are unavoidable, economy class must be booked to reduce per-passenger carbon allocation, and carbon offsets must be registered.',
    version: 'v1.0',
    effectiveDate: new Date('2026-06-01').toISOString(),
    status: 'Active',
  }
];

const SEED_ACKNOWLEDGEMENTS: PolicyAcknowledgement[] = [
  // Alice
  { id: 'ack-1', policyId: 'pol-conduct', employeeId: 'emp-alice', acknowledgedAt: new Date('2026-01-05').toISOString(), dueDate: new Date('2026-01-30').toISOString(), status: 'Acknowledged', reminderSent: false },
  { id: 'ack-2', policyId: 'pol-procure', employeeId: 'emp-alice', acknowledgedAt: new Date('2026-03-20').toISOString(), dueDate: new Date('2026-04-15').toISOString(), status: 'Acknowledged', reminderSent: false },
  // Bob
  { id: 'ack-3', policyId: 'pol-conduct', employeeId: 'emp-bob', acknowledgedAt: new Date('2026-01-12').toISOString(), dueDate: new Date('2026-01-30').toISOString(), status: 'Acknowledged', reminderSent: false },
  { id: 'ack-4', policyId: 'pol-procure', employeeId: 'emp-bob', acknowledgedAt: null, dueDate: new Date('2026-04-15').toISOString(), status: 'Overdue', reminderSent: true },
  { id: 'ack-5', policyId: 'pol-travel', employeeId: 'emp-bob', acknowledgedAt: null, dueDate: new Date('2026-07-20').toISOString(), status: 'Pending', reminderSent: false },
  // Charlie
  { id: 'ack-6', policyId: 'pol-conduct', employeeId: 'emp-charlie', acknowledgedAt: new Date('2026-03-22').toISOString(), dueDate: new Date('2026-01-30').toISOString(), status: 'Acknowledged', reminderSent: false },
  { id: 'ack-7', policyId: 'pol-procure', employeeId: 'emp-charlie', acknowledgedAt: null, dueDate: new Date('2026-04-15').toISOString(), status: 'Overdue', reminderSent: false },
  { id: 'ack-8', policyId: 'pol-travel', employeeId: 'emp-charlie', acknowledgedAt: null, dueDate: new Date('2026-07-20').toISOString(), status: 'Pending', reminderSent: false }
];

const SEED_AUDITS: Audit[] = [
  {
    id: 'aud-ops-q1',
    departmentId: 'dept-ops',
    policyId: 'pol-procure',
    auditor: 'David Mitchell (Internal Auditor)',
    findings: 'Review of procurement lists showed 85% compliance with ESG credentials. Three transactions violated the green supplier clause by ordering parts from non-certified suppliers.',
    score: 82,
    date: new Date('2026-04-10').toISOString(),
    status: 'Completed',
  },
  {
    id: 'aud-esg-q2',
    departmentId: 'dept-esg',
    policyId: 'pol-conduct',
    auditor: 'External Bureau Veritas',
    findings: 'Office emissions check, waste audits, and employee acknowledgements were reviewed. Very high engagement, 100% compliance on electrical shutdown policies.',
    score: 95,
    date: new Date('2026-06-15').toISOString(),
    status: 'Completed',
  },
  {
    id: 'aud-fleet-q3',
    departmentId: 'dept-fleet',
    policyId: 'pol-travel',
    auditor: 'David Mitchell (Internal Auditor)',
    findings: 'Scope 1 vehicle emissions logging audit. Scheduled to verify odometer readings and fuel consumption reports.',
    date: new Date('2026-07-25').toISOString(),
    status: 'Scheduled',
  }
];

const SEED_COMPLIANCE: ComplianceIssue[] = [
  {
    id: 'comp-1',
    auditId: 'aud-ops-q1',
    severity: 'Medium',
    description: 'Procurement of non-ESG certified metal brackets from supplier XYZ without sourcing approval.',
    owner: 'Bob Jones',
    dueDate: new Date('2026-07-30').toISOString(),
    status: 'Open',
    createdAt: new Date('2026-04-11').toISOString(),
  },
  {
    id: 'comp-2',
    auditId: 'aud-ops-q1',
    severity: 'High',
    description: 'Fleet logs are missing odometer details for Truck ID FL-12. Cannot verify carbon transaction fuel factors.',
    owner: 'Clark Kent',
    dueDate: new Date('2026-07-05').toISOString(), // Overdue
    status: 'Open',
    createdAt: new Date('2026-04-11').toISOString(),
  }
];

export const useGovernanceStore = create<GovernanceState>()(
  persist(
    (set, get) => ({
      policies: SEED_POLICIES,
      acknowledgements: SEED_ACKNOWLEDGEMENTS,
      audits: SEED_AUDITS,
      complianceIssues: SEED_COMPLIANCE,
      
      addPolicy: (policy) =>
        set((state) => ({
          policies: [
            ...state.policies,
            { ...policy, id: `pol-${Math.random().toString(36).substr(2, 9)}` },
          ],
        })),
        
      updatePolicy: (id, updates) =>
        set((state) => ({
          policies: state.policies.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
        
      createAcknowledgementsForEmployees: (policyId, employeeIds, dueDate) =>
        set((state) => {
          const newAcks = employeeIds.map((empId) => ({
            id: `ack-${Math.random().toString(36).substr(2, 9)}`,
            policyId,
            employeeId: empId,
            acknowledgedAt: null,
            dueDate,
            status: 'Pending' as const,
            reminderSent: false,
          }));
          return {
            acknowledgements: [...state.acknowledgements, ...newAcks],
          };
        }),
        
      acknowledgePolicy: (employeeId, policyId) =>
        set((state) => ({
          acknowledgements: state.acknowledgements.map((ack) =>
            ack.employeeId === employeeId && ack.policyId === policyId
              ? {
                  ...ack,
                  acknowledgedAt: new Date().toISOString(),
                  status: 'Acknowledged' as const,
                }
              : ack
          ),
        })),
        
      sendReminder: (id) =>
        set((state) => ({
          acknowledgements: state.acknowledgements.map((ack) =>
            ack.id === id ? { ...ack, reminderSent: true } : ack
          ),
        })),
        
      addAudit: (audit) =>
        set((state) => ({
          audits: [
            ...state.audits,
            {
              ...audit,
              id: `aud-${Math.random().toString(36).substr(2, 9)}`,
              status: audit.status || 'Scheduled',
            },
          ],
        })),
        
      updateAudit: (id, updates) =>
        set((state) => ({
          audits: state.audits.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),
        
      addComplianceIssue: (issue) =>
        set((state) => ({
          complianceIssues: [
            ...state.complianceIssues,
            {
              ...issue,
              id: `comp-${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date().toISOString(),
              status: new Date(issue.dueDate) < new Date() ? 'Overdue' : 'Open',
            },
          ],
        })),
        
      updateComplianceIssue: (id, updates) =>
        set((state) => ({
          complianceIssues: state.complianceIssues.map((ci) => {
            if (ci.id === id) {
              const merged = { ...ci, ...updates };
              let status = merged.status;
              if (status !== 'Resolved') {
                status = new Date(merged.dueDate) < new Date() ? 'Overdue' : 'Open';
              }
              return { ...merged, status };
            }
            return ci;
          }),
        })),
        
      checkOverdueIssues: () =>
        set((state) => {
          const now = new Date();
          return {
            complianceIssues: state.complianceIssues.map((ci) => {
              if (ci.status !== 'Resolved' && new Date(ci.dueDate) < now) {
                return { ...ci, status: 'Overdue' };
              }
              return ci;
            }),
            acknowledgements: state.acknowledgements.map((ack) => {
              if (ack.status !== 'Acknowledged' && new Date(ack.dueDate) < now) {
                return { ...ack, status: 'Overdue' };
              }
              return ack;
            }),
          };
        }),
    }),
    {
      name: 'ecosphere-governance-storage',
    }
  )
);
