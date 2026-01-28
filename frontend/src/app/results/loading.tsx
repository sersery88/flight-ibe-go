import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading UI for results page - shown during navigation
 */
export default function ResultsLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Search Header Skeleton */}
      <div className="sticky top-0 z-40 bg-background border-b border-border shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="flex justify-center">
        <div className="w-full max-w-7xl px-4 py-6">
          <div className="flex gap-6">
            {/* Sidebar Skeleton */}
            <aside className="hidden w-72 shrink-0 lg:block">
              <div className="space-y-4">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            </aside>

            {/* Results Skeleton */}
            <main className="flex-1 space-y-4">
              {/* Sort Tabs */}
              <Skeleton className="h-16 w-full rounded-lg" />
              
              {/* Mobile Filter Button */}
              <Skeleton className="h-10 w-full rounded-lg lg:hidden" />

              {/* Flight Cards */}
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <div className="space-y-4">
                    {/* Flight Row */}
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="h-6 w-16" />
                        </div>
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    
                    {/* Divider */}
                    <div className="border-t border-dashed border-border" />
                    
                    {/* Return Flight Row */}
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="h-6 w-16" />
                        </div>
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Skeleton className="h-8 w-24" />
                          <Skeleton className="mt-1 h-4 w-16" />
                        </div>
                        <Skeleton className="h-10 w-24 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
