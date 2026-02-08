'use client';

import React from 'react';
import type { Deck } from '@/types/seatmap';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// ============================================================================
// Types
// ============================================================================

export interface DeckTabsProps {
  decks: Deck[];
  activeDeck: string;
  onDeckChange: (deckType: string) => void;
  aircraftCode?: string;
}

// ============================================================================
// Helpers
// ============================================================================

const DECK_LABELS: Record<string, string> = {
  MAIN: 'Hauptdeck',
  UPPER: 'Oberdeck',
  LOWER: 'Unterdeck',
};

function countAvailableSeats(deck: Deck): number {
  return deck.seats.filter((s) =>
    s.travelerPricing?.some((tp) => tp.seatAvailabilityStatus === 'AVAILABLE')
  ).length;
}

// ============================================================================
// DeckTabs Component
// ============================================================================

export function DeckTabs({ decks, activeDeck, onDeckChange, aircraftCode }: DeckTabsProps) {
  // Only render tabs if multiple decks
  if (decks.length <= 1) return null;

  return (
    <Tabs value={activeDeck} onValueChange={onDeckChange}>
      <TabsList className="w-full">
        {decks.map((deck) => {
          const deckType = deck.deckType ?? 'MAIN';
          const label = DECK_LABELS[deckType] ?? deckType;
          const available = countAvailableSeats(deck);

          return (
            <TabsTrigger key={deckType} value={deckType} className="flex-1 gap-1.5">
              <span>{label}</span>
              <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {available} Sitze
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Content panels are rendered externally; these are placeholders for Base UI compatibility */}
      {decks.map((deck) => {
        const deckType = deck.deckType ?? 'MAIN';
        return <TabsContent key={deckType} value={deckType} />;
      })}
    </Tabs>
  );
}
