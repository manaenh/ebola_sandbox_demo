import type { Feature, FeatureCollection, LineString } from 'geojson'
import type { CityLocationView, CityRoute, CitySituation, EventMapContext } from './types'

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
  center: [114.22, 22.61],
  zoom: 9.55,
  pitch: 48,
  bearing: -13,
}

export const crossRegionCamera: CameraPreset = {
  center: [114.55, 22.92],
  zoom: 7.75,
  pitch: 38,
  bearing: -10,
}

export function locationCamera(location: CityLocationView): CameraPreset {
  return {
    center: location.coordinates,
    zoom: location.id === 'cross-region-target' ? 9.1 : location.category === 'trajectory' ? 11.25 : 12.05,
    pitch: 56,
    bearing: -16,
  }
}

export function eventContextCamera(context: EventMapContext, situation: CitySituation): CameraPreset {
  if (context.cameraPreset === 'city-wide') return shenzhenCamera
  if (context.cameraPreset === 'cross-region') return crossRegionCamera

  const ids = context.relatedLocations ?? (context.primaryLocation ? [context.primaryLocation] : [])
  const locations = ids.flatMap((id) => {
    const location = situation.locations.find((item) => item.id === id)
    return location ? [location] : []
  })
  if (context.cameraPreset === 'location-close' && locations[0]) return locationCamera(locations[0])
  if (locations.length === 0) return shenzhenCamera

  const center: [number, number] = [
    locations.reduce((sum, item) => sum + item.coordinates[0], 0) / locations.length,
    locations.reduce((sum, item) => sum + item.coordinates[1], 0) / locations.length,
  ]
  const longitudeSpan = Math.max(...locations.map((item) => item.coordinates[0])) - Math.min(...locations.map((item) => item.coordinates[0]))
  const latitudeSpan = Math.max(...locations.map((item) => item.coordinates[1])) - Math.min(...locations.map((item) => item.coordinates[1]))
  const span = Math.max(longitudeSpan, latitudeSpan)
  const zoom = context.cameraPreset === 'response-network'
    ? Math.max(9.5, Math.min(10.6, 10.7 - span * 2.2))
    : Math.max(10.1, Math.min(11.35, 11.5 - span * 2.4))
  return { center, zoom, pitch: context.cameraPreset === 'response-network' ? 45 : 52, bearing: -14 }
}

export function getVisibleMapLocations(situation: CitySituation, showTrajectory: boolean) {
  return situation.locations.filter((location) =>
    location.visibleByDefault || (showTrajectory && location.category === 'trajectory'))
}

export function getVisibleMapRoutes(situation: CitySituation, showTrajectory: boolean) {
  const visibleIds = new Set(getVisibleMapLocations(situation, showTrajectory).map((location) => location.id))
  return situation.routes.filter((route) =>
    route.kind !== 'trajectory' || (showTrajectory && visibleIds.has(route.from) && visibleIds.has(route.to)))
}

function curveCoordinates(from: CityLocationView, to: CityLocationView, route: CityRoute): [number, number][] {
  const [x1, y1] = from.coordinates
  const [x2, y2] = to.coordinates
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy) || 1
  const bend = route.kind === 'cross-region' ? 0.12 : route.kind === 'response' ? 0.035 : route.kind === 'investigation' ? 0.024 : 0.012
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
        meaning: route.kind === 'trajectory' ? 'movement-history'
          : route.kind === 'transfer' ? 'medical-transfer'
            : route.kind === 'specimen' ? 'specimen-transfer'
              : route.kind === 'investigation' ? 'investigation-workload'
                : route.kind === 'cross-region' ? 'cross-region-coordination'
              : 'response-connection',
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
