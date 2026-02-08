'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import {
  SeatmapGrid,
  SegmentTabs,
  DeckTabs,
  PassengerSelector,
  Legend,
  SelectionSummary,
  ExitRowDialog,
  NoSeatmapFallback,
  AvailableSeatsCounter,
} from '@/components/seatmap';
import { SeatDetailSheet } from '@/components/seatmap/seat-detail-sheet';
import type { TravelerInfo } from '@/components/seatmap/passenger-selector';
import { useSeatmap } from '@/hooks/use-seatmap';
import { useSeatSelectionStore } from '@/stores/seat-selection-store';
import type {
  FlightOffer,
  SeatmapData,
  Seat,
  SelectedSeat,
  Deck,
} from '@/types/seatmap';
import { getAircraftProfile } from '@/lib/aircraft-profiles';
import { getSeatCharacteristic } from '@/lib/seat-characteristics';
import { getSeatPrice, getSeatCurrency, getSeatStatus } from '@/lib/seat-grid-builder';
import { getAvailableCategories } from '@/lib/seat-categories';
import type { SeatCategory } from '@/lib/seat-categories';

// ============================================================================
// Types
// ============================================================================

export interface SeatmapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: FlightOffer;
  travelers: TravelerInfo[];
  segmentIndex?: number;
}

// ============================================================================
// Helpers
// ============================================================================

function buildDisplayLabel(seat: Seat): string {
  const parts = [seat.number];
  const chars = seat.characteristicsCodes ?? [];
  for (const code of chars) {
    const def = getSeatCharacteristic(code);
    if (def) parts.push(def.label);
  }
  return parts.join(' · ');
}

