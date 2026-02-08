'use client';

import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ServiceOption {
  type: string;
  label: string;
  description?: string;
  icon?: string;
  price: number;
  currency: string;
}

export interface ServiceToggleProps {
  service: ServiceOption;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

// ============================================================================
// Icon map for known service types
// ============================================================================

const SERVICE_ICONS: Record<string, string> = {
  PRIORITY_BOARDING: '⚡',
  AIRPORT_CHECKIN: '🏢',
  LOUNGE_ACCESS: '🛋️',
  FAST_TRACK: '🏃',
  MEAL: '🍽️',
  WIFI: '📶',
};

const SERVICE_LABELS: Record<string, string> = {
  PRIORITY_BOARDING: 'Priority Boarding',
  AIRPORT_CHECKIN: 'Airport Check-in',
  LOUNGE_ACCESS: 'Lounge-Zugang',
  FAST_TRACK: 'Fast Track Security',
  MEAL: 'Mahlzeit',
  WIFI: 'WLAN an Bord',
};

// ============================================================================
// ServiceToggle
// ============================================================================

export function ServiceToggle({ service, checked, onChange }: ServiceToggleProps) {
  const icon = service.icon || SERVICE_ICONS[service.type] || '⚡';
  const label = service.label || SERVICE_LABELS[service.type] || service.type;

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all min-h-[56px] ${
        checked
          ? 'border-pink-300 dark:border-pink-700 bg-pink-50/50 dark:bg-pink-950/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
      }`}
    >
      {/* Checkbox */}
      <motion.div
        animate={{
          backgroundColor: checked ? 'rgb(236 72 153)' : 'transparent',
          borderColor: checked ? 'rgb(236 72 153)' : 'rgb(209 213 219)',
        }}
        transition={{ duration: 0.15 }}
        className="flex items-center justify-center h-5 w-5 rounded-md border-2 shrink-0"
      >
        {checked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          </motion.div>
        )}
      </motion.div>

      {/* Icon */}
      <span className="text-lg shrink-0">{icon}</span>

      {/* Label + Description */}
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </p>
        {service.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {service.description}
          </p>
        )}
      </div>

      {/* Price */}
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
        +{formatCurrency(service.price, service.currency)}
      </span>
    </button>
  );
}
