'use client';

import React, { useMemo } from 'react';
import type {
  Deck,
  Seat,
  SelectedSeat,
  PriceTier,
  PriceTierDefinition,
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
  priceTiers?: PriceTierDefinition[];
  /** Map travelerId → index (0-based) for colors */
  travelerIndexMap?: Record<string, number>;
  compact?: boolean;
}

// ============================================================================
// Helper: map Y-position → CSS grid column
// ============================================================================

function buildColumnMap(columns: number[], aisles: number[]): Map<number, number> {
  const map = new Map<number, number>();
  // Column 1 is reserved for row numbers
  let gridCol = 2;
  for (let i = 0; i < columns.length; i++) {
    map.set(columns[i], gridCol);
    gridCol++;
    // Add aisle gap column after this column if it's an aisle boundary
    if (aisles.includes(columns[i])) {
      gridCol++; // skip one column for aisle
    }
  }
  return map;
}

function buildRowMap(rowRange: [number, number], rowGaps: number[]): Map<number, number> {
  const map = new Map<number, number>();
  const gapSet = new Set(rowGaps);
  // Row 1 is reserved for column labels header
  let gridRow = 2;
  for (let r = rowRange[0]; r <= rowRange[1]; r++) {
    if (gapSet.has(r)) continue;
    map.set(r, gridRow);
    gridRow++;
  }
  return map;
}

function totalGridColumns(columns: number[], aisles: number[]): number {
  // 1 (row-number col) + columns.length + aisles.length (gap cols)
  return 1 + columns.length + aisles.length;
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
  compact = false,
}: SeatmapGridProps) {
  const layout = useMemo(() => buildGridLayout(deck), [deck]);
  const { columns, aisles, rowRange, rowGaps, cabinBoundaries } = layout;

  const columnMap = useMemo(() => buildColumnMap(columns, aisles), [columns, aisles]);
  const rowMap = useMemo(() => buildRowMap(rowRange, rowGaps), [rowRange, rowGaps]);

  // Set of selected seat numbers for quick lookup
  const selectedNumbers = useMemo(
    () => new Set(Object.values(selectedSeats).map((s) => s.number)),
    [selectedSeats]
  );

  // Reverse map: seatNumber → travelerId
  const seatToTraveler = useMemo(() => {
    const m = new Map<string, string>();
    for (const [tid, sel] of Object.entries(selectedSeats)) {
      m.set(sel.number, tid);
    }
    return m;
  }, [selectedSeats]);

  const totalCols = totalGridColumns(columns, aisles);

  // Wing rows
  const config = deck.deckConfiguration;
  const wingStart = config?.startWingsRow ?? 0;
  const wingEnd = config?.endWingsRow ?? 0;
  const exitRows = new Set(config?.exitRowsX ?? []);

  // Build aisle column indices for gap rendering
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

  return (
    <div className="space-y-3">
      {/* Cabin headers */}
      {cabinBoundaries.map((cb) => {
        // Find matching amenities on the SeatmapData level if available
        return (
          <React.Fragment key={`cabin-${cb.cabin}-${cb.startRow}`}>
            <CabinHeader cabin={cb.cabin} />
          </React.Fragment>
        );
      })}

      {/* Grid */}
      <div
        className="relative overflow-x-auto pb-2"
        role="grid"
        aria-label="Sitzplan"
      >
        <div
          className="inline-grid gap-1 items-center justify-items-center"
          style={{
            gridTemplateColumns: `40px repeat(${totalCols - 1}, minmax(${compact ? '36px' : '40px'}, 1fr))`,
          }}
        >
          {/* Row 1: Column labels */}
          <div className="text-xs font-medium text-muted-foreground" style={{ gridRow: 1, gridColumn: 1 }}>
            {/* empty corner */}
          </div>
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

          {/* Row numbers + Wing/Exit indicators */}
          {Array.from(rowMap.entries()).map(([rowNum, gridRow]) => {
            const isWing = rowNum >= wingStart && rowNum <= wingEnd;
            const isExit = exitRows.has(rowNum);

            return (
              <div
                key={`row-${rowNum}`}
                className={[
                  'text-xs font-medium flex items-center gap-0.5 justify-end pr-1 w-full',
                  isWing ? 'text-blue-400' : 'text-muted-foreground',
                ].join(' ')}
                style={{ gridRow, gridColumn: 1 }}
                role="rowheader"
              >
                {isExit && <span title="Notausgang">🚪</span>}
                {isWing && <span className="text-[8px]">✈</span>}
                <span>{rowNum}</span>
              </div>
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

            // Passenger color & number
            const assignedTraveler = seatToTraveler.get(seat.number);
            const travelerIdx = assignedTraveler && travelerIndexMap
              ? travelerIndexMap[assignedTraveler]
              : undefined;
            const passengerColor = travelerIdx != null
              ? PASSENGER_COLORS[travelerIdx % PASSENGER_COLORS.length]
              : undefined;
            const passengerNumber = travelerIdx != null ? travelerIdx + 1 : undefined;

            return (
              <div
                key={seat.number}
                style={{ gridRow, gridColumn: gridCol }}
              >
                <SeatTooltip
                  seat={seat}
                  status={status}
                  price={price}
                  currency={currency}
                  onSelect={() => onSeatSelect(seat)}
                >
                  <SeatCell
                    seat={seat}
                    status={status}
                    isSelected={isSelected}
                    passengerColor={passengerColor}
                    passengerNumber={passengerNumber}
                    price={price}
                    currency={currency}
                    onSelect={() => onSeatSelect(seat)}
                    compact={compact}
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
                className="flex items-center justify-center text-sm opacity-50"
                style={{ gridRow, gridColumn: gridCol }}
                title={facilityDef?.label ?? facility.code ?? ''}
              >
                {facilityDef?.icon ?? '·'}
              </div>
            );
          })}

          {/* Aisle gap columns — render subtle dividers */}
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

        {/* Wing overlay */}
        {wingStart > 0 && wingEnd > 0 && (
          <>
            {Array.from(rowMap.entries())
              .filter(([rowNum]) => rowNum >= wingStart && rowNum <= wingEnd)
              .map(([rowNum, gridRow]) => (
                <React.Fragment key={`wing-${rowNum}`}>
                  {/* subtle wing indicator on the row number side is rendered above */}
                </React.Fragment>
              ))}
          </>
        )}
      </div>
    </div>
  );
});

SeatmapGrid.displayName = 'SeatmapGrid';
