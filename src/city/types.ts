import type { EventId } from '../simulation/types'

export type CityLocationId =
  | 'airport'
  | 'airport-transit'
  | 'home'
  | 'community'
  | 'ride-hailing'
  | 'central-hospital'
  | 'cdc'
  | 'designated-hospital'
  | 'laboratory'

export type CityLocationKind =
  | 'entry'
  | 'transport'
  | 'residence'
  | 'community'
  | 'hospital'
  | 'response'
  | 'laboratory'

export type CityLocationStatus =
  | 'passed'
  | 'investigation'
  | 'exposure-event'
  | 'suspected-location'
  | 'response-ready'
  | 'response-active'
  | 'response-delayed'
  | 'future'

export type CityLocationDefinition = {
  id: CityLocationId
  name: string
  shortLabel: string
  kind: CityLocationKind
  x: number
  y: number
  hasScene: boolean
  relatedEvents: EventId[]
  sourceNote: string
}

export type CityLocationView = CityLocationDefinition & {
  status: CityLocationStatus
  statusLabel: string
  detail: string
  facts: Array<{ label: string; value: string; provenance: 'source' | 'derived' }>
}

export type CityRoute = {
  id: string
  from: CityLocationId
  to: CityLocationId
  kind: 'movement' | 'response'
  status: 'completed' | 'pending' | 'active' | 'delayed'
  label?: string
}

export type CitySignal = {
  label: string
  value: string
  tone: 'neutral' | 'active' | 'alert'
  provenance: 'source' | 'derived'
}

export type CitySituation = {
  locations: CityLocationView[]
  routes: CityRoute[]
  signals: CitySignal[]
  summary: string
}
