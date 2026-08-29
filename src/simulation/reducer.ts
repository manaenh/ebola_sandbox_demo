import { derivedMetric, derivedState, getEventDefinition, simulationAssumption, sourceFact, sourceMetric } from './sourceData'
import type {
  EventId, MetricKey, MetricValue, Module1State, Module2State, Module3State, Module4State, SceneState,
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
  transferStatus: sourceMetric(null, 'status', 'M2-1', '转运模块尚未启动', '未启动'),
  transferWait: sourceMetric(null, 'minutes', 'M2-1', '转运模块尚未启动'),
  contaminationPressure: derivedMetric(null, 'status', 'M2-1', '由转运等待与污染处置事件确定', '污染处置压力', '待评估'),
  specimenStatus: sourceMetric(null, 'status', 'M2-2', '采样模块尚未启动', '未采集'),
  laboratoryDelay: sourceMetric(0, 'minutes', 'M2-2', '采样模块尚未启动'),
  exposureInvestigation: sourceMetric(null, 'status', 'M2-2', '尚未触发', '未触发'),
  tracingActivation: sourceMetric(null, 'status', 'M2-3', '初筛事件尚未发生', '未启动'),
  investigationTotal: sourceMetric(null, 'people', 'M3-1', '首轮名单事件尚未注入'),
  initialHighRiskLocateRate: sourceMetric(null, 'percent', 'M2-3', '首批高风险接触者找到率尚未形成'),
  classificationStatus: derivedMetric(null, 'status', 'M3-1', '风险分类尚未启动', '分类状态', '未启动'),
  highRiskContacts: sourceMetric(null, 'people', 'M3-2', '航班风险分类尚未完成'),
  mediumRiskContacts: sourceMetric(null, 'people', 'M3-2', '航班风险分类尚未完成'),
  lowObservationContacts: sourceMetric(null, 'people', 'M3-2', '航班风险分类尚未完成'),
  missingContact: sourceMetric(null, 'status', 'M3-3', '失联人员事件尚未注入', '未发生'),
  monitoringStatus: derivedMetric(null, 'status', 'M3｜21 天管理', '个体监测根据各自最后暴露时间计算', '监测阶段', '未启动'),
  secondaryCaseStatus: sourceMetric(null, 'status', 'M4-1', '沈洁监测报警尚未发生', '未触发'),
  isolationBeds: sourceMetric(1, 'beds', 'M4-2', '续发病例确证前定点医院隔离床占用', '1 / 12'),
  childCareStatus: sourceMetric(null, 'status', 'M4-3', '儿童照护事件尚未发生', '未发生'),
  temperatureMonitoringCompliance: sourceMetric(null, 'percent', 'M4-3', '儿童照护方案尚未形成'),
})

const initialScene = (): SceneState => ({
  kind: 'hospital', patientLocation: 'triage', patientMood: 'unwell', interaction: 'none',
  phoneMode: 'none', exposureEvent: false, cdcResponse: 'none',
  transferVehicle: 'none', transferMotion: 'idle', cleanupEvents: 0, specimenVisual: 'none',
})

