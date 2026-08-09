import { Skeleton } from '@/components/ui/Skeleton';

export function StudioLoading({ cards = 3 }: { cards?: number }) {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="grid w-full max-w-3xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
