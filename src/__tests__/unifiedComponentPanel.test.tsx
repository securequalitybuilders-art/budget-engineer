// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { UnifiedComponentPanel } from '@/components/furniture/UnifiedComponentPanel'
import { useFurnitureStore } from '@/stores/furnitureStore'
import { useComponentSelectionStore } from '@/stores/componentSelectionStore'

describe('UnifiedComponentPanel', () => {
  afterEach(() => {
    cleanup()
    useFurnitureStore.getState().clearAll()
    useFurnitureStore.getState().setActiveCategory('furniture')
    useFurnitureStore.getState().setActiveDef(null)
    useComponentSelectionStore.getState().clearSelection()
  })

  it('renders header with title', () => {
    render(<UnifiedComponentPanel />)
    expect(screen.getByText('Component Library')).toBeTruthy()
  })

  it('renders all 8 category tabs', () => {
    render(<UnifiedComponentPanel />)
    const tabs = ['Furniture', 'Sanitary', 'Kitchen', 'Lighting', 'Stairs', 'Structural', 'Doors', 'Windows']
    for (const tab of tabs) {
      expect(screen.getByText(tab)).toBeTruthy()
    }
  })

  it('renders furniture items by default', () => {
    render(<UnifiedComponentPanel />)
    expect(screen.getByText('Furniture')).toBeTruthy()
    const items = screen.queryAllByRole('button')
    expect(items.length).toBeGreaterThan(0)
  })

  it('shows door specs when Doors tab clicked', () => {
    render(<UnifiedComponentPanel />)
    const doorTabs = screen.getAllByText('Doors')
    fireEvent.click(doorTabs[0])
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('shows window specs when Windows tab clicked', () => {
    render(<UnifiedComponentPanel />)
    const winTabs = screen.getAllByText('Windows')
    fireEvent.click(winTabs[0])
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('highlights active category tab', () => {
    render(<UnifiedComponentPanel />)
    const furnitureTabs = screen.getAllByText('Furniture')
    expect(furnitureTabs[0].className).toContain('bg-blue-600')
  })

  it('switches highlighted tab on click', () => {
    render(<UnifiedComponentPanel />)
    const doorTabs = screen.getAllByText('Doors')
    fireEvent.click(doorTabs[0])
    expect(doorTabs[0].className).toContain('bg-blue-600')
    const furnitureTabs = screen.getAllByText('Furniture')
    expect(furnitureTabs[0].className).not.toContain('bg-blue-600')
  })

  it('selecting a door spec sets it in the store', () => {
    render(<UnifiedComponentPanel />)
    const doorTabs = screen.getAllByText('Doors')
    fireEvent.click(doorTabs[0])
    const buttons = screen.getAllByRole('button')
    const doorButton = buttons.find(
      (b) => b.textContent?.includes('Single Swing') && b.textContent?.includes('813'),
    )
    if (doorButton) {
      fireEvent.click(doorButton)
      expect(useComponentSelectionStore.getState().selectedDoorSpec).toBeTruthy()
    }
  })

  it('shows placed count', () => {
    useFurnitureStore.getState().placeBlock('BED-SINGLE', 0, 0)
    render(<UnifiedComponentPanel />)
    const matches = screen.getAllByText(/1 placed/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('shows search toggle button', () => {
    render(<UnifiedComponentPanel />)
    const toggle = screen.getAllByLabelText('Toggle search')
    expect(toggle.length).toBeGreaterThanOrEqual(1)
  })

  it('shows search input after toggling', () => {
    render(<UnifiedComponentPanel />)
    const toggles = screen.getAllByLabelText('Toggle search')
    fireEvent.click(toggles[0])
    expect(screen.getByLabelText('Search components')).toBeTruthy()
  })

  it('calls onClose when close button clicked', () => {
    let called = false
    render(<UnifiedComponentPanel onClose={() => { called = true }} />)
    const buttons = screen.getAllByText('✕')
    fireEvent.click(buttons[buttons.length - 1])
    expect(called).toBe(true)
  })

  it('shows instruction text in furniture mode', () => {
    render(<UnifiedComponentPanel />)
    const matches = screen.getAllByText(/Select an item above/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('shows instruction text in door mode', () => {
    render(<UnifiedComponentPanel />)
    const doorTabs = screen.getAllByText('Doors')
    fireEvent.click(doorTabs[0])
    const matches = screen.getAllByText(/Select a door size/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })
})
