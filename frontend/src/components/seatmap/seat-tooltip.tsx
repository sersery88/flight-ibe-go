'use client';

import React, { useMemo } from 'react';
import type { Seat, SeatStatus } from '@/types/seatmap';
import {
  getSeatCharacteristic,
  isExitRow,
  GENERIC_SYSTEM_CODES,
} from '@/lib/seat-characteristics';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

// ============================================================================
// Types for grouped characteristics
// ============================================================================

interface CharBadge {
  icon: string;
  label: string;
  group: 'position' | 'feature' | 'warning';
}

// Position codes — displayed in header, not as badges
const POSITION_CODES = new Set(['W', 'A', 'M', 'CC']);

// ============================================================================
// Build grouped characteristics
// ============================================================================

function buildCharacteristicBadges(codes?: string[]): CharBadge[] {
  if (!codes) return [];
  const badges: CharBadge[] = [];

  for (const code of codes) {
    if (GENERIC_SYSTEM_CODES.has(code)) continue;  // CH, 1A, 1A_AQC_PREMIUM_SEAT, N, R, RS
    if (POSITION_CODES.has(code)) continue;         // W, A, M, CC — shown in header
    const def = getSeatCharacteristic(code);
    if (!def) continue;

    badges.push({
      icon: def.icon,
      label: def.label,
      group: def.warning ? 'warning' : 'feature',
    });
  }

  return badges;
}

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
  /** Whether seat is in wing zone (from deckConfiguration) */
  isWingZone?: boolean;
  /** Whether seat is in exit row (from deckConfiguration exitRowsX) */
  isExitRowConfig?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}

export function SeatTooltip({
  seat,
  status,
  price,
  currency,
  isWingZone,
  isExitRowConfig,
  onSelect,
  children,
}: SeatTooltipProps) {
  const disabled = status === 'BLOCKED' || status === 'OCCUPIED';
  const positionLabel = getSeatPositionLabel(seat.characteristicsCodes);
  const exitRow = isExitRow(seat.characteristicsCodes) || isExitRowConfig;

  // Build all characteristic badges grouped
  const allBadges = useMemo(
    () => buildCharacteristicBadges(seat.characteristicsCodes),
    [seat.characteristicsCodes]
  );

  const features = allBadges.filter(b => b.group === 'feature');
  const warnings = allBadges.filter(b => b.group === 'warning');

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] p-3">
        <div className="space-y-2">
          {/* Header: Seat number + position */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              {seat.number}
            </span>
            {positionLabel && (
              <>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-xs text-muted-foreground">{positionLabel}</span>
              </>
            )}
          </div>

          {/* Features (green) */}
          {features.length > 0 && (
            <div className="space-y-0.5">
              {features.map((f, i) => (
                <p key={i} className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                </p>
              ))}
            </div>
          )}

          {/* Wing zone indicator */}
          {isWingZone && (
            <p className="text-[11px] text-blue-500 flex items-center gap-1">
              <span>✈️</span>
              <span>Über dem Flügel</span>
            </p>
          )}

          {/* Warnings (amber) */}
          {warnings.length > 0 && (
            <div className="space-y-0.5">
              {warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <span>{w.icon}</span>
                  <span>{w.label}</span>
                </p>
              ))}
            </div>
          )}

          {/* Exit row */}
          {exitRow && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span>🚪</span>
              <span>Notausgangsreihe — besondere Bedingungen</span>
            </p>
          )}

          {/* Price */}
          {status === 'AVAILABLE' && (
            <div className="pt-1.5 border-t border-border">
              {price != null && price > 0 ? (
                <span className="text-sm font-bold text-foreground">
                  {price.toFixed(2)} {currency ?? 'EUR'}
                </span>
              ) : (
                <span className="text-sm font-bold text-emerald-600">Kostenlos</span>
              )}
            </div>
          )}

          {status === 'OCCUPIED' && (
            <p className="text-xs text-muted-foreground">Dieser Sitz ist bereits belegt.</p>
          )}

          {status === 'BLOCKED' && (
            <p className="text-xs text-muted-foreground">Dieser Sitz ist nicht verfügbar.</p>
          )}

          {/* Select button */}
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
