import type { Feature, FeatureCollection, LineString } from 'geojson'
import type { CityLocationView, CityRoute, CitySituation } from './types'

export type CameraPreset = {
  center: [number, number]
  zoom: number
  pitch: number
  bearing: number
}

export const regionCamera: CameraPreset = {
  center: [113.82, 22.58],
  zoom: 8.15,
  pitch: 32,
  bearing: -9,
}

export const shenzhenCamera: CameraPreset = {
  center: [114.06, 22.61],
  zoom: 9.55,
  pitch: 48,
  bearing: -13,
}

export function locationCamera(location: CityLocationView): CameraPreset {
  return {
    center: location.coordinates,
    zoom: location.category === 'trajectory' ? 11.25 : 12.05,
    pitch: 56,
    bearing: -16,
  }
}

export function getVisibleMapLocations(situation: CitySituation, showTrajectory: boolean) {
  return situation.locations.filter((location) =>
    location.visibleByDefault || (showTrajectory && location.category === 'trajectory'))
}

export function getVisibleMapRoutes(situation: CitySituation, showTrajectory: boolean) {
  const visibleIds = new Set(getVisibleMapLocations(situation, showTrajectory).map((location) => location.id))
  return situation.routes.filter((route) =>
    route.kind === 'response' || (showTrajectory && visibleIds.has(route.from) && visibleIds.has(route.to)))
}

function curveCoordinates(from: CityLocationView, to: CityLocationView, route: CityRoute): [number, number][] {
  const [x1, y1] = from.coordinates
  const [x2, y2] = to.coordinates
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy) || 1
  const bend = route.kind === 'response' ? 0.035 : 0.012
  const control: [number, number] = [
    (x1 + x2) / 2 - (dy / length) * bend,
    (y1 + y2) / 2 + (dx / length) * bend,
  ]
  return Array.from({ length: 17 }, (_, index) => {
    const t = index / 16
    const inverse = 1 - t
    return [
      inverse * inverse * x1 + 2 * inverse * t * control[0] + t * t * x2,
      inverse * inverse * y1 + 2 * inverse * t * control[1] + t * t * y2,
    ]
  })
}

export function buildRouteGeoJSON(situation: CitySituation, showTrajectory: boolean): FeatureCollection<LineString> {
  const byId = new Map(situation.locations.map((location) => [location.id, location]))
  const features = getVisibleMapRoutes(situation, showTrajectory).flatMap((route) => {
    const from = byId.get(route.from)
    const to = byId.get(route.to)
    if (!from || !to) return []
    const feature: Feature<LineString> = {
      type: 'Feature',
      properties: {
        id: route.id,
        kind: route.kind,
        status: route.status,
        meaning: route.kind === 'trajectory' ? 'movement-history' : 'response-connection',
      },
      geometry: {
        type: 'LineString',
        coordinates: curveCoordinates(from, to, route),
      },
    }
    return [feature]
  })
  return { type: 'FeatureCollection', features }
}
