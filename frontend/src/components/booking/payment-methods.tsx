'use client';

import { motion } from 'motion/react';
import { formatCurrency } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface PaymentMethodsProps {
  selected: string | null;
  onSelect: (method: string) => void;
  totalAmount: number;
  currency: string;
}

interface PaymentMethod {
  id: string;
  label: string;
  sublabel?: string;
  fee: number; // percentage, e.g. 1.6 = +1.6%
  icons: string[];
}

// ============================================================================
// Payment Methods Config
// ============================================================================

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'credit_card',
    label: 'Kreditkarte',
    sublabel: 'VISA · Mastercard · Amex',
    fee: 0,
    icons: ['visa', 'mastercard', 'amex'],
  },
  {
    id: 'twint',
    label: 'TWINT',
    fee: 1.6,
    icons: ['twint'],
  },
  {
    id: 'apple_pay',
    label: 'Apple Pay',
    fee: 0,
    icons: ['apple_pay'],
  },
  {
    id: 'google_pay',
    label: 'Google Pay',
    fee: 0,
    icons: ['google_pay'],
  },
];

// ============================================================================
// Icon/Logo Mapping (SVG-style colored boxes)
// ============================================================================

function PaymentIcon({ type }: { type: string }) {
  switch (type) {
    case 'visa':
      return (
        <span className="inline-flex items-center justify-center h-7 w-11 rounded bg-[#1A1F71] text-white text-[9px] font-bold tracking-wide">
          VISA
        </span>
      );
    case 'mastercard':
      return (
        <span className="inline-flex items-center justify-center h-7 w-11 rounded bg-gray-900 dark:bg-gray-700 overflow-hidden">
          <span className="flex items-center -space-x-1.5">
            <span className="h-4 w-4 rounded-full bg-[#EB001B]" />
            <span className="h-4 w-4 rounded-full bg-[#F79E1B] opacity-80" />
          </span>
        </span>
      );
    case 'amex':
      return (
        <span className="inline-flex items-center justify-center h-7 w-11 rounded bg-[#006FCF] text-white text-[8px] font-bold">
          AMEX
        </span>
      );
    case 'twint':
      return (
        <span className="inline-flex items-center justify-center h-7 w-11 rounded bg-black text-white text-[8px] font-bold tracking-tight">
          TWINT
        </span>
      );
    case 'apple_pay':
      return (
        <span className="inline-flex items-center justify-center h-7 w-11 rounded bg-black text-white text-[9px] font-medium">
           Pay
        </span>
      );
    case 'google_pay':
      return (
        <span className="inline-flex items-center justify-center h-7 w-11 rounded bg-white dark:bg-gray-200 border border-gray-200 dark:border-gray-400 text-[8px] font-bold">
          <span>
            <span className="text-[#4285F4]">G</span>
            <span className="text-gray-700"> Pay</span>
          </span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center justify-center h-7 w-11 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 text-[9px]">
          💳
        </span>
      );
  }
}

// ============================================================================
// PaymentMethods
// ============================================================================

export function PaymentMethods({ selected, onSelect, totalAmount, currency }: PaymentMethodsProps) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
          💳 Zahlungsmethode
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Wähle deine bevorzugte Zahlungsart
        </p>
      </div>
      <div className="p-4 space-y-2.5">
        {PAYMENT_METHODS.map((method) => {
          const isSelected = selected === method.id;
          const feeAmount = method.fee > 0 ? (totalAmount * method.fee) / 100 : 0;

          return (
            <motion.label
              key={method.id}
              whileTap={{ scale: 0.99 }}
              layout
              className={`
                relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer min-h-[60px]
                transition-[background-color,border-color] duration-200 ease-in-out
                ${
                  isSelected
                    ? 'border-pink-500 bg-pink-50/50 dark:bg-pink-950/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }
              `}
            >
              {/* Radio */}
              <input
                type="radio"
                name="payment-method"
                value={method.id}
                checked={isSelected}
                onChange={() => onSelect(method.id)}
                className="sr-only"
              />
              <div
                className={`
                  h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors
                  ${
                    isSelected
                      ? 'border-pink-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }
                `}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="h-2.5 w-2.5 rounded-full bg-pink-500"
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {method.label}
                  </span>
                  {method.fee > 0 && (
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-1.5 py-0.5">
                      +{method.fee}% Gebühr
                    </span>
                  )}
                </div>
                {method.sublabel && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {method.sublabel}
                  </p>
                )}
                {method.fee > 0 && isSelected && feeAmount > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    Aufpreis: {formatCurrency(feeAmount, currency)}
                  </p>
                )}
              </div>

              {/* Icons */}
              <div className="flex items-center gap-1 shrink-0">
                {method.icons.map((icon) => (
                  <PaymentIcon key={icon} type={icon} />
                ))}
              </div>
            </motion.label>
          );
        })}
      </div>
    </div>
  );
}
