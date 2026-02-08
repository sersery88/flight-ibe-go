'use client';

import { motion } from 'motion/react';
import { Check, Users, Armchair, CreditCard, PartyPopper } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ProgressBarProps {
  currentStep: 1 | 2 | 3 | 4;
  onStepClick?: (step: 1 | 2 | 3 | 4) => void;
}

interface StepDef {
  step: 1 | 2 | 3 | 4;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

// ============================================================================
// Step Definitions
// ============================================================================

const STEPS: StepDef[] = [
  { step: 1, label: 'Passagiere', shortLabel: 'Daten', icon: Users },
  { step: 2, label: 'Extras & Sitzplatz', shortLabel: 'Extras', icon: Armchair },
  { step: 3, label: 'Zahlung', shortLabel: 'Zahlung', icon: CreditCard },
  { step: 4, label: 'Bestätigung', shortLabel: 'Fertig', icon: PartyPopper },
];

// ============================================================================
// ProgressBar Component
// ============================================================================

export function ProgressBar({ currentStep, onStepClick }: ProgressBarProps) {
  return (
    <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="mx-auto max-w-[1200px] px-4 py-3 md:py-4">
        {/* Desktop */}
        <div className="hidden md:flex items-center justify-center gap-0">
          {STEPS.map((stepDef, idx) => {
            const isCompleted = currentStep > stepDef.step;
            const isCurrent = currentStep === stepDef.step;
            const isFuture = currentStep < stepDef.step;
            const isClickable = isCompleted && onStepClick;

            return (
              <div key={stepDef.step} className="flex items-center">
                {/* Step indicator */}
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(stepDef.step)}
                  disabled={!isClickable}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all ${
                    isClickable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''
                  } ${!isClickable && !isCurrent ? 'cursor-default' : ''}`}
                >
                  {/* Circle */}
                  <motion.div
                    layout
                    className={`flex items-center justify-center rounded-full shrink-0 transition-colors duration-300 ${
                      isCompleted
                        ? 'h-7 w-7 bg-emerald-500 text-white'
                        : isCurrent
                          ? 'h-7 w-7 bg-pink-500 text-white'
                          : 'h-7 w-7 bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </motion.div>
                    ) : (
                      <span className="text-xs font-bold">{stepDef.step}</span>
                    )}
                  </motion.div>

                  {/* Label */}
                  <span
                    className={`text-sm font-medium whitespace-nowrap transition-colors duration-300 ${
                      isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isCurrent
                          ? 'text-gray-900 dark:text-gray-100'
                          : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {stepDef.label}
                  </span>
                </button>

                {/* Connector line */}
                {idx < STEPS.length - 1 && (
                  <div className="w-12 h-[2px] mx-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{
                        width: isCompleted ? '100%' : '0%',
                      }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center justify-between">
          {STEPS.map((stepDef, idx) => {
            const isCompleted = currentStep > stepDef.step;
            const isCurrent = currentStep === stepDef.step;
            const isClickable = isCompleted && onStepClick;

            return (
              <div key={stepDef.step} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(stepDef.step)}
                  disabled={!isClickable}
                  className="flex flex-col items-center gap-1 flex-1"
                >
                  {/* Circle */}
                  <motion.div
                    layout
                    className={`flex items-center justify-center rounded-full shrink-0 transition-colors duration-300 ${
                      isCompleted
                        ? 'h-8 w-8 bg-emerald-500 text-white'
                        : isCurrent
                          ? 'h-8 w-8 bg-pink-500 text-white'
                          : 'h-8 w-8 bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    ) : (
                      <stepDef.icon className="h-4 w-4" />
                    )}
                  </motion.div>

                  {/* Short label */}
                  <span
                    className={`text-[10px] font-medium transition-colors duration-300 ${
                      isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isCurrent
                          ? 'text-gray-900 dark:text-gray-100'
                          : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {stepDef.shortLabel}
                  </span>
                </button>

                {/* Connector line */}
                {idx < STEPS.length - 1 && (
                  <div className="h-[2px] flex-1 mx-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden -mt-4">
                    <motion.div
                      className="h-full bg-emerald-500 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{
                        width: isCompleted ? '100%' : '0%',
                      }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
