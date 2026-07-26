// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import {
  generateDefaultRegister,
  sheetByView,
  sheetsByDiscipline,
  sheetsByStatus,
  updateSheetRevision,
  nextRev,
  DEFAULT_DRAWING_TYPES,
} from '@/lib/drawings/drawing-register'
import { DrawingRegisterPanel } from '@/components/drawings/DrawingRegisterPanel'
import { useDrawingRegisterStore, getFilteredSheets } from '@/stores/drawingRegisterStore'

describe('drawing-register utilities', () => {
  it('nextRev increments A→B', () => {
    expect(nextRev('A')).toBe('B')
  })

  it('nextRev increments C→D', () => {
    expect(nextRev('C')).toBe('D')
  })

  it('nextRev wraps Z→ZA', () => {
    expect(nextRev('Z')).toBe('ZA')
  })

  it('generateDefaultRegister creates correct count for 1 floor', () => {
    const reg = generateDefaultRegister({ floorCount: 1 })
    const nonPerFloor = DEFAULT_DRAWING_TYPES.filter((d) => !d.perFloor).length
    const perFloor = DEFAULT_DRAWING_TYPES.filter((d) => d.perFloor).length
    expect(reg.length).toBe(nonPerFloor + perFloor * 1)
  })

  it('generateDefaultRegister creates correct count for 3 floors', () => {
    const reg = generateDefaultRegister({ floorCount: 3 })
    const nonPerFloor = DEFAULT_DRAWING_TYPES.filter((d) => !d.perFloor).length
    const perFloor = DEFAULT_DRAWING_TYPES.filter((d) => d.perFloor).length
    expect(reg.length).toBe(nonPerFloor + perFloor * 3)
  })

  it('generateDefaultRegister includes floor names', () => {
    const reg = generateDefaultRegister({ floorCount: 2, floorNames: ['Ground', 'First'] })
    const floorPlanSheets = reg.filter((s) => s.viewId === 'plan')
    expect(floorPlanSheets).toHaveLength(2)
    expect(floorPlanSheets[0].title).toContain('Ground')
    expect(floorPlanSheets[1].title).toContain('First')
  })

  it('generateDefaultRegister generates unique sheet numbers', () => {
    const reg = generateDefaultRegister({ floorCount: 2 })
    const numbers = reg.map((s) => s.sheetNumber)
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it('generateDefaultRegister starts all sheets as pending', () => {
    const reg = generateDefaultRegister({ floorCount: 1 })
    expect(reg.every((s) => s.status === 'pending')).toBe(true)
  })

  it('generateDefaultRegister uses custom revision', () => {
    const reg = generateDefaultRegister({ floorCount: 1, revision: 'C' })
    expect(reg.every((s) => s.revision === 'C')).toBe(true)
  })

  it('sheetByView finds correct sheet', () => {
    const reg = generateDefaultRegister({ floorCount: 2 })
    const sheet = sheetByView(reg, 'plan', 0)
    expect(sheet).toBeDefined()
    expect(sheet!.viewId).toBe('plan')
    expect(sheet!.floorIndex).toBe(0)
  })

  it('sheetByView returns undefined for non-existent viewId', () => {
    const reg = generateDefaultRegister({ floorCount: 1 })
    expect(sheetByView(reg, 'xxx' as any)).toBeUndefined()
  })

  it('sheetsByDiscipline filters correctly', () => {
    const reg = generateDefaultRegister({ floorCount: 1 })
    const arch = sheetsByDiscipline(reg, 'A')
    expect(arch.length).toBeGreaterThan(0)
    expect(arch.every((s) => s.discipline === 'A')).toBe(true)
  })

  it('sheetsByStatus filters by status', () => {
    const reg = generateDefaultRegister({ floorCount: 1 })
    const pending = sheetsByStatus(reg, 'pending')
    expect(pending.length).toBe(reg.length)
    const generated = sheetsByStatus(reg, 'generated')
    expect(generated).toHaveLength(0)
  })

  it('updateSheetRevision increments revision', () => {
    const reg = generateDefaultRegister({ floorCount: 1 })
    const sheet = reg[0]
    const updated = updateSheetRevision(sheet, 'B', 'Updated per review')
    expect(updated.revision).toBe('B')
    expect(updated.revisions).toHaveLength(2)
    expect(updated.revisions[1].note).toBe('Updated per review')
  })
})

describe('drawingRegisterStore', () => {
  beforeEach(() => {
    useDrawingRegisterStore.setState({ sheets: [], activeSheetId: null })
  })

  it('initialize sets sheets', () => {
    useDrawingRegisterStore.getState().initialize({ floorCount: 2 })
    expect(useDrawingRegisterStore.getState().sheets.length).toBeGreaterThan(0)
  })

  it('setSheetStatus updates status', () => {
    useDrawingRegisterStore.getState().initialize({ floorCount: 1 })
    const sheet = useDrawingRegisterStore.getState().sheets[0]
    useDrawingRegisterStore.getState().setSheetStatus(sheet.id, 'generated')
    const updated = useDrawingRegisterStore.getState().sheets.find((s) => s.id === sheet.id)
    expect(updated?.status).toBe('generated')
  })

  it('setActiveSheet updates activeSheetId', () => {
    useDrawingRegisterStore.getState().setActiveSheet('test-id')
    expect(useDrawingRegisterStore.getState().activeSheetId).toBe('test-id')
  })

  it('updateRevision adds revision entry', () => {
    useDrawingRegisterStore.getState().initialize({ floorCount: 1 })
    const sheet = useDrawingRegisterStore.getState().sheets[0]
    useDrawingRegisterStore.getState().updateRevision(sheet.id, 'C')
    const updated = useDrawingRegisterStore.getState().sheets.find((s) => s.id === sheet.id)
    expect(updated?.revision).toBe('C')
  })

  it('markGenerated updates status', () => {
    useDrawingRegisterStore.getState().initialize({ floorCount: 2 })
    useDrawingRegisterStore.getState().markGenerated('plan', 0)
    const sheet = useDrawingRegisterStore.getState().sheets.find(
      (s) => s.viewId === 'plan' && s.floorIndex === 0
    )
    expect(sheet?.status).toBe('generated')
  })

  it('clearAll resets state', () => {
    useDrawingRegisterStore.getState().initialize({ floorCount: 1 })
    useDrawingRegisterStore.getState().setActiveSheet('x')
    useDrawingRegisterStore.getState().clearAll()
    expect(useDrawingRegisterStore.getState().sheets).toHaveLength(0)
    expect(useDrawingRegisterStore.getState().activeSheetId).toBeNull()
  })

  it('getFilteredSheets filters by discipline', () => {
    useDrawingRegisterStore.getState().initialize({ floorCount: 1 })
    const sheets = useDrawingRegisterStore.getState().sheets
    const filtered = getFilteredSheets(sheets, { discipline: 'A', status: 'ALL' })
    expect(filtered.every((s) => s.discipline === 'A')).toBe(true)
  })

  it('getFilteredSheets filters by status', () => {
    useDrawingRegisterStore.getState().initialize({ floorCount: 1 })
    const allSheets = useDrawingRegisterStore.getState().sheets
    useDrawingRegisterStore.getState().setSheetStatus(allSheets[0].id, 'generated')
    const updated = useDrawingRegisterStore.getState().sheets
    const filtered = getFilteredSheets(updated, { discipline: 'ALL', status: 'generated' })
    expect(filtered.every((s) => s.status === 'generated')).toBe(true)
    expect(filtered.length).toBe(1)
  })
})

describe('DrawingRegisterPanel', () => {
  beforeEach(cleanup)

  const mockSheets = [
    {
      id: 's1',
      sheetNumber: 'A-101',
      title: 'Floor Plan — Ground',
      discipline: 'A' as const,
      disciplineLabel: 'Architectural',
      scale: '1:100',
      sheetSize: 'A4' as const,
      revision: 'A',
      revisions: [],
      status: 'generated' as const,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      viewId: 'plan' as const,
      floorIndex: 0,
    },
    {
      id: 's2',
      sheetNumber: 'A-201',
      title: 'Site Plan',
      discipline: 'A' as const,
      disciplineLabel: 'Architectural',
      scale: '1:200',
      sheetSize: 'A4' as const,
      revision: 'A',
      revisions: [],
      status: 'pending' as const,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      viewId: 'site-plan' as const,
    },
    {
      id: 's3',
      sheetNumber: 'E-101',
      title: 'Electrical Plan',
      discipline: 'E' as const,
      disciplineLabel: 'Electrical',
      scale: '1:100',
      sheetSize: 'A4' as const,
      revision: 'A',
      revisions: [],
      status: 'error' as const,
      errorMessage: 'Generation failed',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      viewId: 'electrical' as const,
    },
  ]

  it('renders all sheet numbers', () => {
    render(<DrawingRegisterPanel sheets={mockSheets} activeSheetId={null} onSelectSheet={() => {}} />)
    expect(screen.getByText('A-101')).toBeTruthy()
    expect(screen.getByText('A-201')).toBeTruthy()
    expect(screen.getByText('E-101')).toBeTruthy()
  })

  it('renders sheet titles', () => {
    render(<DrawingRegisterPanel sheets={mockSheets} activeSheetId={null} onSelectSheet={() => {}} />)
    expect(screen.getByText('Floor Plan — Ground')).toBeTruthy()
    expect(screen.getByText('Site Plan')).toBeTruthy()
  })

  it('shows status badges', () => {
    render(<DrawingRegisterPanel sheets={mockSheets} activeSheetId={null} onSelectSheet={() => {}} />)
    expect(screen.getAllByText('Generated').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Error').length).toBeGreaterThanOrEqual(1)
  })

  it('shows total and generated counts', () => {
    render(<DrawingRegisterPanel sheets={mockSheets} activeSheetId={null} onSelectSheet={() => {}} />)
    expect(screen.getByText(/3 total/)).toBeTruthy()
    expect(screen.getByText(/1 generated/)).toBeTruthy()
  })

  it('calls onSelectSheet when row clicked', () => {
    const onSelect = vi.fn()
    render(<DrawingRegisterPanel sheets={mockSheets} activeSheetId={null} onSelectSheet={onSelect} />)
    const rows = document.querySelectorAll('tbody tr')
    expect(rows.length).toBe(3)
    fireEvent.click(rows[0])
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('s1')
  })

  it('filters by discipline', () => {
    render(<DrawingRegisterPanel sheets={mockSheets} activeSheetId={null} onSelectSheet={() => {}} />)
    expect(screen.getByText('A-101')).toBeTruthy()
    fireEvent.click(screen.getByTestId('disc-filter-E'))
    expect(screen.queryByText('A-101')).toBeNull()
    expect(screen.getByText('E-101')).toBeTruthy()
  })

  it('filters by status', () => {
    render(<DrawingRegisterPanel sheets={mockSheets} activeSheetId={null} onSelectSheet={() => {}} />)
    fireEvent.click(screen.getByTestId('status-filter-error'))
    expect(screen.queryByText('A-101')).toBeNull()
    expect(screen.getByText('E-101')).toBeTruthy()
  })

  it('shows empty state when no sheets match filter', () => {
    render(<DrawingRegisterPanel sheets={[]} activeSheetId={null} onSelectSheet={() => {}} />)
    expect(screen.getByText(/No drawings match/)).toBeTruthy()
  })

  it('shows error banner when sheets have errors', () => {
    render(<DrawingRegisterPanel sheets={mockSheets} activeSheetId={null} onSelectSheet={() => {}} />)
    expect(screen.getByText(/encountered an error/)).toBeTruthy()
  })

  it('shows discipline badges', () => {
    render(<DrawingRegisterPanel sheets={mockSheets} activeSheetId={null} onSelectSheet={() => {}} />)
    const badges = screen.getAllByText('A').filter(
      (el) => el.className.includes('uppercase')
    )
    expect(badges.length).toBe(2)
    expect(screen.getByText('E')).toBeTruthy()
  })
})
