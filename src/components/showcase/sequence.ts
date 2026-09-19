import type { SimulationAction, SimulationState } from '../../simulation/types'
import { showcaseTiming } from './timing'

export const openingStops = ['airport', 'home', 'convenience-store', 'ride-hailing', 'central-hospital'] as const

// Apply only the first visible M1-1 consequence, without entering another event.
export function openingConsequenceTime(state: SimulationState) {
  if (state.currentEventId !== 'M1-1' || state.phase !== 'resolved') return undefined
  return state.scheduledConsequences.find((item) => item.sourceEventId === 'M1-1')?.executeAt
}

export const responseStages = ['incident', 'coordination', 'transfer-scene', 'transfer', 'sampling-scene', 'laboratory', 'confirmation', 'escalation'] as const
export type ResponseStage = typeof responseStages[number]
export const transferCutawayAnimationMs = showcaseTiming.transferCutawayAnimation
export const samplingCutawayAnimationMs = showcaseTiming.samplingCutawayAnimation
export const cutawayStageMs = showcaseTiming.cutawayStage

export const responseSentences: Partial<Record<ResponseStage, string>> = {
  incident: '11:20｜医院上报疑似病例，疾控介入响应',
  coordination: '11:20｜疾控中心与卫健委启动协同响应',
  'transfer-scene': '12:05｜转运组接患者离开市中心医院',
  transfer: '12:05｜患者从市中心医院转运至定点医院',
  'sampling-scene': '13:30｜定点医院完成采样与包装',
  laboratory: '13:30｜完成采样，标本送往市级实验室',
}

// Move through the existing reducer's smaller events before the flight hero decision.
export function flightEntryActions(state: SimulationState): SimulationAction[] {
  if (state.currentEventId !== 'M2-4' || state.phase !== 'milestone') return []
  return [
    { type: 'ADVANCE_EVENT' },
    { type: 'START_MODULE_3' },
    { type: 'RESOLVE_DECISION', decision: 'classify-investigation-list' },
    { type: 'ADVANCE_EVENT' },
  ]
}

export function crossRegionEntryActions(state: SimulationState): SimulationAction[] {
  if (state.currentEventId !== 'M3-2' || state.phase !== 'resolved') return []
  return [
    { type: 'ADVANCE_EVENT' },
    { type: 'RESOLVE_DECISION', decision: 'minimum-info-coordination' },
    { type: 'ADVANCE_TIME', simulationTime: '2026-08-08T22:00:00+08:00' },
    { type: 'ADVANCE_EVENT' },
  ]
}

export function monitoringConsequenceTime(state: SimulationState) {
  if (state.currentEventId !== 'M4-1' || state.phase !== 'resolved') return undefined
  return state.scheduledConsequences.find((item) => item.sourceEventId === 'M4-1')?.executeAt
}

// These are presentation cues; the reducer remains the source of every resulting value.
export function curatedActions(stage: ResponseStage, state: SimulationState): SimulationAction[] {
  if (stage === 'incident' && state.currentEventId === 'M1-1' && state.phase === 'resolved') return [
    { type: 'ADVANCE_EVENT' },
    { type: 'RESOLVE_DECISION', decision: 'risk-communication' },
    { type: 'ADVANCE_EVENT' },
    { type: 'RESOLVE_DECISION', decision: 'early-report' },
    { type: 'ADVANCE_EVENT' },
  ]
  if (stage === 'transfer-scene' && state.module === 1 && state.phase === 'module-complete') return [
    { type: 'START_MODULE_2' },
    { type: 'RESOLVE_DECISION', decision: 'backup-transfer' },
  ]
  if (stage === 'transfer' && state.currentEventId === 'M2-1' && state.phase === 'resolved') return [
    { type: 'ADVANCE_TIME', simulationTime: '2026-08-05T13:10:00+08:00' },
  ]
  if (stage === 'sampling-scene' && state.currentEventId === 'M2-1' && state.phase === 'resolved') return [
    { type: 'ADVANCE_EVENT' },
    { type: 'RESOLVE_DECISION', decision: 'standardized-sampling' },
  ]
  if (stage === 'laboratory' && state.currentEventId === 'M2-2' && state.phase === 'resolved') return [
    { type: 'ADVANCE_TIME', simulationTime: '2026-08-05T17:40:00+08:00' },
    { type: 'ADVANCE_EVENT' },
    { type: 'RESOLVE_DECISION', decision: 'escalate-on-screening' },
  ]
  if (stage === 'confirmation' && state.currentEventId === 'M2-3' && state.phase === 'resolved') return [
    { type: 'ADVANCE_EVENT' },
  ]
  return []
}