const initialModule1 = (): Module1State => ({
  isolationScheduledFor: null,
  isolationCompletedAt: null,
  exposureDurationMinutes: null,
  vomitingExposureOccurred: false,
  additionalAssessmentRequired: 0,
  patientCooperative: null,
  communicationStatus: 'not-started',
  communicationDelayMinutes: null,
  samplingReadiness: 'pending',
  earlyPublicOpinionSignalTriggeredByM1: false,
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

const initialModule2 = (): Module2State => ({
  started: false,
  transferStatus: 'not-started',
  transferCompletedAt: null,
  transferWaitMinutes: 0,
  additionalVomitingCleanupEvents: 0,
  contaminationHandlingWorkload: 'baseline',
  occupationalExposurePressure: 'baseline',
  samplingProtocol: 'pending',
  specimenStatus: 'not-collected',
  specimenReachedLaboratoryAt: null,
  outerPackagingContamination: false,
  exposureInvestigationStarted: false,
  laboratoryDelayMinutes: 0,
  preliminaryPositive: false,
  tracingMode: 'not-started',
  fullTracingActivated: false,
  highRiskContactFindingProgress: null,
  findingProgressAsOf: null,
  confirmed: false,
  confirmationAt: null,
  confirmationCt: null,
  jointCommandActivated: false,
  dailyRiskAssessmentStarted: false,
  consistencyCheckTargetMinutes: null,
  unifiedInformationTargetMinutes: null,
  transferPressure: 'pending',
  laboratoryPressure: 'pending',
  tracingPressure: 'pending',
  overallResponseWorkload: 'pending',
})

const initialModule3 = (): Module3State => ({
  started: false,
  investigationTotal: 126,
  investigationGroups: { family: 2, companions: 2, flight: 39, hospital: 24, transportCommunity: 59 },
  missingPhoneNumbers: 18,
  incompleteIdentities: 9,
  initialHighRiskLocateRate: null,
  startingTracingPressure: 'pending',
  highRiskTracingPressure: 'pending',
  unresolvedHighRiskWorkload: 'pending',
  initialListManagementMode: 'pending',
  investigationStatus: 'pending',
  riskClassificationStatus: 'not-started',
  investigationCompletionTarget24h: 90,
  classificationTarget48h: 100,
  highRiskLostToFollowUpTarget: 0,
  highRiskLostToFollowUpActual: null,
  flightPassengersTotal: 298,
  flightReviewCompleted: false,
  flightManagementMode: 'pending',
  flightHighRisk: null,
  flightMediumRisk: null,
  flightLowObservation: null,
  flightExcludedFromActiveMonitoring: null,
  flightExcludedProvenance: derivedState('M3-2｜全航班复核差额', '234 = 298 - 7 - 18 - 39，为确定性算术派生值'),
  missingTravelerStatus: 'not-started',
  crossRegionCoordinationMode: 'pending',
  crossRegionCoordinationStatus: 'pending',
  resolutionDelay: 'pending',
  dinnerAttendees: 0,
  dinnerOccurredWhileAsymptomatic: false,
  effectiveExposureEvent: false,
  riskCommunicationOnly: false,
  contactInfrastructureEstablished: false,
  lastExposureTrackingEnabled: false,
  monitoringPhase: 'not-started',
  monitoringRecords: {},
  lostToFollowUpStatus: 'none',
  tracingOperationalPressure: 'pending',
})

const initialModule4 = (): Module4State => ({
  started: false,
  shenJieMonitoring: {
    contactId: 'shen-jie', lastExposureAt: '2026-08-03T07:20:00+08:00',
    monitoringStartAt: '2026-08-03T07:20:00+08:00', monitoringEndAt: '2026-08-24T07:20:00+08:00',
    currentMonitoringDay: 8, monitoringStatus: 'active', symptomaticAlert: false,
    daysSinceLastExposure: 7, temperature: 38.1, symptoms: ['乏力', '恶心'],
    provenance: simulationAssumption('M4-1｜沈洁个体监测记录', '源脚本给出距最后接触 7 天；具体时分仅用于个体监测调度'),
  },
  alertTriggered: false, separationStatus: 'pending', transferStatus: 'not-started', transferDelayMinutes: 0,
  transferCompletedWithinMinutes: null, sharedBathroomExposureDurationMinutes: 0, sharedBathroomExposureOccurred: false,
  additionalHighRiskContacts: 0, baselineHighRiskContacts: 11, totalHighRiskContacts: 11,
  secondaryConfirmed: false, confirmationAt: null, confirmationCt: null, sequenceConsistentWithIndex: false,
  secondaryCaseTimelineCreated: false, householdExposureInvestigationStarted: false, confirmedCases: 1,
  isolationBedsOccupied: 1, isolationBedsTotal: 12, daughterAge: 8, daughterPcrStatus: 'pending',
  daughterAsymptomatic: true, guardianAvailable: false, childCareMode: 'pending', careStable: false,
  temperatureMonitoringCompliance: null, familyMonitoringSiteConflictEvent: false, unsupportedChildFamilyInfections: 0,
})

export function deriveModule1State(module1: Module1State): Module1State {
  const exposureControlQuality = module1.isolationScheduledFor === null
    ? 'pending'
    : module1.isolationScheduledFor === '11:05' ? 'good' : 'compromised'
  const cooperationQuality = module1.communicationStatus === 'successful'
    ? 'stable'
    : module1.communicationStatus === 'strained' ? 'strained' : 'pending'
  const contactInformationQuality = module1.communicationStatus === 'successful'
    ? 'improved'
    : module1.communicationStatus === 'strained' ? 'limited' : 'pending'
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
  const communicationComplete = module1.communicationStatus === 'successful' || module1.communicationStatus === 'strained'
  const complete = communicationComplete && module1.reportWithin15Minutes !== null
  const downstreamResponsePressure = !complete
    ? 'pending'
    : expanded && delayed ? 'high'
      : expanded || module1.communicationStatus === 'strained' || delayed ? 'elevated'
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

export function deriveModule2State(module2: Module2State, module1: Module1State): Module2State {
  if (!module2.started) return { ...module2, transferPressure: 'pending', laboratoryPressure: 'pending', tracingPressure: 'pending', overallResponseWorkload: 'pending' }

  const inheritedHigh = module1.downstreamResponsePressure === 'high'
  const inheritedElevated = inheritedHigh || module1.downstreamResponsePressure === 'elevated'
  const transferProblem = module2.transferStatus === 'waiting'
    || module2.transferStatus === 'completed-after-wait'
    || module2.additionalVomitingCleanupEvents > 0
  const transferPressure = transferProblem
    ? inheritedElevated ? 'high' : 'elevated'
    : inheritedHigh ? 'elevated' : 'controlled'
  const laboratoryPressure = module2.samplingProtocol === 'pending'
    ? 'pending'
    : module2.laboratoryDelayMinutes > 0 ? 'delayed' : 'controlled'
  const tracingPressure = module2.highRiskContactFindingProgress === null
    ? 'pending'
    : module2.highRiskContactFindingProgress === 61
      ? inheritedElevated || laboratoryPressure === 'delayed' ? 'high' : 'elevated'
      : inheritedHigh || laboratoryPressure === 'delayed' ? 'elevated' : 'controlled'

  const delayedFullTracing = module2.tracingMode === 'preliminary' && !module2.fullTracingActivated
  const pressureCount = Number(inheritedElevated) + Number(transferProblem) + Number(module2.laboratoryDelayMinutes > 0) + Number(delayedFullTracing)
  const overallResponseWorkload = pressureCount >= 4 ? 'severe'
    : pressureCount >= 3 ? 'high'
      : pressureCount >= 1 ? 'elevated'
        : 'controlled'

  return { ...module2, transferPressure, laboratoryPressure, tracingPressure, overallResponseWorkload }
}

export function deriveModule3State(module3: Module3State, module2: Module2State): Module3State {
  if (!module3.started) return { ...module3, startingTracingPressure: 'pending', highRiskTracingPressure: 'pending', unresolvedHighRiskWorkload: 'pending', tracingOperationalPressure: 'pending' }

  const module2Progress = module2.highRiskContactFindingProgress
  const initialHighRiskLocateRate: 0.92 | 0.61 | null = module3.initialHighRiskLocateRate
    ?? (module2Progress === 61 ? 0.61 : module2Progress === 92 ? 0.92 : null)
  const inheritedModulePressure = module2.overallResponseWorkload === 'high' || module2.overallResponseWorkload === 'severe'
  const highRiskTracingPressure = initialHighRiskLocateRate === 0.61 ? 'high' : initialHighRiskLocateRate === 0.92 ? 'controlled' : 'pending'
  const unresolvedHighRiskWorkload = initialHighRiskLocateRate === 0.61 ? 'higher' : initialHighRiskLocateRate === 0.92 ? 'lower' : 'pending'
  const startingTracingPressure = initialHighRiskLocateRate === 0.61
    ? 'high'
    : inheritedModulePressure ? 'elevated' : 'controlled'
  const pressureCount = Number(startingTracingPressure === 'high' || startingTracingPressure === 'elevated')
    + Number(module3.initialListManagementMode === 'uniform-interim')
    + Number(module3.flightManagementMode === 'uniform-interim')
    + Number(module3.crossRegionCoordinationMode === 'awaiting-details' && module3.missingTravelerStatus !== 'found')
  const tracingOperationalPressure = pressureCount >= 4 ? 'severe'
    : pressureCount >= 3 ? 'high'
      : pressureCount >= 1 ? 'elevated'
        : 'controlled'

  return { ...module3, initialHighRiskLocateRate, startingTracingPressure, highRiskTracingPressure, unresolvedHighRiskWorkload, tracingOperationalPressure }
}

export const createInitialState = (runId = 1): SimulationState => ({
  runId,
  module: 1,
  currentEventId: 'M1-1',
  simulationTime: getEventDefinition('M1-1').isoTime,
  phase: 'deciding',
  activeHotspot: null,
  metrics: initialMetrics(),
  scene: initialScene(),
  module1: initialModule1(),
  module2: initialModule2(),
  module3: initialModule3(),
  module4: initialModule4(),
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
    module2: deriveModule2State({ ...state.module2, ...effects.module2Changes }, state.module1),
    module3: deriveModule3State({ ...state.module3, ...effects.module3Changes }, state.module2),
    module4: { ...state.module4, ...effects.module4Changes },
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
  if (eventId === 'M2-1') {
    return {
      ...state.scene,
      kind: 'transport', patientLocation: 'isolation', interaction: 'transfer-preparation',
      transferVehicle: 'none', transferMotion: 'idle', cleanupEvents: 0, specimenVisual: 'none',
    }
  }
  if (eventId === 'M2-2') {
    return {
      ...state.scene,
      kind: 'sampling', patientLocation: 'designated-hospital', interaction: 'none',
      transferVehicle: state.module2.transferStatus === 'completed' ? 'backup' : 'regular',
      transferMotion: 'arrived', specimenVisual: 'preparing',
    }
  }
  if (eventId === 'M2-3' || eventId === 'M2-4') {
    return {
      ...state.scene,
      kind: 'laboratory', patientLocation: 'designated-hospital',
      interaction: eventId === 'M2-4' ? 'confirmation' : 'laboratory-alert',
      specimenVisual: 'received',
    }
  }
  if (eventId === 'M3-1') {
    return {
      ...state.scene,
      kind: 'tracing-command', interaction: 'contact-investigation', patientLocation: 'designated-hospital',
      specimenVisual: 'received',
    }
  }
  if (eventId === 'M3-2') {
    return {
      ...state.scene,
      kind: 'aircraft', interaction: 'flight-classification', patientLocation: 'designated-hospital',
    }
  }
  if (eventId === 'M3-3') {
    return {
      ...state.scene,
      kind: 'cross-region', interaction: 'cross-region-coordination', patientLocation: 'designated-hospital',
    }
  }
  if (eventId === 'M4-1') return { ...state.scene, kind: 'monitoring-point', interaction: 'monitoring-alert', patientLocation: 'designated-hospital', transferMotion: 'idle', exposureEvent: false }
  if (eventId === 'M4-2') return { ...state.scene, kind: 'secondary-confirmation', interaction: 'secondary-confirmation', patientLocation: 'designated-hospital', specimenVisual: 'received' }
  if (eventId === 'M4-3') return { ...state.scene, kind: 'child-care', interaction: 'child-care-coordination', patientLocation: 'designated-hospital', phoneMode: 'none' }
  return initialScene()
}

function enterModule2Event(state: SimulationState, eventId: EventId): SimulationState {
  const event = getEventDefinition(eventId)
  const advanced = advanceSimulationTime(state, event.isoTime)
  let module2 = { ...advanced.module2, started: true }
  let metrics = advanced.metrics

  if (eventId === 'M2-2' && module2.transferStatus === 'waiting') {
    module2 = { ...module2, transferStatus: 'completed-after-wait' }
    metrics = {
      ...metrics,
      transferStatus: derivedMetric(null, 'status', 'M2-1｜等待路径后续状态', '源脚本未提供等待路径的确切接收时刻', '等待后完成'),
    }
  }
  if (eventId === 'M2-3') {
    module2 = { ...module2, preliminaryPositive: true }
  }
  module2 = deriveModule2State(module2, advanced.module1)

  if (eventId === 'M2-4') {
    const confirmedModule2 = deriveModule2State({
      ...module2,
      confirmed: true,
      confirmationAt: '18:40',
      confirmationCt: 22.6,
      jointCommandActivated: true,
      dailyRiskAssessmentStarted: true,
      consistencyCheckTargetMinutes: 30,
      unifiedInformationTargetMinutes: 120,
      tracingMode: 'full',
      fullTracingActivated: true,
    }, advanced.module1)
    return {
      ...advanced,
      module: 2,
      currentEventId: eventId,
      phase: 'milestone',
      activeHotspot: null,
      metrics: {
        ...metrics,
        confirmedCases: sourceMetric(1, 'cases', 'M2-4｜效果反馈/数据', '复核实验室报告 EBOV 核酸阳性'),
        suspectedCases: derivedMetric(0, 'cases', 'M2-4｜病例状态更新', '同一病例由疑似状态转为实验室确诊'),
        cdcResponse: sourceMetric(null, 'status', 'M2-4｜干预和措施', '联合指挥机制及每日风险评估启动', '联合响应已启动'),
        tracingActivation: sourceMetric(null, 'status', 'M2-4｜确证后状态', '等待复核路径在此时全面启动', '已启动'),
      },
      module2: confirmedModule2,
      scene: sceneAtEvent(eventId, { ...advanced, module2: confirmedModule2 }),
      situationSummary: event.situationSummary,
      eventLog: [...advanced.eventLog, {
        id: 'm24-confirmed', time: '18:40', title: 'EBOV 核酸复核阳性',
        detail: 'Ct 22.6，样本符合质量要求；联合指挥与每日风险评估启动。', tone: 'alert',
      }],
    }
  }

  return {
    ...advanced,
    module: 2,
    currentEventId: eventId,
    phase: 'deciding',
    activeHotspot: null,
    metrics,
    module2,
    scene: sceneAtEvent(eventId, { ...advanced, module2 }),
    situationSummary: event.situationSummary,
    eventLog: [...advanced.eventLog, {
      id: `${eventId.toLowerCase()}-injection`, time: event.time, title: event.title,
      detail: event.description, tone: eventId === 'M2-3' ? 'alert' : 'active',
    }],
  }
}

function enterModule3Event(state: SimulationState, eventId: EventId): SimulationState {
  const event = getEventDefinition(eventId)
  const advanced = advanceSimulationTime(state, event.isoTime)
  const module2Progress = advanced.module2.highRiskContactFindingProgress
  const initialHighRiskLocateRate: 0.92 | 0.61 | null = module2Progress === 61 ? 0.61 : module2Progress === 92 ? 0.92 : null
  let module3 = deriveModule3State({
    ...advanced.module3,
    started: true,
    initialHighRiskLocateRate,
  }, advanced.module2)
  let metrics = advanced.metrics

  if (eventId === 'M3-1') {
    metrics = {
      ...metrics,
      investigationTotal: sourceMetric(126, 'people', 'M3-1｜首轮需调查名单', '需调查人员，不等同于密切接触者'),
      initialHighRiskLocateRate: sourceMetric(module2Progress, 'percent', 'M2-3｜18:00 首批高风险接触者找到率', '该比率不是 M3-1 的 126 人调查名单完成率'),
      classificationStatus: derivedMetric(null, 'status', 'M3-1｜事件注入', '126 人尚待依据实际暴露逐人分类', '分类状态', '待分类'),
      missingContact: sourceMetric(null, 'status', 'M3-1｜信息质量', '18 人缺电话号码、9 人身份信息不完整；两类信息缺口不得相加为互斥人数', '18 电话 / 9 身份'),
    }
  }
  if (eventId === 'M3-3') {
    metrics = {
      ...metrics,
      missingContact: sourceMetric(1, 'people', 'M3-3｜事件注入', '一名同行人员当前失联', '失联查找中'),
    }
    module3 = deriveModule3State({ ...module3, missingTravelerStatus: 'searching', lostToFollowUpStatus: 'active' }, advanced.module2)
  }

  return {
    ...advanced,
    module: 3,
    currentEventId: eventId,
    phase: 'deciding',
    activeHotspot: null,
    metrics,
    module3,
    scene: sceneAtEvent(eventId, { ...advanced, module3 }),
    situationSummary: event.situationSummary,
    eventLog: [...advanced.eventLog, {
      id: `${eventId.toLowerCase()}-injection`, time: event.time, title: event.title,
      detail: event.description, tone: eventId === 'M3-3' ? 'alert' : 'active',
    }],
  }
}

function enterModule4Event(state: SimulationState, eventId: EventId): SimulationState {
  const event = getEventDefinition(eventId)
  const advanced = advanceSimulationTime(state, event.isoTime)
  let module4 = { ...advanced.module4, started: true }
  let metrics = advanced.metrics
  let phase: SimulationState['phase'] = event.kind === 'milestone' ? 'milestone' : 'deciding'

  if (eventId === 'M4-1') {
    const shenJieMonitoring = {
      ...module4.shenJieMonitoring,
      monitoringStatus: 'alert' as const,
      symptomaticAlert: true,
    }
    module4 = { ...module4, alertTriggered: true, shenJieMonitoring }
    metrics = {
      ...metrics,
      secondaryCaseStatus: sourceMetric(null, 'status', 'M4-1｜监测报警', '沈洁 38.1℃、乏力、恶心，距最后接触 7 天', '症状报警'),
      monitoringStatus: sourceMetric(null, 'status', 'M4-1｜个体健康监测', '沈洁个人监测记录触发报警', '个体报警'),
      transferStatus: derivedMetric(null, 'status', 'M4-1｜事件注入', '等待分离与转运决策', '待决策'),
      highRiskContacts: sourceMetric(11, 'people', 'M4-1｜高风险接触者基线', '延迟路径可由 11 增至 16'),
    }
  }

  if (eventId === 'M4-2') {
    module4 = {
      ...module4, secondaryConfirmed: true, confirmationAt: '15:30', confirmationCt: 27.9,
      sequenceConsistentWithIndex: true, secondaryCaseTimelineCreated: true,
      householdExposureInvestigationStarted: true, confirmedCases: 2,
      isolationBedsOccupied: 2, isolationBedsTotal: 12,
    }
    metrics = {
      ...metrics,
      confirmedCases: sourceMetric(2, 'cases', 'M4-2｜效果反馈/数据', '沈洁按续发病例管理，确诊病例增至 2 例'),
      secondaryCaseStatus: sourceMetric(null, 'status', 'M4-2｜检测结果', 'EBOV 核酸阳性，Ct 27.9；序列与指示病例高度一致', '已确诊 · Ct 27.9'),
      isolationBeds: sourceMetric(2, 'beds', 'M4-2｜资源状态', '隔离床占用 2/12', '2 / 12'),
      highRiskContacts: sourceMetric(module4.totalHighRiskContacts, 'people', 'M4-1｜分支结果', module4.additionalHighRiskContacts === 5 ? '延迟分离使高风险接触者由 11 增至 16' : '及时分离未新增高风险接触者'),
    }
  }

  if (eventId === 'M4-3') {
    module4 = { ...module4, daughterPcrStatus: 'negative', daughterAsymptomatic: true, guardianAvailable: false }
    metrics = {
      ...metrics,
      childCareStatus: sourceMetric(null, 'status', 'M4-3｜事件注入', '女儿核酸阴性、无症状且当前无监护人', '阴性 · 无症状'),
      temperatureMonitoringCompliance: sourceMetric(null, 'percent', 'M4-3｜照护决策前', '等待照护方案'),
    }
  }

  return {
    ...advanced, module: 4, currentEventId: eventId, phase, activeHotspot: null, metrics, module4,
    scene: sceneAtEvent(eventId, { ...advanced, module4 }), situationSummary: event.situationSummary,
    eventLog: [...advanced.eventLog, {
      id: `${eventId.toLowerCase()}-injection`, time: event.time, title: event.title,
      detail: event.description, tone: eventId === 'M4-1' || eventId === 'M4-2' ? 'alert' : 'active',
      provenance: sourceFact(`${eventId}｜事件注入`),
    }],
  }
}

export function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
  if (action.type === 'SELECT_HOTSPOT') return { ...state, activeHotspot: action.hotspot }
  if (action.type === 'CLEAR_HOTSPOT') return { ...state, activeHotspot: null }
  if (action.type === 'RESET_MODULE') return createInitialState(state.runId + 1)
  if (action.type === 'ADVANCE_TIME') return advanceSimulationTime(state, action.simulationTime)
  if (action.type === 'START_MODULE_2') {
    if (state.module !== 1 || state.phase !== 'module-complete') return state
    return enterModule2Event(state, 'M2-1')
  }
  if (action.type === 'START_MODULE_3') {
    if (state.module !== 2 || state.phase !== 'module-complete') return state
    return enterModule3Event(state, 'M3-1')
  }
  if (action.type === 'START_MODULE_4') {
    if (state.module !== 3 || state.phase !== 'module-complete') return state
    return enterModule4Event(state, 'M4-1')
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
      activeHotspot: null,
      metrics: { ...state.metrics, ...effects.metricChanges },
      scene: { ...state.scene, ...effects.sceneChanges },
      module1: deriveModule1State({ ...state.module1, ...effects.module1Changes }),
      module2: deriveModule2State({ ...state.module2, ...effects.module2Changes }, state.module1),
      module3: deriveModule3State({ ...state.module3, ...effects.module3Changes }, state.module2),
      module4: { ...state.module4, ...effects.module4Changes },
      scheduledConsequences: [...state.scheduledConsequences, ...(effects.scheduledConsequences ?? [])],
      decisions: { ...state.decisions, [state.currentEventId]: option.id },
      completedEventIds: state.completedEventIds.includes(state.currentEventId)
        ? state.completedEventIds : [...state.completedEventIds, state.currentEventId],
      situationSummary: effects.situationSummary,
      eventLog: [...state.eventLog, ...effects.eventLog],
    }
  }

  if (action.type === 'ADVANCE_EVENT') {
    if (state.phase === 'milestone' && state.currentEventId === 'M2-4') {
      return {
        ...state,
        phase: 'module-complete',
        activeHotspot: null,
        situationSummary: '转运、采样与实验室确证完成，深圳联合响应网络已经形成。',
      }
    }
    if (state.phase === 'milestone' && state.currentEventId === 'M4-2') {
      const completedMilestone = state.completedEventIds.includes('M4-2')
        ? state
        : { ...state, completedEventIds: [...state.completedEventIds, 'M4-2' as const] }
      return enterModule4Event(completedMilestone, 'M4-3')
    }
    if (state.phase !== 'resolved') return state
    const current = getEventDefinition(state.currentEventId)
    if (!current.nextEvent && current.module === 3) {
      const selected = state.decisions['M3-3']
      const completionTime = selected === 'minimum-info-coordination'
        ? '2026-08-08T22:00:00+08:00'
        : '2026-08-09T16:01:00+08:00'
      const completed = advanceSimulationTime(state, completionTime)
      const module3 = deriveModule3State({
        ...completed.module3,
        investigationStatus: 'classified',
        riskClassificationStatus: 'completed',
        contactInfrastructureEstablished: true,
        lastExposureTrackingEnabled: true,
        monitoringPhase: 'active',
      }, completed.module2)
      return {
        ...completed,
        module: 3,
        phase: 'module-complete',
        activeHotspot: null,
        module3,
        metrics: {
          ...completed.metrics,
          classificationStatus: derivedMetric(null, 'status', 'M3｜模块完成态', '接触者调查与风险分类体系已建立', '分类状态', '体系已建立'),
          monitoringStatus: derivedMetric(null, 'status', 'M3｜21 天管理启动', '个体监测周期由各自最后暴露时间计算', '监测阶段', '持续健康监测中'),
        },
        situationSummary: '接触者调查体系已建立，当前进入持续健康监测阶段。',
      }
    }
    if (!current.nextEvent && current.module === 4) {
      return {
        ...state, phase: 'module-complete', activeHotspot: null,
        situationSummary: '家庭续发病例已纳入隔离治疗，传播链与接触者管理完成更新；儿童照护进入持续支持阶段。',
      }
    }
    if (!current.nextEvent) {
      const completionTime = '2026-08-05T12:00:00+08:00'
      const completed = advanceSimulationTime(state, completionTime)
      return {
        ...completed,
        module: 1,
        phase: 'module-complete',
        activeHotspot: null,
        situationSummary: '首诊发现与即时控制完成，当前路径及其后果已保存。',
      }
    }

    if (current.nextEvent.startsWith('M2-')) return enterModule2Event(state, current.nextEvent)
    if (current.nextEvent.startsWith('M3-')) return enterModule3Event(state, current.nextEvent)
    if (current.nextEvent.startsWith('M4-')) return enterModule4Event(state, current.nextEvent)

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
