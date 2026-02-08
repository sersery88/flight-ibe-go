'use client';

import React from 'react';

// ============================================================================
// Legend items
// ============================================================================

interface LegendItem {
  color: string;
  label: string;
  pattern?: string;
  /** Optional border/outline style instead of solid fill */
  outline?: boolean;
  /** Text color override for special items */
  textColor?: string;
}

const LEGEND_ITEMS: LegendItem[] = [
  // Price tiers
  { color: '#10B981', label: 'Kostenlos' },
  { color: '#3B82F6', label: 'Günstig (< 30 €)' },
  { color: '#F59E0B', label: 'Mittel (30–80 €)' },
  { color: '#8B5CF6', label: 'Premium / Extra-Leg' },
  // States
  { color: '#EC4899', label: 'Ausgewählt', pattern: '✓' },
  { color: '#D1D5DB', label: 'Blockiert' },
  { color: '#9CA3AF', label: 'Belegt', pattern: '✗' },
];

interface SpecialLegendItem {
  icon: string;
  label: string;
  colorClass: string;
}

const SPECIAL_ITEMS: SpecialLegendItem[] = [
  { icon: '🚪', label: 'Notausgangsreihe', colorClass: 'text-amber-600 dark:text-amber-400' },
  { icon: '✈️', label: 'Flügelbereich', colorClass: 'text-blue-400 dark:text-blue-300' },
  { icon: '🦵', label: 'Extra Beinfreiheit', colorClass: 'text-emerald-600 dark:text-emerald-400' },
  { icon: '♿', label: 'Rollstuhlgerecht', colorClass: 'text-blue-600 dark:text-blue-400' },
];

// ============================================================================
// Legend Component
// ============================================================================

export function Legend() {
  return (
    <div className="space-y-2">
      {/* Color legend */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs"
        role="list"
        aria-label="Farblegende"
      >
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2" role="listitem">
            <span
              className="inline-flex items-center justify-center size-5 rounded-sm text-white text-[10px] font-bold shrink-0"
              style={{ backgroundColor: item.color }}
            >
              {item.pattern ?? ''}
            </span>
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Special indicators */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 text-xs pt-1 border-t border-border/50"
        role="list"
        aria-label="Zusatzlegende"
      >
        {SPECIAL_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2" role="listitem">
            <span className="inline-flex items-center justify-center size-5 text-sm shrink-0">
              {item.icon}
            </span>
            <span className={item.colorClass}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
