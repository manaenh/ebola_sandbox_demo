import { derivedMetric, getEventDefinition, sourceMetric } from './sourceData'
import type {
  EventId,
  MetricKey,
  MetricValue,
  SceneState,
  SimulationAction,
  SimulationState,
} from './types'

const initialMetrics = (): Record<MetricKey, MetricValue> => ({
  confirmedCases: derivedMetric(0, 'cases', 'M1-1', '确证发生于后续模块，此时尚无确诊病例'),
  suspectedCases: derivedMetric(1, 'cases', 'M1-1', '当前事件唯一就诊患者'),
  assessmentRequired: sourceMetric(null, 'people', 'M1-1', '尚未完成暴露评估'),
  riskContacts: sourceMetric(null, 'people', 'M1-1', '尚未分类'),
  tracingProgress: sourceMetric(null, 'percent', 'M1-1', '追踪尚未启动'),
  exposureDuration: sourceMetric(null, 'minutes', 'M1-1', '等待决策结果'),
  publicOpinionRisk: sourceMetric(null, 'status', 'M1-2', '当前尚未触发', '未触发'),
  cdcResponse: sourceMetric(null, 'status', 'M1-3', '等待首次报告决策', '待决策'),
  responseDelay: sourceMetric(null, 'status', 'M1-3', '等待首次报告决策', '待决策'),
})

const initialScene = (): SceneState => ({
  patientLocation: 'triage',
  patientMood: 'unwell',
  interaction: 'none',
  phoneMode: 'none',
  exposureEvent: false,
  cdcResponse: 'none',
})

export const createInitialState = (runId = 1): SimulationState => ({
  runId,
  currentEventId: 'M1-1',
  simulationTime: getEventDefinition('M1-1').isoTime,
  phase: 'deciding',
  activeHotspot: null,
  metrics: initialMetrics(),
  scene: initialScene(),
  persistent: {
    waitingAreaMinutes: null,
    isolationTime: null,
    vomitingExposureOccurred: false,
    assessmentRequired: null,
    patientCooperative: null,
    samplingReady: false,
    communicationDelayMinutes: null,
    earlyPublicOpinionRisk: false,
    cdcResponseStarted: false,
    reportWithin15Minutes: null,
    responseDelayMinutes: 0,
  },
  decisions: {},
  completedEventIds: [],
  situationSummary: getEventDefinition('M1-1').situationSummary,
  eventLog: [{
    id: 'm11-arrival',
    time: '10:42',
    title: '急诊分诊卡触发',
    detail: '高热、乏力、腹泻；旅行史仅记录为“非洲出差”。',
    tone: 'active',
  }],
})

function sceneAtEvent(eventId: EventId, state: SimulationState): SceneState {
  if (eventId === 'M1-2') {
    return {
      ...state.scene,
      patientLocation: state.persistent.isolationTime === '11:05' ? 'isolation' : 'triage',
      patientMood: 'resistant',
      interaction: 'communication',
      phoneMode: 'none',
      exposureEvent: false,
      cdcResponse: 'none',
    }
  }

  if (eventId === 'M1-3') {
    return {
      ...state.scene,
      patientLocation: state.persistent.isolationTime === '11:05' ? 'isolation' : 'triage',
      interaction: 'coordination',
      exposureEvent: false,
      cdcResponse: 'none',
    }
  }

  return initialScene()
}

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

  if (action.type === 'RESET_MODULE') {
    return createInitialState(state.runId + 1)
  }

  if (action.type === 'RESOLVE_DECISION') {
    if (state.phase !== 'deciding') return state

    const event = getEventDefinition(state.currentEventId)
    const option = event.decisions.find((decision) => decision.id === action.decision)
    if (!option) return state

    const effects = option.effects
    return {
      ...state,
      phase: 'resolved',
      simulationTime: effects.simulationTime ?? state.simulationTime,
      activeHotspot: null,
      metrics: { ...state.metrics, ...effects.metricChanges },
      scene: { ...state.scene, ...effects.sceneChanges },
      persistent: { ...state.persistent, ...effects.persistentChanges },
      decisions: { ...state.decisions, [state.currentEventId]: option.id },
      completedEventIds: state.completedEventIds.includes(state.currentEventId)
        ? state.completedEventIds
        : [...state.completedEventIds, state.currentEventId],
      situationSummary: effects.situationSummary,
      eventLog: [...state.eventLog, ...effects.eventLog],
    }
  }

  if (action.type === 'ADVANCE_EVENT') {
    if (state.phase !== 'resolved') return state

    const current = getEventDefinition(state.currentEventId)
    if (!current.nextEvent) {
      return {
        ...state,
        phase: 'module-complete',
        activeHotspot: null,
        situationSummary: '首诊发现与即时控制完成，当前路径已保存。',
      }
    }

    const next = getEventDefinition(current.nextEvent)
    return {
      ...state,
      currentEventId: next.id,
      simulationTime: next.isoTime,
      phase: 'deciding',
      activeHotspot: null,
      scene: sceneAtEvent(next.id, state),
      situationSummary: next.situationSummary,
      eventLog: [
        ...state.eventLog,
        {
          id: `${next.id.toLowerCase()}-injection`,
          time: next.time,
          title: next.title,
          detail: next.description,
          tone: 'active',
        },
      ],
    }
  }

  return state
}
