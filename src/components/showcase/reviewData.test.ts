import { describe, expect, it } from 'vitest'
import { createInitialState, simulationReducer } from '../../simulation/reducer'
import { crossRegionEntryActions, curatedActions, flightEntryActions, monitoringConsequenceTime, openingConsequenceTime, type ResponseStage } from './sequence'
import { scenarioLocations } from './responseGeography'
import { getKeyDecisionPath, getReviewBeats, getReviewDecisions, reviewRouteData } from './reviewData'

function completedRun(initialDecision: 'rapid-epidemiology' | 'staged-assessment', monitoringDecision: 'immediate-monitoring-separation' | 'continue-monitoring-assessment') {
  let state = simulationReducer(createInitialState(), { type: 'RESOLVE_DECISION', decision: initialDecision })
  state = simulationReducer(state, { type: 'ADVANCE_TIME', simulationTime: openingConsequenceTime(state)! })
  for (const stage of ['incident', 'coordination', 'transfer-scene', 'transfer', 'sampling-scene', 'laboratory', 'confirmation'] as ResponseStage[]) {
    state = curatedActions(stage, state).reduce(simulationReducer, state)
  }
  state = flightEntryActions(state).reduce(simulationReducer, state)
  state = simulationReducer(state, { type: 'RESOLVE_DECISION', decision: 'classify-flight-risk' })
  state = crossRegionEntryActions(state).reduce(simulationReducer, state)
  state = simulationReducer(state, { type: 'START_MODULE_4' })
  state = simulationReducer(state, { type: 'RESOLVE_DECISION', decision: monitoringDecision })
  state = simulationReducer(state, { type: 'ADVANCE_TIME', simulationTime: monitoringConsequenceTime(state)! })
  return simulationReducer(state, { type: 'ADVANCE_EVENT' })
}

describe('Showcase review', () => {
  it.each([
    ['rapid-epidemiology', 'immediate-monitoring-separation', 23, 0, 11],
    ['staged-assessment', 'continue-monitoring-assessment', 78, 21, 16],
  ] as const)('shows recorded branch results for %s and %s', (initial, monitoring, minutes, assessment, highRisk) => {
    const state = completedRun(initial, monitoring)
    expect(state.module4.secondaryConfirmed).toBe(true)
    expect(state.module1.exposureDurationMinutes).toBe(minutes)
    expect(state.module1.additionalAssessmentRequired).toBe(assessment)
    expect(state.module4.totalHighRiskContacts).toBe(highRisk)
    expect(state.module4.confirmedCases).toBe(2)
    expect(getReviewDecisions(state).find((entry) => entry.id === 'M1-1')?.code).toBe(initial === 'rapid-epidemiology' ? 'A' : 'B')
    expect(getReviewDecisions(state).find((entry) => entry.id === 'M4-1')?.code).toBe(monitoring === 'immediate-monitoring-separation' ? 'A' : 'B')
    expect(getReviewBeats(state).at(-2)?.consequence).toContain(monitoring === 'immediate-monitoring-separation' ? '立即隔离转运' : '延后转运')
    const keyPath = getKeyDecisionPath(state)
    expect(keyPath.find((entry) => entry.id === 'M1-1')?.consequence).toContain(`${minutes} min`)
    expect(keyPath.find((entry) => entry.id === 'M4-1')?.consequence).toContain(monitoring === 'immediate-monitoring-separation' ? '未新增' : '+5')
    expect(keyPath.find((entry) => entry.id === 'M2-3')?.consequence).toContain('92%')
  })

  it('keeps replay routes attached to the shared location coordinates', () => {
    const beats = getReviewBeats(completedRun('rapid-epidemiology', 'immediate-monitoring-separation'))
    const transfer = beats.find((beat) => beat.time === '08月05日 12:05')!
    const line = reviewRouteData(transfer).features.find((feature) => feature.properties?.kind === 'transfer')!
    expect(line.geometry.coordinates).toEqual([scenarioLocations['central-hospital'].coordinates, scenarioLocations['designated-hospital'].coordinates])
    const specimen = beats.find((beat) => beat.time === '08月05日 13:30')!
    const specimenLine = reviewRouteData(specimen).features.find((feature) => feature.properties?.kind === 'specimen')!
    expect(specimenLine.geometry.coordinates).toEqual([scenarioLocations['designated-hospital'].coordinates, scenarioLocations.laboratory.coordinates])
    expect(reviewRouteData(specimen).features).toHaveLength(1)
  })

  it('renders the recorded 61% tracing branch without substituting the curated 92% path', () => {
    const baseline = completedRun('rapid-epidemiology', 'immediate-monitoring-separation')
    const alternative = { ...baseline, decisions: { ...baseline.decisions, 'M2-3': 'await-confirmation' as const },
      module3: { ...baseline.module3, initialHighRiskLocateRate: 0.61 as const } }
    expect(getKeyDecisionPath(alternative).find((entry) => entry.id === 'M2-3')).toMatchObject({ code: 'B', tone: 'adverse', consequence: '首批高风险找到率 61%' })
    expect(getReviewBeats(alternative).find((beat) => beat.time === '08月07日 09:00')?.consequence).toContain('61%')
  })
})
