// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { en } from '@/lib/i18n/en'
import { sn } from '@/lib/i18n/sn'
import { nd } from '@/lib/i18n/nd'
import { setLocale, getLocale, t, initI18n, type Locale } from '@/lib/i18n/i18n'
import { LocaleSwitcher } from '@/components/common/LocaleSwitcher'

function flatten(obj: unknown, prefix = ''): string[] {
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    typeof v === 'string'
      ? [prefix ? `${prefix}.${k}` : k]
      : flatten(v, prefix ? `${prefix}.${k}` : k),
  )
}

describe('i18n locale engine', () => {
  beforeEach(() => {
    localStorage.clear()
    setLocale('en')
  })

  it('exposes exactly the supported locales', () => {
    const locales: Locale[] = ['en', 'sn', 'nd']
    expect(locales).toContain(getLocale())
  })

  it('switches to Shona and resolves Shona strings', () => {
    setLocale('sn')
    expect(getLocale()).toBe('sn')
    expect(t('nav.home')).toBe('Kumba')
    expect(t('project.name')).toBe('Zita Repurojekiti')
    expect(t('common.language')).toBe('Mutauro')
    expect(t('app.name')).toBe('Budget Engineer')
  })

  it('switches to Ndebele and resolves Ndebele strings', () => {
    setLocale('nd')
    expect(getLocale()).toBe('nd')
    expect(t('nav.home')).toBe('Ekhaya')
    expect(t('project.name')).toBe('Ibizo Lephrojekthi')
    expect(t('common.language')).toBe('Ulimi')
  })

  it('switches back to English', () => {
    setLocale('nd')
    setLocale('en')
    expect(getLocale()).toBe('en')
    expect(t('nav.home')).toBe('Home')
    expect(t('common.language')).toBe('Language')
  })

  it('keeps identical translation key sets across locales', () => {
    const enKeys = flatten(en)
    expect(flatten(sn).sort()).toEqual(enKeys.sort())
    expect(flatten(nd).sort()).toEqual(enKeys.sort())
  })

  it('returns the path itself for unknown keys', () => {
    setLocale('en')
    expect(t('missing.deep.key')).toBe('missing.deep.key')
    expect(t('nav.notAKey')).toBe('nav.notAKey')
  })

  it('initI18n restores the stored Shona locale', () => {
    localStorage.setItem('budget-engineer-locale', 'sn')
    initI18n()
    expect(getLocale()).toBe('sn')
    expect(t('nav.home')).toBe('Kumba')
  })

  it('initI18n restores the stored Ndebele locale', () => {
    localStorage.setItem('budget-engineer-locale', 'nd')
    initI18n()
    expect(getLocale()).toBe('nd')
    expect(t('nav.home')).toBe('Ekhaya')
  })

  it('initI18n falls back to English for an unknown stored locale', () => {
    localStorage.setItem('budget-engineer-locale', 'fr')
    initI18n()
    expect(getLocale()).toBe('en')
    expect(t('nav.home')).toBe('Home')
  })

  it('initI18n defaults to English when nothing is stored', () => {
    initI18n()
    expect(getLocale()).toBe('en')
  })
})

describe('LocaleSwitcher', () => {
  it('lists all three languages in the dropdown', () => {
    setLocale('en')
    render(<LocaleSwitcher />)
    const toggle = screen.getByRole('button', { name: 'Language' })
    expect(toggle).toBeTruthy()
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'English' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Shona' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ndebele' })).toBeTruthy()
  })
})
