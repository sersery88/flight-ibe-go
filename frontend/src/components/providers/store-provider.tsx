'use client';

import { useEffect, type ReactNode } from 'react';
import { useSearchStore } from '@/stores/search-store';

interface StoreProviderProps {
  children: ReactNode;
}

/**
 * Provider component that handles Zustand store hydration.
 * Place this high in your component tree (e.g., in layout.tsx).
 * 
 * This ensures that persisted state from localStorage is properly
 * rehydrated after the initial SSR render, preventing hydration mismatches.
 */
export function StoreProvider({ children }: StoreProviderProps) {
  useEffect(() => {
    // Rehydrate the search store from localStorage
    useSearchStore.persist.rehydrate();
  }, []);

  return <>{children}</>;
}
