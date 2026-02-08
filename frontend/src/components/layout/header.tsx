'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full">
        <Sun className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      title={theme === 'light' ? 'Dunkler Modus' : 'Heller Modus'}
      aria-label={theme === 'light' ? 'Dunklen Modus aktivieren' : 'Hellen Modus aktivieren'}
    >
      {theme === 'light' ? (
        <Sun className="h-5 w-5 text-gray-600" />
      ) : (
        <Moon className="h-5 w-5 text-gray-400" />
      )}
    </button>
  );
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded-lg">
          <Image
            src="/logo.svg"
            alt="Pink Travel"
            width={160}
            height={60}
            className="h-9 w-auto sm:h-11"
            priority
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Hauptnavigation">
          <Link
            href="/"
            className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            Flugsuche
          </Link>
          <ThemeToggle />
        </nav>

        {/* Mobile Nav */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95"
            aria-label={mobileMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-foreground" />
            ) : (
              <Menu className="h-5 w-5 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-gray-200 dark:border-gray-800 md:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Flugsuche
              </Link>
              <div className="border-t border-gray-200 dark:border-gray-800 pt-2 mt-2">
                <p className="px-4 py-2 text-xs text-muted-foreground">
                  Pink Travel AG · seit 1994
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
