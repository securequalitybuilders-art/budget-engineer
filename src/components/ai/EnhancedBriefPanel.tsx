import { useState, useMemo, useCallback } from 'react';
import { detectClimateZone, generateSiteContext, generateWindRose } from '@/engine/site/locationIntelligence';
import { Compass, Sun, Wind, MapPin, DollarSign, Layers, Palette } from 'lucide-react';
import type { SiteContext } from '@/domain/site';

export function generateBriefText(q: {
  buildingType: string; siteWidth: number; siteDepth: number;
  bedrooms: number; bathrooms: number; livingAreas: number;
  kitchen: boolean; garage: boolean; verandah: boolean; store: boolean;
  style: string; roof: string; floors: number;
  solar: boolean; rainwater: boolean; borehole: boolean; notes: string;
  budgetUsd: number; lat?: number; lng?: number;
}): string {
  return [
    `${q.floors}-storey ${q.buildingType.replace('-', ' ')}`,
    `site ${q.siteWidth}×${q.siteDepth} m`,
    `${q.bedrooms} bedrooms, ${q.bathrooms} bathrooms`,
    `${q.livingAreas} living area${q.livingAreas !== 1 ? 's' : ''}`,
    q.kitchen ? 'kitchen' : '',
    q.garage ? 'garage' : '',
    q.verandah ? 'verandah' : '',
    q.store ? 'store room' : '',
    q.style,
    q.roof ? `${q.roof} roof` : '',
    q.solar ? 'solar ready' : '',
    q.rainwater ? 'rainwater harvesting' : '',
    q.borehole ? 'borehole' : '',
    `budget $${q.budgetUsd}`,
    q.notes || '',
  ].filter(Boolean).join(', ')
}

export interface BriefQuestionnaire {
  buildingType: string
  lat: number
  lng: number
  siteWidth: number
  siteDepth: number
  budgetUsd: number
  bedrooms: number
  bathrooms: number
  livingAreas: number
  kitchen: boolean
  garage: boolean
  verandah: boolean
  store: boolean
  style: string
  roof: string
  floors: number
  solar: boolean
  rainwater: boolean
  borehole: boolean
  notes: string
}

const DEFAULT_QUESTIONNAIRE: BriefQuestionnaire = {
  buildingType: 'house-residential',
  lat: -17.825,
  lng: 31.033,
  siteWidth: 30,
  siteDepth: 25,
  budgetUsd: 50000,
  bedrooms: 3,
  bathrooms: 2,
  livingAreas: 1,
  kitchen: true,
  garage: false,
  verandah: false,
  store: false,
  style: 'modern',
  roof: 'gable',
  floors: 1,
  solar: false,
  rainwater: false,
  borehole: false,
  notes: '',
}

const BUILDING_TYPES = [
  { value: 'house-residential', label: 'House / Residential' },
  { value: 'apartment-multi', label: 'Apartment / Flat' },
  { value: 'clinic-health', label: 'Clinic / Health Centre' },
  { value: 'school-classroom', label: 'School / Classroom Block' },
  { value: 'hotel-fullservice', label: 'Hotel (Full Service)' },
  { value: 'office-commercial', label: 'Office / Commercial' },
  { value: 'retail-shop', label: 'Retail / Shop' },
  { value: 'church-worship', label: 'Church / Place of Worship' },
  { value: 'warehouse-industrial', label: 'Warehouse / Industrial' },
  { value: 'mixed-use', label: 'Mixed-Use (Commercial + Residential)' },
]

