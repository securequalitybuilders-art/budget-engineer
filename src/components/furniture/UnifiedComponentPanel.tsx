import { useMemo, useState } from 'react'
import { getFurnitureByCategory } from '@/lib/furniture/furniture-library'
import { getDoors, getWindows } from '@/engine/parametric/componentRegistry'
import { useFurnitureStore } from '@/stores/furnitureStore'
import { useComponentSelectionStore } from '@/stores/componentSelectionStore'
import { useDisciplineStore } from '@/stores/disciplineStore'
import { ROOM_TEMPLATES } from '@/lib/interior/roomTemplates'
import type { BlockCategory } from '@/domain/furniture'
import type { DisciplineId } from '@/lib/studio/discipline'

interface UnifiedComponentPanelProps {
  onClose?: () => void
}

type UnifiedCategory = BlockCategory | 'doors' | 'windows' | 'interior' | 'stairs'

interface UnifiedCatDef {
  key: UnifiedCategory
  label: string
  disciplines: DisciplineId[]
}

const CATEGORY_DEFS: UnifiedCatDef[] = [
  { key: 'furniture', label: 'Furniture', disciplines: ['ARCH', 'INT'] },
  { key: 'sanitary', label: 'Sanitary', disciplines: ['ARCH', 'PLUM', 'INT'] },
  { key: 'kitchen', label: 'Kitchen', disciplines: ['ARCH', 'INT'] },
  { key: 'lighting', label: 'Lighting', disciplines: ['ARCH', 'ELEC', 'INT'] },
  { key: 'stairs', label: 'Stairs', disciplines: ['ARCH', 'STR'] },
  { key: 'structural', label: 'Structural', disciplines: ['STR', 'ARCH'] },
  { key: 'doors', label: 'Doors', disciplines: ['ARCH', 'INT'] },
  { key: 'windows', label: 'Windows', disciplines: ['ARCH', 'INT'] },
  { key: 'interior', label: 'Room Templates', disciplines: ['INT', 'ARCH'] },
]

