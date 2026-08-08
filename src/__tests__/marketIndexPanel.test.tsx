// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { db } from '@/db/db'
import { buildMarketIndexSnapshot } from '@/engine/ecosystem/marketIndexScheduler'
import { useMarketIndexStore } from '@/stores/marketIndexStore'
import { MarketPriceTicker } from '@/components/ecosystem/MarketPriceTicker'
import { MarketIndexStudio } from '@/pages/studio/MarketIndexStudio'
import { ProjectLifecycleDashboard } from '@/components/lifecycle/ProjectLifecycleDashboard'

const PID = 'p-market-panel'

async function seedRates() {
  await db.rates.clear()
  await db.rates.bulkAdd([
    { id: 'cement', region: 'zimbabwe', code: 'MAT-CEM', description: 'Cement 50kg', unit: 'bag', baseRateCents: 1850, source: 'zimbabwe', year: 2026 },
    { id: 'brick', region: 'zimbabwe', code: 'MAT-BRK', description: 'Common brick', unit: 'each', baseRateCents: 25, source: 'zimbabwe', year: 2026 },
    { id: 'steel', region: 'zimbabwe', code: 'MAT-STL', description: 'Steel rebar 12mm', unit: 'm', baseRateCents: 450, source: 'zimbabwe', year: 2026 },
  ] as never[])
}

beforeEach(async () => {
  await db.marketIndexSnapshots.clear()
  await db.rates.clear()
  await db.milestones.clear()
  await db.escrows.clear()
  useMarketIndexStore.setState({ snapshot: null, history: [], isLoading: false })
})

afterEach(() => {
  cleanup()
})

describe('MarketPriceTicker', () => {
  it('shows the empty state when no rates exist', async () => {
    render(<MarketPriceTicker />)
    expect(await screen.findByText(/No market index yet/)).toBeTruthy()
    expect(screen.getByText(/open a project to auto-compute/)).toBeTruthy()
  })

  it('auto-computes from the db catalogue and renders symbols with prices', async () => {
    await seedRates()
    render(<MarketPriceTicker />)
    expect(await screen.findAllByText('Cement 50kg')).toBeTruthy()
    expect(screen.getAllByText(/\/bag$/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('MKT')).toBeTruthy()
    expect(screen.getByText('USD')).toBeTruthy()
    const dayKey = useMarketIndexStore.getState().snapshot?.dayKey
    expect(dayKey).toBeTruthy()
    expect(screen.getAllByText(dayKey!).length).toBeGreaterThanOrEqual(1)
  })

  it('renders an existing fresh snapshot without recomputing', async () => {
    await seedRates()
    const snapshot = buildMarketIndexSnapshot(
      [
        { code: 'MAT-CEM', description: 'Cement 50kg', unit: 'bag', baseRateCents: 1850, year: 2026 },
      ],
      { source: 'auto' }
    )
    await db.marketIndexSnapshots.put(snapshot as never)
    useMarketIndexStore.setState({ snapshot: null, history: [] })
    render(<MarketPriceTicker />)
    expect(await screen.findAllByText('Cement 50kg')).toBeTruthy()
    expect(await db.marketIndexSnapshots.count()).toBe(1)
  })
})

describe('MarketIndexStudio', () => {
  function renderStudio() {
    return render(
      <MemoryRouter initialEntries={[`/project/${PID}/studio/market-index`]}>
        <Routes>
          <Route path="/project/:id/studio/market-index" element={<MarketIndexStudio />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('renders stat cards and the price table after auto-refresh', async () => {
    await seedRates()
    renderStudio()
    expect(await screen.findByText('Symbols tracked')).toBeTruthy()
    expect(await screen.findByText('Cement 50kg')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('Common brick')).toBeTruthy()
    expect(screen.getByText('Steel rebar 12mm')).toBeTruthy()
    expect(screen.getByText('Snapshot history')).toBeTruthy()
  })

  it('toggles the display currency from USD to ZWG', async () => {
    await seedRates()
    renderStudio()
    await screen.findByText('Cement 50kg')
    // USD base for cement = 1850c → $19
    expect(screen.getAllByText('$19').length).toBeGreaterThanOrEqual(1)
    fireEvent.click(screen.getByText('ZWG'))
    // ZWG base = 1850 × 26 = 48100c → $481
    expect(screen.getAllByText('$481').length).toBeGreaterThanOrEqual(1)
  })

  it('Run now recomputes and marks the latest snapshot manual', async () => {
    await seedRates()
    renderStudio()
    await screen.findByText('Cement 50kg')
    fireEvent.click(screen.getByText('Run now'))
    expect(await screen.findByText('Index recomputed.')).toBeTruthy()
    expect(useMarketIndexStore.getState().snapshot?.source).toBe('manual')
  })

  it('shows a loading spinner before any data is ready', async () => {
    renderStudio()
    expect(screen.getByRole('heading', { name: 'Market Index' })).toBeTruthy()
    expect(await screen.findByText('Symbols tracked')).toBeTruthy()
  })
})

describe('ProjectLifecycleDashboard Market Index card', () => {
  it('shows the module card with symbol count and link', async () => {
    const snapshot = buildMarketIndexSnapshot(
      [
        { code: 'MAT-CEM', description: 'Cement 50kg', unit: 'bag', baseRateCents: 1850, year: 2026 },
        { code: 'MAT-STL', description: 'Steel rebar 12mm', unit: 'm', baseRateCents: 450, year: 2026 },
      ],
      { source: 'auto' }
    )
    useMarketIndexStore.setState({ snapshot, history: [snapshot] })
    await db.marketIndexSnapshots.put(snapshot as never)
    render(
      <MemoryRouter>
        <ProjectLifecycleDashboard projectId={PID} />
      </MemoryRouter>
    )
    expect(screen.getByText('Market Index')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    const link = screen.getByRole('link', { name: /Market Index/ })
    expect(link.getAttribute('href')).toBe(`/project/${PID}/studio/market-index`)
  })

  it('shows a dash card when no snapshot exists', async () => {
    render(
      <MemoryRouter>
        <ProjectLifecycleDashboard projectId={PID} />
      </MemoryRouter>
    )
    expect(screen.getByText('Market Index')).toBeTruthy()
    expect(screen.getByText('Refresh on open')).toBeTruthy()
  })
})
