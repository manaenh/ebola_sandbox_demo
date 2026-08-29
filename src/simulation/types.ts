export type ProvenanceKind =
  | 'SOURCE_FACT'
  | 'SCHEDULED_SOURCE_CONSEQUENCE'
  | 'DERIVED_STATE'
  | 'SIMULATION_ASSUMPTION'

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
  | 'transferStatus'
  | 'transferWait'
  | 'contaminationPressure'
  | 'specimenStatus'
  | 'laboratoryDelay'
  | 'exposureInvestigation'
  | 'tracingActivation'
  | 'investigationTotal'
  | 'initialHighRiskLocateRate'
  | 'classificationStatus'
  | 'highRiskContacts'
  | 'mediumRiskContacts'
  | 'lowObservationContacts'
  | 'missingContact'
  | 'monitoringStatus'
  | 'secondaryCaseStatus'
  | 'isolationBeds'
  | 'childCareStatus'
  | 'temperatureMonitoringCompliance'

export type EventId = 'M1-1' | 'M1-2' | 'M1-3' | 'M2-1' | 'M2-2' | 'M2-3' | 'M2-4' | 'M3-1' | 'M3-2' | 'M3-3' | 'M4-1' | 'M4-2' | 'M4-3'

export type ModuleId = 1 | 2 | 3 | 4
export type SceneKind = 'hospital' | 'transport' | 'sampling' | 'laboratory' | 'tracing-command' | 'aircraft' | 'cross-region' | 'monitoring-point' | 'secondary-confirmation' | 'child-care'

export type SceneState = {
  kind: SceneKind
  patientLocation: 'triage' | 'isolation' | 'vehicle' | 'designated-hospital'
  patientMood: 'unwell' | 'resistant' | 'cooperative' | 'distressed'
  interaction:
    | 'none'
    | 'isolation-route'
    | 'communication'
    | 'coordination'
    | 'transfer-preparation'
    | 'transfer-waiting'
    | 'sampling-standardized'
    | 'sampling-routine'
    | 'laboratory-alert'
    | 'confirmation'
    | 'contact-investigation'
    | 'flight-classification'
    | 'cross-region-coordination'
    | 'monitoring-alert'
    | 'secondary-confirmation'
    | 'child-care-coordination'
  phoneMode: 'none' | 'family-video' | 'short-video'
  exposureEvent: boolean
  cdcResponse: 'none' | 'active' | 'delayed'
  transferVehicle: 'none' | 'backup' | 'regular-pending' | 'regular'
  transferMotion: 'idle' | 'preparing' | 'loading' | 'waiting' | 'arrived'
  cleanupEvents: number
  specimenVisual: 'none' | 'preparing' | 'sealed' | 'contaminated' | 'in-transit' | 'received'
}

export type HotspotId =
  | 'zhou-qihang'
  | 'triage-nurse'
  | 'triage-desk'
  | 'waiting-area'
  | 'isolation-route'
  | 'transfer-vehicle'
  | 'transfer-team'
  | 'transfer-route'
  | 'sampling-station'
  | 'sample-package'
  | 'handover-route'

export type DecisionId =
  | 'rapid-epidemiology'
  | 'staged-assessment'
  | 'risk-communication'
  | 'direct-procedure'
  | 'early-report'
  | 'await-tests'
  | 'backup-transfer'
  | 'wait-regular-transfer'
  | 'standardized-sampling'
  | 'routine-multi-test'
  | 'escalate-on-screening'
  | 'await-confirmation'
  | 'classify-investigation-list'
  | 'uniform-interim-management'
  | 'classify-flight-risk'
  | 'uniform-flight-management'
  | 'minimum-info-coordination'
  | 'await-complete-itinerary'
  | 'immediate-monitoring-separation'
  | 'continue-monitoring-assessment'
  | 'coordinated-child-care'
  | 'immediate-guardianship'

export type EventLogEntry = {
  id: string
  time: string
  title: string
  detail: string
  tone: 'neutral' | 'active' | 'alert' | 'complete'
  provenance?: Provenance
}

