'use client';

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import type {
  Deck,
  Seat,
  SelectedSeat,
  AircraftCabinAmenities,
} from '@/types/seatmap';
import {
  buildGridLayout,
  getColumnLabel,
  getSeatStatus,
  getSeatPrice,
  getSeatCurrency,
} from '@/lib/seat-grid-builder';
import { getFacilityType } from '@/lib/seat-characteristics';
import { PASSENGER_COLORS } from '@/types/seatmap';
import { getSeatCategory } from '@/lib/seat-categories';
import type { SeatCategory } from '@/lib/seat-categories';
import { SeatCell } from './seat-cell';
import { SeatTooltip } from './seat-tooltip';
import { CabinHeader } from './cabin-header';

// ============================================================================
// Types
// ============================================================================

export interface SeatmapGridProps {
  deck: Deck;
  selectedSeats: Record<string, SelectedSeat>;
  activeTravelerId: string;
  onSeatSelect: (seat: Seat) => void;
  travelerIndexMap?: Record<string, number>;
  amenities?: AircraftCabinAmenities;
  compact?: boolean;
  activeFilter?: SeatCategory | null;
  onSeatTapMobile?: (seat: Seat) => void;
}

// ============================================================================
// Helper: map Y-position → CSS grid column
// ============================================================================

function buildColumnMap(columns: number[], aisles: number[]): Map<number, number> {
  const map = new Map<number, number>();
  let gridCol = 2;
  for (let i = 0; i < columns.length; i++) {
    map.set(columns[i], gridCol);
    gridCol++;
    if (aisles.includes(columns[i])) {
      gridCol++;
    }
  }
  return map;
}

function buildRowMap(rowRange: [number, number], rowGaps: number[]): Map<number, number> {
  const map = new Map<number, number>();
  const gapSet = new Set(rowGaps);
  let gridRow = 2;
  for (let r = rowRange[0]; r <= rowRange[1]; r++) {
    if (gapSet.has(r)) continue;
    map.set(r, gridRow);
    gridRow++;
  }
  return map;
}

function totalGridColumns(columns: number[], aisles: number[]): number {
  return 1 + columns.length + aisles.length + 1;
}

// ============================================================================
// Hook: detect mobile
// ============================================================================

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}

// ============================================================================
// SeatmapGrid Component
// ============================================================================

