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
    { id: 'emp-alice', email: 'alice@ecosphere.com', name: 'Alice Smith', role: 'Admin', departmentId: 'dept-esg', xp: 2500, totalPoints: 1800, streakDays: 12, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
    { id: 'emp-bob', email: 'bob@ecosphere.com', name: 'Bob Jones', role: 'DepartmentHead', departmentId: 'dept-ops', xp: 1400, totalPoints: 950, streakDays: 5, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
    { id: 'emp-charlie', email: 'charlie@ecosphere.com', name: 'Charlie Brown', role: 'Employee', departmentId: 'dept-rd', xp: 450, totalPoints: 300, streakDays: 3, avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' }
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
  configs: [
    { id: 'singleton', orgName: 'EcoSphere Corp', envWeight: 0.4, socialWeight: 0.3, govWeight: 0.3, autoEmissionCalc: true, evidenceRequired: true, autoBadgeAward: true, pushNotifications: true, emailNotifications: true }
  ]
};

export function getFallbackDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(SEED_DATA, null, 2));
    return SEED_DATA;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
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
  }
};
