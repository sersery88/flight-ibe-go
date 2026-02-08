'use client';

import React, { useMemo } from 'react';
import type { Seat, SeatStatus } from '@/types/seatmap';
import { getSeatCharacteristic } from '@/lib/seat-characteristics';
import { getSeatCategory, CATEGORY_STYLES } from '@/lib/seat-categories';

// ============================================================================
// Position helper
// ============================================================================

function getSeatPosition(characteristics?: string[]): string {
  if (!characteristics) return '';
  if (characteristics.includes('W')) return 'Fenster';
  if (characteristics.includes('A')) return 'Gang';
  if (characteristics.includes('M') || characteristics.includes('CC')) return 'Mitte';
  return '';
}

// ============================================================================
// SeatCell Component
// ============================================================================

export interface SeatCellProps {
  seat: Seat;
  status: SeatStatus;
  isSelected: boolean;
  passengerColor?: string;
  passengerNumber?: number;
  price?: number;
  currency?: string;
  /** Median price of all available seats — used to detect preferred tier */
  medianPrice?: number;
  onSelect: () => void;
  compact?: boolean;
  /** When true, seat is visually dimmed (filter active, not matching) */
  dimmed?: boolean;
  /** When true, seat is highlighted (filter active + matching) */
  highlighted?: boolean;
}

export const SeatCell = React.memo(function SeatCell({
  seat,
  status,
  isSelected,
  passengerColor,
  passengerNumber,
  price,
  currency,
  medianPrice,
  onSelect,
  compact = false,
  dimmed = false,
  highlighted = false,
}: SeatCellProps) {
  const disabled = status === 'BLOCKED' || status === 'OCCUPIED';

  // Determine category — standard seats above median price → preferred
  const category = useMemo(() => {
    const base = getSeatCategory(seat.characteristicsCodes);
    if (base === 'standard' && price != null && price > 0 && medianPrice != null && medianPrice > 0 && price > medianPrice * 1.2) {
      return 'preferred' as const;
    }
    return base;
  }, [seat.characteristicsCodes, price, medianPrice]);
  const categoryStyle = CATEGORY_STYLES[category];

  // Color logic:
  // 1. SELECTED → passengerColor (handled via style prop) or pink
  // 2. BLOCKED → gray
  // 3. OCCUPIED → dark gray with ✗
  // 4. AVAILABLE → category color, OR emerald if free + standard
  const colors = useMemo(() => {
    if (isSelected) {
      return { bg: 'bg-pink-500', text: 'text-white', ring: 'ring-pink-400' };
    }
    if (status === 'BLOCKED') {
      return { bg: 'bg-gray-300 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400', ring: 'ring-gray-200' };
    }
    if (status === 'OCCUPIED') {
      return { bg: 'bg-gray-400 dark:bg-gray-600', text: 'text-gray-600 dark:text-gray-300', ring: 'ring-gray-300' };
    }
    // AVAILABLE: free standard → emerald, else category color
    if (category === 'standard' && (price == null || price === 0)) {
      return { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-400' };
    }
    return { bg: categoryStyle.bg, text: categoryStyle.text, ring: categoryStyle.ring };
  }, [isSelected, status, category, price, categoryStyle]);

  const ariaLabel = useMemo(() => {
    const parts: string[] = [`Sitz ${seat.number}`];
    const pos = getSeatPosition(seat.characteristicsCodes);
    if (pos) parts.push(pos);

    if (status === 'BLOCKED') parts.push('Blockiert');
    else if (status === 'OCCUPIED') parts.push('Belegt');
    else if (status === 'SELECTED') parts.push('Ausgewählt');
    else parts.push('Verfügbar');

    if (price != null && price > 0) {
      parts.push(`${price.toFixed(2)} ${currency ?? 'EUR'}`);
    } else if (status === 'AVAILABLE') {
      parts.push('Kostenlos');
    }

    // Category info
    if (category !== 'standard') {
      parts.push(categoryStyle.label);
    }

    // Warning characteristics
    if (seat.characteristicsCodes) {
      for (const code of seat.characteristicsCodes) {
        const def = getSeatCharacteristic(code);
        if (def?.warning) parts.push(def.label);
      }
    }

    return parts.join(', ');
  }, [seat.number, seat.characteristicsCodes, status, price, currency, category, categoryStyle.label]);

  const size = compact
    ? 'min-w-[36px] min-h-[36px] w-9 h-9 text-[10px]'
    : 'min-w-[40px] min-h-[40px] w-10 h-10 text-xs';

  return (
    <button
      type="button"
      disabled={disabled || dimmed}
      onClick={onSelect}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      className={[
        'relative flex items-center justify-center rounded-md font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        size,
        colors.bg,
        colors.text,
        `focus-visible:${colors.ring}`,
        disabled
          ? 'cursor-not-allowed opacity-70'
          : 'cursor-pointer hover:scale-105 active:scale-95',
        // Dimming for filter
        dimmed ? 'opacity-20 !pointer-events-none' : '',
        // Highlight for filter match
        highlighted ? 'ring-2 ring-white shadow-lg' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        isSelected && passengerColor
          ? { backgroundColor: passengerColor }
          : undefined
      }
    >
      {/* Mini badge — only exit rows get a visible indicator on the cell */}
      {category === 'exit' && status === 'AVAILABLE' && !isSelected && !dimmed && (
        <span className="absolute -top-1 -right-1 text-[8px] leading-none pointer-events-none bg-white dark:bg-gray-900 rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-sm">
          🚪
        </span>
      )}

      {/* Seat content */}
      {status === 'OCCUPIED' ? (
        <span className="text-xs font-bold">✗</span>
      ) : isSelected ? (
        <span className="flex flex-col items-center leading-none">
          {passengerNumber != null ? (
            <span className="text-[10px] font-bold">{passengerNumber}</span>
          ) : (
            <span className="text-xs font-bold">✓</span>
          )}
        </span>
      ) : (
        <span className="leading-none">{seat.number.replace(/^\d+/, '')}</span>
      )}
    </button>
  );
});

SeatCell.displayName = 'SeatCell';
