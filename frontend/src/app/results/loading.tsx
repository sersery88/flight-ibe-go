import { Skeleton } from '@/components/ui/skeleton';

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 animate-pulse">
      {/* Flight row */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-accent" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-5 w-14 rounded bg-accent" />
            <div className="h-[2px] flex-1 bg-accent" />
            <div className="h-5 w-14 rounded bg-accent" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-8 rounded bg-accent" />
            <div className="flex-1" />
            <div className="h-3 w-8 rounded bg-accent" />
          </div>
        </div>
      </div>
      {/* Return flight row */}
      <div className="my-3 border-t border-dashed border-border/50" />
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-accent" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-5 w-14 rounded bg-accent" />
            <div className="h-[2px] flex-1 bg-accent" />
            <div className="h-5 w-14 rounded bg-accent" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-8 rounded bg-accent" />
            <div className="flex-1" />
            <div className="h-3 w-8 rounded bg-accent" />
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
        <div className="h-5 w-24 rounded-full bg-accent" />
        <div className="flex items-center gap-3">
          <div className="space-y-1 text-right">
            <div className="ml-auto h-6 w-20 rounded bg-accent" />
            <div className="ml-auto h-3 w-12 rounded bg-accent" />
          </div>
          <div className="h-10 w-24 rounded-xl bg-accent" />
        </div>
      </div>
    </div>
  );
}

export default function ResultsLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Search bar skeleton */}
      <div className="sticky top-0 z-40 bg-background border-b border-border shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>

      {/* Sort tabs skeleton */}
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <div className="flex gap-6">
          {/* Desktop sidebar skeleton */}
          <div className="hidden lg:block w-72 shrink-0">
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
          <div className="flex-1 space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl lg:hidden" />
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="h-4 w-28" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
