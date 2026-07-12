import { useMemo } from 'react'
import type { BlockCategory } from '@/domain/furniture'
import { FURNITURE_LIBRARY, BLOCK_CATEGORIES, getFurnitureByCategory } from '@/lib/furniture/furniture-library'
import { useFurnitureStore } from '@/stores/furnitureStore'

interface BlockLibraryPanelProps {
  onClose?: () => void
}

export function BlockLibraryPanel({ onClose }: BlockLibraryPanelProps) {
  const activeCategory = useFurnitureStore((s) => s.activeCategory)
  const setActiveCategory = useFurnitureStore((s) => s.setActiveCategory)
  const activeDefId = useFurnitureStore((s) => s.activeDefId)
  const setActiveDef = useFurnitureStore((s) => s.setActiveDef)
  const blocks = useFurnitureStore((s) => s.blocks)

  const items = useMemo(() => getFurnitureByCategory(activeCategory), [activeCategory])

  return (
    <div className="flex h-full flex-col bg-white border-l border-stone-200 w-72 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2">
        <span className="font-semibold text-stone-800">Block Library</span>
        <span className="text-stone-400">{blocks.length} placed</span>
        {onClose && (
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 ml-1" aria-label="Close panel">
            ✕
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 border-b border-stone-200 px-2 py-1.5">
        {BLOCK_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
              activeCategory === cat.key
                ? 'bg-blue-600 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Item grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => {
            const isActive = activeDefId === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveDef(isActive ? null : item.id)}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300'
                    : 'border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-stone-100'
                }`}
                title={`${item.name} — ${(item.width * 1000).toFixed(0)}×${(item.depth * 1000).toFixed(0)} mm`}
              >
                <span className="text-lg leading-none">{item.symbol}</span>
                <span className="text-[10px] text-stone-700 leading-tight text-center line-clamp-2">
                  {item.name}
                </span>
                <span className="text-[9px] text-stone-400">
                  {(item.width * 1000).toFixed(0)}×{(item.depth * 1000).toFixed(0)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="border-t border-stone-200 px-3 py-1.5 text-[10px] text-stone-400 leading-relaxed">
        {activeDefId
          ? 'Click on the plan to place the selected item. Right-click or press Escape to cancel.'
          : 'Select an item above, then click the plan to place it.'}
      </div>
    </div>
  )
}
