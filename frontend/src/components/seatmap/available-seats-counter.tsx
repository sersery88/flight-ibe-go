'use client';

import React from 'react';
import type { AvailableSeatsCounter as AvailableSeatsCounterType } from '@/types/seatmap';

// ============================================================================
// Types
// ============================================================================

export interface AvailableSeatsCounterProps {
  counters?: AvailableSeatsCounterType[];
}

// ============================================================================
// AvailableSeatsCounter Component
// ============================================================================

export function AvailableSeatsCounter({ counters }: AvailableSeatsCounterProps) {
  if (!counters || counters.length === 0) return null;

  // Use the first counter (or the one with the highest value)
  const value = counters[0]?.value;
  if (value == null || value <= 0) return null;

  let colorClasses: string;
  if (value > 20) {
    colorClasses = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400';
  } else if (value >= 5) {
    colorClasses = 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400';
  } else {
    colorClasses = 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400';
  }

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        colorClasses,
      ].join(' ')}
    >
      <span>💺</span>
      <span>
        Noch {value} {value === 1 ? 'Platz' : 'Plätze'} verfügbar
      </span>
    </span>
  );
}
