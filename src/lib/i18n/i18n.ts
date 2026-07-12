import { en, type TranslationKeys } from './en'

type Locale = 'en'

const locales: Record<Locale, TranslationKeys> = { en }

let currentLocale: Locale = 'en'
let currentTranslations: TranslationKeys = en

export function setLocale(locale: Locale) {
  currentLocale = locale
  currentTranslations = locales[locale] ?? en
  try {
    localStorage.setItem('budget-engineer-locale', locale)
  } catch { /* ignore */ }
}

export function getLocale(): Locale {
  return currentLocale
}

export function t(path: string, params?: Record<string, string | number>): string {
  const keys = path.split('.')
  let value: unknown = currentTranslations
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key]
    } else {
      return path
    }
  }
  if (typeof value !== 'string') return path
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? `{{${k}}}`))
  }
  return value
}

export function initI18n() {
  try {
    const stored = localStorage.getItem('budget-engineer-locale')
    if (stored === 'en' || stored === null) {
      currentTranslations = en
    } else {
      setLocale('en')
    }
  } catch {
    currentTranslations = en
  }
}

export function useTranslation() {
  return { t, locale: currentLocale, setLocale }
}
