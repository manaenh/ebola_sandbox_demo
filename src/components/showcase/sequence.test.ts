import { describe, expect, it } from 'vitest'
import { createInitialState, simulationReducer } from '../../simulation/reducer'
import { crossRegionEntryActions, curatedActions, flightEntryActions, monitoringConsequenceTime, openingConsequenceTime, type ResponseStage } from './sequence'

describe('Showcase M1-1 handoff', () => {
  it('applies early isolation without advancing the event, then permits full simulation continuation', () => {
    let state = simulationReducer(createInitialState(), { type: 'RESOLVE_DECISION', decision: 'rapid-epidemiology' })
    state = simulationReducer(state, { type: 'ADVANCE_TIME', simulationTime: openingConsequenceTime(state)! })
    expect(state.currentEventId).toBe('M1-1')
    expect(state.scene.patientLocation).toBe('isolation')
    expect(state.module1.exposureDurationMinutes).toBe(23)
    expect(openingConsequenceTime(state)).toBeUndefined()
    expect(simulationReducer(state, { type: 'ADVANCE_EVENT' }).currentEventId).toBe('M1-2')
  })

  it('shows expanded exposure before isolation and retains the pending isolation for full simulation', () => {
    let state = simulationReducer(createInitialState(), { type: 'RESOLVE_DECISION', decision: 'staged-assessment' })
    state = simulationReducer(state, { type: 'ADVANCE_TIME', simulationTime: openingConsequenceTime(state)! })
    expect(state.currentEventId).toBe('M1-1')
    expect(state.scene.exposureEvent).toBe(true)
    expect(state.module1.additionalAssessmentRequired).toBe(21)
    expect(state.module1.isolationCompletedAt).toBeNull()
    expect(state.scheduledConsequences).toHaveLength(1)
    const continued = simulationReducer(state, { type: 'ADVANCE_EVENT' })
    expect(continued.currentEventId).toBe('M1-2')
    expect(continued.module1.additionalAssessmentRequired).toBe(21)
  })
})

describe('Showcase Phase 2 curated path', () => {
  for (const decision of ['rapid-epidemiology', 'staged-assessment'] as const) {
    it(`reaches the first confirmed case after ${decision} and keeps its M1-1 outcome`, () => {
      let state = simulationReducer(createInitialState(), { type: 'RESOLVE_DECISION', decision })
      state = simulationReducer(state, { type: 'ADVANCE_TIME', simulationTime: openingConsequenceTime(state)! })
      const initialAssessment = state.module1.additionalAssessmentRequired
      for (const stage of ['incident', 'coordination', 'transfer-scene', 'transfer', 'sampling-scene', 'laboratory', 'confirmation'] as ResponseStage[]) {
        const actions = curatedActions(stage, state)
        if (stage !== 'coordination') expect(actions.length).toBeGreaterThan(0)
        state = actions.reduce(simulationReducer, state)
        if (stage === 'transfer-scene') {
          expect(state.scene.kind).toBe('transport')
          expect(state.scene.transferMotion).toBe('loading')
        }
        if (stage === 'transfer') expect(state.module2.transferStatus).toBe('completed')
        if (stage === 'sampling-scene') {
          expect(state.scene.kind).toBe('sampling')
          expect(state.scene.specimenVisual).toBe('in-transit')
        }
        if (stage === 'laboratory') {
          expect(state.currentEventId).toBe('M2-3')
          expect(state.module2.confirmed).toBe(false)
          expect(state.module2.specimenReachedLaboratoryAt).toBe('17:40')
        }
      }
      expect(state.currentEventId).toBe('M2-4')
      expect(state.phase).toBe('milestone')
      expect(state.module2.confirmed).toBe(true)
      expect(state.metrics.confirmedCases.value).toBe(1)
      expect(state.module1.additionalAssessmentRequired).toBe(initialAssessment)
      expect(curatedActions('escalation', state)).toEqual([])
    })
  }
})

describe('Showcase flight review handoff', () => {
  for (const decision of ['classify-flight-risk', 'uniform-flight-management'] as const) {
    it(`reaches the same exposure counts through ${decision}`, () => {
      let state = simulationReducer(createInitialState(), { type: 'RESOLVE_DECISION', decision: 'rapid-epidemiology' })
      state = simulationReducer(state, { type: 'ADVANCE_TIME', simulationTime: openingConsequenceTime(state)! })
      for (const stage of ['incident', 'coordination', 'transfer-scene', 'transfer', 'sampling-scene', 'laboratory', 'confirmation'] as ResponseStage[]) {
        state = curatedActions(stage, state).reduce(simulationReducer, state)
      }
      state = flightEntryActions(state).reduce(simulationReducer, state)
      expect(state.currentEventId).toBe('M3-2')
      expect(state.phase).toBe('deciding')
      expect(state.module3.flightPassengersTotal).toBe(298)
      state = simulationReducer(state, { type: 'RESOLVE_DECISION', decision })
      expect(state.module3.flightManagementMode).toBe(decision === 'classify-flight-risk' ? 'risk-based' : 'uniform-interim')
      expect([state.module3.flightHighRisk, state.module3.flightMediumRisk, state.module3.flightLowObservation, state.module3.flightExcludedFromActiveMonitoring]).toEqual([7, 18, 39, 234])
    })
  }
})

describe('Showcase monitoring hero path', () => {
  for (const decision of ['immediate-monitoring-separation', 'continue-monitoring-assessment'] as const) {
    it(`preserves the M4-1 consequence through confirmation after ${decision}`, () => {
      let state = simulationReducer(createInitialState(), { type: 'RESOLVE_DECISION', decision: 'rapid-epidemiology' })
      state = simulationReducer(state, { type: 'ADVANCE_TIME', simulationTime: openingConsequenceTime(state)! })
      for (const stage of ['incident', 'coordination', 'transfer-scene', 'transfer', 'sampling-scene', 'laboratory', 'confirmation'] as ResponseStage[]) {
        state = curatedActions(stage, state).reduce(simulationReducer, state)
      }
      state = flightEntryActions(state).reduce(simulationReducer, state)
      state = simulationReducer(state, { type: 'RESOLVE_DECISION', decision: 'classify-flight-risk' })
      state = crossRegionEntryActions(state).reduce(simulationReducer, state)
      expect(state.currentEventId).toBe('M3-3')
      expect(state.phase).toBe('module-complete')
      expect(state.module3.missingTravelerStatus).toBe('found')
      state = simulationReducer(state, { type: 'START_MODULE_4' })
      expect(state.currentEventId).toBe('M4-1')
      state = simulationReducer(state, { type: 'RESOLVE_DECISION', decision })
      const target = monitoringConsequenceTime(state)
      expect(target).toBeDefined()
      state = simulationReducer(state, { type: 'ADVANCE_TIME', simulationTime: target! })
      expect(state.module4.transferStatus).toBe('completed')
      expect(state.module4.additionalHighRiskContacts).toBe(decision === 'immediate-monitoring-separation' ? 0 : 5)
      expect(state.module4.sharedBathroomExposureDurationMinutes).toBe(decision === 'immediate-monitoring-separation' ? 0 : 240)
      state = simulationReducer(state, { type: 'ADVANCE_EVENT' })
      expect(state.currentEventId).toBe('M4-2')
      expect(state.module4.secondaryConfirmed).toBe(true)
      expect(state.module4.confirmedCases).toBe(2)
    })
  }
})
