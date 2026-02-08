'use client';

import Link from 'next/link';
import { Plane, Shield, Globe } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Branding */}
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 dark:bg-gray-700">
                <Plane className="h-4 w-4 text-white -rotate-45" />
              </div>
              <span className="text-lg font-bold text-gray-800 dark:text-gray-200">Flypink</span>
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
              Pink Travel AG — dein Vergleichsportal für günstige Flüge weltweit. Seit 1994.
            </p>
          </div>

          {/* Service Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-300 mb-3">Service</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/" className="text-sm text-gray-500 transition-colors hover:text-pink-500 dark:text-gray-400">
                Flugsuche
              </Link>
              <Link href="/" className="text-sm text-gray-500 transition-colors hover:text-pink-500 dark:text-gray-400">
                Über uns
              </Link>
              <Link href="/" className="text-sm text-gray-500 transition-colors hover:text-pink-500 dark:text-gray-400">
                FAQ & Hilfe
              </Link>
            </nav>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-300 mb-3">Rechtliches</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/" className="text-sm text-gray-500 transition-colors hover:text-pink-500 dark:text-gray-400">
                Impressum
              </Link>
              <Link href="/" className="text-sm text-gray-500 transition-colors hover:text-pink-500 dark:text-gray-400">
                Datenschutz
              </Link>
              <Link href="/" className="text-sm text-gray-500 transition-colors hover:text-pink-500 dark:text-gray-400">
                AGB
              </Link>
            </nav>
          </div>

          {/* Trust */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-300 mb-3">Sicherheit</h4>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>SSL-verschlüsselt</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Globe className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>DSGVO-konform</span>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Flypink by Pink Travel AG. Alle Rechte vorbehalten.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            400+ Airlines · 190+ Länder
          </p>
        </div>
      </div>
    </footer>
  );
}
