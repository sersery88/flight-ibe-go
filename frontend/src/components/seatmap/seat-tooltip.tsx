'use client';

import React from 'react';
import type { Seat, SeatStatus } from '@/types/seatmap';
import {
  getSeatCharacteristic,
  getWarningLabels,
  isExitRow,
} from '@/lib/seat-characteristics';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

// ============================================================================
// Position helper
// ============================================================================

function getSeatPositionLabel(characteristics?: string[]): string | null {
  if (!characteristics) return null;
  if (characteristics.includes('W')) return 'Fenster';
  if (characteristics.includes('A')) return 'Gang';
  if (characteristics.includes('M') || characteristics.includes('CC')) return 'Mitte';
  return null;
}

// ============================================================================
// SeatTooltip — Desktop: Hover-Tooltip, wraps children
// ============================================================================

export interface SeatTooltipProps {
  seat: Seat;
  status: SeatStatus;
  price?: number;
  currency?: string;
  onSelect: () => void;
  children: React.ReactNode;
}

export function SeatTooltip({
  seat,
  status,
  price,
  currency,
  onSelect,
  children,
}: SeatTooltipProps) {
  const disabled = status === 'BLOCKED' || status === 'OCCUPIED';
  const positionLabel = getSeatPositionLabel(seat.characteristicsCodes);
  const warnings = getWarningLabels(seat.characteristicsCodes);
  const exitRow = isExitRow(seat.characteristicsCodes);

  // Gather characteristic badges (non-position, non-warning)
  const badges: { icon: string; label: string }[] = [];
  if (seat.characteristicsCodes) {
    for (const code of seat.characteristicsCodes) {
      if (['W', 'A', 'M', 'CC'].includes(code)) continue; // skip position codes
      const def = getSeatCharacteristic(code);
      if (def && !def.warning) {
        badges.push({ icon: def.icon, label: def.label });
      }
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] p-3">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-sm">Sitz {seat.number}</span>
            {positionLabel && (
              <span className="text-xs text-muted-foreground">{positionLabel}</span>
            )}
          </div>

          {/* Characteristics badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {badges.map((b, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]"
                >
                  <span>{b.icon}</span>
                  <span>{b.label}</span>
                </span>
              ))}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-0.5">
              {warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-600 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>{w}</span>
                </p>
              ))}
            </div>
          )}

          {exitRow && (
            <p className="text-[11px] text-amber-600 flex items-center gap-1">
              <span>🚪</span>
              <span>Notausgangsreihe — besondere Bedingungen</span>
            </p>
          )}

          {/* Price */}
          {status === 'AVAILABLE' && (
            <div className="pt-1 border-t border-border">
              {price != null && price > 0 ? (
                <span className="text-sm font-semibold">
                  {price.toFixed(2)} {currency ?? 'EUR'}
                </span>
              ) : (
                <span className="text-sm font-semibold text-emerald-600">Kostenlos</span>
              )}
            </div>
          )}

          {status === 'OCCUPIED' && (
            <p className="text-xs text-muted-foreground">Dieser Sitz ist bereits belegt.</p>
          )}

          {status === 'BLOCKED' && (
            <p className="text-xs text-muted-foreground">Dieser Sitz ist nicht verfügbar.</p>
          )}

          {/* Select button (desktop — click on cell is primary, this is secondary) */}
          {!disabled && status !== 'SELECTED' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="w-full mt-1 rounded-md bg-pink-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-pink-600 transition-colors"
            >
              Auswählen
            </button>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