const CITIES = [
  { label: 'Harare, Zimbabwe', lat: -17.825, lng: 31.033 },
  { label: 'Bulawayo, Zimbabwe', lat: -20.15, lng: 28.58 },
  { label: 'Victoria Falls, Zimbabwe', lat: -18.08, lng: 25.83 },
  { label: 'Mutare, Zimbabwe', lat: -18.97, lng: 32.67 },
  { label: 'Gweru, Zimbabwe', lat: -19.45, lng: 29.85 },
  { label: 'Johannesburg, SA', lat: -26.20, lng: 28.05 },
  { label: 'Cape Town, SA', lat: -33.92, lng: 18.42 },
  { label: 'Lusaka, Zambia', lat: -15.42, lng: 28.32 },
  { label: 'Gaborone, Botswana', lat: -24.66, lng: 25.91 },
]

const STYLES = ['modern', 'traditional', 'vernacular', 'contemporary', 'colonial']
const ROOFS = ['gable', 'flat', 'hip', 'canopy', 'sawtooth']

function SectionBox({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-stone-700/40 bg-stone-900/60 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
        {icon}
        {title}
      </div>
      {children}
    </div>
  )
}

function RangeInput({ label, value, onChange, min, max, step, unit }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] text-stone-500">{label}</span>
      <div className="flex items-center gap-1">
        <input type="range" min={min} max={max} step={step ?? 1} value={value} onChange={e => onChange(parseFloat(e.target.value))}
          className="w-20 accent-cyan-600" />
        <span className="w-12 text-right text-xs text-stone-300">{value}{unit ?? ''}</span>
      </div>
    </label>
  )
}

