// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import {
  PageEnter,
  DzCard,
  DzPill,
  Money,
  Kicker,
  BentoGrid,
  EscrowVaultCard,
  RedPenMarker,
  GreenFlagBadge,
  DigitalTwinTimeline,
  MarketPriceTicker,
  DataTable,
  FormField,
  ContractorMatchCard,
  MaterialsTransparencyPanel,
  ContingencySpendDownCard,
  MilestoneProgressCard,
  BorderBeamCard,
  DzSkeleton,
  ToggleSwitch,
} from '@/components/dzenhare'

afterEach(cleanup)

describe('primitives', () => {
  it('PageEnter renders children', () => {
    render(<PageEnter><p>hello</p></PageEnter>)
    expect(screen.getByText('hello')).toBeTruthy()
  })

  it('DzCard applies hover lift when requested', () => {
    const { container } = render(<DzCard hover>card</DzCard>)
    const node = container.firstChild as HTMLElement
    expect(node.className).toContain('shadow-card')
    expect(node.className).toContain('hover:-translate-y-0.5')
  })

  it('Money formats cents in monospace tabular digits', () => {
    render(<Money cents={1_250_000} />)
    expect(screen.getByText('$12,500')).toBeTruthy()
    expect(screen.getByText('$12,500').className).toContain('font-mono')
  })

  it('Kicker renders an uppercase SteelBlue label', () => {
    render(<Kicker>Funds secured</Kicker>)
    const k = screen.getByText('Funds secured')
    expect(k.className).toContain('text-steelBlue')
    expect(k.className).toContain('uppercase')
  })

  it('DzPill applies the verified gold tone', () => {
    render(<DzPill tone="verified">Verified</DzPill>)
    expect(screen.getByText('Verified').className).toContain('text-gold')
  })
})

describe('BentoGrid', () => {
  it('renders all bento items with titles + content', () => {
    render(<BentoGrid items={[
      { id: 'a', title: 'Alpha', content: <p>alpha body</p>, className: 'md:col-span-2' },
      { id: 'b', title: 'Beta', content: <p>beta body</p> },
      { id: 'c', title: 'Gamma', content: <p>gamma body</p> },
    ]} />)
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('beta body')).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 3 }).length).toBe(3)
  })

  it('first large item carries the col-span-2 class', () => {
    const { container } = render(<BentoGrid items={[{ id: 'a', title: 'A', content: null, className: 'md:col-span-2' }]} />)
    expect(container.querySelector('[class*="md:col-span-2"]')).toBeTruthy()
  })
})

describe('EscrowVaultCard', () => {
  it('shows the secured amount and pending pulse', () => {
    const { container } = render(<EscrowVaultCard securedCents={1_400_000} status="pending" />)
    expect(screen.getByText('$14,000')).toBeTruthy()
    expect(container.querySelector('[data-vault-status="pending"]')).toBeTruthy()
    expect(container.querySelector('.animate-pulse-border')).toBeTruthy()
  })

  it('disputed status swaps to orange border + pill', () => {
    const { container } = render(<EscrowVaultCard securedCents={500_000} status="disputed" />)
    expect(container.querySelector('[data-vault-status="disputed"]')).toBeTruthy()
    expect(screen.getByText('disputed')).toBeTruthy()
    expect(container.querySelector('[class*="border-safetyOrange"]')).toBeTruthy()
  })

  it('released status shows the green pill', () => {
    render(<EscrowVaultCard securedCents={0} status="released" />)
    expect(screen.getByText('Funds released')).toBeTruthy()
  })
})

describe('RedPenMarker', () => {
  it('renders the strikethrough line and forensic tooltip with original → revised', () => {
    render(
      <RedPenMarker original="$60/m²" revised="$48/m²" reason="Below ZIQS market band" rule="ZIQS SMM · clause 8.2">
        Tile laying
      </RedPenMarker>,
    )
    expect(screen.getByText('Tile laying')).toBeTruthy()
    expect(screen.getByTestId('red-pen-forensic').textContent).toContain('$60/m²')
    expect(screen.getByTestId('red-pen-forensic').textContent).toContain('$48/m²')
    expect(screen.getByTestId('red-pen-forensic').textContent).toContain('ZIQS SMM')
  })

  it('renders the forensic math variance line in safety-orange monospace', () => {
    render(
      <RedPenMarker original="$3,200" revised="$4,700" reason="Unit rate above ZIQS band" variance="+180 bags ($1,800 leakage)">
        Cement
      </RedPenMarker>,
    )
    const tooltip = screen.getByTestId('red-pen-forensic')
    const variance = [...tooltip.querySelectorAll('p')].find((p) => p.textContent?.includes('leakage'))
    expect(variance?.textContent).toContain('▲ +180 bags ($1,800 leakage)')
    expect(variance?.className).toContain('text-safetyOrange')
    expect(variance?.className).toContain('font-mono')
  })
})

