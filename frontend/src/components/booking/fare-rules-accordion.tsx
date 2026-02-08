'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface FareRule {
  category: string;
  notApplicable: boolean;
  maxPenalty?: number;
  currency?: string;
  description?: string;
}

export interface FareRuleGroup {
  segmentId: string;
  segmentLabel?: string; // e.g. "FRA → IST"
  rules: FareRule[];
}

export interface FareRulesAccordionProps {
  fareRules: FareRuleGroup[];
}

// ============================================================================
// Rule Display Config — NO fare basis codes!
// ============================================================================

const RULE_CONFIG: Record<string, { icon: string; label: string }> = {
  REFUND: { icon: '💰', label: 'Stornierung' },
  EXCHANGE: { icon: '🔄', label: 'Umbuchung' },
  REVALIDATION: { icon: '⏰', label: 'Revalidierung' },
  REISSUE: { icon: '📄', label: 'Neuausstellung' },
};

function humanizeRule(rule: FareRule): string {
  if (rule.notApplicable) return 'Nicht möglich';
  if (rule.maxPenalty === 0) return 'Kostenlos';
  if (rule.maxPenalty != null && rule.maxPenalty > 0) {
    return `Gegen Gebühr von ${formatCurrency(rule.maxPenalty, rule.currency || 'EUR')}`;
  }
  if (rule.description) return rule.description;
  return 'Auf Anfrage bei der Airline';
}

function getRuleExtra(rule: FareRule): string | null {
  if (rule.category === 'REFUND' && !rule.notApplicable) {
    return 'Steuer-Rückerstattung möglich';
  }
  return null;
}

// ============================================================================
// FareRulesAccordion
// ============================================================================

export function FareRulesAccordion({ fareRules }: FareRulesAccordionProps) {
  const [open, setOpen] = useState(false);

  if (fareRules.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-3">
          <span className="text-lg">📋</span>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Tarifbedingungen
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tarifbedingungen nicht verfügbar
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Deduplicate: if all rule groups have the same rules, show only once
  const allRules = fareRules.flatMap((g) => g.rules);
  const hasRules = allRules.length > 0;

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 min-h-[56px]"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">📋</span>
          <div className="text-left">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Tarifbedingungen
            </h2>
            {!open && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Stornierung, Umbuchung & mehr
              </p>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-5 w-5 text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {/* Show rules from first group (they're typically the same across segments) */}
              {fareRules[0]?.rules.map((rule) => {
                const config = RULE_CONFIG[rule.category] || {
                  icon: 'ℹ️',
                  label: rule.category,
                };
                const extra = getRuleExtra(rule);

                return (
                  <div key={rule.category} className="flex gap-3">
                    <span className="text-base shrink-0 mt-0.5">{config.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {config.label}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {humanizeRule(rule)}
                      </p>
                      {extra && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                          {extra}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Disclaimer */}
              <p className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
                ℹ️ Detaillierte Bedingungen können je nach Fluggesellschaft abweichen.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
