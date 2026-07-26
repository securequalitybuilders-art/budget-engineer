import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/stores/uiStore'

describe('design option prominent selector', () => {
  beforeEach(() => {
    useUIStore.setState({
      activeStage: 1,
      selectedDesignId: null,
    })
  })

  it('selectedDesignId starts null when no option selected', () => {
    expect(useUIStore.getState().selectedDesignId).toBeNull()
  })

  it('selecting an option sets selectedDesignId and unlocks Design stage', () => {
    const store = useUIStore.getState()
    store.setSelectedDesignId('opt-compact')
    expect(useUIStore.getState().selectedDesignId).toBe('opt-compact')

    store.setActiveStage(3)
    expect(useUIStore.getState().activeStage).toBe(3)
  })

  it('changing selection updates selectedDesignId', () => {
    const store = useUIStore.getState()
    store.setSelectedDesignId('opt-compact')
    expect(useUIStore.getState().selectedDesignId).toBe('opt-compact')

    store.setSelectedDesignId('opt-standard')
    expect(useUIStore.getState().selectedDesignId).toBe('opt-standard')
  })

  it('clearing selection re-locks Design stage', () => {
    const store = useUIStore.getState()
    store.setSelectedDesignId('opt-compact')
    store.setActiveStage(3)
    expect(useUIStore.getState().activeStage).toBe(3)

    store.setSelectedDesignId(null)
    expect(useUIStore.getState().selectedDesignId).toBeNull()
  })
})
