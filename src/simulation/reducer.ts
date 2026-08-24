import { derivedMetric, getEventDefinition, sourceMetric } from './sourceData'
import type {
  EventId, MetricKey, MetricValue, Module1State, SceneState,
  ScheduledConsequence, SimulationAction, SimulationState,
} from './types'

const initialMetrics = (): Record<MetricKey, MetricValue> => ({
  confirmedCases: derivedMetric(0, 'cases', 'M1-1', '确认发生于后续模块，此时尚无确诊病例'),
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
  patientLocation: 'triage', patientMood: 'unwell', interaction: 'none',
  phoneMode: 'none', exposureEvent: false, cdcResponse: 'none',
})

const initialModule1 = (): Module1State => ({
  isolationScheduledFor: null,
  isolationCompletedAt: null,
  exposureDurationMinutes: null,
  vomitingExposureOccurred: false,
  additionalAssessmentRequired: 0,
  patientCooperative: null,
  communicationDelayMinutes: null,
  samplingReadiness: 'pending',
  earlyPublicOpinionRisk: false,
  cdcResponseStarted: false,
  reportWithin15Minutes: null,
  responseDelayMinutes: 0,
  cdcArrival: null,
  tracingWorkload: 'pending',
  exposureControlQuality: 'pending',
  cooperationQuality: 'pending',
  contactInformationQuality: 'pending',
  responseSpeed: 'pending',
  downstreamResponsePressure: 'pending',
})

export function deriveModule1State(module1: Module1State): Module1State {
  const exposureControlQuality = module1.isolationScheduledFor === null
    ? 'pending'
    : module1.isolationScheduledFor === '11:05' ? 'good' : 'compromised'
  const cooperationQuality = module1.patientCooperative === null
    ? 'pending'
    : module1.patientCooperative ? 'stable' : 'strained'
  const contactInformationQuality = module1.patientCooperative === null
    ? 'pending'
    : module1.patientCooperative ? 'improved' : 'limited'
  const responseSpeed = module1.reportWithin15Minutes === null
    ? 'pending'
    : module1.reportWithin15Minutes ? 'timely' : 'delayed'
  const expanded = module1.isolationScheduledFor === '12:00'
  const delayed = module1.reportWithin15Minutes === false
  const tracingWorkload = module1.isolationScheduledFor === null
    ? 'pending'
    : expanded && delayed ? 'expanded-delayed'
      : expanded ? 'expanded'
        : delayed ? 'delayed-start'
          : 'contained'
  const complete = module1.patientCooperative !== null && module1.reportWithin15Minutes !== null
  const downstreamResponsePressure = !complete
    ? 'pending'
    : expanded && delayed ? 'high'
      : expanded || module1.patientCooperative === false || delayed ? 'elevated'
        : 'controlled'

  return {
    ...module1,
    exposureControlQuality,
    cooperationQuality,
    contactInformationQuality,
    responseSpeed,
    tracingWorkload,
    downstreamResponsePressure,
  }
}

export const createInitialState = (runId = 1): SimulationState => ({
  runId,
  currentEventId: 'M1-1',
  simulationTime: getEventDefinition('M1-1').isoTime,
  phase: 'deciding',
  activeHotspot: null,
  metrics: initialMetrics(),
  scene: initialScene(),
  module1: initialModule1(),
  scheduledConsequences: [],
  decisions: {},
  completedEventIds: [],
  situationSummary: getEventDefinition('M1-1').situationSummary,
  eventLog: [{
    id: 'm11-arrival', time: '10:42', title: '急诊分诊卡触发',
    detail: '高热、乏力、腹泻；旅行史仅记录为“非洲出差”。', tone: 'active',
  }],
})

function applyScheduledConsequence(state: SimulationState, consequence: ScheduledConsequence): SimulationState {
  const effects = consequence.effects
  return {
    ...state,
    metrics: { ...state.metrics, ...effects.metricChanges },
    module1: deriveModule1State({ ...state.module1, ...effects.module1Changes }),
    scene: { ...state.scene, ...effects.sceneChanges },
    eventLog: [...state.eventLog, ...(effects.eventLog ?? [])],
  }
}

