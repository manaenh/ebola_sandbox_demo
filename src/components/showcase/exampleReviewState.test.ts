import { describe, expect, it } from 'vitest'
import { createExampleReviewState } from './exampleReviewState'

describe('example review entry', () => {
  it('builds a completed review through the existing reducer', () => {
    const state = createExampleReviewState()
    expect(state.module4.secondaryConfirmed).toBe(true)
    expect(state.module4.confirmedCases).toBe(2)
    expect(state.module1.exposureDurationMinutes).toBe(23)
    expect(state.decisions['M4-1']).toBe('immediate-monitoring-separation')
  })
})
