'use client';

import React from 'react';
import type { SeatmapData } from '@/types/seatmap';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// ============================================================================
// Types
// ============================================================================

export interface SegmentTabsProps {
  segments: SeatmapData[];
  activeSegmentId: string;
  onSegmentChange: (id: string) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function getSegmentLabel(segment: SeatmapData): string {
  const dep = segment.departure?.iataCode ?? '???';
  const arr = segment.arrival?.iataCode ?? '???';
  return `${dep} → ${arr}`;
}

function getSegmentSubtitle(segment: SeatmapData): string {
  const carrier = segment.carrierCode ?? '';
  const number = segment.number ?? '';
  return `${carrier}${number}`;
}

function isCodeshare(segment: SeatmapData): boolean {
  if (!segment.carrierCode) return false;
  // It's a codeshare if operating carrier differs from marketing carrier
  // The 'operating' field is not directly on SeatmapData in our types,
  // but we check the pattern
  return false; // Will be enhanced when operating carrier data is available
}

// ============================================================================
// SegmentTabs Component
// ============================================================================

export function SegmentTabs({ segments, activeSegmentId, onSegmentChange }: SegmentTabsProps) {
  if (segments.length <= 1) return null;

  return (
    <Tabs value={activeSegmentId} onValueChange={onSegmentChange}>
      <TabsList className="w-full">
        {segments.map((segment) => {
          const id = segment.segmentId ?? segment.flightOfferId ?? '0';
          const label = getSegmentLabel(segment);
          const subtitle = getSegmentSubtitle(segment);

          return (
            <TabsTrigger key={id} value={id} className="flex-1 flex-col gap-0 py-1.5">
              <span className="text-sm font-medium">{label}</span>
              <span className="text-[10px] text-muted-foreground">{subtitle}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Content panels are rendered externally */}
      {segments.map((segment) => {
        const id = segment.segmentId ?? segment.flightOfferId ?? '0';
        return <TabsContent key={id} value={id} />;
      })}
    </Tabs>
  );
}