export function advanceSimulationTime(state: SimulationState, simulationTime: string): SimulationState {
  if (Date.parse(simulationTime) < Date.parse(state.simulationTime)) return state

  const due = state.scheduledConsequences
    .filter((item) => Date.parse(item.executeAt) <= Date.parse(simulationTime))
    .sort((a, b) => Date.parse(a.executeAt) - Date.parse(b.executeAt))
  const pendingIds = new Set(due.map((item) => item.id))
  let advanced: SimulationState = {
    ...state,
    simulationTime,
    scheduledConsequences: state.scheduledConsequences.filter((item) => !pendingIds.has(item.id)),
  }
  due.forEach((consequence) => { advanced = applyScheduledConsequence(advanced, consequence) })
  return advanced
}

function sceneAtEvent(eventId: EventId, state: SimulationState): SceneState {
  if (eventId === 'M1-2') {
    return {
      ...state.scene,
      patientMood: 'resistant',
      interaction: 'communication',
      phoneMode: 'none',
      cdcResponse: 'none',
    }
  }
  if (eventId === 'M1-3') {
    return { ...state.scene, interaction: 'coordination', cdcResponse: 'none' }
  }
  return initialScene()
}

export function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
  if (action.type === 'SELECT_HOTSPOT') return { ...state, activeHotspot: action.hotspot }
  if (action.type === 'CLEAR_HOTSPOT') return { ...state, activeHotspot: null }
  if (action.type === 'RESET_MODULE') return createInitialState(state.runId + 1)
  if (action.type === 'ADVANCE_TIME') return advanceSimulationTime(state, action.simulationTime)

  if (action.type === 'RESOLVE_DECISION') {
    if (state.phase !== 'deciding') return state
    const event = getEventDefinition(state.currentEventId)
    const option = event.decisions.find((decision) => decision.id === action.decision)
    if (!option) return state
    const effects = option.effects
    return {
      ...state,
      phase: 'resolved',
      activeHotspot: null,
      metrics: { ...state.metrics, ...effects.metricChanges },
      scene: { ...state.scene, ...effects.sceneChanges },
      module1: deriveModule1State({ ...state.module1, ...effects.module1Changes }),
      scheduledConsequences: [...state.scheduledConsequences, ...(effects.scheduledConsequences ?? [])],
      decisions: { ...state.decisions, [state.currentEventId]: option.id },
      completedEventIds: state.completedEventIds.includes(state.currentEventId)
        ? state.completedEventIds : [...state.completedEventIds, state.currentEventId],
      situationSummary: effects.situationSummary,
      eventLog: [...state.eventLog, ...effects.eventLog],
    }
  }

  if (action.type === 'ADVANCE_EVENT') {
    if (state.phase !== 'resolved') return state
    const current = getEventDefinition(state.currentEventId)
    if (!current.nextEvent) {
      const completionTime = state.module1.responseDelayMinutes === 130
        ? '2026-08-05T13:30:00+08:00'
        : '2026-08-05T12:00:00+08:00'
      const completed = advanceSimulationTime(state, completionTime)
      return {
        ...completed,
        phase: 'module-complete',
        activeHotspot: null,
        situationSummary: '首诊发现与即时控制完成，当前路径及其后果已保存。',
      }
    }

    const next = getEventDefinition(current.nextEvent)
    const advanced = advanceSimulationTime(state, next.isoTime)
    return {
      ...advanced,
      currentEventId: next.id,
      phase: 'deciding',
      activeHotspot: null,
      scene: sceneAtEvent(next.id, advanced),
      situationSummary: next.situationSummary,
      eventLog: [...advanced.eventLog, {
        id: `${next.id.toLowerCase()}-injection`, time: next.time, title: next.title,
        detail: next.description, tone: 'active',
      }],
    }
  }

  return state
}
