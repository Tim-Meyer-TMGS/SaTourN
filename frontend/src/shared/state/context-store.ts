import { create } from 'zustand';

import { DEFAULT_WORK_CONTEXT, STORAGE_KEYS } from '../config/constants';
import type { WorkContext } from '../types/context';

type ContextStore = {
  context: WorkContext;
  setContext: (nextContext: Partial<WorkContext>) => void;
  resetContext: () => void;
};

function loadStoredContext(): WorkContext {
  if (typeof window === 'undefined') return DEFAULT_WORK_CONTEXT;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.workContext);
    if (!raw) return DEFAULT_WORK_CONTEXT;
    const parsed = JSON.parse(raw) as Partial<WorkContext>;

    return {
      area: parsed.area || '',
      city: parsed.city || '',
      type: parsed.type || ''
    };
  } catch {
    return DEFAULT_WORK_CONTEXT;
  }
}

function persistContext(context: WorkContext) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEYS.workContext, JSON.stringify(context));
  } catch {
    // localStorage may be unavailable in privacy-restricted environments.
  }
}

export const useContextStore = create<ContextStore>((set) => ({
  context: loadStoredContext(),
  setContext: (nextContext) => {
    set((state) => {
      const context = { ...state.context, ...nextContext };
      persistContext(context);
      return { context };
    });
  },
  resetContext: () => {
    persistContext(DEFAULT_WORK_CONTEXT);
    set({ context: DEFAULT_WORK_CONTEXT });
  }
}));
