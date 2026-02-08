'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// ============================================================================
// Types
// ============================================================================

export interface ExitRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  onCancel: () => void;
}

// ============================================================================
// ExitRowDialog Component
// ============================================================================

export function ExitRowDialog({
  open,
  onOpenChange,
  onAccept,
  onCancel,
}: ExitRowDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>⚠️</span>
            <span>Notausgangsreihe</span>
          </DialogTitle>
          <DialogDescription>
            Dieser Sitzplatz befindet sich an einem Notausgang. Bitte bestätigen Sie,
            dass Sie die folgenden Voraussetzungen erfüllen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <div className="flex items-start gap-2 text-sm">
            <span className="text-emerald-600 shrink-0">✓</span>
            <span>Mindestens 15 Jahre alt</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-emerald-600 shrink-0">✓</span>
            <span>Körperlich in der Lage, die Nottür zu bedienen (ca. 20 kg)</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-emerald-600 shrink-0">✓</span>
            <span>Sprachkenntnisse der Crew-Sprache (Englisch oder Landessprache)</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-emerald-600 shrink-0">✓</span>
            <span>Kein Begleittier und kein Kleinkind auf dem Schoß</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Die Fluggesellschaft kann Sie ggf. umsetzen, falls die Voraussetzungen
          nicht erfüllt sind.
        </p>

        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="inline-flex items-center justify-center rounded-md bg-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-pink-600 transition-colors"
          >
            Akzeptieren & Wählen
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
