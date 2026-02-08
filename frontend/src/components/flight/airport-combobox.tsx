'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Plane, MapPin, Loader2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// Using native input for combobox (special keyboard/focus behavior)
import { cn } from '@/lib/utils';
import { useLocationSearch } from '@/hooks/use-flights';
import type { LocationResult } from '@/lib/api-client';

// ============================================================================
// Airport Combobox — Premium Autocomplete
// ============================================================================

interface AirportComboboxProps {
  value: string;
  valueName: string;
  onChange: (code: string, name: string) => void;
  placeholder?: string;
  label?: string;
  icon?: 'departure' | 'arrival';
  className?: string;
  compact?: boolean;
}

export function AirportCombobox({
  value,
  valueName,
  onChange,
  placeholder = 'Flughafen suchen...',
  label,
  icon = 'departure',
  className,
  compact = false,
}: AirportComboboxProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Search locations with debounce
  const { data, isLoading } = useLocationSearch(query);
  const locations = data?.data ?? [];

  // Only show locations from API when user types at least 2 characters
  const displayLocations = query.length >= 2 ? locations : [];

  // Click outside and Escape key handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        inputRef.current?.blur();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Reset highlighted index when locations change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [displayLocations.length]);

  const handleSelect = useCallback((location: LocationResult) => {
    onChange(location.iataCode, location.name);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || displayLocations.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(i => Math.min(i + 1, displayLocations.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (displayLocations[highlightedIndex]) {
          handleSelect(displayLocations[highlightedIndex]);
        }
        break;
    }
  }, [isOpen, displayLocations, highlightedIndex, handleSelect]);

  const displayValue = valueName || value;

  const IconComponent = icon === 'departure' ? Plane : MapPin;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && !compact && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <IconComponent
            className={cn(
              'text-gray-400 transition-colors',
              icon === 'departure' && '-rotate-45',
              compact ? 'h-5 w-5' : 'h-5 w-5'
            )}
          />
        </div>

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={label || placeholder}
          className={cn(
            'w-full text-sm font-medium transition-all duration-200 cursor-text truncate',
            'min-h-[48px]',
            compact
              ? 'rounded-xl border-0 bg-gray-50 py-3.5 pl-12 pr-4 hover:bg-gray-100 hover:shadow-sm focus:bg-white focus:shadow-lg focus:ring-2 focus:ring-pink-500/30 dark:bg-white/10 dark:hover:bg-white/15 dark:focus:bg-white/20'
              : 'rounded-xl border border-gray-200 dark:border-gray-700 bg-background py-3.5 pl-12 pr-4 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20',
            'placeholder:text-muted-foreground/60 placeholder:font-normal focus:outline-none'
          )}
          placeholder={placeholder}
          value={isOpen ? query : displayValue}
          onChange={(e) => {
            setQuery((e.target as HTMLInputElement).value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
          }}
          onKeyDown={handleKeyDown}
        />

        {isLoading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-4">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="listbox"
            className="absolute left-0 right-0 z-50 mt-2 max-h-[320px] overflow-y-auto overflow-x-hidden rounded-2xl border bg-popover py-2 shadow-2xl"
            style={{ minWidth: '300px' }}
          >
            {query.length < 2 ? (
              <div className="flex items-center gap-3 px-5 py-4 text-sm text-muted-foreground">
                <Search className="h-4 w-4 shrink-0" />
                <span>Mindestens 2 Zeichen eingeben…</span>
              </div>
            ) : isLoading ? (
              <div className="space-y-3 px-5 py-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-10 w-14 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-3/4 rounded bg-muted" />
                      <div className="h-3 w-1/3 rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayLocations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-6 text-sm text-muted-foreground">
                <MapPin className="h-8 w-8 text-muted-foreground/40" />
                <span>Keine Ergebnisse gefunden</span>
              </div>
            ) : (
              displayLocations.map((location, index) => (
                <button
                  key={`${location.iataCode}-${location.name}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === highlightedIndex}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-3 px-4 py-3 transition-colors text-left min-h-[52px]',
                    index === highlightedIndex
                      ? 'bg-gray-50 dark:bg-gray-800/50'
                      : 'hover:bg-accent/50'
                  )}
                  onClick={() => handleSelect(location)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {/* IATA Code Badge — neutral */}
                  <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 shadow-sm">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wide">
                      {location.iataCode}
                    </span>
                  </div>

                  {/* Location Info */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {location.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        location.subType === 'CITY'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      )}>
                        {location.subType === 'CITY' ? 'Stadt' : 'Flughafen'}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
