'use client';

import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface PriceSummaryProps {
  basePrice: number;
  seatCost: number;
  bagCost: number;
  serviceCost: number;
  currency: string;
  taxes: number;
}

// ============================================================================
// PriceSummary
// ============================================================================

export function PriceSummary({
  basePrice,
  seatCost,
  bagCost,
  serviceCost,
  currency,
  taxes,
}: PriceSummaryProps) {
  const totalExtras = seatCost + bagCost + serviceCost;
  const grandTotal = basePrice + totalExtras;

  const lineItems: { label: string; amount: number; show: boolean }[] = [
    { label: 'Flug', amount: basePrice, show: true },
    { label: 'Sitzplätze', amount: seatCost, show: seatCost > 0 },
    { label: 'Zusatzgepäck', amount: bagCost, show: bagCost > 0 },
    { label: 'Services', amount: serviceCost, show: serviceCost > 0 },
  ];

  const visibleItems = lineItems.filter((item) => item.show);

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 space-y-2.5">
        {/* Line items */}
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {item.label}
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100 tabular-nums">
                {formatCurrency(item.amount, currency)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700" />

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-gray-900 dark:text-gray-100">
            Gesamt
          </span>
          <motion.span
            key={grandTotal}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums"
          >
            {formatCurrency(grandTotal, currency)}
          </motion.span>
        </div>

        {/* Tax hint */}
        {taxes > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Inkl. {formatCurrency(taxes, currency)} Steuern & Gebühren
          </p>
        )}
      </div>
    </div>
  );
}
