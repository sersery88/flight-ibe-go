'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useFlightDates } from '@/hooks/use-flights';

// ============================================================================
// Premium Flight Date Picker — Google Flights / Skyscanner Style
// ============================================================================

// --- Constants ---

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;

const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
] as const;

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
] as const;

// --- Date Helpers ---

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday = 0, Sunday = 6 */
function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBeforeDay(a: Date, b: Date): boolean {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return da < db;
}

function formatShortDate(date: Date): string {
  return `${date.getDate()}. ${SHORT_MONTHS[date.getMonth()]}`;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

const TODAY = new Date();
const TODAY_NORM = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());

// --- Types ---

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface DayPrice {
  date: string;
  price: number;
}

type TripTypeValue = 'roundtrip' | 'oneway' | 'multicity';

// ============================================================================
// useIsMobile hook
// ============================================================================

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

// ============================================================================
// Month Grid Component
// ============================================================================

interface MonthGridProps {
  year: number;
  month: number;
  // Selection
  selectedFrom?: Date;
  selectedTo?: Date;
  hoverDate?: Date;
  isRange?: boolean;
  // Events
  onDayClick: (date: Date) => void;
  onDayHover?: (date: Date | null) => void;
  // Prices
  priceMap?: Map<string, number>;
  minPrice?: number;
  maxPrice?: number;
  // Config
  minDate?: Date;
  isMobile?: boolean;
}

