export type ProvenanceKind = 'source' | 'derived' | 'assumption' | 'unknown'

export type Provenance = {
  kind: ProvenanceKind
  document: string
  locator: string
  note?: string
}

export type MetricValue = {
  value: number | null
  displayValue?: string
  unit: 'people' | 'cases' | 'minutes' | 'percent' | 'beds' | 'status'
  provenance: Provenance
  context?: string
}

export type MetricKey =
  | 'confirmedCases'
  | 'suspectedCases'
  | 'assessmentRequired'
  | 'riskContacts'
  | 'tracingProgress'
  | 'exposureDuration'
  | 'publicOpinionRisk'
  | 'cdcResponse'
  | 'responseDelay'

export type EventId = 'M1-1' | 'M1-2' | 'M1-3'

export type SceneState = {
  patientLocation: 'triage' | 'isolation'
  patientMood: 'unwell' | 'resistant' | 'cooperative' | 'distressed'
  interaction: 'none' | 'isolation-route' | 'communication' | 'coordination'
  phoneMode: 'none' | 'family-video' | 'short-video'
  exposureEvent: boolean
  cdcResponse: 'none' | 'active' | 'delayed'
}

export type HotspotId =
  | 'zhou-qihang'
  | 'triage-nurse'
  | 'triage-desk'
  | 'waiting-area'
  | 'isolation-route'

export type DecisionId =
  | 'rapid-epidemiology'
  | 'staged-assessment'
  | 'risk-communication'
  | 'direct-procedure'
  | 'early-report'
  | 'await-tests'

export type EventLogEntry = {
  id: string
  time: string
  title: string
  detail: string
  tone: 'neutral' | 'active' | 'alert' | 'complete'
}

export type Module1State = {
  isolationScheduledFor: string | null
  isolationCompletedAt: string | null
  exposureDurationMinutes: number | null
  vomitingExposureOccurred: boolean
  additionalAssessmentRequired: number

  patientCooperative: boolean | null
  communicationDelayMinutes: number | null
  samplingReadiness: 'pending' | 'improved' | 'blocked'
  earlyPublicOpinionRisk: boolean

  cdcResponseStarted: boolean
  reportWithin15Minutes: boolean | null
  responseDelayMinutes: number
  cdcArrival: 'before-12:00' | null

  tracingWorkload: 'pending' | 'contained' | 'expanded' | 'delayed-start' | 'expanded-delayed'
  exposureControlQuality: 'pending' | 'good' | 'compromised'
  cooperationQuality: 'pending' | 'stable' | 'strained'
  contactInformationQuality: 'pending' | 'improved' | 'limited'
  responseSpeed: 'pending' | 'timely' | 'delayed'
  downstreamResponsePressure: 'pending' | 'controlled' | 'elevated' | 'high'
}

export type ScheduledConsequenceEffects = {
  metricChanges?: Partial<Record<MetricKey, MetricValue>>
  module1Changes?: Partial<Module1State>
  sceneChanges?: Partial<SceneState>
  eventLog?: EventLogEntry[]
}

export type ScheduledConsequence = {
  id: string
  type: 'patient-isolated' | 'vomiting-exposure' | 'response-delay-elapsed'
  sourceEventId: EventId
  executeAt: string
  effects: ScheduledConsequenceEffects
}

export type DecisionOutcome = {
  label: string
  summary: string
  facts: string[]
}

export type DecisionEffects = {
  metricChanges?: Partial<Record<MetricKey, MetricValue>>
  module1Changes: Partial<Module1State>
  sceneChanges: Partial<SceneState>
  scheduledConsequences?: ScheduledConsequence[]
  eventLog: EventLogEntry[]
  outcome: DecisionOutcome
  situationSummary: string
}

export type DecisionOption = {
  id: DecisionId
  code: 'A' | 'B'
  title: string
  description: string
  effects: DecisionEffects
}

export type SimulationEventDefinition = {
  id: EventId
  title: string
  date: string
  time: string
  isoTime: string
  description: string
  characters: string[]
  organizations: string[]
  decisions: DecisionOption[]
  visibleMetrics: MetricKey[]
  nextEvent: EventId | null
  decisionTreeLabel: string
  situationSummary: string
}

export type SimulationState = {
  runId: number
  currentEventId: EventId
  simulationTime: string
  phase: 'deciding' | 'resolved' | 'module-complete'
  activeHotspot: HotspotId | null
  metrics: Record<MetricKey, MetricValue>
  scene: SceneState
  module1: Module1State
  scheduledConsequences: ScheduledConsequence[]
  decisions: Partial<Record<EventId, DecisionId>>
  completedEventIds: EventId[]
  situationSummary: string
  eventLog: EventLogEntry[]
}

export type SimulationAction =
  | { type: 'SELECT_HOTSPOT'; hotspot: HotspotId }
  | { type: 'CLEAR_HOTSPOT' }
  | { type: 'RESOLVE_DECISION'; decision: DecisionId }
  | { type: 'ADVANCE_EVENT' }
  | { type: 'ADVANCE_TIME'; simulationTime: string }
  | { type: 'RESET_MODULE' }
