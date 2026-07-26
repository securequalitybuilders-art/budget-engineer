import { useState } from 'react'
import { setLocale, getLocale, t } from '@/lib/i18n/i18n'
import { Globe, ChevronDown } from 'lucide-react'

const LOCALES = [
  { code: 'en', label: 'English' },
] as const

export function LocaleSwitcher() {
  const [open, setOpen] = useState(false)
  const current = getLocale()

  const handleSwitch = (code: 'en') => {
    setLocale(code)
    setOpen(false)
    window.location.reload()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
      >
        <Globe size={16} />
        <span className="flex-1 text-left truncate">{t('common.language') || 'English'}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-2 shadow-xl">
          <div className="mb-2 px-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Language</div>
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => handleSwitch(l.code)}
              className={`w-full rounded px-2 py-1.5 text-left text-xs transition-colors ${
                current === l.code
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
