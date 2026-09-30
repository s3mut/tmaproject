/**
 * Design System — Skeleton
 * Loading placeholder components for different content shapes.
 */

// ── Card Skeleton ─────────────────────────────────────────────────────────────
export const SkeletonCard = ({ lines = 2 }: { lines?: number }) => (
  <div className="item-card rounded-xl p-4 animate-pulse">
    <div className="flex gap-3">
      <div className="w-10 h-10 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-3.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-lg w-3/4" />
        {lines >= 2 && <div className="h-3 bg-slate-700/60 rounded-lg w-1/2" />}
        {lines >= 3 && <div className="h-3 bg-slate-700/40 rounded-lg w-2/3" />}
      </div>
    </div>
  </div>
);

// ── Chip/Pill Skeleton (for category filters) ─────────────────────────────────
export const SkeletonChip = ({ width = 'w-20' }: { width?: string }) => (
  <div className={`flex-shrink-0 h-9 rounded-xl bg-slate-700/60 animate-pulse ${width}`} />
);

// ── List of skeleton cards ────────────────────────────────────────────────────
export const SkeletonList = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}
  </div>
);

// ── Stat Card Skeleton ────────────────────────────────────────────────────────
export const SkeletonStat = () => (
  <div className="rounded-xl p-4 animate-pulse border border-slate-200/50 dark:border-slate-800/50 bg-slate-100/30 dark:bg-slate-800/30">
    <div className="flex items-center justify-between mb-3">
      <div className="h-3 bg-slate-200/80 dark:bg-slate-700/80 rounded w-16" />
      <div className="w-8 h-8 rounded-lg bg-slate-200/80 dark:bg-slate-700/80" />
    </div>
    <div className="h-7 bg-slate-200/80 dark:bg-slate-700/80 rounded-lg w-12" />
  </div>
);

// ── Default export ─────────────────────────────────────────────────────────────
export default SkeletonCard;
