import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AiEngine, AiRemoteProvider } from '@/lib/ai/ai-types';

export type ApiKeyMap = Partial<Record<AiRemoteProvider, string>>;

interface AiSettingsStore {
  engine: AiEngine;
  apiKeys: ApiKeyMap;
  setEngine: (engine: AiEngine) => void;
  setApiKey: (provider: AiRemoteProvider, key: string) => void;
  clearApiKey: (provider: AiRemoteProvider) => void;
}

export const useAiSettingsStore = create<AiSettingsStore>()(
  persist(
    (set) => ({
      engine: 'local-rules',
      apiKeys: {},
      setEngine: (engine) => set({ engine }),
      setApiKey: (provider, key) => set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),
      clearApiKey: (provider) =>
        set((s) => {
          const apiKeys = { ...s.apiKeys };
          delete apiKeys[provider];
          return { apiKeys };
        }),
    }),
    { name: 'be-ai-settings' },
  ),
);
