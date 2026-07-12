import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CarbonTransaction, EmissionFactor, Goal } from '@/types';

interface EnvironmentalState {
  emissionFactors: EmissionFactor[];
  carbonTransactions: CarbonTransaction[];
  goals: Goal[];
  
  // Factor CRUD
  addEmissionFactor: (factor: Omit<EmissionFactor, 'id'>) => void;
  updateEmissionFactor: (id: string, updates: Partial<EmissionFactor>) => void;
  deleteEmissionFactor: (id: string) => void;
  
  // Transaction CRUD
  addCarbonTransaction: (tx: Omit<CarbonTransaction, 'id' | 'totalEmissions' | 'date'> & { date?: string }) => void;
  deleteCarbonTransaction: (id: string) => void;
  
  // Goal CRUD
  addGoal: (goal: Omit<Goal, 'id' | 'currentValue' | 'status'>) => void;
  updateGoalProgress: (id: string, value: number) => void;
  deleteGoal: (id: string) => void;
}

const SEED_FACTORS: EmissionFactor[] = [
  { id: 'fact-elec', name: 'Grid Electricity', category: 'Purchase', unit: 'kWh', factorValue: 0.42, description: 'Average grid mix carbon intensity', status: 'Active' },
  { id: 'fact-gas', name: 'Natural Gas Heating', category: 'Purchase', unit: 'm3', factorValue: 2.03, description: 'Natural gas combustion emissions', status: 'Active' },
  { id: 'fact-steel', name: 'Steel Sourcing', category: 'Manufacturing', unit: 'kg', factorValue: 1.85, description: 'Primary steel production emission factor', status: 'Active' },
  { id: 'fact-plastic', name: 'PET Plastic Granules', category: 'Manufacturing', unit: 'kg', factorValue: 3.1, description: 'Virgin PET plastic material', status: 'Active' },
  { id: 'fact-flight', name: 'Short-haul Business Flight', category: 'Expense', unit: 'passenger-km', factorValue: 0.15, description: 'Business flight carbon impact per km', status: 'Active' },
  { id: 'fact-diesel', name: 'Fleet Diesel Fuel', category: 'Fleet', unit: 'liters', factorValue: 2.68, description: 'Diesel commercial vehicle fuel consumption', status: 'Active' },
  { id: 'fact-petrol', name: 'Fleet Petrol Fuel', category: 'Fleet', unit: 'liters', factorValue: 2.31, description: 'Standard unleaded commercial fuel', status: 'Active' },
];

const SEED_GOALS: Goal[] = [
  { id: 'goal-carbon', name: 'Reduce Carbon Footprint', description: 'Reduce total scope 1 & 2 carbon emissions', targetValue: 10000, currentValue: 6420, unit: 'kg CO2e', deadline: new Date('2026-12-31').toISOString(), departmentId: 'dept-esg', status: 'Active' },
  { id: 'goal-fleet', name: 'Green Fleet Transition', description: 'Reduce diesel fleet fuel usage by transitioning to hybrid/electric vehicles', targetValue: 5000, currentValue: 2100, unit: 'liters', deadline: new Date('2026-09-30').toISOString(), departmentId: 'dept-ops', status: 'Active' },
  { id: 'goal-rd', name: 'Eco-Material Integration', description: 'Ensure R&D uses sustainable polymers and metals', targetValue: 80, currentValue: 55, unit: '% materials', deadline: new Date('2026-11-15').toISOString(), departmentId: 'dept-rd', status: 'Active' }
];

const SEED_TRANSACTIONS: CarbonTransaction[] = [
  { id: 'tx-1', departmentId: 'dept-ops', emissionFactorId: 'fact-elec', sourceType: 'Purchase', quantity: 12000, totalEmissions: 5040, date: new Date('2026-07-01').toISOString(), autoCalculated: true, notes: 'Monthly plant electricity' },
  { id: 'tx-2', departmentId: 'dept-ops', emissionFactorId: 'fact-diesel', sourceType: 'Fleet', quantity: 800, totalEmissions: 2144, date: new Date('2026-07-02').toISOString(), autoCalculated: true, notes: 'Fleet logistics delivery' },
  { id: 'tx-3', departmentId: 'dept-rd', emissionFactorId: 'fact-steel', sourceType: 'Manufacturing', quantity: 450, totalEmissions: 832.5, date: new Date('2026-07-03').toISOString(), autoCalculated: false, notes: 'Prototype fabrication' },
  { id: 'tx-4', departmentId: 'dept-esg', emissionFactorId: 'fact-flight', sourceType: 'Expense', quantity: 2400, totalEmissions: 360, date: new Date('2026-07-04').toISOString(), autoCalculated: true, notes: 'ESG audit team travel' },
  { id: 'tx-5', departmentId: 'dept-sales', emissionFactorId: 'fact-petrol', sourceType: 'Fleet', quantity: 150, totalEmissions: 346.5, date: new Date('2026-07-05').toISOString(), autoCalculated: true, notes: 'Sales team local travel' },
];

export const useEnvironmentalStore = create<EnvironmentalState>()(
  persist(
    (set) => ({
      emissionFactors: SEED_FACTORS,
      carbonTransactions: SEED_TRANSACTIONS,
      goals: SEED_GOALS,
      
      addEmissionFactor: (factor) =>
        set((state) => ({
          emissionFactors: [
            ...state.emissionFactors,
            { ...factor, id: `fact-${Math.random().toString(36).substr(2, 9)}` },
          ],
        })),
        
      updateEmissionFactor: (id, updates) =>
        set((state) => ({
          emissionFactors: state.emissionFactors.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        })),
        
      deleteEmissionFactor: (id) =>
        set((state) => ({
          emissionFactors: state.emissionFactors.filter((f) => f.id !== id),
        })),
        
      addCarbonTransaction: (tx) =>
        set((state) => {
          const factor = state.emissionFactors.find((f) => f.id === tx.emissionFactorId);
          const factorVal = factor ? factor.factorValue : 1;
          const totalEmissions = tx.quantity * factorVal;
          const newTx: CarbonTransaction = {
            ...tx,
            id: `tx-${Math.random().toString(36).substr(2, 9)}`,
            totalEmissions,
            date: tx.date || new Date().toISOString(),
          };
          return {
            carbonTransactions: [newTx, ...state.carbonTransactions],
          };
        }),
        
      deleteCarbonTransaction: (id) =>
        set((state) => ({
          carbonTransactions: state.carbonTransactions.filter((tx) => tx.id !== id),
        })),
        
      addGoal: (goal) =>
        set((state) => ({
          goals: [
            ...state.goals,
            {
              ...goal,
              id: `goal-${Math.random().toString(36).substr(2, 9)}`,
              currentValue: 0,
              status: 'Active',
            },
          ],
        })),
        
      updateGoalProgress: (id, value) =>
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id === id) {
              const current = Math.min(g.targetValue, Math.max(0, value));
              const status = current >= g.targetValue ? 'Completed' : 'Active';
              return { ...g, currentValue: current, status };
            }
            return g;
          }),
        })),
        
      deleteGoal: (id) =>
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        })),
    }),
    {
      name: 'ecosphere-environmental-storage',
    }
  )
);
