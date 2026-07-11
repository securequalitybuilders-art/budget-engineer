// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import {
  DISCIPLINES,
  getDiscipline,
  getDisciplineByAiaCode,
  getDisciplineByAiaCodeOrFail,
  DEFAULT_DISCIPLINE,
  type DisciplineId,
} from '@/lib/studio/discipline'
import {
  ALL_STAGES,
  getStageDef,
  getStagesForDiscipline,
  getStageIdsForDiscipline,
  getDefaultStage,
  isStageInDiscipline,
  nextStage,
  type StageId,
} from '@/lib/studio/stageRegistry'
import { useDisciplineStore } from '@/stores/disciplineStore'
import { DisciplineSwitcher } from '@/components/studio/DisciplineSwitcher'

// ── discipline.ts ──

describe('discipline.ts', () => {
  it('defines 8 disciplines', () => {
    expect(DISCIPLINES.length).toBe(8)
  })

  it('each discipline has a unique id', () => {
    const ids = DISCIPLINES.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('each discipline has a unique aiaCode', () => {
    const codes = DISCIPLINES.map((d) => d.aiaCode)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('getDiscipline returns the correct discipline', () => {
    const arch = getDiscipline('ARCH')
    expect(arch.label).toBe('Architecture')
    expect(arch.aiaCode).toBe('A')
  })

  it('getDiscipline throws for unknown id', () => {
    expect(() => getDiscipline('XYZ' as DisciplineId)).toThrow('Unknown discipline')
  })

  it('getDisciplineByAiaCode finds discipline by AIA code', () => {
    const s = getDisciplineByAiaCode('S')
    expect(s?.id).toBe('STR')
  })

  it('getDisciplineByAiaCode finds by AIA code', () => {
    expect(getDisciplineByAiaCode('S')?.id).toBe('STR')
    expect(getDisciplineByAiaCode('M')?.id).toBe('MEP')
    expect(getDisciplineByAiaCode('A')?.id).toBe('ARCH')
  })

  it('getDisciplineByAiaCodeOrFail returns discipline', () => {
    expect(getDisciplineByAiaCodeOrFail('A').id).toBe('ARCH')
    expect(getDisciplineByAiaCodeOrFail('L').id).toBe('LAND')
  })

  it('DEFAULT_DISCIPLINE is ARCH', () => {
    expect(DEFAULT_DISCIPLINE).toBe('ARCH')
  })

  it('every discipline has a color, icon, description, shortLabel', () => {
    for (const d of DISCIPLINES) {
      expect(d.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(d.icon).toBeTruthy()
      expect(d.description).toBeTruthy()
      expect(d.shortLabel).toBeTruthy()
    }
  })
})

// ── stageRegistry.ts ──

describe('stageRegistry.ts', () => {
  it('defines 7 stages', () => {
    expect(ALL_STAGES.length).toBe(7)
  })

  it('each StageDef has an id, label, shortLabel, description, icon', () => {
    for (const s of ALL_STAGES) {
      expect(s.id).toBeTruthy()
      expect(s.label).toBeTruthy()
      expect(s.shortLabel).toBeTruthy()
      expect(s.description).toBeTruthy()
      expect(s.icon).toBeTruthy()
    }
  })

  it('getStageDef returns correct stage', () => {
    const brief = getStageDef('brief')
    expect(brief.label).toBe('Brief')
  })

  it('getStageDef throws for unknown stage', () => {
    expect(() => getStageDef('unknown' as StageId)).toThrow('Unknown stage')
  })

  it('getStagesForDiscipline returns discipline-specific stages', () => {
    expect(getStagesForDiscipline('ARCH').length).toBe(7)
    expect(getStagesForDiscipline('STR').length).toBe(6)
    expect(getStagesForDiscipline('MEP').length).toBe(5)
    expect(getStagesForDiscipline('ELEC').length).toBe(5)
    expect(getStagesForDiscipline('PLUM').length).toBe(5)
    expect(getStagesForDiscipline('INT').length).toBe(5)
    expect(getStagesForDiscipline('LAND').length).toBe(6)
    expect(getStagesForDiscipline('CIVIL').length).toBe(6)
  })

  it('ARCH and INT have correct first stages', () => {
    expect(getStagesForDiscipline('ARCH')[0].id).toBe('brief')
    expect(getStagesForDiscipline('INT')[0].id).toBe('brief')
  })

  it('getStageIdsForDiscipline returns stage IDs', () => {
    const ids = getStageIdsForDiscipline('ARCH')
    expect(ids).toEqual(['brief', 'concept', 'site-analysis', 'design', 'engineering', 'docs-bim', 'cost-deliver'])
  })

  it('getDefaultStage returns the first stage', () => {
    expect(getDefaultStage('ARCH')).toBe('brief')
    expect(getDefaultStage('MEP')).toBe('brief')
    expect(getDefaultStage('INT')).toBe('brief')
  })

  it('isStageInDiscipline checks membership', () => {
    expect(isStageInDiscipline('site-analysis', 'ARCH')).toBe(true)
    expect(isStageInDiscipline('site-analysis', 'MEP')).toBe(false)
    expect(isStageInDiscipline('site-analysis', 'INT')).toBe(false)
    expect(isStageInDiscipline('site-analysis', 'LAND')).toBe(true)
    expect(isStageInDiscipline('site-analysis', 'CIVIL')).toBe(true)
  })

  it('nextStage returns next stage or null', () => {
    expect(nextStage('brief', 'ARCH')).toBe('concept')
    expect(nextStage('concept', 'ARCH')).toBe('site-analysis')
    expect(nextStage('cost-deliver', 'ARCH')).toBeNull()
    expect(nextStage('site-analysis', 'MEP')).toBeNull()
  })

  it('nextStage returns null for unknown stage in discipline', () => {
    expect(nextStage('site-analysis' as StageId, 'MEP')).toBeNull()
  })
})

// ── disciplineStore.ts ──

describe('disciplineStore', () => {
  beforeEach(() => {
    useDisciplineStore.setState({
      currentDiscipline: DEFAULT_DISCIPLINE,
      visibleDisciplines: DISCIPLINES.map((d) => d.id),
      disciplineFilter: null,
    })
  })

  it('starts with ARCH as current discipline', () => {
    expect(useDisciplineStore.getState().currentDiscipline).toBe('ARCH')
  })

  it('setCurrentDiscipline changes the active discipline', () => {
    useDisciplineStore.getState().setCurrentDiscipline('STR')
    expect(useDisciplineStore.getState().currentDiscipline).toBe('STR')
  })

  it('toggleDisciplineVisibility removes a visible discipline', () => {
    useDisciplineStore.getState().toggleDisciplineVisibility('STR')
    expect(useDisciplineStore.getState().visibleDisciplines).not.toContain('STR')
  })

  it('toggleDisciplineVisibility adds back a hidden discipline', () => {
    useDisciplineStore.getState().toggleDisciplineVisibility('STR')
    useDisciplineStore.getState().toggleDisciplineVisibility('STR')
    expect(useDisciplineStore.getState().visibleDisciplines).toContain('STR')
  })

  it('showAllDisciplines shows all 8 disciplines', () => {
    useDisciplineStore.getState().hideAllDisciplines()
    useDisciplineStore.getState().showAllDisciplines()
    expect(useDisciplineStore.getState().visibleDisciplines.length).toBe(8)
  })

  it('hideAllDisciplines hides all', () => {
    useDisciplineStore.getState().hideAllDisciplines()
    expect(useDisciplineStore.getState().visibleDisciplines.length).toBe(0)
  })

  it('setDisciplineFilter sets the filter', () => {
    useDisciplineStore.getState().setDisciplineFilter('MEP')
    expect(useDisciplineStore.getState().disciplineFilter).toBe('MEP')
    useDisciplineStore.getState().setDisciplineFilter(null)
    expect(useDisciplineStore.getState().disciplineFilter).toBeNull()
  })
})

// ── DisciplineSwitcher.tsx ──

describe('DisciplineSwitcher (full)', () => {
  beforeEach(() => {
    cleanup()
    useDisciplineStore.setState({
      currentDiscipline: DEFAULT_DISCIPLINE,
      visibleDisciplines: DISCIPLINES.map((d) => d.id),
      disciplineFilter: null,
    })
  })

  it('renders all 8 discipline buttons', () => {
    const { container } = render(<DisciplineSwitcher />)
    const buttons = container.querySelectorAll('[data-active]')
    expect(buttons.length).toBe(8)
  })

  it('marks the current discipline as active', () => {
    const { container } = render(<DisciplineSwitcher />)
    const activeButtons = container.querySelectorAll('[data-active="true"]')
    expect(activeButtons.length).toBe(1)
    expect(activeButtons[0].textContent).toContain('Arch')
  })

  it('has role="radiogroup"', () => {
    const { container } = render(<DisciplineSwitcher />)
    expect(container.querySelector('[role="radiogroup"]')).toBeTruthy()
  })

  it('responds to setCurrentDiscipline when clicked', () => {
    const { container } = render(<DisciplineSwitcher />)
    const strButton = Array.from(container.querySelectorAll('[data-active]')).find(
      (b) => b.textContent?.includes('Struct')
    )
    expect(strButton).toBeTruthy()
    fireEvent.click(strButton!)
    expect(useDisciplineStore.getState().currentDiscipline).toBe('STR')
  })

  it('marks hidden disciplines with opacity-40', () => {
    useDisciplineStore.getState().toggleDisciplineVisibility('STR')
    const { container } = render(<DisciplineSwitcher />)
    const strButton = Array.from(container.querySelectorAll('[data-active]')).find(
      (b) => b.textContent?.includes('Struct')
    ) as HTMLElement
    expect(strButton.dataset.visible).toBe('false')
  })
})

describe('DisciplineSwitcher (compact)', () => {
  beforeEach(() => {
    cleanup()
    useDisciplineStore.setState({
      currentDiscipline: DEFAULT_DISCIPLINE,
      visibleDisciplines: DISCIPLINES.map((d) => d.id),
      disciplineFilter: null,
    })
  })

  it('renders a select element', () => {
    const { container } = render(<DisciplineSwitcher compact />)
    const select = container.querySelector('select')
    expect(select).toBeTruthy()
  })

  it('renders all 8 options in the select', () => {
    const { container } = render(<DisciplineSwitcher compact />)
    const options = container.querySelectorAll('option')
    expect(options.length).toBe(8)
  })

  it('select shows the current discipline', () => {
    const { container } = render(<DisciplineSwitcher compact />)
    const select = container.querySelector('select') as HTMLSelectElement
    expect(select.value).toBe('ARCH')
  })

  it('changing select value updates the store', () => {
    const { container } = render(<DisciplineSwitcher compact />)
    const select = container.querySelector('select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'LAND' } })
    expect(useDisciplineStore.getState().currentDiscipline).toBe('LAND')
  })
})