export type Module1State = {
  isolationScheduledFor: string | null
  isolationCompletedAt: string | null
  exposureDurationMinutes: number | null
  vomitingExposureOccurred: boolean
  additionalAssessmentRequired: number

  patientCooperative: boolean | null
  communicationStatus: 'not-started' | 'in-progress' | 'successful' | 'strained'
  communicationDelayMinutes: number | null
  samplingReadiness: 'pending' | 'delayed' | 'improved'
  earlyPublicOpinionSignalTriggeredByM1: boolean

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

export type Module2State = {
  started: boolean
  transferStatus: 'not-started' | 'preparing' | 'waiting' | 'completed' | 'completed-after-wait'
  transferCompletedAt: '13:10' | null
  transferWaitMinutes: number
  additionalVomitingCleanupEvents: number
  contaminationHandlingWorkload: 'baseline' | 'increased'
  occupationalExposurePressure: 'baseline' | 'increased'

  samplingProtocol: 'pending' | 'standardized' | 'routine-multi-test'
  specimenStatus: 'not-collected' | 'in-transit' | 'received' | 'processing-delayed' | 'confirmed-quality'
  specimenReachedLaboratoryAt: '17:40' | null
  outerPackagingContamination: boolean
  exposureInvestigationStarted: boolean
  laboratoryDelayMinutes: number

  preliminaryPositive: boolean
  tracingMode: 'not-started' | 'preliminary' | 'full'
  fullTracingActivated: boolean
  highRiskContactFindingProgress: number | null
  findingProgressAsOf: '18:00' | null

  confirmed: boolean
  confirmationAt: '18:40' | null
  confirmationCt: 22.6 | null
  jointCommandActivated: boolean
  dailyRiskAssessmentStarted: boolean
  consistencyCheckTargetMinutes: 30 | null
  unifiedInformationTargetMinutes: 120 | null

  transferPressure: 'pending' | 'controlled' | 'elevated' | 'high'
  laboratoryPressure: 'pending' | 'controlled' | 'delayed'
  tracingPressure: 'pending' | 'controlled' | 'elevated' | 'high'
  overallResponseWorkload: 'pending' | 'controlled' | 'elevated' | 'high' | 'severe'
}

export type InvestigationStatus = 'pending' | 'contacted' | 'classified' | 'excluded'
export type ContactRiskLevel = 'high' | 'medium' | 'low-observation' | 'excluded'
export type TracingStatus = 'not-started' | 'searching' | 'located' | 'monitoring' | 'closed'
export type MonitoringStatus = 'not-started' | 'active' | 'alert' | 'completed'

export type ContactMonitoring = {
  contactId: string
  lastExposureAt: string | null
  monitoringStartAt: string | null
  monitoringEndAt: string | null
  currentMonitoringDay: number | null
  monitoringStatus: MonitoringStatus
  symptomaticAlert: boolean
}

export type Module3State = {
  started: boolean
  investigationTotal: 126
  investigationGroups: {
    family: 2
    companions: 2
    flight: 39
    hospital: 24
    transportCommunity: 59
  }
  missingPhoneNumbers: 18
  incompleteIdentities: 9
  initialHighRiskLocateRate: 0.92 | 0.61 | null
  startingTracingPressure: 'pending' | 'controlled' | 'elevated' | 'high'
  highRiskTracingPressure: 'pending' | 'controlled' | 'high'
  unresolvedHighRiskWorkload: 'pending' | 'lower' | 'higher'

  initialListManagementMode: 'pending' | 'risk-based' | 'uniform-interim'
  investigationStatus: InvestigationStatus
  riskClassificationStatus: 'not-started' | 'in-progress' | 'completed'
  investigationCompletionTarget24h: 90
  classificationTarget48h: 100
  highRiskLostToFollowUpTarget: 0
  highRiskLostToFollowUpActual: number | null

  flightPassengersTotal: 298
  flightReviewCompleted: boolean
  flightManagementMode: 'pending' | 'risk-based' | 'uniform-interim'
  flightHighRisk: 7 | null
  flightMediumRisk: 18 | null
  flightLowObservation: 39 | null
  flightExcludedFromActiveMonitoring: 234 | null
  flightExcludedProvenance: Provenance

  missingTravelerStatus: 'not-started' | 'searching' | 'found'
  crossRegionCoordinationMode: 'pending' | 'minimum-necessary' | 'awaiting-details'
  crossRegionCoordinationStatus: 'pending' | 'active' | 'closed-loop'
  resolutionDelay: 'pending' | 'within-6h' | 'after-24h'
  dinnerAttendees: 0 | 12
  dinnerOccurredWhileAsymptomatic: boolean
  effectiveExposureEvent: boolean
  riskCommunicationOnly: boolean

  contactInfrastructureEstablished: boolean
  lastExposureTrackingEnabled: boolean
  monitoringPhase: 'not-started' | 'active'
  monitoringRecords: Record<string, ContactMonitoring>
  lostToFollowUpStatus: 'none' | 'active' | 'resolved'
  tracingOperationalPressure: 'pending' | 'controlled' | 'elevated' | 'high' | 'severe'
}

export type Module4State = {
  started: boolean
  shenJieMonitoring: ContactMonitoring & {
    daysSinceLastExposure: 7
    temperature: 38.1
    symptoms: ['乏力', '恶心']
    provenance: Provenance
  }
  alertTriggered: boolean
  separationStatus: 'pending' | 'immediate' | 'delayed'
  transferStatus: 'not-started' | 'preparing' | 'waiting' | 'completed'
  transferDelayMinutes: 0 | 50 | 240
  transferCompletedWithinMinutes: 50 | null
  sharedBathroomExposureDurationMinutes: 0 | 240
  sharedBathroomExposureOccurred: boolean
  additionalHighRiskContacts: 0 | 5
  baselineHighRiskContacts: 11
  totalHighRiskContacts: 11 | 16
  secondaryConfirmed: boolean
  confirmationAt: '15:30' | null
  confirmationCt: 27.9 | null
  sequenceConsistentWithIndex: boolean
  secondaryCaseTimelineCreated: boolean
  householdExposureInvestigationStarted: boolean
  confirmedCases: 1 | 2
  isolationBedsOccupied: 1 | 2
  isolationBedsTotal: 12
  daughterAge: 8
  daughterPcrStatus: 'pending' | 'negative'
  daughterAsymptomatic: boolean
  guardianAvailable: boolean
  childCareMode: 'pending' | 'coordinated' | 'immediate-guardianship'
  careStable: boolean
  temperatureMonitoringCompliance: 100 | null
  familyMonitoringSiteConflictEvent: boolean
  unsupportedChildFamilyInfections: 0
}

export type ScheduledConsequenceEffects = {
  metricChanges?: Partial<Record<MetricKey, MetricValue>>
  module1Changes?: Partial<Module1State>
  module2Changes?: Partial<Module2State>
  module3Changes?: Partial<Module3State>
  module4Changes?: Partial<Module4State>
  sceneChanges?: Partial<SceneState>
  eventLog?: EventLogEntry[]
}

export type ScheduledConsequence = {
  id: string
  type:
    | 'patient-isolated'
    | 'patient-cooperation'
    | 'vomiting-exposure'
    | 'response-delay-elapsed'
    | 'transfer-completed'
    | 'specimen-received'
    | 'tracing-progress'
    | 'missing-traveler-found'
    | 'monitoring-transfer-completed'
  sourceEventId: EventId
  executeAt: string
  provenance: Provenance
  effects: ScheduledConsequenceEffects
}

export type DecisionOutcome = {
  label: string
  summary: string
  facts: string[]
}

export type DecisionEffects = {
  metricChanges?: Partial<Record<MetricKey, MetricValue>>
  module1Changes?: Partial<Module1State>
  module2Changes?: Partial<Module2State>
  module3Changes?: Partial<Module3State>
  module4Changes?: Partial<Module4State>
  sceneChanges?: Partial<SceneState>
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
  module: ModuleId
  kind: 'decision' | 'milestone'
  sceneKind: SceneKind
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
  provenance: Provenance
}

export type SimulationState = {
  runId: number
  module: ModuleId
  currentEventId: EventId
  simulationTime: string
  phase: 'deciding' | 'resolved' | 'milestone' | 'module-complete'
  activeHotspot: HotspotId | null
  metrics: Record<MetricKey, MetricValue>
  scene: SceneState
  module1: Module1State
  module2: Module2State
  module3: Module3State
  module4: Module4State
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
  | { type: 'START_MODULE_2' }
  | { type: 'START_MODULE_3' }
  | { type: 'START_MODULE_4' }
  | { type: 'RESET_MODULE' }
