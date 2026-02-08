'use client';

import { Users, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverPositioner,
} from '@/components/ui/popover';

// ============================================================================
// Passenger Selector — Premium Stepper with Popover
// ============================================================================

export interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
}

interface PassengerSelectorProps {
  value: PassengerCount;
  onChange: (value: PassengerCount) => void;
  label?: string;
  className?: string;
  compact?: boolean;
}

const PASSENGER_TYPES = [
  { key: 'adults' as const, label: 'Erwachsene', description: 'Ab 12 Jahren', min: 1, max: 9 },
  { key: 'children' as const, label: 'Kinder', description: '2–11 Jahre', min: 0, max: 8 },
  { key: 'infants' as const, label: 'Babys', description: 'Unter 2 Jahren', min: 0, max: 4 },
];

export function PassengerSelector({
  value,
  onChange,
  label,
  className,
  compact = false,
}: PassengerSelectorProps) {
  const totalPassengers = value.adults + value.children + value.infants;

  const updateCount = (key: keyof PassengerCount, delta: number) => {
    const type = PASSENGER_TYPES.find((t) => t.key === key)!;
    const newValue = Math.max(type.min, Math.min(type.max, value[key] + delta));

    // Infants can't exceed adults
    if (key === 'infants' && newValue > value.adults) return;
    if (key === 'adults' && newValue < value.infants) {
      onChange({ ...value, adults: newValue, infants: newValue });
      return;
    }

    // Max 9 passengers total
    const newTotal = totalPassengers + delta;
    if (newTotal > 9) return;

    onChange({ ...value, [key]: newValue });
  };

  const getDisplayText = () => {
    const parts: string[] = [];
    if (value.adults > 0) {
      parts.push(`${value.adults} Erw.`);
    }
    if (value.children > 0) {
      parts.push(`${value.children} Kind${value.children > 1 ? 'er' : ''}`);
    }
    if (value.infants > 0) {
      parts.push(`${value.infants} Baby${value.infants > 1 ? 's' : ''}`);
    }
    return parts.join(', ') || '1 Erw.';
  };

  return (
    <div className={cn('relative', className)}>
      {label && !compact && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <Popover>
        <PopoverTrigger
          className={cn(
            'flex items-center gap-2 text-left text-sm transition-all duration-150 cursor-pointer min-h-[44px]',
            compact
              ? 'rounded-xl bg-gray-50 px-4 py-2.5 hover:bg-gray-100 hover:shadow-sm focus:bg-white focus:shadow-md focus:ring-2 focus:ring-pink-500/50 dark:bg-white/10 dark:hover:bg-white/15 dark:focus:bg-white/20'
              : 'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background px-4 py-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20',
            'focus:outline-none'
          )}
        >
          <Users className={cn('text-gray-400 shrink-0', compact ? 'h-4 w-4' : 'h-5 w-5')} />
          <span className="whitespace-nowrap font-medium">{getDisplayText()}</span>
        </PopoverTrigger>

        <PopoverPositioner sideOffset={8}>
          <PopoverContent
            className="z-50 w-80 rounded-2xl border bg-popover p-5 shadow-2xl"
          >
            <div className="space-y-5">
              <h3 className="text-sm font-semibold text-foreground">Passagiere</h3>

              {PASSENGER_TYPES.map((type) => (
                <div key={type.key} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {type.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                        value[type.key] <= type.min
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed dark:border-gray-700 dark:text-gray-600'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:scale-95 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
                      )}
                      onClick={() => updateCount(type.key, -1)}
                      disabled={value[type.key] <= type.min}
                      aria-label={`${type.label} reduzieren`}
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <span className="w-8 text-center text-lg font-semibold tabular-nums">
                      {value[type.key]}
                    </span>

                    <button
                      type="button"
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                        value[type.key] >= type.max || totalPassengers >= 9
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed dark:border-gray-700 dark:text-gray-600'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:scale-95 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
                      )}
                      onClick={() => updateCount(type.key, 1)}
                      disabled={value[type.key] >= type.max || totalPassengers >= 9}
                      aria-label={`${type.label} erhöhen`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                Max. 9 Passagiere. Babys reisen auf dem Schoß eines Erwachsenen.
              </div>
            </div>
          </PopoverContent>
        </PopoverPositioner>
      </Popover>
    </div>
  );
}