function isExitRowSeat(seat: Seat): boolean {
  return (seat.characteristicsCodes ?? []).includes('E');
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function SeatmapSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 py-8 animate-pulse">
      <div className="w-48 h-6 bg-muted rounded-full" />
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="w-6 h-4 bg-muted rounded-sm" />
          {Array.from({ length: 6 }).map((_, j) => (
            <React.Fragment key={j}>
              <div className="size-8 bg-muted rounded-md" />
              {j === 2 && <div className="w-4" />}
            </React.Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Error State
// ============================================================================

function SeatmapError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
      <div className="flex items-center justify-center size-14 rounded-full bg-red-50 dark:bg-red-950/30">
        <AlertCircle className="size-7 text-red-500" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base font-semibold text-foreground">
          Sitzplan konnte nicht geladen werden
        </h3>
        <p className="text-sm text-muted-foreground">
          Bitte versuche es erneut. Falls das Problem weiterhin besteht,
          kannst du den Sitzplatz beim Check-in wählen.
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        <RefreshCw className="size-4" />
        Erneut versuchen
      </button>
    </div>
  );
}

// ============================================================================
// SeatmapModal Component
// ============================================================================

export function SeatmapModal({
  open,
  onOpenChange,
  offer,
  travelers,
  segmentIndex = 0,
}: SeatmapModalProps) {
  // ---------- API Data ----------
  const { data, isLoading, isError, refetch } = useSeatmap(open ? offer : null);
  const seatmapSegments: SeatmapData[] = data?.data ?? [];

  // ---------- Store ----------
  const {
    selections,
    selectSeat: storeSelectSeat,
    removeSeat: storeRemoveSeat,
    clearAll: storeClearAll,
  } = useSeatSelectionStore();

  // ---------- Local State ----------
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(segmentIndex);
  const [activeDeck, setActiveDeck] = useState<string>('MAIN');
  const [activeTravelerId, setActiveTravelerId] = useState<string>(
    travelers.filter(t => t.type !== 'HELD_INFANT')[0]?.id ?? '1'
  );
  const [exitRowDialogOpen, setExitRowDialogOpen] = useState(false);
  const [pendingExitSeat, setPendingExitSeat] = useState<Seat | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);

  // --- New states for v3 ---
  const [activeFilter, setActiveFilter] = useState<SeatCategory | null>(null);
  const [detailSeat, setDetailSeat] = useState<Seat | null>(null);

  // Reset active segment when prop changes
  useEffect(() => {
    setActiveSegmentIdx(segmentIndex);
  }, [segmentIndex]);

  // Reset active traveler when travelers change
  useEffect(() => {
    const eligible = travelers.filter(t => t.type !== 'HELD_INFANT');
    if (eligible.length > 0 && !eligible.find(t => t.id === activeTravelerId)) {
      setActiveTravelerId(eligible[0].id);
    }
  }, [travelers, activeTravelerId]);

  // Reset deck + filter + detail when segment changes
  useEffect(() => {
    setActiveDeck('MAIN');
    setActiveFilter(null);
    setDetailSeat(null);
  }, [activeSegmentIdx]);

  // Reset filter + detail when deck changes
  useEffect(() => {
    setActiveFilter(null);
    setDetailSeat(null);
  }, [activeDeck]);

  // ---------- Derived ----------
  const activeSegment = seatmapSegments[activeSegmentIdx] ?? null;
  const segmentId = activeSegment?.segmentId ?? activeSegment?.flightOfferId ?? String(activeSegmentIdx);
  const decks = activeSegment?.decks ?? [];
  const currentDeck: Deck | undefined = decks.find(d => d.deckType === activeDeck) ?? decks[0];

  const aircraftCode = activeSegment?.aircraft?.code;
  const aircraftProfile = getAircraftProfile(aircraftCode);

  const segmentSelections = selections[segmentId] ?? {};

  const travelerIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    let idx = 0;
    for (const t of travelers) {
      if (t.type !== 'HELD_INFANT') {
        map[t.id] = idx++;
      }
    }
    return map;
  }, [travelers]);

  const eligibleTravelers = useMemo(
    () => travelers.filter(t => t.type !== 'HELD_INFANT'),
    [travelers]
  );

  // Available categories for legend
  const availableCategories = useMemo(
    () => (currentDeck ? getAvailableCategories(currentDeck.seats) : []),
    [currentDeck]
  );

  const totalCost = useSeatSelectionStore(s => s.totalSeatCost());
  const currency = useSeatSelectionStore(s => s.currency()) || 'EUR';

  // ---------- Selected seat numbers for detail sheet status ----------
  const selectedNumbers = useMemo(
    () => new Set(Object.values(segmentSelections).map((s) => s.number)),
    [segmentSelections]
  );

  // Compute detail seat status/price for mobile sheet
  const detailSeatStatus = useMemo(() => {
    if (!detailSeat) return undefined;
    return getSeatStatus(detailSeat, activeTravelerId, selectedNumbers);
  }, [detailSeat, activeTravelerId, selectedNumbers]);

  const detailSeatPrice = useMemo(() => {
    if (!detailSeat) return undefined;
    return getSeatPrice(detailSeat, activeTravelerId) ?? undefined;
  }, [detailSeat, activeTravelerId]);

  const detailSeatCurrency = useMemo(() => {
    if (!detailSeat) return undefined;
    return getSeatCurrency(detailSeat, activeTravelerId);
  }, [detailSeat, activeTravelerId]);

  // Wing/exit info for detail seat
  const detailSeatWingZone = useMemo(() => {
    if (!detailSeat || !currentDeck) return false;
    const config = currentDeck.deckConfiguration;
    const x = detailSeat.coordinates?.x ?? 0;
    const ws = config?.startWingsRow ?? 0;
    const we = config?.endWingsRow ?? 0;
    return x >= ws && x <= we && ws > 0;
  }, [detailSeat, currentDeck]);

  const detailSeatExitRow = useMemo(() => {
    if (!detailSeat || !currentDeck) return false;
    const x = detailSeat.coordinates?.x ?? 0;
    const exitRowsX = currentDeck.deckConfiguration?.exitRowsX ?? [];
    return exitRowsX.includes(x);
  }, [detailSeat, currentDeck]);

  // ---------- Handlers ----------
  const handleSeatSelect = useCallback(
    (seat: Seat) => {
      const pricing = seat.travelerPricing?.find(
        tp => tp.seatAvailabilityStatus === 'AVAILABLE'
      );
      if (!pricing && seat.travelerPricing && seat.travelerPricing.length > 0) {
        return;
      }

      const existingSelection = segmentSelections[activeTravelerId];
      if (existingSelection?.number === seat.number) {
        storeRemoveSeat(segmentId, activeTravelerId);
        return;
      }

      for (const [tid, sel] of Object.entries(segmentSelections)) {
        if (sel.number === seat.number) {
          storeRemoveSeat(segmentId, tid);
          break;
        }
      }

      if (isExitRowSeat(seat)) {
        const traveler = travelers.find(t => t.id === activeTravelerId);
        if (traveler?.type === 'CHILD') {
          return;
        }
        setPendingExitSeat(seat);
        setExitRowDialogOpen(true);
        return;
      }

      doSelectSeat(seat);
    },
    [segmentId, activeTravelerId, segmentSelections, travelers]
  );

  const doSelectSeat = useCallback(
    (seat: Seat) => {
      const price = getSeatPrice(seat, activeTravelerId) ?? undefined;
      const cur = getSeatCurrency(seat, activeTravelerId);

      const selected: SelectedSeat = {
        number: seat.number,
        cabin: seat.cabin ?? 'M',
        price: price != null ? price : undefined,
        currency: cur || undefined,
        characteristics: seat.characteristicsCodes ?? [],
        displayLabel: buildDisplayLabel(seat),
      };

      storeSelectSeat(segmentId, activeTravelerId, selected);

      const eligible = travelers.filter(t => t.type !== 'HELD_INFANT');
      const currentIdx = eligible.findIndex(t => t.id === activeTravelerId);
      const updatedSelections = {
        ...segmentSelections,
        [activeTravelerId]: selected,
      };

      for (let i = 1; i <= eligible.length; i++) {
        const nextIdx = (currentIdx + i) % eligible.length;
        const nextId = eligible[nextIdx].id;
        if (!updatedSelections[nextId]) {
          setActiveTravelerId(nextId);
          break;
        }
      }
    },
    [segmentId, activeTravelerId, segmentSelections, travelers, storeSelectSeat]
  );

  const handleExitRowAccept = useCallback(() => {
    setExitRowDialogOpen(false);
    if (pendingExitSeat) {
      doSelectSeat(pendingExitSeat);
      setPendingExitSeat(null);
    }
  }, [pendingExitSeat, doSelectSeat]);

  const handleExitRowCancel = useCallback(() => {
    setExitRowDialogOpen(false);
    setPendingExitSeat(null);
  }, []);

  const handleConfirm = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSkip = useCallback(() => {
    storeClearAll();
    onOpenChange(false);
  }, [onOpenChange, storeClearAll]);

  const handleSegmentChange = useCallback((id: string) => {
    const idx = seatmapSegments.findIndex(
      s => (s.segmentId ?? s.flightOfferId ?? '0') === id
    );
    if (idx >= 0) setActiveSegmentIdx(idx);
  }, [seatmapSegments]);

  // Mobile tap handler
  const handleSeatTapMobile = useCallback((seat: Seat) => {
    setDetailSeat(seat);
  }, []);

  // Handle selection from detail sheet
  const handleDetailSheetSelect = useCallback((seat: Seat) => {
    handleSeatSelect(seat);
    setDetailSeat(null);
  }, [handleSeatSelect]);

  // ---------- Render ----------
  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          {/* Backdrop */}
          <DialogPrimitive.Backdrop
            className="fixed inset-0 z-50 bg-black/50 data-[open]:animate-in data-[open]:fade-in-0 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:animation-duration-[200ms]"
          />

          {/* Modal Popup */}
          <DialogPrimitive.Popup
            className={[
              'fixed z-50 flex flex-col bg-background',
              'inset-0',
              'md:inset-auto md:top-[50%] md:left-[50%] md:translate-x-[-50%] md:translate-y-[-50%]',
              'md:w-full md:max-w-5xl md:max-h-[85vh] md:rounded-2xl md:border md:border-border md:shadow-2xl',
              'data-[open]:animate-in data-[closed]:animate-out',
              'data-[open]:slide-in-from-bottom data-[closed]:slide-out-to-bottom',
              'md:data-[open]:slide-in-from-bottom-0 md:data-[closed]:slide-out-to-bottom-0',
              'md:data-[open]:fade-in-0 md:data-[open]:zoom-in-95',
              'md:data-[closed]:fade-out-0 md:data-[closed]:zoom-out-95',
              'duration-300 md:duration-200',
            ].join(' ')}
          >
            {/* ---- HEADER (sticky) ---- */}
            <div className="sticky top-0 z-10 bg-background border-b border-border shrink-0">
              <div className="flex items-center justify-between px-4 py-3 md:px-6">
                <div className="flex-1 min-w-0">
                  <DialogPrimitive.Title className="text-lg font-bold text-foreground">
                    Sitzplatzwahl
                  </DialogPrimitive.Title>
                  {activeSegment && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {aircraftProfile.name}
                      {activeSegment.departure?.iataCode && activeSegment.arrival?.iataCode && (
                        <span>
                          {' '}· {activeSegment.departure.iataCode} → {activeSegment.arrival.iataCode}
                        </span>
                      )}
                      {activeSegment.carrierCode && activeSegment.number && (
                        <span> · {activeSegment.carrierCode}{activeSegment.number}</span>
                      )}
                    </p>
                  )}
                </div>
                <DialogPrimitive.Close
                  className="flex items-center justify-center size-9 rounded-full hover:bg-muted transition-colors shrink-0 -mr-1"
                >
                  <X className="size-5 text-muted-foreground" />
                  <span className="sr-only">Schließen</span>
                </DialogPrimitive.Close>
              </div>

              {/* Segment Tabs */}
              {seatmapSegments.length > 1 && (
                <div className="px-4 pb-2 md:px-6">
                  <SegmentTabs
                    segments={seatmapSegments}
                    activeSegmentId={segmentId}
                    onSegmentChange={handleSegmentChange}
                  />
                </div>
              )}

              {/* Deck Tabs */}
              {decks.length > 1 && (
                <div className="px-4 pb-2 md:px-6">
                  <DeckTabs
                    decks={decks}
                    activeDeck={activeDeck}
                    onDeckChange={setActiveDeck}
                    aircraftCode={aircraftCode}
                  />
                </div>
              )}

              {/* Available Seats Counter */}
              {!isLoading && !isError && activeSegment?.availableSeatsCounters && (
                <div className="px-4 pb-2 md:px-6">
                  <AvailableSeatsCounter counters={activeSegment.availableSeatsCounters} />
                </div>
              )}

              {/* Passenger Selector */}
              {eligibleTravelers.length > 0 && !isLoading && !isError && activeSegment && (
                <div className="px-4 pb-3 md:px-6">
                  <PassengerSelector
                    travelers={eligibleTravelers}
                    activeTravelerId={activeTravelerId}
                    onTravelerChange={setActiveTravelerId}
                    selections={segmentSelections}
                  />
                </div>
              )}
            </div>

            {/* ---- CONTENT (scrollable) ---- */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6">
              {isLoading && <SeatmapSkeleton />}

              {isError && <SeatmapError onRetry={() => refetch()} />}

              {!isLoading && !isError && seatmapSegments.length === 0 && (
                <NoSeatmapFallback />
              )}

              {!isLoading && !isError && currentDeck && (
                <SeatmapGrid
                  deck={currentDeck}
                  selectedSeats={segmentSelections}
                  activeTravelerId={activeTravelerId}
                  onSeatSelect={handleSeatSelect}
                  travelerIndexMap={travelerIndexMap}
                  amenities={activeSegment?.aircraftCabinAmenities}
                  activeFilter={activeFilter}
                  onSeatTapMobile={handleSeatTapMobile}
                />
              )}
            </div>

            {/* ---- LEGEND (collapsible on mobile) ---- */}
            {!isLoading && !isError && activeSegment && (
              <div className="border-t border-border shrink-0">
                {/* Mobile: collapsible */}
                <div className="md:hidden">
                  <button
                    type="button"
                    onClick={() => setLegendOpen(!legendOpen)}
                    className="flex items-center justify-between w-full px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    <span>
                      Filter
                      {activeFilter && (
                        <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-pink-500/10 text-pink-500 px-1.5 py-0.5 text-[10px]">
                          Filter aktiv
                        </span>
                      )}
                    </span>
                    {legendOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </button>
                  <AnimatePresence>
                    {legendOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden px-4 pb-3"
                      >
                        <Legend
                          availableCategories={availableCategories}
                          activeFilter={activeFilter}
                          onFilterChange={setActiveFilter}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {/* Desktop: always visible */}
                <div className="hidden md:block px-6 py-3">
                  <Legend
                    availableCategories={availableCategories}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                  />
                </div>
              </div>
            )}

            {/* ---- FOOTER (sticky) ---- */}
            <div className="sticky bottom-0 z-10 bg-background border-t border-border shrink-0">
              {Object.keys(segmentSelections).length > 0 && (
                <div className="px-4 pt-3 md:px-6">
                  <SelectionSummary
                    selections={segmentSelections}
                    travelers={eligibleTravelers}
                  />
                </div>
              )}

              <div className="flex items-center gap-3 px-4 py-3 md:px-6">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex-1 md:flex-none inline-flex items-center justify-center rounded-xl border border-border bg-background px-5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Überspringen
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-[2] md:flex-1 inline-flex items-center justify-center rounded-xl bg-pink-500 px-6 py-3 text-sm font-semibold text-white hover:bg-pink-600 transition-colors shadow-lg shadow-pink-500/20"
                >
                  {totalCost > 0
                    ? `Bestätigen · ${totalCost.toFixed(2)} ${currency}`
                    : 'Bestätigen'}
                </button>
              </div>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Mobile Detail Bottom Sheet */}
      <SeatDetailSheet
        seat={detailSeat}
        status={detailSeatStatus}
        price={detailSeatPrice}
        currency={detailSeatCurrency}
        isWingZone={detailSeatWingZone}
        isExitRowConfig={detailSeatExitRow}
        onSelect={handleDetailSheetSelect}
        onClose={() => setDetailSeat(null)}
      />

      {/* Exit Row Warning */}
      <ExitRowDialog
        open={exitRowDialogOpen}
        onOpenChange={setExitRowDialogOpen}
        onAccept={handleExitRowAccept}
        onCancel={handleExitRowCancel}
      />
    </>
  );
}