export function UnifiedComponentPanel({ onClose }: UnifiedComponentPanelProps) {
  const [activeCategory, setActiveCategory] = useState<UnifiedCategory>('furniture')
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const currentDiscipline = useDisciplineStore((s) => s.currentDiscipline)

  const activeDefId = useFurnitureStore((s) => s.activeDefId)
  const setActiveDef = useFurnitureStore((s) => s.setActiveDef)
  const setActiveFurnitureCategory = useFurnitureStore((s) => s.setActiveCategory)
  const blocks = useFurnitureStore((s) => s.blocks)

  const selectedDoorSpec = useComponentSelectionStore((s) => s.selectedDoorSpec)
  const selectedWindowSpec = useComponentSelectionStore((s) => s.selectedWindowSpec)
  const setSelectedDoorSpec = useComponentSelectionStore((s) => s.setSelectedDoorSpec)
  const setSelectedWindowSpec = useComponentSelectionStore((s) => s.setSelectedWindowSpec)

  const furnitureItems = useMemo(() => {
    if (activeCategory === 'doors' || activeCategory === 'windows') return []
    return getFurnitureByCategory(activeCategory as BlockCategory)
  }, [activeCategory])

  const filteredFurniture = useMemo(() => {
    if (activeCategory === 'doors' || activeCategory === 'windows') return []
    if (!search) return furnitureItems
    const q = search.toLowerCase()
    return furnitureItems.filter(
      (f) => f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q) || f.tags.some((t) => t.includes(q)),
    )
  }, [furnitureItems, search, activeCategory])

  const doors = useMemo(() => {
    if (activeCategory !== 'doors') return []
    const all = getDoors()
    if (!search) return all
    const q = search.toLowerCase()
    return all.filter((d) => d.label.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.type.includes(q))
  }, [search, activeCategory])

  const windows = useMemo(() => {
    if (activeCategory !== 'windows') return []
    const all = getWindows()
    if (!search) return all
    const q = search.toLowerCase()
    return all.filter((w) => w.label.toLowerCase().includes(q) || w.code.toLowerCase().includes(q) || w.type.includes(q))
  }, [search, activeCategory])

  const isFurnitureCategory = activeCategory !== 'doors' && activeCategory !== 'windows' && activeCategory !== 'interior'

  const handleCategoryChange = (cat: UnifiedCategory) => {
    setActiveCategory(cat)
    setSearch('')
    if (cat !== 'doors' && cat !== 'windows' && cat !== 'interior') {
      setActiveFurnitureCategory(cat as BlockCategory)
    }
  }

  const handleFurnitureSelect = (id: string | null) => {
    setActiveDef(id)
    setSelectedDoorSpec(null)
    setSelectedWindowSpec(null)
  }

  const handleDoorSelect = (code: string) => {
    if (selectedDoorSpec === code) {
      setSelectedDoorSpec(null)
    } else {
      setSelectedDoorSpec(code)
      setActiveDef(null)
    }
  }

  const handleWindowSelect = (code: string) => {
    if (selectedWindowSpec === code) {
      setSelectedWindowSpec(null)
    } else {
      setSelectedWindowSpec(code)
      setActiveDef(null)
    }
  }

  return (
    <div className="flex h-full flex-col bg-white border-l border-stone-200 w-72 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2">
        <span className="font-semibold text-stone-800">Component Library</span>
        <div className="flex items-center gap-1">
          <span className="text-stone-400">{blocks.length} placed</span>
          <button
            onClick={() => setShowSearch((v) => !v)}
            className="text-stone-400 hover:text-stone-700 px-1"
            aria-label="Toggle search"
          >
            🔍
          </button>
          {onClose && (
            <button onClick={onClose} className="text-stone-400 hover:text-stone-700 ml-1" aria-label="Close panel">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Search input */}
      {showSearch && (
        <div className="border-b border-stone-200 px-2 py-1.5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter components..."
            className="w-full rounded border border-stone-300 px-2 py-1 text-[11px] outline-none focus:border-blue-400"
            aria-label="Search components"
          />
        </div>
      )}

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 border-b border-stone-200 px-2 py-1.5">
        {CATEGORY_DEFS.filter((c) => c.disciplines.includes(currentDiscipline)).map((cat) => (
          <button
            key={cat.key}
            onClick={() => handleCategoryChange(cat.key)}
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
        {activeCategory === 'doors' && (
          <div className="grid grid-cols-1 gap-1.5">
            {doors.map((d) => {
              const isSelected = selectedDoorSpec === d.code
              return (
                <button
                  key={d.code}
                  onClick={() => handleDoorSelect(d.code)}
                  className={`flex flex-col gap-0.5 rounded-lg border p-2 text-left transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300'
                      : 'border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  <span className="text-[11px] font-medium text-stone-800">{d.label}</span>
                  <span className="text-[10px] text-stone-400">{d.code} — {d.widthMm}×{d.heightMm}mm · {d.type} · {d.core}</span>
                  {d.fireRatingMinHr && (
                    <span className="text-[9px] text-amber-600">Fire rated: {d.fireRatingMinHr}h</span>
                  )}
                </button>
              )
            })}
            {doors.length === 0 && (
              <p className="text-[11px] text-stone-400 text-center py-4">No doors match your filter.</p>
            )}
          </div>
        )}

        {activeCategory === 'windows' && (
          <div className="grid grid-cols-1 gap-1.5">
            {windows.map((w) => {
              const isSelected = selectedWindowSpec === w.code
              return (
                <button
                  key={w.code}
                  onClick={() => handleWindowSelect(w.code)}
                  className={`flex flex-col gap-0.5 rounded-lg border p-2 text-left transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300'
                      : 'border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  <span className="text-[11px] font-medium text-stone-800">{w.label}</span>
                  <span className="text-[10px] text-stone-400">{w.code} — {w.widthMm}×{w.heightMm}mm · {w.type} · {w.liteCount} lites</span>
                </button>
              )
            })}
            {windows.length === 0 && (
              <p className="text-[11px] text-stone-400 text-center py-4">No windows match your filter.</p>
            )}
          </div>
        )}

        {activeCategory === 'interior' && (
          <div className="grid grid-cols-1 gap-1.5">
            {ROOM_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                className="flex flex-col gap-0.5 rounded-lg border border-stone-200 bg-stone-50 p-2"
              >
                <span className="text-[11px] font-medium text-stone-800">{tpl.name}</span>
                <span className="text-[10px] text-stone-400">{tpl.defaultWidth/1000}×{tpl.defaultDepth/1000}m · {tpl.roomType}</span>
                <span className="text-[9px] text-stone-400 line-clamp-1">{tpl.description}</span>
                <span className="text-[9px] text-stone-400">Materials: {tpl.suggestedMaterials.wall}, {tpl.suggestedMaterials.floor}</span>
              </div>
            ))}
          </div>
        )}

        {isFurnitureCategory && (
          <div className="grid grid-cols-2 gap-2">
            {filteredFurniture.map((item) => {
              const isActive = activeDefId === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleFurnitureSelect(isActive ? null : item.id)}
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
        )}
      </div>

      {/* Instructions */}
      <div className="border-t border-stone-200 px-3 py-1.5 text-[10px] text-stone-400 leading-relaxed">
        {activeCategory === 'doors' && selectedDoorSpec && (
          <span>Door spec selected. Use <strong>+Door</strong> on the plan to place a {doors.find(d => d.code === selectedDoorSpec)?.widthMm ?? ''}mm door.</span>
        )}
        {activeCategory === 'windows' && selectedWindowSpec && (
          <span>Window spec selected. Use <strong>+Window</strong> on the plan to place a {windows.find(w => w.code === selectedWindowSpec)?.widthMm ?? ''}mm window.</span>
        )}
        {isFurnitureCategory && activeDefId && (
          <span>Click on the plan to place the selected item. Right-click or press Escape to cancel.</span>
        )}
        {isFurnitureCategory && !activeDefId && (
          <span>Select an item above, then click the plan to place it.</span>
        )}
        {activeCategory === 'doors' && !selectedDoorSpec && (
          <span>Select a door size, then use <strong>+Door</strong> on the plan.</span>
        )}
        {activeCategory === 'windows' && !selectedWindowSpec && (
          <span>Select a window size, then use <strong>+Window</strong> on the plan.</span>
        )}
        {activeCategory === 'interior' && (
          <span>Room templates for reference. Configure rooms in <strong>Interior Studio</strong> (Design → Interior button).</span>
        )}
      </div>
    </div>
  )
}
