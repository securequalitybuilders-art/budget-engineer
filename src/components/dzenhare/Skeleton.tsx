import { cn } from '@/lib/utils';

/** Shimmering placeholder block - the repo rule is skeletons, not spinners. */
export function DzSkeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-lg', className)} />;
}

/** Card-shaped skeleton for list/panel loading states. */
export function DzSkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4', className)}>
      <DzSkeleton className="h-3 w-24" />
      <DzSkeleton className="mt-3 h-8 w-40" />
      <DzSkeleton className="mt-3 h-3 w-full" />
      <DzSkeleton className="mt-2 h-3 w-3/4" />
    </div>
  );
}