function MonthGrid({
  year,
  month,
  selectedFrom,
  selectedTo,
  hoverDate,
  isRange = false,
  onDayClick,
  onDayHover,
  priceMap,
  minPrice = 0,
  maxPrice = 0,
  minDate,
  isMobile = false,
}: MonthGridProps) {
  const totalDays = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);

  // Build cells: null = empty padding, number = day
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  // For range preview: the effective "to" is hoverDate when only from is set
  const effectiveTo = selectedTo || (isRange && selectedFrom && hoverDate && !isBeforeDay(hoverDate, selectedFrom) ? hoverDate : undefined);

  const getPriceColor = (price: number) => {
    if (maxPrice === minPrice) return 'text-gray-400';
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    if (ratio < 0.33) return 'text-emerald-600';
    if (ratio < 0.66) return 'text-amber-600';
    return 'text-red-500';
  };

  return (
    <div className={cn('select-none', isMobile ? 'px-4' : '')}>
      {/* Month header */}
      <div className="mb-3">
        <h3 className="text-base font-bold text-gray-800">
          {MONTHS[month]} {year}
        </h3>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-center text-[11px] font-medium text-gray-400 py-1">
            {wd}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`e-${idx}`} className={cn('aspect-square', isMobile ? 'min-h-[48px]' : 'min-h-[40px]')} />;
          }

          const date = new Date(year, month, day);
          const disabled = minDate ? isBeforeDay(date, minDate) : isBeforeDay(date, TODAY_NORM);
          const isStart = selectedFrom ? isSameDay(date, selectedFrom) : false;
          const isEnd = effectiveTo ? isSameDay(date, effectiveTo) : false;
          const inRange =
            isRange && selectedFrom && effectiveTo
              ? !isBeforeDay(date, selectedFrom) && !isBeforeDay(effectiveTo, date) && !isStart && !isEnd
              : false;
          const isSelected = isStart || isEnd;
          const today = isSameDay(date, TODAY_NORM);

          // Price
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const price = priceMap?.get(dateStr);

          // Range background shape
          const isStartAndEnd = isStart && isEnd;
          const showRangeBg = (inRange || (isStart && effectiveTo && !isStartAndEnd) || (isEnd && selectedFrom && !isStartAndEnd));

          // Determine column position for edge rounding
          const colIndex = idx % 7;
          const isFirstCol = colIndex === 0;
          const isLastCol = colIndex === 6;

          return (
            <div
              key={day}
              className={cn(
                'relative flex items-center justify-center',
                isMobile ? 'min-h-[48px]' : 'min-h-[40px]',
              )}
              onMouseEnter={() => !disabled && onDayHover?.(date)}
              onMouseLeave={() => onDayHover?.(null)}
            >
              {/* Range background stripe */}
              {showRangeBg && !isStartAndEnd && (
                <div
                  className={cn(
                    'absolute inset-y-[2px] bg-pink-50',
                    isStart ? 'left-1/2 right-0' : isEnd ? 'left-0 right-1/2' : 'inset-x-0',
                    isFirstCol && !isStart && 'rounded-l-full',
                    isLastCol && !isEnd && 'rounded-r-full',
                  )}
                />
              )}

              {/* Day button */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onDayClick(date)}
                className={cn(
                  'relative z-10 flex flex-col items-center justify-center rounded-full transition-colors',
                  isMobile ? 'h-[44px] w-[44px]' : 'h-[38px] w-[38px]',
                  // States
                  disabled && 'text-gray-300 cursor-not-allowed',
                  !disabled && !isSelected && !inRange && 'text-gray-800 hover:bg-gray-100 cursor-pointer',
                  inRange && !isSelected && 'text-gray-800',
                  isSelected && 'bg-pink-500 text-white shadow-sm',
                  today && !isSelected && 'ring-1.5 ring-gray-800 ring-inset',
                )}
              >
                <span className={cn('text-sm leading-none', isSelected ? 'font-semibold' : 'font-medium')}>
                  {day}
                </span>
                {price !== undefined && !disabled && (
                  <span
                    className={cn(
                      'text-[8px] leading-none mt-0.5 font-medium',
                      isSelected ? 'text-white/80' : getPriceColor(price),
                    )}
                  >
                    {formatPrice(price)}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// usePriceData hook
// ============================================================================

function usePriceData(origin?: string, destination?: string, externalPrices: DayPrice[] = []) {
  const canFetch = !!origin && !!destination && origin.length === 3 && destination.length === 3;
  const { data: priceData, isLoading } = useFlightDates(origin || '', destination || '');

  return useMemo(() => {
    const map = new Map<string, number>();
    externalPrices.forEach((p) => map.set(p.date, p.price));
    if (priceData?.data) {
      for (const item of priceData.data) {
        map.set(item.departureDate, parseFloat(item.price.total));
      }
    }
    const values = Array.from(map.values());
    return {
      priceMap: map,
      minPrice: values.length > 0 ? Math.min(...values) : 0,
      maxPrice: values.length > 0 ? Math.max(...values) : 0,
      isLoading: canFetch && isLoading,
    };
  }, [externalPrices, priceData, canFetch, isLoading]);
}

// ============================================================================
// FlightDatePicker — Range / Roundtrip Picker
// ============================================================================

interface FlightDatePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  tripType?: TripTypeValue;
  onTripTypeChange?: (type: TripTypeValue) => void;
  prices?: DayPrice[];
  origin?: string;
  destination?: string;
  minDate?: Date;
  className?: string;
  compact?: boolean;
  showTripTypeSelector?: boolean;
}

export function FlightDatePicker({
  value,
  onChange,
  tripType = 'roundtrip',
  onTripTypeChange,
  prices: externalPrices = [],
  origin,
  destination,
  minDate,
  className,
  compact = false,
  showTripTypeSelector = false,
}: FlightDatePickerProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calendar navigation: leftMonth is the first visible month
  const [leftMonth, setLeftMonth] = useState(() => {
    if (value?.from) return new Date(value.from.getFullYear(), value.from.getMonth(), 1);
    return new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  });

  // Temp selections during picker open
  const [tempFrom, setTempFrom] = useState<Date | undefined>(value?.from);
  const [tempTo, setTempTo] = useState<Date | undefined>(value?.to);
  const [activeTab, setActiveTab] = useState<'departure' | 'return'>('departure');
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);

  const isOneway = tripType === 'oneway';
  const isRange = !isOneway;
  const rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1);

  const { priceMap, minPrice, maxPrice, isLoading: isPriceLoading } = usePriceData(origin, destination, externalPrices);

  useEffect(() => { setMounted(true); }, []);

  // Sync from parent value
  useEffect(() => {
    setTempFrom(value?.from);
    setTempTo(value?.to);
    if (value?.from) {
      setLeftMonth(new Date(value.from.getFullYear(), value.from.getMonth(), 1));
    }
  }, [value?.from, value?.to]);

  // Lock scroll on mobile when open
  useEffect(() => {
    if (isOpen && isMobile) {
      const scrollY = window.scrollY;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      return () => {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, isMobile]);

  // Auto-set active tab
  useEffect(() => {
    if (isOpen) {
      if (!tempFrom) setActiveTab('departure');
      else if (!tempTo && isRange) setActiveTab('return');
    }
  }, [isOpen, tempFrom, tempTo, isRange]);

  const handleOpen = useCallback(() => {
    setTempFrom(value?.from);
    setTempTo(value?.to);
    setActiveTab(value?.from ? (value?.to || isOneway ? 'departure' : 'return') : 'departure');
    setIsOpen(true);
  }, [value, isOneway]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setHoverDate(null);
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    if (isOneway) {
      // Single mode
      if (tempFrom && isSameDay(date, tempFrom)) {
        setTempFrom(undefined);
      } else {
        setTempFrom(date);
      }
      return;
    }

    // Range mode
    if (activeTab === 'departure') {
      if (tempFrom && isSameDay(date, tempFrom)) {
        // Reset
        setTempFrom(undefined);
        setTempTo(undefined);
        return;
      }
      setTempFrom(date);
      if (tempTo && !isBeforeDay(date, tempTo)) {
        setTempTo(undefined);
      }
      setActiveTab('return');
    } else {
      if (tempTo && isSameDay(date, tempTo)) {
        setTempTo(undefined);
        return;
      }
      if (tempFrom && isBeforeDay(date, tempFrom)) {
        // Clicked before departure → reset departure
        setTempFrom(date);
        setTempTo(undefined);
        return;
      }
      setTempTo(date);
    }
  }, [activeTab, tempFrom, tempTo, isOneway]);

  const handleDone = useCallback(() => {
    onChange(isOneway ? { from: tempFrom, to: undefined } : { from: tempFrom, to: tempTo });
    handleClose();
  }, [onChange, tempFrom, tempTo, isOneway, handleClose]);

  const handleReset = useCallback(() => {
    setTempFrom(undefined);
    setTempTo(undefined);
    setActiveTab('departure');
  }, []);

  const canComplete = isOneway ? !!tempFrom : !!tempFrom && !!tempTo;

  const navigateMonth = useCallback((delta: number) => {
    setDirection(delta > 0 ? 1 : -1);
    setLeftMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }, []);

  // --- Computed: effective min date for return tab ---
  const effectiveMinDate = useMemo(() => {
    if (activeTab === 'return' && tempFrom) return tempFrom;
    return minDate || TODAY_NORM;
  }, [activeTab, tempFrom, minDate]);

  // --- Render the calendar content ---
  const renderCalendarBody = () => {
    if (isMobile) {
      // Mobile: Vertical scroll, show current + next + next+1 months
      const months: { year: number; month: number }[] = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + i, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth() });
      }

      return (
        <div className="flex-1 overflow-y-auto overscroll-contain pb-4 space-y-6">
          {months.map(({ year, month }) => (
            <MonthGrid
              key={`${year}-${month}`}
              year={year}
              month={month}
              selectedFrom={tempFrom}
              selectedTo={tempTo}
              hoverDate={hoverDate || undefined}
              isRange={isRange}
              onDayClick={handleDayClick}
              priceMap={priceMap}
              minPrice={minPrice}
              maxPrice={maxPrice}
              minDate={effectiveMinDate}
              isMobile
            />
          ))}
        </div>
      );
    }

    // Desktop: 2 months side-by-side with animation
    return (
      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`${leftMonth.getFullYear()}-${leftMonth.getMonth()}`}
            initial={{ opacity: 0, x: direction > 0 ? 80 : -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -80 : 80 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex gap-8 p-6"
          >
            <div className="flex-1 min-w-[280px]">
              <MonthGrid
                year={leftMonth.getFullYear()}
                month={leftMonth.getMonth()}
                selectedFrom={tempFrom}
                selectedTo={tempTo}
                hoverDate={hoverDate || undefined}
                isRange={isRange}
                onDayClick={handleDayClick}
                onDayHover={setHoverDate}
                priceMap={priceMap}
                minPrice={minPrice}
                maxPrice={maxPrice}
                minDate={effectiveMinDate}
              />
            </div>
            <div className="w-px bg-gray-100 self-stretch my-2" />
            <div className="flex-1 min-w-[280px]">
              <MonthGrid
                year={rightMonth.getFullYear()}
                month={rightMonth.getMonth()}
                selectedFrom={tempFrom}
                selectedTo={tempTo}
                hoverDate={hoverDate || undefined}
                isRange={isRange}
                onDayClick={handleDayClick}
                onDayHover={setHoverDate}
                priceMap={priceMap}
                minPrice={minPrice}
                maxPrice={maxPrice}
                minDate={effectiveMinDate}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  // --- Mobile Bottom Sheet ---
  const mobileSheet = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-black/40"
            onClick={handleClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 top-0 z-[9999] flex flex-col bg-white rounded-t-2xl"
            style={{ maxHeight: '100dvh' }}
          >
            {/* Sticky Header */}
            <div className="flex-shrink-0 border-b border-gray-100">
              {/* Close + Title */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 transition-colors -ml-2"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
                <span className="text-sm font-semibold text-gray-800">Reisedaten</span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-pink-500 font-medium px-2 py-1"
                >
                  Reset
                </button>
              </div>

              {/* Tab selector */}
              {isRange && (
                <div className="flex mx-4 mb-3 bg-gray-100 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('departure')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                      activeTab === 'departure'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500',
                    )}
                  >
                    <Calendar className="h-4 w-4" />
                    <span>{tempFrom ? formatShortDate(tempFrom) : 'Abflug'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('return')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                      activeTab === 'return'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500',
                    )}
                  >
                    <span>{tempTo ? formatShortDate(tempTo) : 'Rückflug'}</span>
                  </button>
                </div>
              )}

              {/* Weekday header — sticky for scroll */}
              <div className="grid grid-cols-7 px-4 pb-2">
                {WEEKDAYS.map((wd) => (
                  <div key={wd} className="text-center text-[11px] font-medium text-gray-400">
                    {wd}
                  </div>
                ))}
              </div>
            </div>

            {/* Scrollable calendar months */}
            {renderCalendarBody()}

            {/* Sticky Footer */}
            <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 bg-white safe-area-pb">
              <button
                type="button"
                onClick={handleDone}
                disabled={!canComplete}
                className={cn(
                  'w-full py-3.5 rounded-2xl text-base font-semibold transition-all',
                  canComplete
                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25 hover:bg-pink-600 active:scale-[0.98]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                )}
              >
                {canComplete
                  ? isOneway
                    ? `${formatShortDate(tempFrom!)} — Fertig`
                    : `${formatShortDate(tempFrom!)} → ${formatShortDate(tempTo!)} — Fertig`
                  : 'Datum wählen'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // --- Desktop Dropdown ---
  const desktopDropdown = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9998]"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-full z-[9999] mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
            style={{ minWidth: 620 }}
          >
            {/* Header with tabs + navigation */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              {/* Left: Tab selector */}
              <div className="flex items-center gap-3">
                {isRange && (
                  <div className="flex bg-gray-100 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('departure')}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        activeTab === 'departure'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700',
                      )}
                    >
                      <Calendar className="h-4 w-4" />
                      <span>{tempFrom ? formatShortDate(tempFrom) : 'Abflug'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('return')}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        activeTab === 'return'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700',
                      )}
                    >
                      <span>{tempTo ? formatShortDate(tempTo) : 'Rückflug'}</span>
                    </button>
                  </div>
                )}
                {isPriceLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              </div>

              {/* Right: Navigation arrows */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => navigateMonth(-1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-500" />
                </button>
                <button
                  type="button"
                  onClick={() => navigateMonth(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Calendar body */}
            {renderCalendarBody()}

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Zurücksetzen
              </button>
              <button
                type="button"
                onClick={handleDone}
                disabled={!canComplete}
                className={cn(
                  'px-8 py-2.5 rounded-full text-sm font-semibold transition-all',
                  canComplete
                    ? 'bg-pink-500 text-white shadow-md hover:bg-pink-600 hover:shadow-lg active:scale-[0.98]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                )}
              >
                Fertig
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        className={cn(
          'flex w-full items-center gap-2 text-left text-sm transition-all duration-200 cursor-pointer min-h-[48px]',
          compact
            ? 'rounded-xl border-0 bg-white/80 px-4 py-3 hover:bg-white hover:shadow-sm focus:bg-white focus:shadow-lg focus:ring-2 focus:ring-pink-500/30 dark:bg-white/10 dark:hover:bg-white/15 dark:focus:bg-white/20'
            : 'rounded-xl border bg-white px-4 py-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20',
          'focus:outline-none',
        )}
      >
        <Calendar className="h-5 w-5 text-gray-400 shrink-0" />
        <span className={cn('whitespace-nowrap font-medium', !value?.from && 'text-gray-400 font-normal')}>
          {value?.from ? formatShortDate(value.from) : 'Hinflug'}
        </span>
        {isRange && (
          <>
            <span className="text-gray-300">→</span>
            <span className={cn('whitespace-nowrap font-medium', !value?.to && 'text-gray-400 font-normal')}>
              {value?.to ? formatShortDate(value.to) : 'Rückflug'}
            </span>
          </>
        )}
      </button>

      {/* Calendar popup */}
      {mounted && (
        isMobile
          ? createPortal(mobileSheet, document.body)
          : desktopDropdown
      )}
    </div>
  );
}

// ============================================================================
// SingleFlightDatePicker
// ============================================================================

interface SingleFlightDatePickerProps {
  value?: Date | null;
  onChange: (date: Date | undefined) => void;
  label?: string;
  prices?: DayPrice[];
  minDate?: Date;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export function SingleFlightDatePicker({
  value,
  onChange,
  label,
  prices: externalPrices = [],
  minDate,
  placeholder = 'Datum wählen',
  className,
  compact = false,
}: SingleFlightDatePickerProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) return new Date(value.getFullYear(), value.getMonth(), 1);
    return new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  });
  const [tempDate, setTempDate] = useState<Date | undefined>(value || undefined);
  const [direction, setDirection] = useState<1 | -1>(1);

  const rightMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

  // Simple price map from external
  const priceMap = useMemo(() => {
    const map = new Map<string, number>();
    externalPrices.forEach((p) => map.set(p.date, p.price));
    return map;
  }, [externalPrices]);

  const priceValues = useMemo(() => Array.from(priceMap.values()), [priceMap]);
  const pMin = priceValues.length > 0 ? Math.min(...priceValues) : 0;
  const pMax = priceValues.length > 0 ? Math.max(...priceValues) : 0;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setTempDate(value || undefined);
    if (value) setCurrentMonth(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [value]);

  // Lock scroll on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      const scrollY = window.scrollY;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      return () => {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, isMobile]);

  const handleOpen = useCallback(() => {
    setTempDate(value || undefined);
    setIsOpen(true);
  }, [value]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    if (tempDate && isSameDay(date, tempDate)) {
      setTempDate(undefined);
    } else {
      setTempDate(date);
    }
  }, [tempDate]);

  const handleDone = useCallback(() => {
    onChange(tempDate);
    handleClose();
  }, [onChange, tempDate, handleClose]);

  const navigateMonth = useCallback((delta: number) => {
    setDirection(delta > 0 ? 1 : -1);
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }, []);

  const effectiveMinDate = minDate || TODAY_NORM;

  // --- Mobile Bottom Sheet ---
  const mobileSheet = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-black/40"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 top-0 z-[9999] flex flex-col bg-white rounded-t-2xl"
            style={{ maxHeight: '100dvh' }}
          >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-100">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 transition-colors -ml-2"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
                <span className="text-sm font-semibold text-gray-800">{label || placeholder}</span>
                <div className="w-10" />
              </div>

              {/* Show current selection */}
              {tempDate && (
                <div className="flex items-center justify-center pb-3">
                  <div className="flex items-center gap-2 bg-pink-50 text-pink-600 rounded-full px-4 py-1.5 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    {formatShortDate(tempDate)}
                  </div>
                </div>
              )}

              {/* Weekday header */}
              <div className="grid grid-cols-7 px-4 pb-2">
                {WEEKDAYS.map((wd) => (
                  <div key={wd} className="text-center text-[11px] font-medium text-gray-400">
                    {wd}
                  </div>
                ))}
              </div>
            </div>

            {/* Scrollable months */}
            <div className="flex-1 overflow-y-auto overscroll-contain pb-4 space-y-6">
              {Array.from({ length: 6 }, (_, i) => {
                const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + i, 1);
                return (
                  <MonthGrid
                    key={`${d.getFullYear()}-${d.getMonth()}`}
                    year={d.getFullYear()}
                    month={d.getMonth()}
                    selectedFrom={tempDate}
                    isRange={false}
                    onDayClick={handleDayClick}
                    priceMap={priceMap}
                    minPrice={pMin}
                    maxPrice={pMax}
                    minDate={effectiveMinDate}
                    isMobile
                  />
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 bg-white safe-area-pb">
              <button
                type="button"
                onClick={handleDone}
                disabled={!tempDate}
                className={cn(
                  'w-full py-3.5 rounded-2xl text-base font-semibold transition-all',
                  tempDate
                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25 hover:bg-pink-600 active:scale-[0.98]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                )}
              >
                {tempDate ? `${formatShortDate(tempDate)} — Fertig` : 'Datum wählen'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // --- Desktop Dropdown ---
  const desktopDropdown = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9998]"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-full z-[9999] mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
            style={{ minWidth: 620 }}
          >
            {/* Header with navigation */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {tempDate ? formatShortDate(tempDate) : placeholder}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => navigateMonth(-1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-500" />
                </button>
                <button
                  type="button"
                  onClick={() => navigateMonth(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Calendar body */}
            <div className="relative overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={`${currentMonth.getFullYear()}-${currentMonth.getMonth()}`}
                  initial={{ opacity: 0, x: direction > 0 ? 80 : -80 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -80 : 80 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="flex gap-8 p-6"
                >
                  <div className="flex-1 min-w-[280px]">
                    <MonthGrid
                      year={currentMonth.getFullYear()}
                      month={currentMonth.getMonth()}
                      selectedFrom={tempDate}
                      isRange={false}
                      onDayClick={handleDayClick}
                      priceMap={priceMap}
                      minPrice={pMin}
                      maxPrice={pMax}
                      minDate={effectiveMinDate}
                    />
                  </div>
                  <div className="w-px bg-gray-100 self-stretch my-2" />
                  <div className="flex-1 min-w-[280px]">
                    <MonthGrid
                      year={rightMonth.getFullYear()}
                      month={rightMonth.getMonth()}
                      selectedFrom={tempDate}
                      isRange={false}
                      onDayClick={handleDayClick}
                      priceMap={priceMap}
                      minPrice={pMin}
                      maxPrice={pMax}
                      minDate={effectiveMinDate}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setTempDate(undefined)}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Zurücksetzen
              </button>
              <button
                type="button"
                onClick={handleDone}
                disabled={!tempDate}
                className={cn(
                  'px-8 py-2.5 rounded-full text-sm font-semibold transition-all',
                  tempDate
                    ? 'bg-pink-500 text-white shadow-md hover:bg-pink-600 hover:shadow-lg active:scale-[0.98]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                )}
              >
                Fertig
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        className={cn(
          'flex w-full items-center gap-2 text-left text-sm transition-all duration-200 cursor-pointer min-h-[48px]',
          compact
            ? 'rounded-xl border-0 bg-white/80 py-3.5 px-4 hover:bg-white hover:shadow-sm focus:bg-white focus:shadow-lg focus:ring-2 focus:ring-pink-500/30 dark:bg-white/10 dark:hover:bg-white/15 dark:focus:bg-white/20'
            : 'rounded-xl border bg-white px-4 py-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20',
          'focus:outline-none',
          !value && 'text-gray-400',
        )}
      >
        <Calendar className="h-5 w-5 text-gray-400 shrink-0" />
        <span className="font-medium text-gray-800">{value ? formatShortDate(value) : placeholder}</span>
      </button>

      {mounted && (isMobile ? createPortal(mobileSheet, document.body) : desktopDropdown)}
    </div>
  );
}
