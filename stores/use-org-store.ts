import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Department } from '@/types';

interface OrgState {
  departments: Department[];
  addDepartment: (dept: Omit<Department, 'id' | 'employeeCount'>) => void;
  updateDepartment: (id: string, updates: Partial<Department>) => void;
  deleteDepartment: (id: string) => void;
}

const SEED_DEPARTMENTS: Department[] = [
  {
    id: 'dept-esg',
    name: 'Sustainability & ESG',
    code: 'ESG',
    head: 'alice@ecosphere.com',
    parentId: null,
    employeeCount: 15,
    status: 'Active',
  },
  {
    id: 'dept-ops',
    name: 'Operations & Logistics',
    code: 'OPS',
    head: 'bob@ecosphere.com',
    parentId: null,
    employeeCount: 120,
    status: 'Active',
  },
  {
    id: 'dept-rd',
    name: 'Research & Development',
    code: 'RD',
    head: 'diana@ecosphere.com',
    parentId: null,
    employeeCount: 65,
    status: 'Active',
  },
  {
    id: 'dept-hr',
    name: 'Human Resources',
    code: 'HR',
    head: 'frank@ecosphere.com',
    parentId: null,
    employeeCount: 10,
    status: 'Active',
  },
  {
    id: 'dept-sales',
    name: 'Sales & Marketing',
    code: 'MKT',
    head: 'bruce@ecosphere.com',
    parentId: null,
    employeeCount: 45,
    status: 'Active',
  },
  {
    id: 'dept-fleet',
    name: 'Fleet Transport Group',
    code: 'FLEET',
    head: 'clark@ecosphere.com',
    parentId: 'dept-ops', // Child of Operations
    employeeCount: 30,
    status: 'Active',
  }
];

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      departments: SEED_DEPARTMENTS,
      addDepartment: (dept) =>
        set((state) => ({
          departments: [
            ...state.departments,
            {
              ...dept,
              id: `dept-${Math.random().toString(36).substr(2, 9)}`,
              employeeCount: 0,
            },
          ],
        })),
      updateDepartment: (id, updates) =>
        set((state) => ({
          departments: state.departments.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),
      deleteDepartment: (id) =>
        set((state) => ({
          departments: state.departments.filter((d) => d.id !== id),
        })),
    }),
    {
      name: 'ecosphere-org-storage',
    }
  )
);
