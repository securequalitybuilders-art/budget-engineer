import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/stores/uiStore'

function resetStore() {
  useUIStore.setState({ activeStage: 1, selectedDesignId: null })
}

describe('design option gating', () => {
  beforeEach(() => resetStore())

  it('selectedDesignId defaults to null', () => {
    expect(useUIStore.getState().selectedDesignId).toBeNull()
  })

  it('setSelectedDesignId updates store', () => {
    useUIStore.getState().setSelectedDesignId('opt-1')
    expect(useUIStore.getState().selectedDesignId).toBe('opt-1')
  })

  it('setSelectedDesignId accepts null to clear selection', () => {
    const store = useUIStore.getState()
    store.setSelectedDesignId('opt-1')
    expect(useUIStore.getState().selectedDesignId).toBe('opt-1')
    store.setSelectedDesignId(null)
    expect(useUIStore.getState().selectedDesignId).toBeNull()
  })

  it('partialize excludes selectedDesignId from persistence', () => {
    useUIStore.getState().setSelectedDesignId('opt-1')
    const partial = useUIStore.persist.getOptions().partialize?.(useUIStore.getState())
    expect(partial).toBeDefined()
    const partialAny = partial as unknown as Record<string, unknown>
    expect(partialAny.selectedDesignId).toBeUndefined()
  })

  it('activeStage can advance when selectedDesignId is set', () => {
    useUIStore.getState().setSelectedDesignId('opt-1')
    useUIStore.getState().setActiveStage(3)
    expect(useUIStore.getState().activeStage).toBe(3)
  })
})
