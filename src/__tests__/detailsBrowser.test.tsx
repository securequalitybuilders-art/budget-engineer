// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { DetailsBrowser } from '@/components/drawings/DetailsBrowser'
import {
  CONSTRUCTION_DETAILS,
  DETAIL_CATEGORIES,
  getDetailsByCategory,
} from '@/engine/construction/constructionDetails'

describe('DetailsBrowser', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders all 6 category tabs', () => {
    render(<DetailsBrowser />)
    for (const cat of DETAIL_CATEGORIES) {
      const matches = screen.getAllByText(cat.label)
      expect(matches.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('defaults to wall-sections category', () => {
    render(<DetailsBrowser />)
    const wallSections = screen.getAllByText('Wall Sections')
    expect(wallSections.length).toBeGreaterThanOrEqual(2)
    expect(wallSections[0].className).toContain('bg-cyan-600/20')
  })

  it('shows detail list for default category', () => {
    render(<DetailsBrowser />)
    const wallDetails = getDetailsByCategory('wall-sections')
    for (const d of wallDetails) {
      const matches = screen.getAllByText(d.title)
      expect(matches.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('shows selected detail title in preview', () => {
    render(<DetailsBrowser />)
    const first = getDetailsByCategory('wall-sections')[0]
    const matches = screen.getAllByText(first.title)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('shows scale badge in preview', () => {
    render(<DetailsBrowser />)
    const first = getDetailsByCategory('wall-sections')[0]
    const matches = screen.getAllByText(first.scale)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('shows description in preview', () => {
    render(<DetailsBrowser />)
    const first = getDetailsByCategory('wall-sections')[0]
    expect(screen.getByText(first.description)).toBeTruthy()
  })

  it('shows Key Dimensions section', () => {
    render(<DetailsBrowser />)
    expect(screen.getByText('Key Dimensions')).toBeTruthy()
  })

  it('shows dimension labels from selected detail', () => {
    render(<DetailsBrowser />)
    const first = getDetailsByCategory('wall-sections')[0]
    for (const dim of first.dimensions) {
      expect(screen.getByText(dim.label)).toBeTruthy()
    }
  })

  it('shows Construction Notes section', () => {
    render(<DetailsBrowser />)
    expect(screen.getByText('Construction Notes')).toBeTruthy()
  })

  it('shows construction notes from selected detail', () => {
    render(<DetailsBrowser />)
    const first = getDetailsByCategory('wall-sections')[0]
    const matchers = first.constructionNotes.map((note) =>
      screen.getAllByText(note).length,
    )
    expect(matchers.every((m) => m > 0)).toBe(true)
  })

  it('switching category changes detail list', () => {
    render(<DetailsBrowser />)
    const foundationsBtn = screen.getByText('Foundations')
    fireEvent.click(foundationsBtn)

    expect(foundationsBtn.className).toContain('bg-cyan-600/20')

    const foundationDetails = getDetailsByCategory('foundations')
    for (const d of foundationDetails) {
      const matches = screen.getAllByText(d.title)
      expect(matches.length).toBeGreaterThanOrEqual(1)
    }

    const wallDetails = getDetailsByCategory('wall-sections')
    const firstWall = wallDetails[0]
    expect(screen.queryByText(firstWall.title)).toBeNull()
  })

  it('clicking a different detail updates preview', () => {
    render(<DetailsBrowser />)
    const wallDetails = getDetailsByCategory('wall-sections')
    if (wallDetails.length >= 2) {
      const first = wallDetails[0]
      const second = wallDetails[1]

      expect(screen.getByText(first.description)).toBeTruthy()

      const secondBtns = screen.getAllByText(second.title)
      fireEvent.click(secondBtns[0])

      expect(screen.getByText(second.description)).toBeTruthy()
      expect(screen.queryByText(first.description)).toBeNull()
    }
  })

  it('renders all 13 construction details across categories', () => {
    expect(CONSTRUCTION_DETAILS.length).toBe(13)
    render(<DetailsBrowser />)
    const wallCount = getDetailsByCategory('wall-sections').length
    expect(wallCount).toBeGreaterThanOrEqual(3)
  })

  it('shows category count in sidebar heading', () => {
    render(<DetailsBrowser />)
    const wallSections = screen.getAllByText('Wall Sections')
    expect(wallSections.length).toBeGreaterThanOrEqual(2)
  })
})
