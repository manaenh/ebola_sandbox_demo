import { SOURCE_DOCUMENT } from './sourceData'
import type { MetricKey, MetricValue, SimulationAction, SimulationState } from './types'

const source = (locator: string, note?: string) => ({
  kind: 'source' as const,
  document: SOURCE_DOCUMENT,
  locator,
  note,
})

const derived = (locator: string, note: string) => ({
  kind: 'derived' as const,
  document: SOURCE_DOCUMENT,
  locator,
  note,
})

const metric = (
  value: number | null,
  unit: MetricValue['unit'],
  provenance: MetricValue['provenance'],
  context?: string,
): MetricValue => ({ value, unit, provenance, context })

const initialMetrics = (): Record<MetricKey, MetricValue> => ({
  confirmedCases: metric(0, 'cases', derived('M1-1', '确证发生于 M2-4，此时尚无确诊病例')),
  suspectedCases: metric(1, 'cases', derived('M1-1', '当前事件唯一就诊患者')),
  assessmentRequired: metric(null, 'people', source('M1-1'), '尚未完成暴露评估'),
  riskContacts: metric(null, 'people', source('M1-1'), '尚未分类'),
  tracingProgress: metric(null, 'percent', source('M1-1'), '追踪尚未启动'),
  exposureDuration: metric(null, 'minutes', source('M1-1'), '等待决策结果'),
})

export const createInitialState = (runId = 1): SimulationState => ({
  runId,
  nodeId: 'M1-1',
  simulationTime: '2026-08-05T10:42:00+08:00',
  phase: 'deciding',
  scenePhase: 'observing',
  selectedDecision: null,
  activeHotspot: null,
  metrics: initialMetrics(),
  revealedNodes: ['M1-1'],
  eventLog: [
    {
      id: 'm11-arrival',
      time: '10:42',
      title: '急诊分诊卡触发',
      detail: '高热、乏力、腹泻；旅行史仅记录为“非洲出差”。',
      tone: 'active',
    },
  ],
})

export function simulationReducer(
  state: SimulationState,
  action: SimulationAction,
): SimulationState {
  if (action.type === 'SELECT_HOTSPOT') {
    return { ...state, activeHotspot: action.hotspot }
  }

  if (action.type === 'CLEAR_HOTSPOT') {
    return { ...state, activeHotspot: null }
  }

  if (action.type === 'RESET_NODE') {
    return createInitialState(state.runId + 1)
  }

  if (action.type === 'RESOLVE_DECISION') {
    if (state.phase === 'resolved') return state

    if (action.decision === 'rapid-epidemiology') {
      return {
        ...state,
        phase: 'resolved',
        scenePhase: 'isolated',
        selectedDecision: action.decision,
        simulationTime: '2026-08-05T11:05:00+08:00',
        metrics: {
          ...state.metrics,
          exposureDuration: metric(23, 'minutes', source('M1-1｜效果反馈/数据')),
        },
        revealedNodes: [...state.revealedNodes, 'M1-1-A'],
        eventLog: [
          ...state.eventLog,
          {
            id: 'm11-a-isolation',
            time: '11:05',
            title: '患者进入预设隔离区',
            detail: '公共候诊区停留 23 分钟；需评估人员仍待逐一判定。',
            tone: 'complete',
          },
        ],
      }
    }

    return {
      ...state,
      phase: 'resolved',
      scenePhase: 'exposure-event',
      selectedDecision: action.decision,
      simulationTime: '2026-08-05T12:00:00+08:00',
      metrics: {
        ...state.metrics,
        assessmentRequired: metric(
          21,
          'people',
          source('M1-1｜效果反馈/数据'),
          '本事件新增需评估人员，不等同于密切接触者',
        ),
        exposureDuration: metric(78, 'minutes', source('干预前后效果对比｜首诊至隔离')),
      },
      revealedNodes: [...state.revealedNodes, 'M1-1-B'],
      eventLog: [
        ...state.eventLog,
        {
          id: 'm11-b-exposure',
          time: '11:36',
          title: '公共候诊区发生呕吐',
          detail: '污染区域被圈定；相关人员进入暴露评估流程。',
          tone: 'alert',
        },
        {
          id: 'm11-b-isolation',
          time: '12:00',
          title: '患者完成隔离',
          detail: '首诊至隔离 78 分钟，新增需评估人员 21 人。',
          tone: 'complete',
        },
      ],
    }
  }

  return state
}