export function EnhancedBriefPanel({ projectId, onGenerate }: {
  projectId?: string
  onGenerate?: (q: BriefQuestionnaire) => void
}) {
  const [q, setQ] = useState<BriefQuestionnaire>(DEFAULT_QUESTIONNAIRE)
  const [showFreeText, setShowFreeText] = useState(false)
  const [cityPreset, setCityPreset] = useState('')

  const set = useCallback(<K extends keyof BriefQuestionnaire>(key: K, value: BriefQuestionnaire[K]) => {
    setQ(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleCitySelect = useCallback((label: string) => {
    setCityPreset(label)
    const city = CITIES.find(c => c.label === label)
    if (city) {
      setQ(prev => ({ ...prev, lat: city.lat, lng: city.lng }))
    }
  }, [])

  const siteContext = useMemo<SiteContext | null>(() => {
    if (q.lat !== 0 || q.lng !== 0) {
      return generateSiteContext(projectId ?? 'demo', q.lat, q.lng, q.siteWidth, q.siteDepth)
    }
    return null
  }, [projectId, q.lat, q.lng, q.siteWidth, q.siteDepth])

  const climate = useMemo(() => {
    if (q.lat !== 0 || q.lng !== 0) return detectClimateZone(q.lat, q.lng)
    return null
  }, [q.lat, q.lng])

  const windDesc = useMemo(() => {
    if (!climate) return ''
    const rose = generateWindRose(climate)
    const strongest = [...rose.sectors].sort((a, b) => b.speed - a.speed)[0]
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const label = dirs[Math.round(strongest.direction / 45) % 8]
    return `${label} @ ${strongest.speed} m/s`
  }, [climate])

  const handleGenerate = useCallback(() => {
    onGenerate?.(q)
  }, [q, onGenerate])

  const uniqueFeatures = useMemo(() => {
    const features: string[] = []
    if (q.garage) features.push('garage')
    if (q.verandah) features.push('verandah')
    if (q.store) features.push('store')
    if (q.solar) features.push('solar')
    if (q.rainwater) features.push('rainwater harvesting')
    if (q.borehole) features.push('borehole')
    return features.join(', ')
  }, [q.garage, q.verandah, q.store, q.solar, q.rainwater, q.borehole])

  if (showFreeText) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 1. PROJECT TYPE */}
      <SectionBox title="1. Project Type" icon={<Layers size={12} />}>
        <div className="flex flex-wrap gap-1.5">
          {BUILDING_TYPES.map(bt => (
            <button key={bt.value}
              onClick={() => set('buildingType', bt.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                q.buildingType === bt.value
                  ? 'bg-cyan-700 text-white'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
              }`}
            >
              {bt.label}
            </button>
          ))}
        </div>
      </SectionBox>

      {/* 2. LOCATION */}
      <SectionBox title="2. Location" icon={<MapPin size={12} />}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-stone-500">City preset</span>
            <select value={cityPreset} onChange={e => handleCitySelect(e.target.value)}
              className="rounded border border-stone-700 bg-stone-800 px-2 py-1 text-xs text-stone-200">
              <option value="">— Select —</option>
              {CITIES.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-stone-500">Latitude</span>
            <input type="number" min={-90} max={90} step={0.01} value={q.lat}
              onChange={e => set('lat', parseFloat(e.target.value) || 0)}
              className="w-20 rounded border border-stone-700 bg-stone-800 px-2 py-1 text-xs text-stone-200" />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-stone-500">Longitude</span>
            <input type="number" min={-180} max={180} step={0.01} value={q.lng}
              onChange={e => set('lng', parseFloat(e.target.value) || 0)}
              className="w-20 rounded border border-stone-700 bg-stone-800 px-2 py-1 text-xs text-stone-200" />
          </label>
        </div>
      </SectionBox>

      {/* 3. SITE DIMENSIONS */}
      <SectionBox title="3. Site Dimensions" icon={<Sun size={12} />}>
        <div className="flex flex-wrap gap-4">
          <RangeInput label="Width (m)" value={q.siteWidth} onChange={v => set('siteWidth', v)} min={10} max={60} />
          <RangeInput label="Depth (m)" value={q.siteDepth} onChange={v => set('siteDepth', v)} min={10} max={60} />
          <div className="self-end text-xs text-stone-500">Area: <span className="text-stone-300">{q.siteWidth * q.siteDepth} m²</span></div>
        </div>
      </SectionBox>

      {/* 4. BUDGET */}
      <SectionBox title="4. Budget" icon={<DollarSign size={12} />}>
        <RangeInput label="USD" value={q.budgetUsd} onChange={v => set('budgetUsd', v)} min={5000} max={500000} step={5000} unit="$" />
        <div className="mt-1 text-[10px] text-stone-500">
          Budget grade: {q.budgetUsd < 30000 ? 'Economy' : q.budgetUsd < 100000 ? 'Standard' : q.budgetUsd < 250000 ? 'Premium' : 'Luxury'}
          {' · '}Rate: ${(q.budgetUsd / (q.siteWidth * q.siteDepth)).toFixed(0)}/m²
        </div>
      </SectionBox>

      {/* 5. ROOMS & SPACES */}
      <SectionBox title="5. Rooms & Spaces" icon={<MapPin size={12} />}>
        <div className="flex flex-wrap gap-4">
          <RangeInput label="Bedrooms" value={q.bedrooms} onChange={v => set('bedrooms', v)} min={1} max={10} />
          <RangeInput label="Bathrooms" value={q.bathrooms} onChange={v => set('bathrooms', v)} min={1} max={8} />
          <RangeInput label="Living Areas" value={q.livingAreas} onChange={v => set('livingAreas', v)} min={0} max={5} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { key: 'kitchen' as const, label: 'Kitchen' },
            { key: 'garage' as const, label: 'Garage' },
            { key: 'verandah' as const, label: 'Verandah' },
            { key: 'store' as const, label: 'Store Room' },
          ].map(t => (
            <button key={t.key}
              onClick={() => setQ(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
              className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                q[t.key] ? 'bg-emerald-700 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
              }`}
            >
              {q[t.key] ? '✓ ' : ''}{t.label}
            </button>
          ))}
        </div>
      </SectionBox>

      {/* 6. STYLE & PREFERENCES */}
      <SectionBox title="6. Style & Preferences" icon={<Palette size={12} />}>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="w-full text-[10px] text-stone-500">Style</span>
          {STYLES.map(s => (
            <button key={s}
              onClick={() => set('style', s)}
              className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize transition-colors ${
                q.style === s ? 'bg-cyan-700 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
              }`}
            >{s}</button>
          ))}
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="w-full text-[10px] text-stone-500">Roof</span>
          {ROOFS.map(r => (
            <button key={r}
              onClick={() => set('roof', r)}
              className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize transition-colors ${
                q.roof === r ? 'bg-cyan-700 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
              }`}
            >{r}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RangeInput label="Floors" value={q.floors} onChange={v => set('floors', v)} min={1} max={5} />
          <div className="flex gap-2">
            {[
              { key: 'solar' as const, label: 'Solar' },
              { key: 'rainwater' as const, label: 'Rainwater' },
              { key: 'borehole' as const, label: 'Borehole' },
            ].map(t => (
              <button key={t.key}
                onClick={() => setQ(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                  q[t.key] ? 'bg-emerald-700 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                {q[t.key] ? '✓ ' : ''}{t.label}
              </button>
            ))}
          </div>
        </div>
      </SectionBox>

      {/* 7. ADDITIONAL NOTES */}
      <SectionBox title="7. Additional Notes" icon={<MapPin size={12} />}>
        <textarea
          rows={2} value={q.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Special requirements, accessibility needs, heritage context..."
          className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-xs text-stone-200 placeholder-stone-500 focus:border-cyan-600 focus:outline-none"
        />
      </SectionBox>

      {/* Site Analysis Summary */}
      {siteContext && climate && (
        <div className="rounded-lg border border-emerald-700/30 bg-emerald-900/20 p-3">
          <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <Compass size={12} />
            Site Analysis (auto-calculated)
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <span className="text-stone-500">Climate:</span>
            <span className="text-stone-200">{climate.name}</span>
            <span className="text-stone-500">Wind:</span>
            <span className="text-stone-200">{windDesc}</span>
            <span className="text-stone-500">Optimal orientation:</span>
            <span className="text-stone-200">{siteContext.orientation}° (E-W long axis)</span>
            <span className="text-stone-500">Setbacks:</span>
            <span className="text-stone-200">
              {siteContext.setbacks ? `${siteContext.setbacks.front}m front, ${siteContext.setbacks.rear}m rear` : '—'}
            </span>
            <span className="text-stone-500">Effective area:</span>
            <span className="text-stone-200">
              {siteContext.setbacks
                ? `${Math.max(0, q.siteWidth - siteContext.setbacks.sides[0] - siteContext.setbacks.sides[1])} × ${Math.max(0, q.siteDepth - siteContext.setbacks.front - siteContext.setbacks.rear)} m`
                : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Engineering Intel Summary */}
      <div className="rounded-lg border border-cyan-700/30 bg-cyan-900/20 p-3">
        <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
          <Wind size={12} />
          Engineering Intel (auto-calculated)
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <span className="text-stone-500">Floors:</span>
          <span className="text-stone-200">{q.floors}-storey {BUILDING_TYPES.find(bt => bt.value === q.buildingType)?.label ?? q.buildingType}</span>
          <span className="text-stone-500">Structure:</span>
          <span className="text-stone-200">{q.floors <= 2 ? 'Load-bearing masonry' : 'Reinforced concrete frame'}</span>
          <span className="text-stone-500">Fire exits:</span>
          <span className="text-stone-200">{q.floors <= 2 ? '1 exit sufficient' : '2 exits required'}</span>
          <span className="text-stone-500">Wet core:</span>
          <span className="text-stone-200">{q.bathrooms >= 2 ? 'Grouped recommended' : 'Single stack'}</span>
        </div>
      </div>

      {/* Generate Button */}
      <button onClick={handleGenerate}
        className="flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-600"
      >
        <Compass size={16} />
        Generate 3 Design Concepts →
      </button>

      <p className="text-[10px] text-stone-500">
        Site analysis is for early-stage reference. Always consult a registered professional for final assessment.
      </p>
    </div>
  )
}
