import type { EventId } from '../simulation/types'

export type CityLocationId =
  | 'airport'
  | 'airport-bus'
  | 'home'
  | 'convenience-store'
  | 'ride-hailing'
  | 'central-hospital'
  | 'cdc'
  | 'designated-hospital'
  | 'laboratory'

export type CityLocationCategory = 'event' | 'response' | 'trajectory'
export type CityLocationIcon = 'airport' | 'transport' | 'home' | 'place' | 'hospital' | 'response' | 'laboratory'
export type CoordinateKind = 'real' | 'scenario'

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
  category: CityLocationCategory
  icon: CityLocationIcon
  coordinates: [longitude: number, latitude: number]
  coordinateKind: CoordinateKind
  visibleByDefault: boolean
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
  kind: 'trajectory' | 'response'
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
