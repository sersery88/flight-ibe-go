'use client';

import React, { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Seat, SeatStatus } from '@/types/seatmap';
import { getSeatCharacteristic, GENERIC_SYSTEM_CODES } from '@/lib/seat-characteristics';
import { getSeatCategory, CATEGORY_STYLES, type SeatCategory } from '@/lib/seat-categories';

// ============================================================================
// Codes to SKIP in the detail list (handled by category badge or position)
// ============================================================================

// Position codes handled separately in the header
const POSITION_CODES = new Set(['W', 'A', 'M', 'CC']);

// Codes that are already represented by the category badge — don't repeat them
const CATEGORY_CODES: Record<SeatCategory, Set<string>> = {
  exit:       new Set(['E', 'IE']),
  preferred:  new Set(['P', 'PS', 'EC']),
  extraleg:   new Set(['L', 'XL']),
  bulkhead:   new Set(['K']),
  bassinet:   new Set(['B', 'BK']),
  accessible: new Set(['H']),
  pet:        new Set(),
  restricted: new Set(),
  standard:   new Set(),
};

// ============================================================================
// Build DEDUPLICATED characteristic list
// ============================================================================

interface CharItem {
  icon: string;
  label: string;
  isWarning: boolean;
}

function buildUniqueCharacteristics(codes: string[] | undefined, category: SeatCategory): CharItem[] {
  if (!codes) return [];
  
  const skipCodes = CATEGORY_CODES[category] ?? new Set();
  const seen = new Set<string>(); // dedupe by label
  const items: CharItem[] = [];

  for (const code of codes) {
    if (GENERIC_SYSTEM_CODES.has(code)) continue;  // CH, 1A, 1A_AQC_PREMIUM_SEAT, N, R, RS
    if (POSITION_CODES.has(code)) continue;         // W, A, M, CC — shown in header
    if (skipCodes.has(code)) continue;               // Category-specific duplicates
    
    const def = getSeatCharacteristic(code);
    if (!def) continue;
    if (seen.has(def.label)) continue; // skip duplicate labels
    
    seen.add(def.label);
    items.push({ icon: def.icon, label: def.label, isWarning: !!def.warning });
  }

  return items;
}

function getSeatPositionLabel(characteristics?: string[]): string | null {
  if (!characteristics) return null;
  if (characteristics.includes('W')) return 'Fenster';
  if (characteristics.includes('A')) return 'Gang';
  if (characteristics.includes('M') || characteristics.includes('CC')) return 'Mitte';
  return null;
}

// ============================================================================
// SeatDetailSheet
// ============================================================================

export interface SeatDetailSheetProps {
  seat: Seat | null;
  status?: SeatStatus;
  price?: number;
  currency?: string;
  isWingZone?: boolean;
  isExitRowConfig?: boolean;
  onSelect: (seat: Seat) => void;
  onDeselect?: (seat: Seat) => void;
  isSelected?: boolean;
  onClose: () => void;
}

export function SeatDetailSheet({
  seat,
  status,
  price,
  currency,
  isWingZone,
  onSelect,
  onDeselect,
  isSelected,
  onClose,
}: SeatDetailSheetProps) {
  const positionLabel = seat ? getSeatPositionLabel(seat.characteristicsCodes) : null;
  const category = useMemo(
    () => (seat ? getSeatCategory(seat.characteristicsCodes) : 'standard'),
    [seat]
  );
  const catStyle = CATEGORY_STYLES[category];

  // Deduplicated characteristics (excluding what the category badge already shows)
  const chars = useMemo(
    () => (seat ? buildUniqueCharacteristics(seat.characteristicsCodes, category) : []),
    [seat, category]
  );

  const features = chars.filter(c => !c.isWarning);
  const warnings = chars.filter(c => c.isWarning);

  // Add wing zone as a feature if applicable
  if (isWingZone && !features.some(f => f.label.includes('Flügel'))) {
    features.push({ icon: '✈️', label: 'Über dem Flügel', isWarning: false });
  }

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[61] bg-background rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-5 pb-6 space-y-3">
              {/* Header: Seat number + position + price */}
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold">{seat.number}</span>
                  {positionLabel && (
                    <span className="text-sm text-muted-foreground">{positionLabel}</span>
                  )}
                </div>
                {status === 'AVAILABLE' && (
                  price != null && price > 0 ? (
                    <span className="text-lg font-bold">
                      {price.toFixed(2)} {currency ?? '€'}
                    </span>
                  ) : (
                    <span className="text-lg font-bold text-emerald-500">Kostenlos</span>
                  )
                )}
              </div>

              {/* Category badge (if not standard) */}
              {category !== 'standard' && (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${catStyle.bg} ${catStyle.text}`}>
                  {catStyle.icon && <span>{catStyle.icon}</span>}
                  {catStyle.label}
                </span>
              )}

              {/* All characteristics in ONE clean list */}
              {(features.length > 0 || warnings.length > 0) && (
                <div className="space-y-1 pt-1">
                  {features.map((f, i) => (
                    <div key={`f-${i}`} className="flex items-center gap-2.5 text-sm">
                      <span className="w-5 text-center">{f.icon}</span>
                      <span className="text-foreground">{f.label}</span>
                    </div>
                  ))}
                  {warnings.map((w, i) => (
                    <div key={`w-${i}`} className="flex items-center gap-2.5 text-sm">
                      <span className="w-5 text-center">{w.icon}</span>
                      <span className="text-amber-600 dark:text-amber-400">{w.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Status messages */}
              {status === 'OCCUPIED' && (
                <p className="text-sm text-muted-foreground text-center py-2">Bereits belegt.</p>
              )}
              {status === 'BLOCKED' && (
                <p className="text-sm text-muted-foreground text-center py-2">Nicht verfügbar.</p>
              )}

              {/* Select / Deselect button */}
              {!disabled && status === 'AVAILABLE' && isSelected && onDeselect && seat && (
                <button
                  type="button"
                  onClick={() => { onDeselect(seat); onClose(); }}
                  className="w-full mt-2 rounded-xl bg-gray-200 dark:bg-gray-700 px-6 py-3.5 text-sm font-semibold text-gray-800 dark:text-gray-200 active:scale-[0.98] transition-all"
                >
                  Auswahl aufheben
                </button>
              )}
              {!disabled && status === 'AVAILABLE' && !isSelected && (
                <button
                  type="button"
                  onClick={handleSelect}
                  className="w-full mt-2 rounded-xl bg-pink-500 px-6 py-3.5 text-sm font-semibold text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  Sitz auswählen
                  {price != null && price > 0 && (
                    <span className="opacity-80">({price.toFixed(2)} {currency ?? '€'})</span>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
