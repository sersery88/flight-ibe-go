'use client';

import React from 'react';
import type { SelectedSeat } from '@/types/seatmap';
import { PASSENGER_COLORS } from '@/types/seatmap';
import type { TravelerInfo } from './passenger-selector';
import { motion, AnimatePresence } from 'motion/react';

// ============================================================================
// Types
// ============================================================================

export interface SelectionSummaryProps {
  selections: Record<string, SelectedSeat>;
  travelers: TravelerInfo[];
}

// ============================================================================
// Helpers
// ============================================================================

function getSeatPositionShort(characteristics: string[]): string {
  if (characteristics.includes('W')) return 'Fenster';
  if (characteristics.includes('A')) return 'Gang';
  if (characteristics.includes('M') || characteristics.includes('CC')) return 'Mitte';
  return '';
}

// ============================================================================
// SelectionSummary Component
// ============================================================================

export function SelectionSummary({ selections, travelers }: SelectionSummaryProps) {
  const eligibleTravelers = travelers.filter((t) => t.type !== 'HELD_INFANT');
  const hasAnySelection = Object.keys(selections).length > 0;

  // Compute total cost
  let totalCost = 0;
  let currency = '';
  for (const sel of Object.values(selections)) {
    totalCost += sel.price ?? 0;
    if (sel.currency && !currency) currency = sel.currency;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground">Sitzauswahl</h4>

      {!hasAnySelection ? (
        <p className="text-xs text-muted-foreground">Keine Auswahl — Sitz wird beim Check-in zugewiesen.</p>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-1.5">
            {eligibleTravelers.map((traveler, index) => {
              const sel = selections[traveler.id];
              const color = PASSENGER_COLORS[index % PASSENGER_COLORS.length];

              return (
                <motion.div
                  key={traveler.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-block size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate text-muted-foreground">{traveler.name}</span>
                  </div>

                  {sel ? (
                    <div className="flex items-center gap-1.5 text-xs shrink-0">
                      <span className="font-medium text-foreground">{sel.number}</span>
                      {sel.characteristics.length > 0 && (
                        <span className="text-muted-foreground">
                          ({getSeatPositionShort(sel.characteristics)})
                        </span>
                      )}
                      {sel.price != null && sel.price > 0 && (
                        <span className="font-semibold text-foreground">
                          · {sel.price.toFixed(2)} {sel.currency ?? 'EUR'}
                        </span>
                      )}
                      {(sel.price == null || sel.price === 0) && (
                        <span className="text-emerald-600">· Kostenlos</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">—</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      {/* Total */}
      {hasAnySelection && (
        <div className="flex items-center justify-between border-t border-border pt-2 mt-2">
          <span className="text-sm font-medium text-foreground">Gesamt</span>
          <span className="text-sm font-bold text-foreground">
            {totalCost > 0
              ? `${totalCost.toFixed(2)} ${currency || 'EUR'}`
              : 'Kostenlos'}
          </span>
        </div>
      )}
    </div>
  );
}
