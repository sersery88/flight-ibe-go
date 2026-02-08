'use client';

import React, { useMemo } from 'react';
import type { Seat, SeatStatus, PriceTier } from '@/types/seatmap';
import { getSeatCharacteristic } from '@/lib/seat-characteristics';

// ============================================================================
// Color Mapping
// ============================================================================

const STATUS_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  'AVAILABLE_free':    { bg: 'bg-emerald-500',  text: 'text-white', ring: 'ring-emerald-400' },
  'AVAILABLE_low':     { bg: 'bg-blue-500',     text: 'text-white', ring: 'ring-blue-400' },
  'AVAILABLE_mid':     { bg: 'bg-amber-500',    text: 'text-white', ring: 'ring-amber-400' },
  'AVAILABLE_high':    { bg: 'bg-violet-500',   text: 'text-white', ring: 'ring-violet-400' },
  'BLOCKED':           { bg: 'bg-gray-300',     text: 'text-gray-500', ring: 'ring-gray-200' },
  'OCCUPIED':          { bg: 'bg-gray-400',     text: 'text-gray-600', ring: 'ring-gray-300' },
  'SELECTED':          { bg: 'bg-pink-500',     text: 'text-white', ring: 'ring-pink-400' },
};

function getPriceTier(price: number | undefined): PriceTier {
  if (price == null || price === 0) return 'free';
  if (price < 30) return 'low';
  if (price <= 80) return 'mid';
  return 'high';
}

function getColorKey(status: SeatStatus, price?: number, characteristics?: string[]): string {
  if (status === 'BLOCKED') return 'BLOCKED';
  if (status === 'OCCUPIED') return 'OCCUPIED';
  if (status === 'SELECTED') return 'SELECTED';

  // Check for extra legroom / premium characteristics
  const isPremium = characteristics?.some(c => c === 'L' || c === 'XL' || c === 'PS' || c === '1A' || c === 'P');
  if (isPremium && (price ?? 0) > 0) return 'AVAILABLE_high';

  const tier = getPriceTier(price);
  return `AVAILABLE_${tier}`;
}

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
  onSelect: () => void;
  compact?: boolean;
}

export const SeatCell = React.memo(function SeatCell({
  seat,
  status,
  isSelected,
  passengerColor,
  passengerNumber,
  price,
  currency,
  onSelect,
  compact = false,
}: SeatCellProps) {
  const disabled = status === 'BLOCKED' || status === 'OCCUPIED';

  const colorKey = getColorKey(status, price, seat.characteristicsCodes);
  const colors = STATUS_COLORS[colorKey] ?? STATUS_COLORS['BLOCKED'];

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

    // Add notable characteristics
    if (seat.characteristicsCodes) {
      for (const code of seat.characteristicsCodes) {
        const def = getSeatCharacteristic(code);
        if (def?.warning) parts.push(def.label);
      }
    }

    return parts.join(', ');
  }, [seat.number, seat.characteristicsCodes, status, price, currency]);

  const size = compact ? 'min-w-[36px] min-h-[36px] w-9 h-9 text-[10px]' : 'min-w-[40px] min-h-[40px] w-10 h-10 text-xs';

  return (
    <button
      type="button"
      disabled={disabled}
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
        disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:scale-105 active:scale-95',
        isSelected && passengerColor ? '' : '',
      ].join(' ')}
      style={
        isSelected && passengerColor
          ? { backgroundColor: passengerColor }
          : undefined
      }
    >
      {/* Seat number */}
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
