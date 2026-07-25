import { useState, useMemo } from 'react'
import type { DetailCategory } from '@/engine/construction/constructionDetails'
import {
  DETAIL_CATEGORIES,
  getDetailsByCategory,
  getDetailById,
  CONSTRUCTION_DETAILS,
} from '@/engine/construction/constructionDetails'

export function DetailsBrowser() {
  const [activeCategory, setActiveCategory] = useState<DetailCategory>('wall-sections')
  const [selectedDetailId, setSelectedDetailId] = useState<string>(
    CONSTRUCTION_DETAILS.find((d) => d.category === 'wall-sections')?.id ?? '',
  )

  const categoryDetails = useMemo(
    () => getDetailsByCategory(activeCategory),
    [activeCategory],
  )

  const selectedDetail = useMemo(
    () => getDetailById(selectedDetailId),
    [selectedDetailId],
  )

  const selectCategory = (cat: DetailCategory) => {
    setActiveCategory(cat)
    const first = getDetailsByCategory(cat)[0]
    if (first) setSelectedDetailId(first.id)
  }

  if (CONSTRUCTION_DETAILS.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-stone-700/60 bg-stone-900/40 p-12">
        <p className="text-sm text-stone-400">No construction details loaded.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-stone-700/60 bg-stone-900/80 p-1">
        {DETAIL_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => selectCategory(cat.key)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === cat.key
                ? 'bg-cyan-600/20 text-cyan-300'
                : 'text-stone-400 hover:bg-stone-800 hover:text-stone-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        <div className="flex w-64 shrink-0 flex-col gap-1">
          <h3 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            {DETAIL_CATEGORIES.find((c) => c.key === activeCategory)?.label ?? activeCategory}
          </h3>
          {categoryDetails.map((detail) => (
            <button
              key={detail.id}
              onClick={() => setSelectedDetailId(detail.id)}
              className={`rounded-md px-3 py-2 text-left text-xs transition-colors ${
                selectedDetailId === detail.id
                  ? 'bg-cyan-600/15 text-cyan-200 ring-1 ring-cyan-600/30'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-stone-200'
              }`}
            >
              <span className="block font-medium">{detail.title}</span>
              <span className="mt-0.5 block text-[10px] text-stone-400">{detail.scale}</span>
            </button>
          ))}
          {categoryDetails.length === 0 && (
            <p className="px-2 text-[11px] text-stone-400">No details in this category.</p>
          )}
        </div>

        <div className="min-w-0 flex-1 rounded-lg border border-stone-700/60 bg-stone-900/40 p-4">
          {selectedDetail ? (
            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-1 flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-stone-200">{selectedDetail.title}</h2>
                  <span className="rounded bg-stone-800 px-2 py-0.5 text-[10px] font-medium text-stone-400">
                    {selectedDetail.scale}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-stone-400">
                  {selectedDetail.description}
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  Key Dimensions
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {selectedDetail.dimensions.map((dim) => (
                    <div key={dim.label} className="flex items-baseline justify-between border-b border-stone-800 pb-1">
                      <span className="text-[11px] text-stone-400">{dim.label}</span>
                      <span className="ml-2 text-[11px] font-medium text-stone-200">{dim.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  Construction Notes
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {selectedDetail.constructionNotes.map((note, i) => (
                    <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-stone-400">
                      <span className="mt-1 block h-1 w-1 shrink-0 rounded-full bg-stone-600" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-400">Select a detail to preview.</p>
          )}
        </div>
      </div>
    </div>
  )
}
