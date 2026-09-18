import type { FeatureCollection, LineString } from 'geojson'
import type { ResponseStage } from './sequence'

export type ResponseNodeId = 'central-hospital' | 'cdc' | 'health' | 'designated-hospital' | 'laboratory'
export type ShowcaseLocationId = ResponseNodeId | 'airport' | 'home' | 'convenience-store' | 'ride-hailing' | 'cross-region-target' | 'neighbor-city' | 'monitoring-site'
type Coordinate = [longitude: number, latitude: number]

// Fixed Showcase locations. The airport uses a real geographic reference; other points are scenario locations.
export const scenarioLocations: Record<ShowcaseLocationId, { label: string; coordinates: Coordinate }> = {
  airport: { label: '深圳机场', coordinates: [113.8030964, 22.6403727] },
  home: { label: '家庭', coordinates: [114.014, 22.674] },
  'convenience-store': { label: '便利店', coordinates: [114.083, 22.633] },
  'ride-hailing': { label: '网约车', coordinates: [114.155, 22.605] },
  'cross-region-target': { label: '协查方向', coordinates: [114.5, 23] },
  'neighbor-city': { label: '邻市协同点', coordinates: [114.72, 23.16] },
  'monitoring-site': { label: '集中健康监测点', coordinates: [114.18, 22.6] },
  'central-hospital': { label: '市中心医院', coordinates: [114.08, 22.58] },
  cdc: { label: '疾控中心', coordinates: [114.104, 22.57] },
  health: { label: '卫健委', coordinates: [114.2, 22.567] },
  'designated-hospital': { label: '定点医院', coordinates: [114.13, 22.61] },
  laboratory: { label: '市级实验室', coordinates: [114.21, 22.6] },
}

export const responseRoutes: Array<{ from: ResponseNodeId; to: ResponseNodeId; kind: 'response' | 'transfer' | 'specimen' }> = [
  { from: 'central-hospital', to: 'cdc', kind: 'response' },
  { from: 'cdc', to: 'health', kind: 'response' },
  { from: 'central-hospital', to: 'designated-hospital', kind: 'transfer' },
  { from: 'designated-hospital', to: 'laboratory', kind: 'specimen' },
  { from: 'laboratory', to: 'cdc', kind: 'response' },
]

export const visibleNodes: Record<ResponseStage, ResponseNodeId[]> = {
  incident: ['central-hospital'],
  coordination: ['central-hospital', 'cdc', 'health'],
  'transfer-scene': ['central-hospital', 'cdc', 'health'],
  transfer: ['central-hospital', 'cdc', 'health', 'designated-hospital'],
  'sampling-scene': ['central-hospital', 'cdc', 'health', 'designated-hospital'],
  laboratory: ['central-hospital', 'cdc', 'health', 'designated-hospital', 'laboratory'],
  confirmation: ['central-hospital', 'cdc', 'health', 'designated-hospital', 'laboratory'],
  escalation: ['central-hospital', 'cdc', 'health', 'designated-hospital', 'laboratory'],
}

export const routeCount: Record<ResponseStage, number> = {
  incident: 0, coordination: 2, 'transfer-scene': 2, transfer: 3,
  'sampling-scene': 3, laboratory: 4, confirmation: 4, escalation: 5,
}

const previousRouteCount: Record<ResponseStage, number> = {
  incident: 0, coordination: 0, 'transfer-scene': 2, transfer: 2,
  'sampling-scene': 3, laboratory: 3, confirmation: 4, escalation: 4,
}

// The finished line uses the same endpoint tuple as its corresponding marker.
export function responseRouteData(stage: ResponseStage): FeatureCollection<LineString> {
  return { type: 'FeatureCollection', features: responseRoutes.slice(0, routeCount[stage]).map((route, index) => {
    const from = scenarioLocations[route.from].coordinates
    const to = scenarioLocations[route.to].coordinates
    return { type: 'Feature' as const, properties: { id: `showcase-response-${index}`, kind: route.kind, status: 'active' },
      geometry: { type: 'LineString' as const, coordinates: [from, to] } }
  }) }
}

export function responsePulseLocation(stage: ResponseStage, progress: number): Coordinate | null {
  const previous = previousRouteCount[stage]
  const newRoutes = responseRoutes.slice(previous, routeCount[stage])
  if (newRoutes.length === 0) return null
  const travel = Math.min(Math.max(progress, 0), 1) * newRoutes.length
  const index = Math.min(Math.floor(travel), newRoutes.length - 1)
  const fraction = Math.min(travel - index, 1)
  const route = newRoutes[index]
  const from = scenarioLocations[route.from].coordinates
  const to = scenarioLocations[route.to].coordinates
  return [from[0] + (to[0] - from[0]) * fraction, from[1] + (to[1] - from[1]) * fraction]
}

export function responseCamera(stage: ResponseStage) {
  const focus: Record<ResponseStage, ResponseNodeId[]> = {
    incident: ['central-hospital'],
    coordination: ['central-hospital', 'cdc', 'health'],
    'transfer-scene': ['central-hospital', 'designated-hospital'],
    transfer: ['central-hospital', 'designated-hospital'],
    'sampling-scene': ['designated-hospital', 'laboratory'],
    laboratory: ['designated-hospital', 'laboratory'],
    confirmation: ['laboratory'],
    escalation: ['central-hospital', 'cdc', 'health', 'designated-hospital', 'laboratory'],
  }
  const points = focus[stage].map((id) => scenarioLocations[id].coordinates)
  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])
  const zoom: Record<ResponseStage, number> = {
    incident: 11.4, coordination: 11.15, 'transfer-scene': 11.05, transfer: 11.05,
    'sampling-scene': 11.05, laboratory: 11.05, confirmation: 11.2, escalation: 9.75,
  }
  return { center: [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2] as Coordinate,
    zoom: zoom[stage], pitch: stage === 'incident' ? 52 : 48, bearing: -14 }
}
