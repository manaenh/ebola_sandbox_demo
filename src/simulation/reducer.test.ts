import { describe, expect, it } from 'vitest'
import { createInitialState, simulationReducer } from './reducer'

describe('M1-1 deterministic simulation', () => {
  it('resolves the rapid epidemiology branch to 11:05 and 23 minutes', () => {
    const next = simulationReducer(createInitialState(), {
      type: 'RESOLVE_DECISION',
      decision: 'rapid-epidemiology',
    })
    expect(next.simulationTime).toContain('11:05')
    expect(next.metrics.exposureDuration.value).toBe(23)
    expect(next.metrics.assessmentRequired.value).toBeNull()
  })

  it('resolves the staged assessment branch without treating assessments as contacts', () => {
    const next = simulationReducer(createInitialState(), {
      type: 'RESOLVE_DECISION',
      decision: 'staged-assessment',
    })
    expect(next.simulationTime).toContain('12:00')
    expect(next.metrics.exposureDuration.value).toBe(78)
    expect(next.metrics.assessmentRequired.value).toBe(21)
    expect(next.metrics.riskContacts.value).toBeNull()
  })

  it('does not apply a second decision to a resolved node', () => {
    const first = simulationReducer(createInitialState(), {
      type: 'RESOLVE_DECISION',
      decision: 'rapid-epidemiology',
    })
    const second = simulationReducer(first, {
      type: 'RESOLVE_DECISION',
      decision: 'staged-assessment',
    })
    expect(second).toBe(first)
  })
})
