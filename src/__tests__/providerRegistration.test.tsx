// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { useProviderStore } from '@/stores/providerStore'
import ProviderRegistration from '@/components/marketplace/ProviderRegistration'
import { PROVIDER_SPECIALTIES, providerTypeForCategory } from '@/domain/providerTaxonomy'

afterEach(cleanup)

const continueToStep = (next: number) => {
  for (let i = 1; i < next; i += 1) fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
}

beforeEach(() => {
  useProviderStore.getState().reset()
})

describe('ProviderRegistration — service provider matrix', () => {
  it('lists all 5 matrix categories on step 0', () => {
    render(<ProviderRegistration />)
    expect(screen.getByText('Professional Consultants & Technical Engineers')).toBeTruthy()
    expect(screen.getByText('Main & General Contractors')).toBeTruthy()
    expect(screen.getByText('Specialized Subcontracting Firms')).toBeTruthy()
    expect(screen.getByText('Skilled Artisans & On-Site Tradespeople')).toBeTruthy()
    expect(screen.getByText('Independent Testing & Quality Assurance Services')).toBeTruthy()
  })

  it('requires a category before continuing', () => {
    render(<ProviderRegistration />)
    fireEvent.change(screen.getByPlaceholderText('e.g. DzeNhare Earthworks (Pvt) Ltd'), { target: { value: 'Zvavanhu Engineers' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    expect(screen.getByText('Select a provider category')).toBeTruthy()
  })

  it('derives the coarse type and persists category + specialties on submit', () => {
    render(<ProviderRegistration />)
    fireEvent.change(screen.getByPlaceholderText('e.g. DzeNhare Earthworks (Pvt) Ltd'), { target: { value: 'Zvavanhu Engineers' } })
    fireEvent.click(screen.getByRole('button', { name: /Professional Consultants & Technical Engineers/ }))
    continueToStep(2)
    fireEvent.change(screen.getByPlaceholderText('info@company.co.zw'), { target: { value: 'eng@zvavanhu.co.zw' } })
    fireEvent.change(screen.getByPlaceholderText('+263 77 123 4567'), { target: { value: '+263 77 111 2222' } })
    continueToStep(3)
    fireEvent.change(screen.getByPlaceholderText('123 Samora Machel Avenue'), { target: { value: '45 Jason Moyo Ave' } })
    fireEvent.change(screen.getByPlaceholderText('Harare'), { target: { value: 'Harare' } })
    continueToStep(4)
    fireEvent.click(screen.getByRole('button', { name: /Quantity Surveyor & Budget Engineer/ }))
    fireEvent.click(screen.getByRole('button', { name: /MEP Engineer/ }))
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    fireEvent.click(screen.getByRole('button', { name: /Complete Registration/ }))

    const store = useProviderStore.getState()
    expect(store.providers).toHaveLength(1)
    const provider = store.providers[0]
    expect(provider.category).toBe('professional-consultant')
    expect(provider.type).toBe(providerTypeForCategory('professional-consultant'))
    expect(provider.specialties).toEqual(['quantity-surveyor', 'mep-engineer'])
    expect(provider.availability.preferredProjectTypes).toContain('Quantity Surveyor & Budget Engineer')
    expect(screen.getByText('Registration Submitted!')).toBeTruthy()
  })

  it('shows the artisan trade roster for skilled artisan categories', () => {
    render(<ProviderRegistration />)
    fireEvent.change(screen.getByPlaceholderText('e.g. DzeNhare Earthworks (Pvt) Ltd'), { target: { value: 'DzeNhare Trades' } })
    fireEvent.click(screen.getByRole('button', { name: /Skilled Artisans & On-Site Tradespeople/ }))
    continueToStep(2)
    fireEvent.change(screen.getByPlaceholderText('info@company.co.zw'), { target: { value: 'trades@dzenhare.co.zw' } })
    fireEvent.change(screen.getByPlaceholderText('+263 77 123 4567'), { target: { value: '+263 71 333 4444' } })
    continueToStep(3)
    fireEvent.change(screen.getByPlaceholderText('123 Samora Machel Avenue'), { target: { value: '2 First St' } })
    fireEvent.change(screen.getByPlaceholderText('Harare'), { target: { value: 'Bulawayo' } })
    continueToStep(4)
    expect(screen.getByText(/Steel Fixers/)).toBeTruthy()
    expect(screen.getByText(/Certified Electricians/)).toBeTruthy()
    const chips = PROVIDER_SPECIALTIES['skilled-artisan'].map((s) => s.label)
    for (const label of chips) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeTruthy()
    }
  })
})
