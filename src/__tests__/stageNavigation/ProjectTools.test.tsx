// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

import { TransactionPanel } from '@/components/layout/TransactionPanel'
import { GovernancePanel } from '@/components/dashboard/GovernancePanel'
import { SnapshotHistoryPanel } from '@/components/dashboard/SnapshotHistoryPanel'
import { PropertiesPanel } from '@/components/layout/PropertiesPanel'

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: vi.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      currentBrief: { rawText: 'test', parsed: null },
      transactions: [],
      currentProject: null,
    }
    return selector ? selector(state) : state
  }),
}))

describe('Project Tools panels', () => {
  it('TransactionPanel renders with variant="full"', () => {
    const { container } = render(<TransactionPanel variant="full" />)
    expect(container.textContent).toBeTruthy()
  })

  it('GovernancePanel renders with variant="full"', () => {
    const { container } = render(
      <GovernancePanel variant="full" selectedDesign={null} projectId={null} />
    )
    expect(container.textContent).toBeTruthy()
  })

  it('SnapshotHistoryPanel renders with variant="full"', () => {
    const { container } = render(
      <SnapshotHistoryPanel variant="full" projectId="test" selectedDesign={null} currentBoq={null} />
    )
    expect(container.textContent).toBeTruthy()
  })

  it('PropertiesPanel renders with variant="full"', () => {
    const { container } = render(<PropertiesPanel variant="full" />)
    expect(container.textContent).toBeTruthy()
  })
})
