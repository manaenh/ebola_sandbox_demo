export type ProvenanceKind = 'source' | 'derived' | 'assumption' | 'unknown'

export type Provenance = {
  kind: ProvenanceKind
  document: string
  locator: string
  note?: string
}

export type MetricValue = {
  value: number | null
  unit: 'people' | 'cases' | 'minutes' | 'percent' | 'beds'
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

export type ScenePhase = 'observing' | 'isolated' | 'exposure-event'
export type HotspotId = 'zhou-qihang' | 'triage' | 'waiting-area' | 'isolation-route'
export type DecisionId = 'rapid-epidemiology' | 'staged-assessment'

export type DecisionOption = {
  id: DecisionId
  code: 'A' | 'B'
  title: string
  description: string
  owner: string
  feedback: string
}

export type EventLogEntry = {
  id: string
  time: string
  title: string
  detail: string
  tone: 'neutral' | 'active' | 'alert' | 'complete'
}

export type SimulationState = {
  runId: number
  nodeId: 'M1-1'
  simulationTime: string
  phase: 'deciding' | 'resolved'
  scenePhase: ScenePhase
  selectedDecision: DecisionId | null
  activeHotspot: HotspotId | null
  metrics: Record<MetricKey, MetricValue>
  revealedNodes: string[]
  eventLog: EventLogEntry[]
}

export type SimulationAction =
  | { type: 'SELECT_HOTSPOT'; hotspot: HotspotId }
  | { type: 'RESOLVE_DECISION'; decision: DecisionId }
  | { type: 'RESET_NODE' }
