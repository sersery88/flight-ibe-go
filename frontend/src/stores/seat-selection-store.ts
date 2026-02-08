'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import type { SelectedSeat } from '@/types/seatmap';

// ============================================================================
// Types
// ============================================================================

/** segmentId → travelerId → SelectedSeat */
export type SeatSelections = Record<string, Record<string, SelectedSeat>>;

export interface SeatSelectionState {
  // ---- Data ----
  /** Nested map: segmentId → travelerId → SelectedSeat */
  selections: SeatSelections;
  /** Tracks when each segment's seatmap was last fetched (epoch ms) */
  lastFetchedAt: Record<string, number>;

  // ---- Computed getters (implemented as plain functions on the store) ----
  /** Total cost of all selected seats */
  totalSeatCost: () => number;
  /** Currency (taken from the first priced selection, or empty string) */
  currency: () => string;
  /** True if at least one seat is selected anywhere */
  hasSelections: () => boolean;
  /** True if data for a segment is older than `maxAgeMs` (default 10 min) */
  isStale: (segmentId: string, maxAgeMs?: number) => boolean;

  // ---- Actions ----
  selectSeat: (segmentId: string, travelerId: string, seat: SelectedSeat) => void;
  removeSeat: (segmentId: string, travelerId: string) => void;
  clearSegment: (segmentId: string) => void;
  clearAll: () => void;
  /** Record the fetch timestamp for a segment */
  setFetchedAt: (segmentId: string, timestamp?: number) => void;
}

// ============================================================================
// Store
// ============================================================================

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export const useSeatSelectionStore = create<SeatSelectionState>()(
  devtools(
    persist(
      (set, get) => ({
        // ---- Data ----
        selections: {},
        lastFetchedAt: {},

        // ---- Computed ----
        totalSeatCost: () => {
          const { selections } = get();
          let total = 0;
          for (const segmentSeats of Object.values(selections)) {
            for (const seat of Object.values(segmentSeats)) {
              total += seat.price ?? 0;
            }
          }
          return total;
        },

        currency: () => {
          const { selections } = get();
          for (const segmentSeats of Object.values(selections)) {
            for (const seat of Object.values(segmentSeats)) {
              if (seat.currency) return seat.currency;
            }
          }
          return '';
        },

        hasSelections: () => {
          const { selections } = get();
          return Object.values(selections).some(
            (segmentSeats) => Object.keys(segmentSeats).length > 0
          );
        },

        isStale: (segmentId: string, maxAgeMs = STALE_THRESHOLD_MS) => {
          const ts = get().lastFetchedAt[segmentId];
          if (!ts) return true;
          return Date.now() - ts > maxAgeMs;
        },

        // ---- Actions ----
        selectSeat: (segmentId, travelerId, seat) =>
          set(
            (state) => ({
              selections: {
                ...state.selections,
                [segmentId]: {
                  ...state.selections[segmentId],
                  [travelerId]: seat,
                },
              },
            }),
            false,
            'selectSeat'
          ),

        removeSeat: (segmentId, travelerId) =>
          set(
            (state) => {
              const segmentSeats = { ...state.selections[segmentId] };
              delete segmentSeats[travelerId];
              return {
                selections: {
                  ...state.selections,
                  [segmentId]: segmentSeats,
                },
              };
            },
            false,
            'removeSeat'
          ),

        clearSegment: (segmentId) =>
          set(
            (state) => {
              const next = { ...state.selections };
              delete next[segmentId];
              return { selections: next };
            },
            false,
            'clearSegment'
          ),

        clearAll: () =>
          set(
            { selections: {}, lastFetchedAt: {} },
            false,
            'clearAll'
          ),

        setFetchedAt: (segmentId, timestamp) =>
          set(
            (state) => ({
              lastFetchedAt: {
                ...state.lastFetchedAt,
                [segmentId]: timestamp ?? Date.now(),
              },
            }),
            false,
            'setFetchedAt'
          ),
      }),
      {
        name: 'seat-selection',
        storage: createJSONStorage(() => sessionStorage),
        // Only persist selections and timestamps — functions are recreated
        partialize: (state) => ({
          selections: state.selections,
          lastFetchedAt: state.lastFetchedAt,
        }),
      }
    ),
    { name: 'SeatSelectionStore', enabled: process.env.NODE_ENV === 'development' }
  )
);
