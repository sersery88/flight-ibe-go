'use client';

import React from 'react';

// ============================================================================
// Legend items
// ============================================================================

interface LegendItem {
  color: string;
  label: string;
  pattern?: string; // extra visual indicator
}

const LEGEND_ITEMS: LegendItem[] = [
  { color: '#10B981', label: 'Kostenlos' },
  { color: '#3B82F6', label: 'Günstig (< 30 €)' },
  { color: '#F59E0B', label: 'Mittel (30–80 €)' },
  { color: '#8B5CF6', label: 'Premium / Extra-Leg' },
  { color: '#EC4899', label: 'Ausgewählt', pattern: '✓' },
  { color: '#D1D5DB', label: 'Blockiert' },
  { color: '#9CA3AF', label: 'Belegt', pattern: '✗' },
];

// ============================================================================
// Legend Component
// ============================================================================

export function Legend() {
  return (
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
  );
}
