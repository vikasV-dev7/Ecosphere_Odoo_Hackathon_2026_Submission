import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'prisma', 'dev_db.json');

// Realistic Seed Data
const SEED_DATA = {
  departments: [
    { id: 'dept-esg', name: 'Sustainability & ESG', code: 'ESG', head: 'alice@ecosphere.com', parentId: null, status: 'Active' },
    { id: 'dept-ops', name: 'Operations & Logistics', code: 'OPS', head: 'bob@ecosphere.com', parentId: null, status: 'Active' },
    { id: 'dept-rd', name: 'Research & Development', code: 'RD', head: 'diana@ecosphere.com', parentId: null, status: 'Active' },
    { id: 'dept-hr', name: 'Human Resources', code: 'HR', head: 'frank@ecosphere.com', parentId: null, status: 'Active' },
    { id: 'dept-sales', name: 'Sales & Marketing', code: 'MKT', head: 'bruce@ecosphere.com', parentId: null, status: 'Active' },
    { id: 'dept-fleet', name: 'Fleet Transport Group', code: 'FLEET', head: 'clark@ecosphere.com', parentId: 'dept-ops', status: 'Active' }
  ],
  employees: [
    { id: 'emp-alice', email: 'alice@ecosphere.com', name: 'Alice Smith', role: 'Admin', departmentId: 'dept-esg', xp: 2500, totalPoints: 1800, streakDays: 12, longestStreak: 15, lastActivityDate: new Date().toISOString(), avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
    { id: 'emp-bob', email: 'bob@ecosphere.com', name: 'Bob Jones', role: 'DepartmentHead', departmentId: 'dept-ops', xp: 1400, totalPoints: 950, streakDays: 5, longestStreak: 7, lastActivityDate: new Date().toISOString(), avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
    { id: 'emp-charlie', email: 'charlie@ecosphere.com', name: 'Charlie Brown', role: 'Employee', departmentId: 'dept-rd', xp: 450, totalPoints: 300, streakDays: 3, longestStreak: 3, lastActivityDate: new Date().toISOString(), avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' }
  ],
  categories: [
    { id: 'cat-comm', name: 'Community Outreach', type: 'CSR_Activity', status: 'Active' },
    { id: 'cat-well', name: 'Employee Health & Wellbeing', type: 'CSR_Activity', status: 'Active' },
    { id: 'cat-env-act', name: 'Environmental Volunteering', type: 'CSR_Activity', status: 'Active' },
    { id: 'cat-eco-chal', name: 'Eco-Living Challenges', type: 'Challenge', status: 'Active' },
    { id: 'cat-office-chal', name: 'Green Office Challenges', type: 'Challenge', status: 'Active' }
  ],
  emissionFactors: [
    { id: 'fact-elec', name: 'Grid Electricity', category: 'Purchase', unit: 'kWh', factorValue: 0.42, description: 'Average grid mix carbon intensity', status: 'Active' },
    { id: 'fact-gas', name: 'Natural Gas Heating', category: 'Purchase', unit: 'm3', factorValue: 2.03, description: 'Natural gas combustion emissions', status: 'Active' },
    { id: 'fact-steel', name: 'Steel Sourcing', category: 'Manufacturing', unit: 'kg', factorValue: 1.85, description: 'Primary steel production emission factor', status: 'Active' },
    { id: 'fact-plastic', name: 'PET Plastic Granules', category: 'Manufacturing', unit: 'kg', factorValue: 3.1, description: 'Virgin PET plastic material', status: 'Active' },
    { id: 'fact-flight', name: 'Short-haul Business Flight', category: 'Expense', unit: 'passenger-km', factorValue: 0.15, description: 'Business flight carbon impact per km', status: 'Active' },
    { id: 'fact-diesel', name: 'Fleet Diesel Fuel', category: 'Fleet', unit: 'liters', factorValue: 2.68, description: 'Diesel commercial vehicle fuel consumption', status: 'Active' },
    { id: 'fact-petrol', name: 'Fleet Petrol Fuel', category: 'Fleet', unit: 'liters', factorValue: 2.31, description: 'Standard unleaded commercial fuel', status: 'Active' }
  ],
  carbonTransactions: [
    { id: 'tx-1', departmentId: 'dept-ops', emissionFactorId: 'fact-elec', sourceType: 'Purchase', quantity: 12000, totalEmissions: 5040, date: new Date('2026-07-01').toISOString(), autoCalculated: true, notes: 'Monthly plant electricity' },
    { id: 'tx-2', departmentId: 'dept-ops', emissionFactorId: 'fact-diesel', sourceType: 'Fleet', quantity: 800, totalEmissions: 2144, date: new Date('2026-07-02').toISOString(), autoCalculated: true, notes: 'Fleet logistics delivery' },
    { id: 'tx-3', departmentId: 'dept-rd', emissionFactorId: 'fact-steel', sourceType: 'Manufacturing', quantity: 450, totalEmissions: 832.5, date: new Date('2026-07-03').toISOString(), autoCalculated: false, notes: 'Prototype fabrication' },
    { id: 'tx-4', departmentId: 'dept-esg', emissionFactorId: 'fact-flight', sourceType: 'Expense', quantity: 2400, totalEmissions: 360, date: new Date('2026-07-04').toISOString(), autoCalculated: true, notes: 'ESG audit team travel' },
    { id: 'tx-5', departmentId: 'dept-sales', emissionFactorId: 'fact-petrol', sourceType: 'Fleet', quantity: 150, totalEmissions: 346.5, date: new Date('2026-07-05').toISOString(), autoCalculated: true, notes: 'Sales team local travel' }
  ],
  goals: [
    { id: 'goal-carbon', name: 'Reduce Carbon Footprint', description: 'Reduce total scope 1 & 2 carbon emissions', targetValue: 10000, currentValue: 6420, unit: 'kg CO2e', deadline: new Date('2026-12-31').toISOString(), departmentId: 'dept-esg', status: 'Active', imageData: null },
    { id: 'goal-fleet', name: 'Green Fleet Transition', description: 'Reduce diesel fleet fuel usage by transitioning to hybrid/electric vehicles', targetValue: 5000, currentValue: 2100, unit: 'liters', deadline: new Date('2026-09-30').toISOString(), departmentId: 'dept-ops', status: 'Active', imageData: null },
    { id: 'goal-rd', name: 'Eco-Material Integration', description: 'Ensure R&D uses sustainable polymers and metals', targetValue: 80, currentValue: 55, unit: '% materials', deadline: new Date('2026-11-15').toISOString(), departmentId: 'dept-rd', status: 'Active', imageData: null }
  ],
  departmentScores: [
    { id: 'ds-1', departmentId: 'dept-ops', period: '2026-07', environmentalScore: 85, socialScore: 90, governanceScore: 80, totalScore: 85, carbonTotal: 7184 },
    { id: 'ds-2', departmentId: 'dept-esg', period: '2026-07', environmentalScore: 98, socialScore: 95, governanceScore: 96, totalScore: 97, carbonTotal: 360 }
  ],
  scoreBreakdowns: [],
  configs: [
    { id: 'singleton', orgName: 'EcoSphere Corp', envWeight: 0.4, socialWeight: 0.3, govWeight: 0.3, autoEmissionCalc: true, evidenceRequired: true, autoBadgeAward: true, pushNotifications: true, emailNotifications: true }
  ],
  csrActivities: [
    { id: 'csr-1', name: 'Park Reforestation Project', description: 'Help plant native canopy species to sequester carbon and preserve biodiversity.', targetValue: 100, unit: 'Trees', deadline: '2026-08-15T00:00:00.000Z', categoryId: 'cat-env-act', departmentId: 'dept-esg', status: 'Active', xpReward: 200, pointsReward: 100, imageUrl: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=600&q=80' },
    { id: 'csr-2', name: 'Office Ergonomics Program', description: 'Training and guidance for postural support and wellness.', targetValue: 50, unit: 'Employees', deadline: '2026-07-28T00:00:00.000Z', categoryId: 'cat-well', departmentId: 'dept-hr', status: 'Active', xpReward: 100, pointsReward: 50, imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80' }
  ],
  employeeParticipations: [
    { id: 'part-1', csrActivityId: 'csr-1', employeeId: 'emp-alice', hoursSpent: 4, status: 'Approved', createdAt: '2026-07-10T10:00:00.000Z' },
    { id: 'part-2', csrActivityId: 'csr-1', employeeId: 'emp-bob', hoursSpent: 3, status: 'Approved', createdAt: '2026-07-11T12:00:00.000Z' },
    { id: 'part-3', csrActivityId: 'csr-2', employeeId: 'emp-charlie', hoursSpent: 2, status: 'Approved', createdAt: '2026-07-12T09:00:00.000Z' }
  ],
  challenges: [
    { id: 'chal-commute', title: 'Carbon-Free Commuting', description: 'Walk, cycle, or take public transit to work for 5 days.', targetValue: 5, unit: 'Days', deadline: '2026-07-31T00:00:00.000Z', categoryId: 'cat-eco-chal', status: 'Active', xpReward: 300, pointsReward: 150, difficulty: 'Easy', progressType: 'counter', evidenceRequired: true },
    { id: 'chal-paper', title: 'Zero Waste Paper Office', description: 'Avoid printing any documents for 10 straight days.', targetValue: 10, unit: 'Days', deadline: '2026-08-15T00:00:00.000Z', categoryId: 'cat-office-chal', status: 'Active', xpReward: 400, pointsReward: 200, difficulty: 'Medium', progressType: 'counter', evidenceRequired: false }
  ],
  challengeParticipations: [
    { id: 'cp-1', challengeId: 'chal-commute', employeeId: 'emp-alice', progress: 5, approvalStatus: 'Approved', completedAt: '2026-07-08T17:00:00.000Z', xpAwarded: 300, pointsAwarded: 150 },
    { id: 'cp-2', challengeId: 'chal-commute', employeeId: 'emp-bob', progress: 3, approvalStatus: 'InProgress', completedAt: null, xpAwarded: 0, pointsAwarded: 0 }
  ],
  policies: [
    { id: 'pol-1', title: 'Corporate Environmental Code of Conduct', content: 'Detailed guidelines regarding sustainable vendor selections, energy savings, and office plastic policies.', version: 'v1.4', effectiveDate: '2026-01-01T00:00:00.000Z', status: 'Active' },
    { id: 'pol-2', title: 'Sustainable Resource Procurement Policy', content: 'Compliance guidelines for sourcing low-emission materials, metals, and standard energy requirements.', version: 'v2.1', effectiveDate: '2026-03-15T00:00:00.000Z', status: 'Active' }
  ],
  policyAcknowledgements: [
    { id: 'ack-1', policyId: 'pol-1', employeeId: 'emp-alice', status: 'Acknowledged', acknowledgedAt: '2026-06-20T10:30:00.000Z', dueDate: '2026-12-31T00:00:00.000Z', reminderSent: false },
    { id: 'ack-2', policyId: 'pol-1', employeeId: 'emp-bob', status: 'Acknowledged', acknowledgedAt: '2026-06-22T14:15:00.000Z', dueDate: '2026-12-31T00:00:00.000Z', reminderSent: false },
    { id: 'ack-3', policyId: 'pol-1', employeeId: 'emp-charlie', status: 'Pending', acknowledgedAt: null, dueDate: '2026-12-31T00:00:00.000Z', reminderSent: false },
    { id: 'ack-4', policyId: 'pol-2', employeeId: 'emp-bob', status: 'Pending', acknowledgedAt: null, dueDate: '2026-08-30T00:00:00.000Z', reminderSent: false }
  ],
  audits: [
    { id: 'aud-1', departmentId: 'dept-ops', policyId: 'pol-2', auditor: 'Alice Smith (ESG)', findings: 'Operational logistics compliant with Scope 1 diesel limits. Storage materials verified.', score: 92, date: '2026-07-02T10:00:00.000Z', status: 'Completed' },
    { id: 'aud-2', departmentId: 'dept-rd', policyId: 'pol-2', auditor: 'Alice Smith (ESG)', findings: 'R&D steel sourcing has 1 unverified vendor. Compliance gap detected in raw materials procurement.', score: 78, date: '2026-07-05T14:30:00.000Z', status: 'Completed' }
  ],
  complianceIssues: [
    { id: 'iss-1', auditId: 'aud-2', severity: 'High', description: 'Replace unverified steel vendor with green certified supplier.', owner: 'Charlie Brown (RD)', dueDate: '2026-08-15T00:00:00.000Z', status: 'Open' }
  ],
  badges: [
    { id: 'badge-1', name: 'Eco Pioneer', description: 'Cross 1,000 XP in sustainability challenges.', ruleType: 'xp_threshold', ruleValue: 1000, icon: 'Compass', xpBonus: 100 },
    { id: 'badge-2', name: 'Green Warrior', description: 'Complete 3 sustainability challenges.', ruleType: 'challenges_completed', ruleValue: 3, icon: 'ShieldCheck', xpBonus: 200 },
    { id: 'badge-3', name: 'Hot Streak', description: 'Maintain a 5-day active action streak.', ruleType: 'streak_days', ruleValue: 5, icon: 'Flame', xpBonus: 150 }
  ],
  employeeBadges: [
    { id: 'eb-1', employeeId: 'emp-alice', badgeId: 'badge-1', createdAt: '2026-06-15T12:00:00.000Z' },
    { id: 'eb-2', employeeId: 'emp-alice', badgeId: 'badge-3', createdAt: '2026-06-20T12:00:00.000Z' },
    { id: 'eb-3', employeeId: 'emp-bob', badgeId: 'badge-3', createdAt: '2026-07-10T12:00:00.000Z' }
  ],
  rewards: [
    { id: 'rew-1', name: 'Eco Stainless Water Bottle', description: 'High quality double-walled vacuum insulated bottle.', pointsRequired: 200, stock: 15, status: 'Active', imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80' },
    { id: 'rew-2', name: 'Carbon Offset Certificate (1 tCO2e)', description: 'Fund verified forestry projects to offset 1 ton of CO2.', pointsRequired: 500, stock: 50, status: 'Active', imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=80' },
    { id: 'rew-3', name: 'Extra Remote Work Day', description: 'Single day remote privilege voucher.', pointsRequired: 800, stock: 100, status: 'Active', imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=400&q=80' }
  ],
  rewardRedemptions: [
    { id: 'red-1', employeeId: 'emp-alice', rewardId: 'rew-1', pointsSpent: 200, status: 'Approved', createdAt: '2026-07-05T14:00:00.000Z' }
  ]
};

export function getFallbackDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(SEED_DATA, null, 2));
    return SEED_DATA;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(data);
    
    // Auto-patch missing tables in case of migration
    let patched = false;
    for (const [key, value] of Object.entries(SEED_DATA)) {
      if (!parsed[key]) {
        parsed[key] = value;
        patched = true;
      }
    }
    if (patched) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
    }
    return parsed;
  } catch (e) {
    return SEED_DATA;
  }
}

export function saveFallbackDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export const fallbackDb = {
  // Config
  getConfig: () => {
    const db = getFallbackDb();
    return db.configs[0] || SEED_DATA.configs[0];
  },
  saveConfig: (updates: any) => {
    const db = getFallbackDb();
    db.configs[0] = { ...db.configs[0], ...updates };
    saveFallbackDb(db);
    return db.configs[0];
  },

  // Departments
  getDepartments: () => getFallbackDb().departments,
  createDepartment: (dept: any) => {
    const db = getFallbackDb();
    const newDept = { ...dept, id: `dept-${Math.random().toString(36).substr(2, 9)}` };
    db.departments.push(newDept);
    saveFallbackDb(db);
    return newDept;
  },
  deleteDepartment: (id: string) => {
    const db = getFallbackDb();
    db.departments = db.departments.filter((d: any) => d.id !== id);
    saveFallbackDb(db);
  },

  // Employees
  getEmployees: () => getFallbackDb().employees,
  getEmployeeByEmail: (email: string) => {
    return getFallbackDb().employees.find((e: any) => e.email === email) || null;
  },
  updateEmployeeStats: (id: string, updates: { xp?: number; totalPoints?: number; streakDays?: number }) => {
    const db = getFallbackDb();
    db.employees = db.employees.map((e: any) => 
      e.id === id ? { ...e, ...updates } : e
    );
    saveFallbackDb(db);
    return db.employees.find((e: any) => e.id === id);
  },

  // Categories
  getCategories: () => getFallbackDb().categories,
  createCategory: (cat: any) => {
    const db = getFallbackDb();
    const newCat = { ...cat, id: `cat-${Math.random().toString(36).substr(2, 9)}` };
    db.categories.push(newCat);
    saveFallbackDb(db);
    return newCat;
  },
  deleteCategory: (id: string) => {
    const db = getFallbackDb();
    db.categories = db.categories.filter((c: any) => c.id !== id);
    saveFallbackDb(db);
  },

  // Emission Factors
  getFactors: () => getFallbackDb().emissionFactors,
  createFactor: (factor: any) => {
    const db = getFallbackDb();
    const newFactor = { ...factor, id: `fact-${Math.random().toString(36).substr(2, 9)}` };
    db.emissionFactors.push(newFactor);
    saveFallbackDb(db);
    return newFactor;
  },
  deleteFactor: (id: string) => {
    const db = getFallbackDb();
    db.emissionFactors = db.emissionFactors.filter((f: any) => f.id !== id);
    saveFallbackDb(db);
  },

  // Carbon Transactions
  getTransactions: () => getFallbackDb().carbonTransactions,
  createTransaction: (tx: any) => {
    const db = getFallbackDb();
    const factor = db.emissionFactors.find((f: any) => f.id === tx.emissionFactorId);
    const factorVal = factor ? factor.factorValue : 1;
    const totalEmissions = tx.quantity * factorVal;
    
    const newTx = {
      ...tx,
      id: `tx-${Math.random().toString(36).substr(2, 9)}`,
      totalEmissions,
      date: tx.date || new Date().toISOString(),
    };
    db.carbonTransactions.unshift(newTx);
    saveFallbackDb(db);
    return newTx;
  },
  deleteTransaction: (id: string) => {
    const db = getFallbackDb();
    db.carbonTransactions = db.carbonTransactions.filter((tx: any) => tx.id !== id);
    saveFallbackDb(db);
  },

  // Goals
  getGoals: () => getFallbackDb().goals,
  createGoal: (goal: any) => {
    const db = getFallbackDb();
    const newGoal = {
      ...goal,
      id: `goal-${Math.random().toString(36).substr(2, 9)}`,
      currentValue: 0,
      status: 'Active',
    };
    db.goals.push(newGoal);
    saveFallbackDb(db);
    return newGoal;
  },
  updateGoalProgress: (id: string, currentValue: number) => {
    const db = getFallbackDb();
    db.goals = db.goals.map((g: any) => {
      if (g.id === id) {
        const nextVal = Math.min(g.targetValue, Math.max(0, currentValue));
        const status = nextVal >= g.targetValue ? 'Completed' : 'Active';
        return { ...g, currentValue: nextVal, status };
      }
      return g;
    });
    saveFallbackDb(db);
    return db.goals.find((g: any) => g.id === id);
  },
  deleteGoal: (id: string) => {
    const db = getFallbackDb();
    db.goals = db.goals.filter((g: any) => g.id !== id);
    saveFallbackDb(db);
  },

  // CSR Activities & Participations
  getCSRActivities: () => getFallbackDb().csrActivities,
  createCSRActivity: (act: any) => {
    const db = getFallbackDb();
    const newAct = {
      ...act,
      id: `csr-${Math.random().toString(36).substr(2, 9)}`,
      status: 'Active',
    };
    db.csrActivities.push(newAct);
    saveFallbackDb(db);
    return newAct;
  },
  getEmployeeParticipations: () => getFallbackDb().employeeParticipations,
  participateInCSR: (part: any) => {
    const db = getFallbackDb();
    const newPart = {
      ...part,
      id: `part-${Math.random().toString(36).substr(2, 9)}`,
      status: 'Approved',
      createdAt: new Date().toISOString()
    };
    db.employeeParticipations.push(newPart);

    // Update Employee XP and Points
    const act = db.csrActivities.find((a: any) => a.id === part.csrActivityId);
    if (act) {
      db.employees = db.employees.map((e: any) => {
        if (e.id === part.employeeId) {
          return {
            ...e,
            xp: e.xp + (act.xpReward || 100),
            totalPoints: e.totalPoints + (act.pointsReward || 50)
          };
        }
        return e;
      });
    }

    saveFallbackDb(db);
    return newPart;
  },

  // Challenges
  getChallenges: () => getFallbackDb().challenges,
  createChallenge: (chal: any) => {
    const db = getFallbackDb();
    const newChal = {
      ...chal,
      id: `chal-${Math.random().toString(36).substr(2, 9)}`,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.challenges.push(newChal);
    saveFallbackDb(db);
    return newChal;
  },
  getChallengeParticipations: () => getFallbackDb().challengeParticipations,
  participateInChallenge: (challengeId: string, employeeId: string, value: number) => {
    const db = getFallbackDb();
    const chal = db.challenges.find((c: any) => c.id === challengeId);
    if (!chal) return null;

    let part = db.challengeParticipations.find((p: any) => p.challengeId === challengeId && p.employeeId === employeeId);
    if (part) {
      part.progress = Math.min(chal.targetValue, part.progress + value);
      if (part.progress >= chal.targetValue && part.approvalStatus !== 'Approved') {
        part.approvalStatus = 'Approved';
        part.completedAt = new Date().toISOString();
        part.xpAwarded = chal.xpReward;
        part.pointsAwarded = chal.pointsReward;
        
        // Reward employee
        db.employees = db.employees.map((e: any) => 
          e.id === employeeId 
            ? { ...e, xp: e.xp + chal.xpReward, totalPoints: e.totalPoints + chal.pointsReward } 
            : e
        );
      }
    } else {
      const isCompleted = value >= chal.targetValue;
      part = {
        id: `cp-${Math.random().toString(36).substr(2, 9)}`,
        challengeId,
        employeeId,
        progress: Math.min(chal.targetValue, value),
        approvalStatus: isCompleted ? 'Approved' : 'InProgress',
        completedAt: isCompleted ? new Date().toISOString() : null,
        xpAwarded: isCompleted ? chal.xpReward : 0,
        pointsAwarded: isCompleted ? chal.pointsReward : 0,
        createdAt: new Date().toISOString()
      };
      db.challengeParticipations.push(part);
      if (isCompleted) {
        db.employees = db.employees.map((e: any) => 
          e.id === employeeId 
            ? { ...e, xp: e.xp + chal.xpReward, totalPoints: e.totalPoints + chal.pointsReward } 
            : e
        );
      }
    }
    saveFallbackDb(db);
    return part;
  },

  // Policies
  getPolicies: () => getFallbackDb().policies,
  createPolicy: (policy: any) => {
    const db = getFallbackDb();
    const newPolicy = {
      ...policy,
      id: `pol-${Math.random().toString(36).substr(2, 9)}`,
      effectiveDate: policy.effectiveDate || new Date().toISOString(),
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.policies.push(newPolicy);

    // Auto-create pending acknowledgements for all active employees
    db.employees.forEach((emp: any) => {
      db.policyAcknowledgements.push({
        id: `ack-${Math.random().toString(36).substr(2, 9)}`,
        policyId: newPolicy.id,
        employeeId: emp.id,
        status: 'Pending',
        acknowledgedAt: null,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        reminderSent: false
      });
    });

    saveFallbackDb(db);
    return newPolicy;
  },
  getPolicyAcknowledgements: () => getFallbackDb().policyAcknowledgements,
  acknowledgePolicy: (policyId: string, employeeId: string) => {
    const db = getFallbackDb();
    const ackIndex = db.policyAcknowledgements.findIndex(
      (a: any) => a.policyId === policyId && a.employeeId === employeeId
    );

    if (ackIndex >= 0) {
      db.policyAcknowledgements[ackIndex] = {
        ...db.policyAcknowledgements[ackIndex],
        status: 'Acknowledged',
        acknowledgedAt: new Date().toISOString()
      };

      // Award small reward for compliance training
      db.employees = db.employees.map((e: any) => {
        if (e.id === employeeId) {
          return {
            ...e,
            xp: e.xp + 50,
            totalPoints: e.totalPoints + 20
          };
        }
        return e;
      });

      saveFallbackDb(db);
      return db.policyAcknowledgements[ackIndex];
    }
    return null;
  },

  // Audits & Compliance
  getAudits: () => getFallbackDb().audits,
  createAudit: (audit: any) => {
    const db = getFallbackDb();
    const newAudit = {
      ...audit,
      id: `aud-${Math.random().toString(36).substr(2, 9)}`,
      date: audit.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.audits.unshift(newAudit);
    saveFallbackDb(db);
    return newAudit;
  },
  getComplianceIssues: () => getFallbackDb().complianceIssues,
  createComplianceIssue: (issue: any) => {
    const db = getFallbackDb();
    const newIssue = {
      ...issue,
      id: `iss-${Math.random().toString(36).substr(2, 9)}`,
      status: 'Open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.complianceIssues.push(newIssue);
    saveFallbackDb(db);
    return newIssue;
  },
  resolveComplianceIssue: (id: string, status: string) => {
    const db = getFallbackDb();
    db.complianceIssues = db.complianceIssues.map((iss: any) =>
      iss.id === id ? { ...iss, status, updatedAt: new Date().toISOString() } : iss
    );
    saveFallbackDb(db);
    return db.complianceIssues.find((iss: any) => iss.id === id);
  },

  // Badges
  getBadges: () => getFallbackDb().badges,
  getEmployeeBadges: () => getFallbackDb().employeeBadges,
  
  // Rewards & Redemptions
  getRewards: () => getFallbackDb().rewards,
  getRewardRedemptions: () => getFallbackDb().rewardRedemptions,
  redeemReward: (employeeId: string, rewardId: string) => {
    const db = getFallbackDb();
    const rewardIndex = db.rewards.findIndex((r: any) => r.id === rewardId);
    if (rewardIndex < 0) throw new Error('Reward not found');
    const reward = db.rewards[rewardIndex];
    
    if (reward.stock <= 0) throw new Error('Out of stock');
    
    const employeeIndex = db.employees.findIndex((e: any) => e.id === employeeId);
    if (employeeIndex < 0) throw new Error('Employee not found');
    const employee = db.employees[employeeIndex];
    
    if (employee.totalPoints < reward.pointsRequired) {
      throw new Error('Insufficient points');
    }

    // Atomic updates
    db.rewards[rewardIndex] = {
      ...reward,
      stock: reward.stock - 1,
      status: reward.stock - 1 === 0 ? 'OutOfStock' : reward.status
    };

    db.employees[employeeIndex] = {
      ...employee,
      totalPoints: employee.totalPoints - reward.pointsRequired
    };

    const redemption = {
      id: `red-${Math.random().toString(36).substr(2, 9)}`,
      employeeId,
      rewardId,
      pointsSpent: reward.pointsRequired,
      status: 'Approved',
      createdAt: new Date().toISOString()
    };
    db.rewardRedemptions.unshift(redemption);

    // Create Notification
    db.notifications.push({
      id: `notif-${Math.random().toString(36).substr(2, 9)}`,
      employeeId,
      type: 'badge_unlock',
      title: 'Reward Redeemed!',
      message: `You successfully redeemed "${reward.name}" for ${reward.pointsRequired} pts.`,
      read: false,
      createdAt: new Date().toISOString()
    });

    saveFallbackDb(db);
    return redemption;
  },

  // Department Scores
  getDepartmentScores: () => getFallbackDb().departmentScores,
  upsertDepartmentScore: (score: any) => {
    const db = getFallbackDb();
    const index = db.departmentScores.findIndex(
      (s: any) => s.departmentId === score.departmentId && s.period === score.period
    );
    if (index >= 0) {
      db.departmentScores[index] = { ...db.departmentScores[index], ...score };
    } else {
      db.departmentScores.push({
        id: `ds-${Math.random().toString(36).substr(2, 9)}`,
        ...score
      });
    }
    saveFallbackDb(db);
  },

  // Score Breakdowns
  getScoreBreakdowns: () => getFallbackDb().scoreBreakdowns,
  saveScoreBreakdowns: (breakdowns: any[]) => {
    const db = getFallbackDb();
    if (breakdowns.length > 0) {
      const scoreId = breakdowns[0].departmentScoreId;
      db.scoreBreakdowns = (db.scoreBreakdowns || []).filter((b: any) => b.departmentScoreId !== scoreId);
      db.scoreBreakdowns.push(...breakdowns);
      saveFallbackDb(db);
    }
  }
};
