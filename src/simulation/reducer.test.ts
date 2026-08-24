import { describe, expect, it } from 'vitest'
import { createInitialState, simulationReducer } from './reducer'
import { getCurrentEventDescription } from './selectors'
import type { DecisionId, SimulationState } from './types'

const choose = (state: SimulationState, decision: DecisionId) =>
  simulationReducer(state, { type: 'RESOLVE_DECISION', decision })
const next = (state: SimulationState) => simulationReducer(state, { type: 'ADVANCE_EVENT' })
const advanceTo = (state: SimulationState, simulationTime: string) =>
  simulationReducer(state, { type: 'ADVANCE_TIME', simulationTime })

type Letter = 'A' | 'B'
const decisions: Record<1 | 2 | 3, Record<Letter, DecisionId>> = {
  1: { A: 'rapid-epidemiology', B: 'staged-assessment' },
  2: { A: 'risk-communication', B: 'direct-procedure' },
  3: { A: 'early-report', B: 'await-tests' },
}

function play(path: `${Letter}${Letter}${Letter}`): SimulationState {
  let state = createInitialState()
  state = choose(state, decisions[1][path[0] as Letter])
  state = next(state)
  state = choose(state, decisions[2][path[1] as Letter])
  state = next(state)
  state = choose(state, decisions[3][path[2] as Letter])
  return next(state)
}

describe('Module 1 time-aware consequences', () => {
  it('M1-1 A isolates the patient before M1-2 at 11:12', () => {
    const resolved = choose(createInitialState(), 'rapid-epidemiology')
    expect(resolved.simulationTime).toContain('10:42')
    expect(resolved.scene.patientLocation).toBe('triage')
    const at1112 = next(resolved)
    expect(at1112.simulationTime).toContain('11:12')
    expect(at1112.scene.patientLocation).toBe('isolation')
    expect(at1112.module1.isolationCompletedAt).toBe('11:05')
    expect(at1112.module1.exposureDurationMinutes).toBe(23)
  })

  it('M1-1 B keeps the patient outside isolation at 11:12 and 11:20', () => {
    let state = choose(createInitialState(), 'staged-assessment')
    state = next(state)
    expect(state.simulationTime).toContain('11:12')
    expect(state.scene.patientLocation).toBe('triage')
    expect(state.module1.isolationCompletedAt).toBeNull()
    expect(state.module1.additionalAssessmentRequired).toBe(0)

    state = choose(state, 'risk-communication')
    state = next(state)
    expect(state.simulationTime).toContain('11:20')
    expect(state.scene.patientLocation).toBe('triage')
    expect(state.module1.isolationCompletedAt).toBeNull()
    expect(state.module1.additionalAssessmentRequired).toBe(0)
  })

  it('executes the delayed vomiting and isolation consequences only at their due times', () => {
    let state = next(choose(createInitialState(), 'staged-assessment'))
    state = choose(state, 'risk-communication')
    state = next(state)
    state = advanceTo(state, '2026-08-05T11:35:00+08:00')
    expect(state.module1.vomitingExposureOccurred).toBe(false)
    expect(state.module1.additionalAssessmentRequired).toBe(0)

    state = advanceTo(state, '2026-08-05T11:36:00+08:00')
    expect(state.module1.vomitingExposureOccurred).toBe(true)
    expect(state.module1.additionalAssessmentRequired).toBe(21)
    expect(state.metrics.assessmentRequired.value).toBe(21)
    expect(state.metrics.riskContacts.value).toBeNull()
    expect(state.scene.patientLocation).toBe('triage')

    state = advanceTo(state, '2026-08-05T12:00:00+08:00')
    expect(state.scene.patientLocation).toBe('isolation')
    expect(state.module1.isolationCompletedAt).toBe('12:00')
    expect(state.module1.exposureDurationMinutes).toBe(78)
  })

  it('never creates the +21 assessment group on the early-isolation branch', () => {
    let state = next(choose(createInitialState(), 'rapid-epidemiology'))
    state = advanceTo(state, '2026-08-05T12:00:00+08:00')
    expect(state.module1.additionalAssessmentRequired).toBe(0)
    expect(state.module1.vomitingExposureOccurred).toBe(false)
    expect(state.metrics.assessmentRequired.value).toBeNull()
  })
})

