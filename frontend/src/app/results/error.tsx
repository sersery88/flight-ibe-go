'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ResultsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Results page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-md text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30"
        >
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </motion.div>

        {/* Text */}
        <h1 className="mb-2 text-2xl font-bold">Etwas ist schiefgelaufen</h1>
        <p className="mb-8 text-muted-foreground">
          Bei der Suche nach Flügen ist ein Fehler aufgetreten.
          Bitte versuchen Sie es erneut.
        </p>

        {/* Error detail (dev only) */}
        {error.message && process.env.NODE_ENV === 'development' && (
          <div className="mb-6 rounded-xl bg-muted p-4 text-left text-xs text-muted-foreground font-mono break-all">
            {error.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={reset}
            className="gap-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white shadow-md shadow-pink-500/20 h-12 px-6 font-semibold" /* CTA stays pink */
          >
            <RotateCcw className="h-4 w-4" />
            Erneut versuchen
          </Button>
          <Link href="/">
            <Button
              variant="outline"
              className="gap-2 rounded-xl h-12 px-6"
            >
              <Home className="h-4 w-4" />
              Zur Startseite
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
