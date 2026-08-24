import { describe, expect, it } from 'vitest'
import { createInitialState, simulationReducer } from './reducer'
import type { DecisionId, SimulationState } from './types'

const decide = (state: SimulationState, decision: DecisionId) => simulationReducer(state, {
  type: 'RESOLVE_DECISION',
  decision,
})

const advance = (state: SimulationState) => simulationReducer(state, { type: 'ADVANCE_EVENT' })

describe('Module 1 deterministic simulation', () => {
  it('preserves both M1-1 source-supported branches', () => {
    const rapid = decide(createInitialState(), 'rapid-epidemiology')
    expect(rapid.simulationTime).toContain('11:05')
    expect(rapid.metrics.exposureDuration.value).toBe(23)
    expect(rapid.metrics.assessmentRequired.value).toBeNull()
    expect(rapid.persistent.isolationTime).toBe('11:05')

    const staged = decide(createInitialState(), 'staged-assessment')
    expect(staged.simulationTime).toContain('12:00')
    expect(staged.metrics.exposureDuration.value).toBe(78)
    expect(staged.metrics.assessmentRequired.value).toBe(21)
    expect(staged.metrics.riskContacts.value).toBeNull()
    expect(staged.persistent.vomitingExposureOccurred).toBe(true)
  })

  it('advances into patient refusal while retaining the earlier route', () => {
    const afterM11 = decide(createInitialState(), 'staged-assessment')
    const m12 = advance(afterM11)

    expect(m12.currentEventId).toBe('M1-2')
    expect(m12.simulationTime).toContain('11:12')
    expect(m12.scene.patientLocation).toBe('triage')
    expect(m12.persistent.waitingAreaMinutes).toBe(78)
    expect(m12.completedEventIds).toEqual(['M1-1'])
  })

  it('stores communication cooperation without inventing social-media counts', () => {
    const m12 = advance(decide(createInitialState(), 'rapid-epidemiology'))
    const cooperative = decide(m12, 'risk-communication')

    expect(cooperative.persistent.patientCooperative).toBe(true)
    expect(cooperative.persistent.communicationDelayMinutes).toBe(15)
    expect(cooperative.persistent.samplingReady).toBe(true)
    expect(cooperative.scene.phoneMode).toBe('family-video')

    const rigid = decide(m12, 'direct-procedure')
    expect(rigid.persistent.earlyPublicOpinionRisk).toBe(true)
    expect(rigid.metrics.publicOpinionRisk.value).toBeNull()
    expect(rigid.metrics.publicOpinionRisk.displayValue).toBe('上升')
  })

  it('plays the full prompt-report route through Module 1 completion', () => {
    let state = decide(createInitialState(), 'rapid-epidemiology')
    state = advance(state)
    state = decide(state, 'risk-communication')
    state = advance(state)
    expect(state.currentEventId).toBe('M1-3')
    expect(state.simulationTime).toContain('11:20')

    state = decide(state, 'early-report')
    expect(state.persistent.cdcResponseStarted).toBe(true)
    expect(state.persistent.reportWithin15Minutes).toBe(true)
    expect(state.metrics.cdcResponse.displayValue).toBe('已启动')

    state = advance(state)
    expect(state.phase).toBe('module-complete')
    expect(state.completedEventIds).toEqual(['M1-1', 'M1-2', 'M1-3'])
    expect(state.decisions).toEqual({
      'M1-1': 'rapid-epidemiology',
      'M1-2': 'risk-communication',
      'M1-3': 'early-report',
    })
  })

  it('retains assessment, public-opinion and response-delay consequences together', () => {
    let state = decide(createInitialState(), 'staged-assessment')
    state = advance(state)
    state = decide(state, 'direct-procedure')
    state = advance(state)
    state = decide(state, 'await-tests')
    state = advance(state)

    expect(state.phase).toBe('module-complete')
    expect(state.persistent.assessmentRequired).toBe(21)
    expect(state.persistent.earlyPublicOpinionRisk).toBe(true)
    expect(state.persistent.responseDelayMinutes).toBe(130)
    expect(state.metrics.responseDelay.value).toBe(130)
    expect(state.metrics.responseDelay.displayValue).toBe('+2h10m')
  })

  it('does not apply another choice before the current event advances', () => {
    const first = decide(createInitialState(), 'rapid-epidemiology')
    const second = decide(first, 'staged-assessment')
    expect(second).toBe(first)
  })
})