describe('GreenFlagBadge', () => {
  it('shows the verified name and expands credential detail', () => {
    render(<GreenFlagBadge name="Willdale Ltd" verified={['ZIMRA standing', 'NSSA clearance']} />)
    expect(screen.getByText('Willdale Ltd')).toBeTruthy()
    const detail = screen.getByTestId('green-flag-detail')
    expect(detail.textContent).toContain('ZIMRA standing')
    expect(detail.textContent).toContain('NSSA clearance')
  })
})

describe('DigitalTwinTimeline', () => {
  it('marks active as in-progress, done as strikethrough, upcoming as dashed', () => {
    render(<DigitalTwinTimeline milestones={[
      { id: 'm1', title: 'Ground slab', status: 'done', date: '2 Jul' },
      { id: 'm2', title: 'Masonry walls', status: 'active', date: '12 Jul', note: 'Coursing underway' },
      { id: 'm3', title: 'Roof structure', status: 'upcoming' },
    ]} />)
    expect(screen.getByText('Ground slab').className).toContain('line-through')
    expect(screen.getByText('In progress')).toBeTruthy()
    expect(screen.getByText('Coursing underway')).toBeTruthy()
    expect(screen.getByText('Roof structure')).toBeTruthy()
  })
})

describe('MarketPriceTicker', () => {
  it('renders symbol, price and directional change', () => {
    render(<MarketPriceTicker currency="USD" dayKey="2026-08-09" items={[
      { symbol: 'CEM', label: 'Cement 50kg', unit: 'bag', currentCents: 2_100_00, changePct: 3.2 },
      { symbol: 'RBR', label: 'Reinforcing bar 12mm', unit: 'm', currentCents: 45_00, changePct: -1.4 },
    ]} />)
    expect(screen.getAllByText('Cement 50kg').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/\/bag/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('3.2%').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1.4%').length).toBeGreaterThan(0)
  })

  it('shows empty state when no items', () => {
    render(<MarketPriceTicker items={[]} />)
    expect(screen.getByText(/No market index yet/)).toBeTruthy()
  })
})

describe('DataTable', () => {
  interface Row { id: string; item: string; cents: number; variance: number }
  const rows: Row[] = [
    { id: '1', item: 'Cement', cents: 210_000, variance: -2.5 },
    { id: '2', item: 'Rebar', cents: 450_000, variance: 3.1 },
    { id: '3', item: 'Steel sheeting', cents: 890_000, variance: 6.4 },
  ]
  it('renders sticky header + variance badges coloured by threshold', () => {
    render(<DataTable<Row>
      rowKey={(r) => r.id}
      columns={[
        { key: 'item', header: 'Item' },
        { key: 'cents', header: 'Total', align: 'right', render: (r) => <Money cents={r.cents} /> },
        { key: 'variance', header: 'vs budget', variance: (r) => r.variance },
      ]}
      rows={rows}
    />)
    expect(screen.getByText('Item')).toBeTruthy()
    expect(screen.getByText('$4,500')).toBeTruthy()
    expect(screen.getByText('▼ 2.5%').className).toContain('text-emerald-400')
    expect(screen.getByText('▲ 3.1%').className).toContain('text-amber-400')
    expect(screen.getByText('▲ 6.4%').className).toContain('text-safetyOrange')
  })

  it('opens the row-actions menu, dispatches onClick, and closes on Escape', () => {
    const onEdit = vi.fn()
    const onDispute = vi.fn()
    render(<DataTable<Row>
      rowKey={(r) => r.id}
      columns={[{ key: 'item', header: 'Item' }]}
      rows={rows}
      actions={[
        { key: 'edit', onClick: onEdit },
        { key: 'view', onClick: vi.fn() },
        { key: 'history', onClick: vi.fn() },
        { key: 'dispute', danger: true, onClick: onDispute },
      ]}
    />)
    expect(screen.queryByRole('menu')).toBeNull()
    fireEvent.click(screen.getByLabelText('Row actions for 3'))
    expect(screen.getByRole('menu')).toBeTruthy()
    expect(screen.getAllByRole('menuitem').length).toBe(4)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()

    fireEvent.click(screen.getByLabelText('Row actions for 2'))
    fireEvent.click(screen.getByText('Edit'))
    expect(onEdit).toHaveBeenCalledWith('2')
    fireEvent.click(screen.getByLabelText('Row actions for 1'))
    fireEvent.click(screen.getByText('Dispute'))
    expect(onDispute).toHaveBeenCalledWith('1')
  })
})

describe('FormField', () => {
  it('renders label, suffix, and AI suggestion', () => {
    render(<FormField id="gfa" label="Gross floor area" suffix="m²" suggestion="Typical for this typology: 180–240 m²" />)
    expect(screen.getByText('Gross floor area')).toBeTruthy()
    expect(screen.getByText('m²')).toBeTruthy()
    expect(screen.getByText(/Typical for this typology/)).toBeTruthy()
  })

  it('shows error state and marks input invalid', () => {
    render(<FormField id="budget" label="Budget" error="Cannot exceed RTP cap" />)
    const input = screen.getByLabelText('Budget') as HTMLInputElement
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Cannot exceed RTP cap')).toBeTruthy()
  })
})

describe('ContractorMatchCard', () => {
  it('renders UNICORN header, metrics and fires invite', () => {
    const onInvite = vi.fn()
    render(<ContractorMatchCard
      name="Kudakwashe Chirinda"
      category="General Building Contractor"
      rating={4.9}
      reviews={37}
      metrics={[
        { key: 'loc', icon: 'location', label: 'Distance', value: '6 km' },
        { key: 'port', icon: 'portfolio', label: 'Projects', value: '14' },
      ]}
      onInvite={onInvite}
    />)
    expect(screen.getByText('Kudakwashe Chirinda')).toBeTruthy()
    expect(screen.getByText(/Unicorn Verified/)).toBeTruthy()
    expect(screen.getByText('6 km')).toBeTruthy()
    fireEvent.click(screen.getByText('Invite to bid'))
    expect(onInvite).toHaveBeenCalledTimes(1)
  })

  it('renders the WIPAA Score row and spec action buttons when handlers are passed', () => {
    const onApprove = vi.fn()
    const onViewProjects = vi.fn()
    const onAlternatives = vi.fn()
    render(<ContractorMatchCard
      name="Kudakwashe Chirinda"
      category="General Building Contractor"
      rating={4.9}
      reviews={37}
      metrics={[{ key: 'loc', icon: 'location', label: 'Distance', value: '6 km' }]}
      wipaaScore={94}
      onApprove={onApprove}
      onViewProjects={onViewProjects}
      onAlternatives={onAlternatives}
    />)
    expect(screen.getByText('WIPAA Score')).toBeTruthy()
    const pill = screen.getByText('94%')
    expect(pill.className).toContain('text-emerald-400')
    expect(screen.getByText('True profitability')).toBeTruthy()
    expect(screen.getByText('Approve Kudakwashe')).toBeTruthy()
    expect(screen.getByText('View past projects')).toBeTruthy()
    expect(screen.getByText('2 alternatives')).toBeTruthy()
    expect(screen.queryByText('Invite to bid')).toBeNull()
    fireEvent.click(screen.getByText('Approve Kudakwashe'))
    fireEvent.click(screen.getByText('View past projects'))
    fireEvent.click(screen.getByText('2 alternatives'))
    expect(onApprove).toHaveBeenCalledTimes(1)
    expect(onViewProjects).toHaveBeenCalledTimes(1)
    expect(onAlternatives).toHaveBeenCalledTimes(1)
  })

  it('tones the WIPAA pill amber below the 75 threshold', () => {
    render(<ContractorMatchCard
      name="Tariro Moyo"
      category="Civil contractor"
      rating={4.2}
      reviews={12}
      metrics={[]}
      wipaaScore={61}
    />)
    expect(screen.getByText('61%').className).toContain('text-amber-400')
  })
})

describe('MaterialsTransparencyPanel', () => {
  it('shows lines, secured total, locked note and track CTA', () => {
    const onTrack = vi.fn()
    render(<MaterialsTransparencyPanel
      lockedUntil="15 Jul 2026"
      totalCents={1_350_000}
      materials={[
        { id: 'w', name: 'Willdale bricks', supplier: 'Willdale Ltd', qty: '8,400', totalCents: 420_000 },
        { id: 'c', name: 'Cement', supplier: 'PPC', qty: '120 bags', totalCents: 252_000 },
      ]}
      onTrack={onTrack}
    />)
    expect(screen.getByText('Willdale bricks')).toBeTruthy()
    expect(screen.getByText('$4,200')).toBeTruthy()
    expect(screen.getByText(/Locked until 15 Jul 2026/)).toBeTruthy()
    fireEvent.click(screen.getByText('Track deliveries'))
    expect(onTrack).toHaveBeenCalledTimes(1)
  })
})

describe('ContingencySpendDownCard', () => {
  it('renders source badges and select/refund handlers', () => {
    const onSelect = vi.fn()
    const onRefund = vi.fn()
    render(<ContingencySpendDownCard
      remainingCents={500_000}
      onSelect={onSelect}
      onRefund={onRefund}
      options={[
        { id: 'o1', label: 'Solar geyser upgrade', amountCents: 180_000, source: 'ai', blurb: 'Saves ~$40/mo on power' },
        { id: 'o2', label: 'Garage floor epoxy', amountCents: 120_000, source: 'owner', blurb: 'Finishing upgrade' },
      ]}
    />)
    expect(screen.getByText('Solar geyser upgrade')).toBeTruthy()
    expect(screen.getByText(/AI-suggested/)).toBeTruthy()
    expect(screen.getByText(/Tafadzwa's pick/)).toBeTruthy()
    fireEvent.click(screen.getAllByText('Select option')[0])
    expect(onSelect).toHaveBeenCalledWith('o1')
    fireEvent.click(screen.getAllByText('Refund')[0])
    expect(onRefund).toHaveBeenCalledTimes(1)
  })
})

describe('MilestoneProgressCard', () => {
  it('renders progress, hold amount, approval banner and approve action', () => {
    const onApprove = vi.fn()
    render(<MilestoneProgressCard
      progressPct={35}
      milestoneLabel="Masonry stage"
      photoCount={3}
      nextDelivery="2 Aug"
      holdCents={1_400_000}
      onReview={() => {}}
      onApprove={onApprove}
    />)
    expect(screen.getByText('Masonry stage')).toBeTruthy()
    expect(screen.getByText('35%')).toBeTruthy()
    expect(screen.getByText('$14,000')).toBeTruthy()
    expect(screen.getAllByText(/Ready for your approval/).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByText('Approve & release'))
    expect(onApprove).toHaveBeenCalledTimes(1)
  })

  it('shows the approved pill and hides actions when approved', () => {
    render(<MilestoneProgressCard progressPct={100} milestoneLabel="Done" holdCents={0} approved />)
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0)
    expect(screen.queryByText('Approve & release')).toBeNull()
  })
})

describe('BorderBeamCard', () => {
  it('renders premium fortress package with beam class', () => {
    const { container } = render(
      <BorderBeamCard badge="Premium" title="Guardian Fortress" description="Everything in Red Pen, plus escrow.">
        <p>included</p>
      </BorderBeamCard>,
    )
    expect(screen.getByText('Guardian Fortress')).toBeTruthy()
    expect(container.querySelector('.border-beam')).toBeTruthy()
    expect(screen.getByText('included')).toBeTruthy()
  })
})

describe('Skeleton', () => {
  it('renders a shimmer block', () => {
    render(<DzSkeleton className="h-8 w-32" />)
    expect(document.querySelector('.shimmer')).toBeTruthy()
  })
})

describe('ToggleSwitch', () => {
  it('is a role=switch that toggles aria-checked on click', () => {
    const onChange = vi.fn()
    render(<ToggleSwitch checked={false} onChange={onChange} label="Show verified only" />)
    const sw = screen.getByRole('switch')
    expect(sw.getAttribute('aria-label')).toBe('Show verified only')
    expect(sw.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(sw)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('renders the elastic-bounce knob transition and forest track when checked', () => {
    const { container } = render(<ToggleSwitch checked onChange={() => {}} label="Enable escrow" />)
    const sw = container.querySelector('[role="switch"]') as HTMLElement
    expect(sw.className).toContain('bg-forest')
    const knob = container.querySelector('span') as HTMLElement
    expect(knob.style.transition).toContain('cubic-bezier(0.34, 1.56, 0.64, 1)')
    expect(knob.style.transform).toBe('translateX(20px)')
  })
})
