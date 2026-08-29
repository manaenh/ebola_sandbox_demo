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
  | 'transport-community-cluster'
  | 'cross-region-target'
  | 'monitoring-site'
  | 'child-care-support'

export type CityLocationCategory = 'event' | 'response' | 'trajectory' | 'investigation'
export type CityLocationIcon = 'airport' | 'transport' | 'home' | 'place' | 'hospital' | 'response' | 'laboratory' | 'cluster' | 'cross-region'
export type CoordinateKind = 'real' | 'scenario'

export type CityLocationStatus =
  | 'passed'
  | 'investigation'
  | 'exposure-event'
  | 'suspected-location'
  | 'response-ready'
  | 'response-active'
  | 'response-delayed'
  | 'transfer-pending'
  | 'transfer-active'
  | 'patient-received'
  | 'specimen-in-transit'
  | 'laboratory-active'
  | 'confirmed-location'
  | 'investigation-pending'
  | 'contacted'
  | 'classified'
  | 'cross-region-search'
  | 'monitoring-active'
  | 'symptom-alert'
  | 'care-active'
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
  kind: 'trajectory' | 'response' | 'transfer' | 'specimen' | 'investigation' | 'cross-region'
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

export type MapFocusType = 'location' | 'route' | 'city-wide' | 'multi-location' | 'cross-region'
export type MapCameraPresetId = 'location-close' | 'route-local' | 'response-network' | 'city-wide' | 'cross-region'

export type EventMapContext = {
  key: string
  focusType: MapFocusType
  primaryLocation?: CityLocationId
  relatedLocations?: CityLocationId[]
  route?: { from: CityLocationId; to: CityLocationId }
  cameraPreset: MapCameraPresetId
}
