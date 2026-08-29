import { describe, expect, it } from 'vitest'
import { createInitialState, simulationReducer } from './reducer'
import { eventOrder, getEventDefinition } from './sourceData'
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

const startModule2 = (state: SimulationState) => simulationReducer(state, { type: 'START_MODULE_2' })

function playToModule2(transfer: DecisionId, sampling?: DecisionId, screening?: DecisionId): SimulationState {
  let state = startModule2(play('AAA'))
  state = choose(state, transfer)
  if (!sampling) return state
  state = next(state)
  state = choose(state, sampling)
  if (!screening) return state
  state = next(state)
  return choose(state, screening)
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

  it('executes the delayed vomiting in its internal window and labels its exact timestamp as an assumption', () => {
    const resolved = choose(createInitialState(), 'staged-assessment')
    const vomiting = resolved.scheduledConsequences.find((item) => item.type === 'vomiting-exposure')!
    expect(vomiting.provenance.kind).toBe('SIMULATION_ASSUMPTION')
    expect(vomiting.provenance.note).toContain('内部排序时刻')

    let state = next(resolved)
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
    expect(state.eventLog.find((item) => item.id === 'm11-b-exposure')?.time).toBe('延迟隔离期间')

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

describe('source provenance and timestamp audit', () => {
  it('classifies every event injection and scheduled consequence', () => {
    const consequences = eventOrder.flatMap((eventId) =>
      getEventDefinition(eventId).decisions.flatMap((decision) => decision.effects.scheduledConsequences ?? []))

    eventOrder.forEach((eventId) => {
      expect(getEventDefinition(eventId).provenance.kind).toBe('SOURCE_FACT')
    })
    expect(consequences.length).toBeGreaterThan(0)
    consequences.forEach((consequence) => {
      expect(['SCHEDULED_SOURCE_CONSEQUENCE', 'SIMULATION_ASSUMPTION']).toContain(consequence.provenance.kind)
    })
    expect(consequences.filter((item) => item.provenance.kind === 'SIMULATION_ASSUMPTION').map((item) => item.id))
      .toEqual(['m11-b-vomiting-window', 'm33-a-found-within-6h', 'm33-b-found-after-24h'])
  })

  it('does not expose the assumed vomiting execution time as a source timestamp', () => {
    let state = next(choose(createInitialState(), 'staged-assessment'))
    state = advanceTo(state, '2026-08-05T11:36:00+08:00')
    const log = state.eventLog.find((item) => item.id === 'm11-b-exposure')!
    expect(log.time).toBe('延迟隔离期间')
    expect(log.provenance?.kind).toBe('SIMULATION_ASSUMPTION')
    expect(log.detail).toContain('未给出该事件的精确时刻')
  })
})

describe('conditional story and persistent state', () => {
  it('adapts M1-2 and all four M1-3 story states to prior decisions', () => {
    const earlyM12 = next(choose(createInitialState(), 'rapid-epidemiology'))
    expect(getCurrentEventDescription(earlyM12)).toContain('已经完成隔离')
    const delayedM12 = next(choose(createInitialState(), 'staged-assessment'))
    expect(getCurrentEventDescription(delayedM12)).toContain('仍在急诊区域')

    const cases: Array<[DecisionId, DecisionId, string]> = [
      ['rapid-epidemiology', 'risk-communication', '正在进行风险沟通和采样准备'],
      ['rapid-epidemiology', 'direct-procedure', '短视频已经上传'],
      ['staged-assessment', 'risk-communication', '正在争取其配合后续处置'],
      ['staged-assessment', 'direct-procedure', '仍未完成隔离，且相关短视频已经上传'],
    ]
    cases.forEach(([first, second, wording]) => {
      let state = next(choose(createInitialState(), first))
      state = next(choose(state, second))
      expect(getCurrentEventDescription(state)).toContain(wording)
    })
  })

  it('keeps M1-2 A communication in progress at 11:12 and 11:20, then applies cooperation at about 11:27', () => {
    const base = next(choose(createInitialState(), 'rapid-epidemiology'))
    let communicated = choose(base, 'risk-communication')
    expect(communicated.simulationTime).toContain('11:12')
    expect(communicated.module1.communicationStatus).toBe('in-progress')
    expect(communicated.module1.patientCooperative).toBeNull()
    expect(communicated.module1.samplingReadiness).toBe('delayed')
    expect(communicated.scheduledConsequences.find((item) => item.type === 'patient-cooperation')?.provenance.kind).toBe('SCHEDULED_SOURCE_CONSEQUENCE')

    communicated = next(communicated)
    expect(communicated.simulationTime).toContain('11:20')
    expect(communicated.module1.communicationStatus).toBe('in-progress')
    expect(communicated.module1.patientCooperative).toBeNull()
    expect(getCurrentEventDescription(communicated)).toContain('正在进行风险沟通')

    communicated = advanceTo(communicated, '2026-08-05T11:27:00+08:00')
    expect(communicated.module1.communicationStatus).toBe('successful')
    expect(communicated.module1.patientCooperative).toBe(true)
    expect(communicated.module1.communicationDelayMinutes).toBe(15)
    expect(communicated.module1.samplingReadiness).toBe('improved')
    expect(communicated.module1.contactInformationQuality).toBe('improved')
  })

  it('models M1-2 B as strained and delayed, not permanently blocked', () => {
    const base = next(choose(createInitialState(), 'rapid-epidemiology'))
    const rigid = choose(base, 'direct-procedure')
    expect(rigid.module1.patientCooperative).toBe(false)
    expect(rigid.module1.communicationStatus).toBe('strained')
    expect(rigid.module1.earlyPublicOpinionSignalTriggeredByM1).toBe(true)
    expect(rigid.module1.samplingReadiness).toBe('delayed')
    expect(rigid.scene.phoneMode).toBe('short-video')
    expect(rigid.metrics.publicOpinionRisk.value).toBeNull()

    const atReport = next(rigid)
    expect(atReport.module1.earlyPublicOpinionSignalTriggeredByM1).toBe(true)
    expect(atReport.scene.phoneMode).toBe('short-video')
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
    expect(state.module1.earlyPublicOpinionSignalTriggeredByM1).toBe(!cooperative)
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
        opinion: m.earlyPublicOpinionSignalTriggeredByM1,
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

describe('Module 2 continuity and branching', () => {
  it('starts M2-1 at 12:05 without resetting Module 1 consequences', () => {
    const module1 = play('BBB')
    const state = startModule2(module1)
    expect(state.currentEventId).toBe('M2-1')
    expect(state.simulationTime).toContain('12:05')
    expect(state.module1.exposureDurationMinutes).toBe(78)
    expect(state.module1.additionalAssessmentRequired).toBe(21)
    expect(state.module1.earlyPublicOpinionSignalTriggeredByM1).toBe(true)
    expect(state.module1.responseDelayMinutes).toBe(130)
  })

  it('allows Module 2 sampling after the strained M1 communication path', () => {
    let state = startModule2(play('ABA'))
    state = next(choose(state, 'backup-transfer'))
    state = choose(state, 'standardized-sampling')
    expect(state.module1.communicationStatus).toBe('strained')
    expect(state.module1.samplingReadiness).toBe('delayed')
    expect(state.module2.samplingProtocol).toBe('standardized')
    expect(state.module2.specimenStatus).toBe('in-transit')
  })

  it('M2-1 A completes receiving at 13:10 while B adds cleanup work without infections', () => {
    let backup = playToModule2('backup-transfer')
    expect(backup.module2.transferStatus).toBe('preparing')
    backup = advanceTo(backup, '2026-08-05T13:10:00+08:00')
    expect(backup.module2.transferStatus).toBe('completed')
    expect(backup.module2.transferCompletedAt).toBe('13:10')

    let waiting = playToModule2('wait-regular-transfer')
    expect(waiting.module2.transferStatus).toBe('waiting')
    expect(waiting.module2.transferWaitMinutes).toBe(70)
    expect(waiting.module2.additionalVomitingCleanupEvents).toBe(2)
    expect(waiting.module2.contaminationHandlingWorkload).toBe('increased')
    expect(waiting.metrics.confirmedCases.value).toBe(0)
    waiting = next(waiting)
    expect(waiting.module2.transferStatus).toBe('completed-after-wait')
    expect(waiting.module2.transferCompletedAt).toBeNull()
  })

  it('M2-2 standardized sampling reaches the laboratory at 17:40 without leakage', () => {
    let state = playToModule2('backup-transfer', 'standardized-sampling')
    expect(state.module2.outerPackagingContamination).toBe(false)
    expect(state.module2.exposureInvestigationStarted).toBe(false)
    expect(state.module2.laboratoryDelayMinutes).toBe(0)
    state = advanceTo(state, '2026-08-05T17:40:00+08:00')
    expect(state.module2.specimenStatus).toBe('received')
    expect(state.module2.specimenReachedLaboratoryAt).toBe('17:40')
  })

  it('M2-2 defective packaging starts exposure investigation and preserves four-hour delay', () => {
    let state = playToModule2('backup-transfer', 'routine-multi-test')
    expect(state.module2.outerPackagingContamination).toBe(true)
    expect(state.module2.exposureInvestigationStarted).toBe(true)
    expect(state.module2.laboratoryDelayMinutes).toBe(240)
    expect(state.metrics.laboratoryDelay.value).toBe(240)
    state = next(state)
    expect(state.currentEventId).toBe('M2-3')
    expect(state.module2.laboratoryDelayMinutes).toBe(240)
    expect(state.metrics.confirmedCases.value).toBe(0)
  })

  it('M2-3 applies 92% versus 61% and M2-4 confirms exactly one case', () => {
    let early = playToModule2('backup-transfer', 'standardized-sampling', 'escalate-on-screening')
    expect(early.module2.tracingMode).toBe('full')
    expect(early.module2.fullTracingActivated).toBe(true)
    expect(early.module2.highRiskContactFindingProgress).toBeNull()
    early = advanceTo(early, '2026-08-06T18:00:00+08:00')
    expect(early.module2.highRiskContactFindingProgress).toBe(92)
    early = next(early)
    expect(early.currentEventId).toBe('M2-4')
    expect(early.phase).toBe('milestone')
    expect(early.metrics.confirmedCases.value).toBe(1)
    expect(early.metrics.suspectedCases.value).toBe(0)
    expect(early.module2.confirmationCt).toBe(22.6)

    let wait = playToModule2('backup-transfer', 'standardized-sampling', 'await-confirmation')
    expect(wait.module2.tracingMode).toBe('preliminary')
    expect(wait.module2.fullTracingActivated).toBe(false)
    wait = advanceTo(wait, '2026-08-06T18:00:00+08:00')
    expect(wait.module2.highRiskContactFindingProgress).toBe(61)
    expect(wait.module2.tracingMode).toBe('preliminary')
    expect(wait.module2.fullTracingActivated).toBe(false)
    wait = next(wait)
    expect(wait.module2.tracingMode).toBe('full')
    expect(wait.module2.fullTracingActivated).toBe(true)
    expect(wait.metrics.confirmedCases.value).toBe(1)
  })

  it('keeps all eight Module 2 decision combinations distinct', () => {
    const transfers: DecisionId[] = ['backup-transfer', 'wait-regular-transfer']
    const samples: DecisionId[] = ['standardized-sampling', 'routine-multi-test']
    const screenings: DecisionId[] = ['escalate-on-screening', 'await-confirmation']
    const fingerprints: string[] = []
    transfers.forEach((transfer) => samples.forEach((sample) => screenings.forEach((screening) => {
      const state = next(playToModule2(transfer, sample, screening))
      fingerprints.push(JSON.stringify({
        transfer: state.module2.transferStatus,
        cleanup: state.module2.additionalVomitingCleanupEvents,
        labDelay: state.module2.laboratoryDelayMinutes,
        investigation: state.module2.exposureInvestigationStarted,
        screeningDecision: state.decisions['M2-3'],
        progress: state.module2.highRiskContactFindingProgress,
      }))
    })))
    expect(new Set(fingerprints).size).toBe(8)
  })
})

const startModule3 = (screening: 'escalate-on-screening' | 'await-confirmation' = 'escalate-on-screening') => {
  let state = playToModule2('backup-transfer', 'standardized-sampling', screening)
  state = next(state) // M2-4 confirmation milestone
  state = next(state) // Module 2 complete
  return simulationReducer(state, { type: 'START_MODULE_3' })
}

function playModule3(
  first: 'classify-investigation-list' | 'uniform-interim-management',
  flight: 'classify-flight-risk' | 'uniform-flight-management',
  missing: 'minimum-info-coordination' | 'await-complete-itinerary',
  screening: 'escalate-on-screening' | 'await-confirmation' = 'escalate-on-screening',
) {
  let state = startModule3(screening)
  state = next(choose(state, first))
  state = next(choose(state, flight))
  return next(choose(state, missing))
}

describe('Module 3 contact investigation and monitoring', () => {
  it('inherits the 92% or 61% M2 tracing context without changing the 126-person source total', () => {
    const full = startModule3('escalate-on-screening')
    const preliminary = startModule3('await-confirmation')
    expect(full.module3.initialHighRiskLocateRate).toBe(0.92)
    expect(full.module3.unresolvedHighRiskWorkload).toBe('lower')
    expect(preliminary.module3.initialHighRiskLocateRate).toBe(0.61)
    expect(preliminary.module3.unresolvedHighRiskWorkload).toBe('higher')
    expect(preliminary.module3.highRiskTracingPressure).toBe('high')
    expect(preliminary.module3.startingTracingPressure).toBe('high')
    expect(full.module3.investigationTotal).toBe(126)
    expect(preliminary.module3.investigationTotal).toBe(126)
    expect(full.metrics.investigationTotal.value).toBe(126)
    expect(full.metrics.initialHighRiskLocateRate.value).toBe(92)
    expect(full.metrics.initialHighRiskLocateRate.context).toContain('不是 M3-1 的 126 人')
    expect(full.metrics.riskContacts.value).toBeNull()
  })

  it('keeps all five investigation groups equal to 126 while preserving information gaps separately', () => {
    const state = startModule3()
    const groups = state.module3.investigationGroups
    expect(groups.family + groups.companions + groups.flight + groups.hospital + groups.transportCommunity).toBe(126)
    expect(groups).toEqual({ family: 2, companions: 2, flight: 39, hospital: 24, transportCommunity: 59 })
    expect(state.module3.missingPhoneNumbers).toBe(18)
    expect(state.module3.incompleteIdentities).toBe(9)
    expect(state.metrics.missingContact.displayValue).toBe('18 电话 / 9 身份')
  })

  it.each(['classify-flight-risk', 'uniform-flight-management'] as const)('%s resolves the source flight classification exactly', (decision) => {
    let state = startModule3()
    state = next(choose(state, 'classify-investigation-list'))
    state = choose(state, decision)
    expect(state.module3.flightReviewCompleted).toBe(true)
    expect(state.module3.flightHighRisk).toBe(7)
    expect(state.module3.flightMediumRisk).toBe(18)
    expect(state.module3.flightLowObservation).toBe(39)
    expect(state.module3.flightExcludedFromActiveMonitoring).toBe(234)
    expect(state.module3.flightExcludedProvenance.kind).toBe('DERIVED_STATE')
    expect(state.metrics.confirmedCases.value).toBe(1)
  })

  it('resolves the delayed missing-person path without converting a 12-person asymptomatic dinner into exposure or infection', () => {
    const state = playModule3('classify-investigation-list', 'classify-flight-risk', 'await-complete-itinerary')
    expect(state.module3.resolutionDelay).toBe('after-24h')
    expect(state.module3.dinnerAttendees).toBe(12)
    expect(state.module3.dinnerOccurredWhileAsymptomatic).toBe(true)
    expect(state.module3.effectiveExposureEvent).toBe(false)
    expect(state.module3.riskCommunicationOnly).toBe(true)
    expect(state.module3.flightHighRisk).toBe(7)
    expect(state.metrics.confirmedCases.value).toBe(1)
    expect(state.metrics.suspectedCases.value).toBe(0)
  })

  it('resolves immediate cross-region coordination within six hours with no new effective exposure', () => {
    const state = playModule3('classify-investigation-list', 'classify-flight-risk', 'minimum-info-coordination')
    expect(state.module3.resolutionDelay).toBe('within-6h')
    expect(state.module3.missingTravelerStatus).toBe('found')
    expect(state.module3.dinnerAttendees).toBe(0)
    expect(state.module3.effectiveExposureEvent).toBe(false)
  })

  it('establishes persistent 21-day monitoring infrastructure and closes high-risk lost-to-follow-up', () => {
    const state = playModule3('uniform-interim-management', 'uniform-flight-management', 'await-complete-itinerary', 'await-confirmation')
    expect(state.phase).toBe('module-complete')
    expect(state.module3.highRiskLostToFollowUpTarget).toBe(0)
    expect(state.module3.highRiskLostToFollowUpActual).toBeNull()
    expect(state.module3.lostToFollowUpStatus).toBe('resolved')
    expect(state.module3.crossRegionCoordinationStatus).toBe('closed-loop')
    expect(state.module3.contactInfrastructureEstablished).toBe(true)
    expect(state.module3.lastExposureTrackingEnabled).toBe(true)
    expect(state.module3.monitoringPhase).toBe('active')
    expect(state.module3.monitoringRecords).toEqual({})
    expect(state.metrics.monitoringStatus.displayValue).toBe('持续健康监测中')
  })

  it('keeps all eight Module 3 decision paths distinguishable without arbitrary scores', () => {
    const first = ['classify-investigation-list', 'uniform-interim-management'] as const
    const flight = ['classify-flight-risk', 'uniform-flight-management'] as const
    const missing = ['minimum-info-coordination', 'await-complete-itinerary'] as const
    const fingerprints: string[] = []
    first.forEach((a) => flight.forEach((b) => missing.forEach((c) => {
      const state = playModule3(a, b, c)
      fingerprints.push(JSON.stringify({
        list: state.module3.initialListManagementMode,
        flight: state.module3.flightManagementMode,
        coordination: state.module3.crossRegionCoordinationMode,
        resolution: state.module3.resolutionDelay,
        dinner: state.module3.dinnerAttendees,
        pressure: state.module3.tracingOperationalPressure,
      }))
    })))
    expect(new Set(fingerprints).size).toBe(8)
  })
})

function startModule4() {
  const module3 = playModule3('classify-investigation-list', 'classify-flight-risk', 'minimum-info-coordination')
  return simulationReducer(module3, { type: 'START_MODULE_4' })
}

function playModule4(
  alert: 'immediate-monitoring-separation' | 'continue-monitoring-assessment',
  care: 'coordinated-child-care' | 'immediate-guardianship',
) {
  let state = startModule4()
  state = next(choose(state, alert))
  state = next(state)
  state = next(choose(state, care))
  return state
}

describe('Module 4 household secondary case and chain interruption', () => {
  it('starts from Shen Jie individual monitoring rather than a global Day counter', () => {
    const state = startModule4()
    expect(state.currentEventId).toBe('M4-1')
    expect(state.module3.monitoringPhase).toBe('active')
    expect(state.module4.shenJieMonitoring.daysSinceLastExposure).toBe(7)
    expect(state.module4.shenJieMonitoring.temperature).toBe(38.1)
    expect(state.module4.shenJieMonitoring.symptoms).toEqual(['乏力', '恶心'])
    expect(state.module4.shenJieMonitoring.monitoringStatus).toBe('alert')
    expect(state.module4.shenJieMonitoring.symptomaticAlert).toBe(true)
  })

  it('timely M4-1 response completes within 50 minutes and adds no high-risk contacts', () => {
    let state = choose(startModule4(), 'immediate-monitoring-separation')
    expect(state.module4.transferStatus).toBe('preparing')
    state = advanceTo(state, '2026-08-10T08:10:00+08:00')
    expect(state.module4.transferStatus).toBe('completed')
    expect(state.module4.transferCompletedWithinMinutes).toBe(50)
    expect(state.module4.additionalHighRiskContacts).toBe(0)
    expect(state.module4.totalHighRiskContacts).toBe(11)
  })

  it('delayed M4-1 response preserves four-hour shared-bathroom exposure and 11 to 16 high-risk change', () => {
    let state = choose(startModule4(), 'continue-monitoring-assessment')
    state = advanceTo(state, '2026-08-10T11:20:00+08:00')
    expect(state.module4.sharedBathroomExposureDurationMinutes).toBe(240)
    expect(state.module4.sharedBathroomExposureOccurred).toBe(true)
    expect(state.module4.additionalHighRiskContacts).toBe(5)
    expect(state.module4.baselineHighRiskContacts).toBe(11)
    expect(state.module4.totalHighRiskContacts).toBe(16)
    expect(state.metrics.confirmedCases.value).toBe(1)
  })

  it.each([
    ['immediate-monitoring-separation', 11],
    ['continue-monitoring-assessment', 16],
  ] as const)('M4-2 confirms Shen Jie without erasing the %s branch', (decision, contacts) => {
    let state = startModule4()
    state = next(choose(state, decision))
    expect(state.currentEventId).toBe('M4-2')
    expect(state.phase).toBe('milestone')
    expect(state.module4.secondaryConfirmed).toBe(true)
    expect(state.module4.confirmationCt).toBe(27.9)
    expect(state.module4.confirmedCases).toBe(2)
    expect(state.metrics.confirmedCases.value).toBe(2)
    expect(state.module4.isolationBedsOccupied).toBe(2)
    expect(state.module4.isolationBedsTotal).toBe(12)
    expect(state.module4.totalHighRiskContacts).toBe(contacts)
    expect(state.module4.secondaryCaseTimelineCreated).toBe(true)
  })

  it('M4-3 coordinated care produces 100% monitoring compliance without infections', () => {
    const state = playModule4('immediate-monitoring-separation', 'coordinated-child-care')
    expect(state.phase).toBe('module-complete')
    expect(state.module4.daughterPcrStatus).toBe('negative')
    expect(state.module4.daughterAsymptomatic).toBe(true)
    expect(state.module4.temperatureMonitoringCompliance).toBe(100)
    expect(state.module4.careStable).toBe(true)
    expect(state.module4.unsupportedChildFamilyInfections).toBe(0)
  })

  it('M4-3 immediate guardianship records the family conflict but no unsupported infection', () => {
    const state = playModule4('continue-monitoring-assessment', 'immediate-guardianship')
    expect(state.module4.familyMonitoringSiteConflictEvent).toBe(true)
    expect(state.module4.totalHighRiskContacts).toBe(16)
    expect(state.module4.unsupportedChildFamilyInfections).toBe(0)
    expect(state.metrics.confirmedCases.value).toBe(2)
  })
})
