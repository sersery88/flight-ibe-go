'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

// ============================================================================
// Trip Type Toggle — Premium Pill Buttons
// ============================================================================

export type TripType = 'roundtrip' | 'oneway' | 'multicity';

interface TripTypeToggleProps {
  value: TripType;
  onChange: (value: TripType) => void;
  className?: string;
}

const TRIP_TYPES: { value: TripType; label: string; shortLabel: string }[] = [
  { value: 'roundtrip', label: 'Hin & Zurück', shortLabel: 'Hin & Rück' },
  { value: 'oneway', label: 'Nur Hinflug', shortLabel: 'Hinflug' },
  { value: 'multicity', label: 'Gabelflug', shortLabel: 'Gabel' },
];

export function TripTypeToggle({ value, onChange, className }: TripTypeToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex rounded-full bg-gray-100 p-1 dark:bg-gray-800',
        className
      )}
      role="radiogroup"
      aria-label="Reiseart"
    >
      {TRIP_TYPES.map((type) => {
        const isActive = value === type.value;
        return (
          <button
            key={type.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(type.value)}
            className={cn(
              'relative rounded-full px-3 py-2 text-xs font-medium transition-colors h-10 cursor-pointer sm:px-4 sm:text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2',
              isActive
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="triptype-pill"
                className="absolute inset-0 rounded-full bg-white shadow-md dark:bg-gray-700"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 sm:hidden">{type.shortLabel}</span>
            <span className="relative z-10 hidden sm:inline">{type.label}</span>
          </button>
        );
      })}
    </div>
  );
}
