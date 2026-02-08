'use client';

import React, { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Seat, SeatStatus } from '@/types/seatmap';
import {
  getSeatCharacteristic,
  isExitRow,
} from '@/lib/seat-characteristics';
import { getSeatCategory, CATEGORY_STYLES } from '@/lib/seat-categories';

// ============================================================================
// Types
// ============================================================================

interface CharBadge {
  icon: string;
  label: string;
  group: 'feature' | 'warning';
}

const POSITION_CODES = new Set(['W', 'A', 'M', 'CC']);

// ============================================================================
// Helpers
// ============================================================================

function buildCharacteristicBadges(codes?: string[]): CharBadge[] {
  if (!codes) return [];
  const badges: CharBadge[] = [];
  for (const code of codes) {
    if (POSITION_CODES.has(code)) continue;
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

function getSeatPositionLabel(characteristics?: string[]): string | null {
  if (!characteristics) return null;
  if (characteristics.includes('W')) return 'Fenster';
  if (characteristics.includes('A')) return 'Gang';
  if (characteristics.includes('M') || characteristics.includes('CC')) return 'Mitte';
  return null;
}

// ============================================================================
// SeatDetailSheet — Mobile Bottom Sheet for seat details
// ============================================================================

export interface SeatDetailSheetProps {
  seat: Seat | null;
  status?: SeatStatus;
  price?: number;
  currency?: string;
  isWingZone?: boolean;
  isExitRowConfig?: boolean;
  onSelect: (seat: Seat) => void;
  onClose: () => void;
}

export function SeatDetailSheet({
  seat,
  status,
  price,
  currency,
  isWingZone,
  isExitRowConfig,
  onSelect,
  onClose,
}: SeatDetailSheetProps) {
  const positionLabel = seat ? getSeatPositionLabel(seat.characteristicsCodes) : null;
  const exitRow = seat ? (isExitRow(seat.characteristicsCodes) || isExitRowConfig) : false;
  const category = useMemo(
    () => (seat ? getSeatCategory(seat.characteristicsCodes) : 'standard'),
    [seat]
  );
  const categoryStyle = CATEGORY_STYLES[category];

  const allBadges = useMemo(
    () => (seat ? buildCharacteristicBadges(seat.characteristicsCodes) : []),
    [seat]
  );

  const features = allBadges.filter(b => b.group === 'feature');
  const warnings = allBadges.filter(b => b.group === 'warning');

  const disabled = status === 'BLOCKED' || status === 'OCCUPIED';

  const handleSelect = useCallback(() => {
    if (seat && !disabled) {
      onSelect(seat);
      onClose();
    }
  }, [seat, disabled, onSelect, onClose]);

  return (
    <AnimatePresence>
      {seat && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[61] bg-background rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-5 pb-6 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2">
                <span className="text-lg">💺</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-bold text-foreground">
                    Sitz {seat.number}
                  </span>
                  {positionLabel && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground">{positionLabel}</span>
                    </>
                  )}
                  {status === 'AVAILABLE' && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      {price != null && price > 0 ? (
                        <span className="text-sm font-semibold text-foreground">
                          {price.toFixed(2)} {currency ?? 'EUR'}
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-emerald-600">Kostenlos</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Category badge */}
              {category !== 'standard' && (
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                      categoryStyle.bg,
                      categoryStyle.text,
                    ].join(' ')}
                  >
                    {categoryStyle.icon && <span>{categoryStyle.icon}</span>}
                    <span>{categoryStyle.label}</span>
                  </span>
                </div>
              )}

              {/* Features */}
              {(features.length > 0 || isWingZone) && (
                <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 p-3 space-y-1.5">
                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    Eigenschaften
                  </p>
                  {features.map((f, i) => (
                    <p key={i} className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                      <span>{f.icon}</span>
                      <span>{f.label}</span>
                    </p>
                  ))}
                  {isWingZone && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <span>✈️</span>
                      <span>Über dem Flügel</span>
                    </p>
                  )}
                </div>
              )}

              {/* Warnings */}
              {(warnings.length > 0 || exitRow) && (
                <div className="rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 p-3 space-y-1.5">
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    Hinweise
                  </p>
                  {warnings.map((w, i) => (
                    <p key={i} className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <span>{w.icon}</span>
                      <span>{w.label}</span>
                    </p>
                  ))}
                  {exitRow && (
                    <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <span>🚪</span>
                      <span>Notausgangsreihe — besondere Bedingungen</span>
                    </p>
                  )}
                </div>
              )}

              {/* Status messages */}
              {status === 'OCCUPIED' && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Dieser Sitz ist bereits belegt.
                </p>
              )}
              {status === 'BLOCKED' && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Dieser Sitz ist nicht verfügbar.
                </p>
              )}

              {/* Select button */}
              {!disabled && status === 'AVAILABLE' && (
                <button
                  type="button"
                  onClick={handleSelect}
                  className="w-full rounded-xl bg-pink-500 px-6 py-3.5 text-sm font-semibold text-white hover:bg-pink-600 active:scale-[0.98] transition-all shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2"
                >
                  <span>💺</span>
                  <span>
                    Sitz auswählen
                    {price != null && price > 0 && (
                      <span> ({price.toFixed(2)} {currency ?? 'EUR'})</span>
                    )}
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
