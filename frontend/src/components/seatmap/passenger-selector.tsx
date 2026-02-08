'use client';

import React from 'react';
import type { SelectedSeat } from '@/types/seatmap';
import { PASSENGER_COLORS } from '@/types/seatmap';
import { motion } from 'motion/react';

// ============================================================================
// Types
// ============================================================================

export interface TravelerInfo {
  id: string;
  name: string;
  type: string;
}

export interface PassengerSelectorProps {
  travelers: TravelerInfo[];
  activeTravelerId: string;
  onTravelerChange: (id: string) => void;
  selections: Record<string, SelectedSeat>;
}

// ============================================================================
// PassengerSelector Component
// ============================================================================

export function PassengerSelector({
  travelers,
  activeTravelerId,
  onTravelerChange,
  selections,
}: PassengerSelectorProps) {
  // Filter out held infants
  const eligibleTravelers = travelers.filter((t) => t.type !== 'HELD_INFANT');

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Passagier auswählen">
      {eligibleTravelers.map((traveler, index) => {
        const isActive = traveler.id === activeTravelerId;
        const selection = selections[traveler.id];
        const color = PASSENGER_COLORS[index % PASSENGER_COLORS.length];

        return (
          <button
            key={traveler.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onTravelerChange(traveler.id)}
            className={[
              'relative flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
              'border-2 min-h-[40px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-pink-400',
              isActive
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-md'
                : 'bg-muted/50 hover:bg-muted border-transparent text-gray-700 dark:text-gray-300',
            ].join(' ')}
            style={{
              borderColor: isActive ? color : 'transparent',
            }}
          >
            {/* Color dot */}
            <span
              className="inline-block size-3 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />

            {/* Name */}
            <span className="whitespace-nowrap">{traveler.name}</span>

            {/* Selected seat badge */}
            {selection && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                {selection.number}
              </motion.span>
            )}
          </button>
        );
      })}
    </div>
  );
}
