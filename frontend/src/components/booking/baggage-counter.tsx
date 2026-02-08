'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Minus, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface BagOption {
  weight: number;
  weightUnit: string;
  maxQuantity: number;
  price: number;
  currency: string;
  type: string; // e.g. 'CHECKED_BAG', 'SPORT_EQUIPMENT'
  label?: string; // e.g. 'Zusätzliches Gepäck (23kg)'
}

export interface BaggageCounterProps {
  travelerName: string;
  travelerId: string;
  bagOptions: BagOption[];
  selected: Record<string, number>; // type → quantity
  onChange: (travelerId: string, type: string, quantity: number) => void;
}

// ============================================================================
// BaggageCounter
// ============================================================================

export function BaggageCounter({
  travelerName,
  travelerId,
  bagOptions,
  selected,
  onChange,
}: BaggageCounterProps) {
  if (bagOptions.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {travelerName}
      </p>

      {bagOptions.map((opt) => {
        const qty = selected[opt.type] ?? 0;
        const label =
          opt.label ||
          `Zusätzliches Gepäck (${opt.weight}${opt.weightUnit.toLowerCase()})`;

        return (
          <div key={opt.type} className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-300">{label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                +{formatCurrency(opt.price, opt.currency)} pro Strecke
              </p>
            </div>

            {/* Counter */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onChange(travelerId, opt.type, Math.max(0, qty - 1))
                }
                disabled={qty <= 0}
                className="flex items-center justify-center h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Weniger"
              >
                <Minus className="h-4 w-4" />
              </button>

              <AnimatePresence mode="popLayout">
                <motion.span
                  key={qty}
                  initial={{ y: -8, opacity: 0, scale: 1.2 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 8, opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15, type: 'spring', stiffness: 400, damping: 25 }}
                  className="w-8 text-center text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums"
                >
                  {qty}
                </motion.span>
              </AnimatePresence>

              <button
                type="button"
                onClick={() =>
                  onChange(
                    travelerId,
                    opt.type,
                    Math.min(opt.maxQuantity, qty + 1)
                  )
                }
                disabled={qty >= opt.maxQuantity}
                className="flex items-center justify-center h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Mehr"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Cost indicator */}
            {qty > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs font-medium text-pink-600 dark:text-pink-400 whitespace-nowrap"
              >
                {formatCurrency(opt.price * qty, opt.currency)}
              </motion.span>
            )}
          </div>
        );
      })}
    </div>
  );
}
