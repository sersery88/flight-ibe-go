'use client';

import React from 'react';
import type { SeatCategory } from '@/lib/seat-categories';
import { CATEGORY_STYLES } from '@/lib/seat-categories';

// ============================================================================
// Types
// ============================================================================

export interface LegendProps {
  availableCategories: SeatCategory[];
  activeFilter: SeatCategory | null;
  onFilterChange: (filter: SeatCategory | null) => void;
}

// ============================================================================
// Static legend items (always visible)
// ============================================================================

interface StaticLegendItem {
  color: string;
  label: string;
  pattern?: string;
  border?: boolean;
}

const STATIC_ITEMS: StaticLegendItem[] = [
  { color: '#10B981', label: 'Kostenlos' },
  { color: '#38BDF8', label: 'Standard' },
  { color: '#EC4899', label: 'Ausgewählt', pattern: '✓' },
  { color: '#9CA3AF', label: 'Belegt', pattern: '✗' },
  { color: '#D1D5DB', label: 'Blockiert' },
];

// ============================================================================
// Filter categories (excludes standard + restricted from clickable filters)
// ============================================================================

const FILTERABLE_CATEGORIES: SeatCategory[] = [
  'standard',
  'exit',
  'preferred',
  'extraleg',
  'bulkhead',
  'bassinet',
  'accessible',
];

// ============================================================================
// Legend Component
// ============================================================================

export function Legend({
  availableCategories,
  activeFilter,
  onFilterChange,
}: LegendProps) {
  // Only show filterable categories that actually exist on this deck
  const filterableOnDeck = FILTERABLE_CATEGORIES.filter(c =>
    availableCategories.includes(c)
  );

  return (
    <div className="space-y-2.5 md:space-y-3">
      {/* Section 1: Static legend (prices + states) */}
      <div
        className="flex flex-wrap gap-x-4 gap-y-1.5 md:gap-x-5 md:gap-y-2 text-xs md:text-sm"
        role="list"
        aria-label="Farblegende"
      >
        {STATIC_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 md:gap-2" role="listitem">
            <span
              className="inline-flex items-center justify-center size-4 md:size-5 rounded-sm text-white text-[9px] md:text-[11px] font-bold shrink-0"
              style={{
                backgroundColor: item.color,
                ...(item.border ? { border: '1.5px solid #d1d5db' } : {}),
              }}
            >
              {item.pattern ?? ''}
            </span>
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Section 2: Seat type filter badges (clickable) */}
      {filterableOnDeck.length > 0 && (
        <div className="pt-1.5 md:pt-2 border-t border-border/50">
          <div
            className="flex flex-wrap gap-1.5 md:gap-2"
            role="list"
            aria-label="Sitztyp-Filter"
          >
            {filterableOnDeck.map((cat) => {
              const style = CATEGORY_STYLES[cat];
              const isActive = activeFilter === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  role="listitem"
                  onClick={() => onFilterChange(isActive ? null : cat)}
                  aria-pressed={isActive}
                  className={[
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 md:px-3 md:py-1.5 text-[11px] md:text-xs font-medium transition-all duration-150',
                    'border cursor-pointer hover:scale-105 active:scale-95',
                    isActive
                      ? 'bg-pink-500 text-white border-pink-400 shadow-md shadow-pink-500/20'
                      : `${style.bg} ${style.text} border-transparent hover:ring-1 hover:ring-white/50`,
                  ].join(' ')}
                >
                  {style.icon && <span className="text-xs md:text-sm">{style.icon}</span>}
                  <span>{style.label}</span>
                </button>
              );
            })}

            {/* Clear filter button when filter is active */}
            {activeFilter && (
              <button
                type="button"
                onClick={() => onFilterChange(null)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 md:px-3 md:py-1.5 text-[11px] md:text-xs font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                <span>✕</span>
                <span>Filter aufheben</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
