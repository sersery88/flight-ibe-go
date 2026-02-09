'use client';

import { cn } from '@/lib/utils';
import type { TravelClass } from '@/types/flight';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPositioner,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

// ============================================================================
// Cabin Class Select — Premium Dropdown
// ============================================================================

interface CabinClassSelectProps {
  value: TravelClass;
  onChange: (value: TravelClass) => void;
  label?: string;
  className?: string;
  compact?: boolean;
}

const CABIN_CLASSES: { value: TravelClass; label: string; shortLabel: string }[] = [
  { value: 'ECONOMY', label: 'Economy', shortLabel: 'Economy' },
  { value: 'PREMIUM_ECONOMY', label: 'Premium Economy', shortLabel: 'Prem. Eco' },
  { value: 'BUSINESS', label: 'Business Class', shortLabel: 'Business' },
  { value: 'FIRST', label: 'First Class', shortLabel: 'First' },
];

export function CabinClassSelect({
  value,
  onChange,
  label,
  className,
  compact = false,
}: CabinClassSelectProps) {
  const selectedCabin = CABIN_CLASSES.find((c) => c.value === value) || CABIN_CLASSES[0];

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <Select value={value} onValueChange={(val) => onChange(val as TravelClass)}>
        <SelectTrigger
          size={compact ? 'sm' : 'default'}
          className={cn(
            'cursor-pointer',
            compact
              ? 'w-auto h-10 border-0 bg-gray-50 hover:bg-gray-100 hover:shadow-sm focus:bg-white focus:shadow-md dark:bg-white/10 dark:hover:bg-white/15 dark:focus:bg-white/20'
              : 'w-full min-h-[48px]'
          )}
        >
          <SelectValue placeholder="Klasse wählen">
            <span className="sm:hidden">{selectedCabin.shortLabel}</span>
            <span className="hidden sm:inline">{selectedCabin.label}</span>
          </SelectValue>
        </SelectTrigger>

        <SelectPositioner>
          <SelectContent>
            {CABIN_CLASSES.map((cabin) => (
              <SelectItem key={cabin.value} value={cabin.value} className="min-h-[44px]">
                {cabin.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectPositioner>
      </Select>
    </div>
  );
}
