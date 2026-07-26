export function DrawingEmptyState({ message = 'Drawing unavailable — no active plan' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-stone-700/60 bg-stone-950/80 p-8">
      <p className="text-sm text-stone-400">{message}</p>
    </div>
  )
}