export const SeatmapGrid = React.memo(function SeatmapGrid({
  deck,
  selectedSeats,
  activeTravelerId,
  onSeatSelect,
  travelerIndexMap,
  amenities,
  compact = false,
  activeFilter,
  onSeatTapMobile,
}: SeatmapGridProps) {
  const isMobile = useIsMobile();
  const layout = useMemo(() => buildGridLayout(deck), [deck]);
  const { columns, aisles, rowRange, rowGaps, cabinBoundaries } = layout;

  const columnMap = useMemo(() => buildColumnMap(columns, aisles), [columns, aisles]);
  const rowMap = useMemo(() => buildRowMap(rowRange, rowGaps), [rowRange, rowGaps]);

  // Map X-coordinate → actual seat row number (e.g. X=0 → row 11 from seat "11A")
  const xToRowLabel = useMemo(() => {
    const map = new Map<number, string>();
    for (const seat of deck.seats) {
      const x = seat.coordinates?.x;
      if (x == null || map.has(x)) continue;
      const match = seat.number.match(/^(\d+)/);
      if (match) map.set(x, match[1]);
    }
    return map;
  }, [deck.seats]);

  const selectedNumbers = useMemo(
    () => new Set(Object.values(selectedSeats).map((s) => s.number)),
    [selectedSeats]
  );

  const seatToTraveler = useMemo(() => {
    const m = new Map<string, string>();
    for (const [tid, sel] of Object.entries(selectedSeats)) {
      m.set(sel.number, tid);
    }
    return m;
  }, [selectedSeats]);

  const totalCols = totalGridColumns(columns, aisles);

  const config = deck.deckConfiguration;
  const wingStart = config?.startWingsRow ?? 0;
  const wingEnd = config?.endWingsRow ?? 0;

  // exitRowsX contains X-coordinates (same coordinate system as seat.coordinates.x)
  const exitRows = useMemo(() => new Set(config?.exitRowsX ?? []), [config?.exitRowsX]);

  const aisleGridCols = useMemo(() => {
    const cols: number[] = [];
    let gridCol = 2;
    for (let i = 0; i < columns.length; i++) {
      gridCol++;
      if (aisles.includes(columns[i])) {
        cols.push(gridCol);
        gridCol++;
      }
    }
    return cols;
  }, [columns, aisles]);

  const rightLabelCol = totalCols;

  // Calculate median price of available seats for preferred tier detection
  // Price threshold for "preferred" tier:
  // Find the lowest price among standard seats — anything above it is premium.
  // This works because Amadeus gives distinct price tiers (e.g. 39.86 / 51.73 / 122.96).
  const preferredThreshold = useMemo(() => {
    const prices: number[] = [];
    for (const seat of deck.seats) {
      if (!seat.travelerPricing) continue;
      for (const tp of seat.travelerPricing) {
        if (tp.seatAvailabilityStatus !== 'AVAILABLE') continue;
        const p = parseFloat(tp.price?.total ?? tp.price?.base ?? '0');
        if (p > 0) prices.push(p);
      }
    }
    if (prices.length === 0) return Infinity;
    
    // Get distinct price tiers
    const uniquePrices = [...new Set(prices)].sort((a, b) => a - b);
    
    // Need at least 2 different prices to distinguish tiers
    if (uniquePrices.length < 2) return Infinity;
    
    // Threshold = lowest price. Anything strictly above it = preferred.
    return uniquePrices[0];
  }, [deck.seats]);

  // Handle seat interaction (mobile vs desktop)
  const handleSeatInteraction = useCallback(
    (seat: Seat) => {
      if (isMobile && onSeatTapMobile) {
        onSeatTapMobile(seat);
      } else {
        onSeatSelect(seat);
      }
    },
    [isMobile, onSeatTapMobile, onSeatSelect]
  );

  return (
    <div className="space-y-3">
      {/* Cabin headers */}
      {cabinBoundaries.map((cb) => (
        <React.Fragment key={`cabin-${cb.cabin}-${cb.startRow}`}>
          <CabinHeader cabin={cb.cabin} amenities={amenities} />
        </React.Fragment>
      ))}

      {/* Grid */}
      <div
        className="relative overflow-x-auto pb-2"
        role="grid"
        aria-label="Sitzplan"
      >
        <div
          className="inline-grid gap-1 items-center justify-items-center"
          style={{
            gridTemplateColumns: `40px repeat(${totalCols - 2}, minmax(${compact ? '36px' : '40px'}, 1fr)) 40px`,
          }}
        >
          {/* Row 1: Column labels */}
          <div className="text-xs font-medium text-muted-foreground" style={{ gridRow: 1, gridColumn: 1 }} />
          {columns.map((y, i) => {
            const gc = columnMap.get(y);
            if (gc == null) return null;
            return (
              <div
                key={`col-${y}`}
                className="text-xs font-semibold text-muted-foreground"
                style={{ gridRow: 1, gridColumn: gc }}
              >
                {getColumnLabel(i, columns)}
              </div>
            );
          })}

          {/* Aisle labels */}
          {aisleGridCols.map((gc) => (
            <div
              key={`aisle-label-${gc}`}
              className="text-[10px] text-muted-foreground/50"
              style={{ gridRow: 1, gridColumn: gc }}
            />
          ))}

          {/* Wing zone — very subtle background tint (no borders, no icons) */}
          {Array.from(rowMap.entries()).map(([rowNum, gridRow]) => {
            const isWing = rowNum >= wingStart && rowNum <= wingEnd && wingStart > 0;
            if (!isWing) return null;
            return (
              <div
                key={`wing-bg-${rowNum}`}
                className="bg-sky-50/60 dark:bg-sky-950/20 pointer-events-none rounded-sm"
                style={{ gridRow, gridColumn: `2 / ${rightLabelCol}` }}
              />
            );
          })}

          {/* Row numbers (LEFT) + EXIT signs on outer edges */}
          {Array.from(rowMap.entries()).map(([rowNum, gridRow]) => {
            const isExit = exitRows.has(rowNum);
            return (
              <React.Fragment key={`row-${rowNum}`}>
                {/* Left side: row number + exit badge */}
                <div
                  className="flex items-center justify-end gap-1 pr-1 w-full"
                  style={{ gridRow, gridColumn: 1 }}
                  role="rowheader"
                >
                  {isExit && (
                    <span className="inline-flex items-center rounded bg-emerald-600 px-0.5 py-px shadow-sm shadow-emerald-500/30 animate-pulse">
                      <span className="text-[6px] font-black text-white tracking-wider leading-none">EXIT</span>
                    </span>
                  )}
                  <span className="text-xs font-medium text-muted-foreground">{xToRowLabel.get(rowNum) ?? rowNum}</span>
                </div>
                {/* Right side: exit badge */}
                {isExit && (
                  <div
                    className="flex items-center justify-start pl-1"
                    style={{ gridRow, gridColumn: rightLabelCol }}
                  >
                    <span className="inline-flex items-center rounded bg-emerald-600 px-0.5 py-px shadow-sm shadow-emerald-500/30 animate-pulse">
                      <span className="text-[6px] font-black text-white tracking-wider leading-none">EXIT</span>
                    </span>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Seats */}
          {deck.seats.map((seat) => {
            const x = seat.coordinates?.x;
            const y = seat.coordinates?.y;
            if (x == null || y == null) return null;

            const gridRow = rowMap.get(x);
            const gridCol = columnMap.get(y);
            if (gridRow == null || gridCol == null) return null;

            const status = getSeatStatus(seat, activeTravelerId, selectedNumbers);
            const price = getSeatPrice(seat, activeTravelerId) ?? undefined;
            const currency = getSeatCurrency(seat, activeTravelerId);
            const isSelected = selectedNumbers.has(seat.number);

            const isWingZone = x >= wingStart && x <= wingEnd && wingStart > 0;
            const isExitRowConfig = exitRows.has(x);

            const assignedTraveler = seatToTraveler.get(seat.number);
            const travelerIdx = assignedTraveler && travelerIndexMap
              ? travelerIndexMap[assignedTraveler]
              : undefined;
            const passengerColor = travelerIdx != null
              ? PASSENGER_COLORS[travelerIdx % PASSENGER_COLORS.length]
              : undefined;
            const passengerNumber = travelerIdx != null ? travelerIdx + 1 : undefined;

            // Filter logic
            const seatCategory = getSeatCategory(seat.characteristicsCodes);
            const isFilterActive = activeFilter != null;
            const matchesFilter = seatCategory === activeFilter;
            const dimmed = isFilterActive && !matchesFilter && !isSelected;
            const highlighted = isFilterActive && matchesFilter && status === 'AVAILABLE' && !isSelected;

            return (
              <div
                key={seat.number}
                className="relative z-[1]"
                style={{ gridRow, gridColumn: gridCol }}
              >
                <SeatTooltip
                  seat={seat}
                  status={status}
                  price={price}
                  currency={currency}
                  isWingZone={isWingZone}
                  isExitRowConfig={isExitRowConfig}
                  onSelect={() => handleSeatInteraction(seat)}
                >
                  <SeatCell
                    seat={seat}
                    status={status}
                    isSelected={isSelected}
                    passengerColor={passengerColor}
                    passengerNumber={passengerNumber}
                    price={price}
                    currency={currency}
                    medianPrice={preferredThreshold}
                    onSelect={() => handleSeatInteraction(seat)}
                    compact={compact}
                    dimmed={dimmed}
                    highlighted={highlighted}
                  />
                </SeatTooltip>
              </div>
            );
          })}

          {/* Facilities */}
          {deck.facilities?.map((facility, idx) => {
            const x = facility.coordinates?.x;
            const y = facility.coordinates?.y;
            if (x == null || y == null) return null;

            const gridRow = rowMap.get(x);
            const gridCol = columnMap.get(y);
            if (gridRow == null || gridCol == null) return null;

            const facilityDef = getFacilityType(facility.code ?? '');

            return (
              <div
                key={`facility-${idx}`}
                className={[
                  'relative z-[1] flex items-center justify-center text-sm',
                  activeFilter ? 'opacity-20' : 'opacity-50',
                ].join(' ')}
                style={{ gridRow, gridColumn: gridCol }}
                title={facilityDef?.label ?? facility.code ?? ''}
              >
                {facilityDef?.icon ?? '·'}
              </div>
            );
          })}

          {/* Aisle gap columns */}
          {aisleGridCols.map((gc) =>
            Array.from(rowMap.values()).map((gr) => (
              <div
                key={`aisle-${gc}-${gr}`}
                className="w-3"
                style={{ gridRow: gr, gridColumn: gc }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
});

SeatmapGrid.displayName = 'SeatmapGrid';
