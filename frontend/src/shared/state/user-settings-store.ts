import { create } from 'zustand';

export type OutdooractiveUserSettings = {
  projectKey: string;
  apiKey: string;
};

type UserSettingsStore = {
  outdooractive: OutdooractiveUserSettings;
  setOutdooractive: (settings: OutdooractiveUserSettings) => void;
  clearOutdooractive: () => void;
};

const DEFAULT_OUTDOORACTIVE_SETTINGS: OutdooractiveUserSettings = {
  projectKey: 'api-sachsen',
  apiKey: ''
};

// Intentionally memory-only until authentication and per-user Neon storage exist.
// The public store interface can stay unchanged when persistence moves server-side.
export const useUserSettingsStore = create<UserSettingsStore>((set) => ({
  outdooractive: DEFAULT_OUTDOORACTIVE_SETTINGS,
  setOutdooractive: (outdooractive) => set({ outdooractive }),
  clearOutdooractive: () => set({ outdooractive: DEFAULT_OUTDOORACTIVE_SETTINGS })
}));