describe('conditional story and persistent state', () => {
  it('adapts M1-2 and all four M1-3 story states to prior decisions', () => {
    const earlyM12 = next(choose(createInitialState(), 'rapid-epidemiology'))
    expect(getCurrentEventDescription(earlyM12)).toContain('已经完成隔离')
    const delayedM12 = next(choose(createInitialState(), 'staged-assessment'))
    expect(getCurrentEventDescription(delayedM12)).toContain('仍在急诊区域')

    const cases: Array<[DecisionId, DecisionId, string]> = [
      ['rapid-epidemiology', 'risk-communication', '已完成隔离并开始配合采样'],
      ['rapid-epidemiology', 'direct-procedure', '短视频已经上传'],
      ['staged-assessment', 'risk-communication', '仍未完成隔离'],
      ['staged-assessment', 'direct-procedure', '仍未完成隔离，且相关短视频已经上传'],
    ]
    cases.forEach(([first, second, wording]) => {
      let state = next(choose(createInitialState(), first))
      state = next(choose(state, second))
      expect(getCurrentEventDescription(state)).toContain(wording)
    })
  })

  it('persists cooperation and public-opinion state without invented reach metrics', () => {
    const base = next(choose(createInitialState(), 'rapid-epidemiology'))
    const communicated = choose(base, 'risk-communication')
    expect(communicated.module1.patientCooperative).toBe(true)
    expect(communicated.module1.communicationDelayMinutes).toBe(15)
    expect(communicated.module1.samplingReadiness).toBe('improved')
    expect(communicated.module1.contactInformationQuality).toBe('improved')

    const rigid = choose(base, 'direct-procedure')
    expect(rigid.module1.patientCooperative).toBe(false)
    expect(rigid.module1.earlyPublicOpinionRisk).toBe(true)
    expect(rigid.module1.samplingReadiness).toBe('blocked')
    expect(rigid.scene.phoneMode).toBe('short-video')
    expect(rigid.metrics.publicOpinionRisk.value).toBeNull()
  })
})

describe('all eight Module 1 paths', () => {
  const paths = ['AAA', 'AAB', 'ABA', 'ABB', 'BAA', 'BAB', 'BBA', 'BBB'] as const

  it.each(paths)('%s persists all three decision dimensions', (path) => {
    const state = play(path)
    const delayedTriage = path[0] === 'B'
    const cooperative = path[1] === 'A'
    const timely = path[2] === 'A'
    expect(state.phase).toBe('module-complete')
    expect(state.module1.isolationCompletedAt).toBe(delayedTriage ? '12:00' : '11:05')
    expect(state.module1.exposureDurationMinutes).toBe(delayedTriage ? 78 : 23)
    expect(state.module1.vomitingExposureOccurred).toBe(delayedTriage)
    expect(state.module1.additionalAssessmentRequired).toBe(delayedTriage ? 21 : 0)
    expect(state.module1.patientCooperative).toBe(cooperative)
    expect(state.module1.earlyPublicOpinionRisk).toBe(!cooperative)
    expect(state.module1.reportWithin15Minutes).toBe(timely)
    expect(state.module1.cdcResponseStarted).toBe(timely)
    expect(state.module1.responseDelayMinutes).toBe(timely ? 0 : 130)
    expect(state.metrics.confirmedCases.value).toBe(0)
    expect(state.metrics.suspectedCases.value).toBe(1)
    expect(state.metrics.riskContacts.value).toBeNull()
  })

  it('produces eight unique final state fingerprints', () => {
    const fingerprints = paths.map((path) => {
      const m = play(path).module1
      return JSON.stringify({
        isolation: m.isolationCompletedAt,
        assessment: m.additionalAssessmentRequired,
        cooperative: m.patientCooperative,
        opinion: m.earlyPublicOpinionRisk,
        report: m.reportWithin15Minutes,
        workload: m.tracingWorkload,
        pressure: m.downstreamResponsePressure,
      })
    })
    expect(new Set(fingerprints).size).toBe(8)
  })

  it('represents AAA, BAA recovery, ABB, and BBB interaction effects', () => {
    const aaa = play('AAA').module1
    expect(aaa.exposureControlQuality).toBe('good')
    expect(aaa.cooperationQuality).toBe('stable')
    expect(aaa.responseSpeed).toBe('timely')
    expect(aaa.tracingWorkload).toBe('contained')
    expect(aaa.downstreamResponsePressure).toBe('controlled')

    const baa = play('BAA').module1
    expect(baa.exposureControlQuality).toBe('compromised')
    expect(baa.contactInformationQuality).toBe('improved')
    expect(baa.tracingWorkload).toBe('expanded')
    expect(baa.downstreamResponsePressure).toBe('elevated')

    const abb = play('ABB').module1
    expect(abb.cooperationQuality).toBe('strained')
    expect(abb.responseSpeed).toBe('delayed')
    expect(abb.tracingWorkload).toBe('delayed-start')
    expect(abb.downstreamResponsePressure).toBe('elevated')

    const bbb = play('BBB').module1
    expect(bbb.tracingWorkload).toBe('expanded-delayed')
    expect(bbb.downstreamResponsePressure).toBe('high')
  })
})
