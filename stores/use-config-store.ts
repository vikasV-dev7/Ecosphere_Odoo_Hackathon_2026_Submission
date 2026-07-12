import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ESGConfig } from '@/types';

interface ConfigState {
  config: ESGConfig;
  updateConfig: (newConfig: Partial<ESGConfig>) => void;
  resetConfig: () => void;
}

const DEFAULT_CONFIG: ESGConfig = {
  orgName: 'EcoSphere Corp',
  envWeight: 0.4,
  socialWeight: 0.3,
  govWeight: 0.3,
  autoEmissionCalc: true,
  evidenceRequired: true,
  autoBadgeAward: true,
  pushNotifications: true,
  emailNotifications: true,
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,
      updateConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig },
        })),
      resetConfig: () => set({ config: DEFAULT_CONFIG }),
    }),
    {
      name: 'ecosphere-config-storage',
    }
  )
);
