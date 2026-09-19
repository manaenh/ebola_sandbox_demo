import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cutawayStageMs, openingStops, responseStages, samplingCutawayAnimationMs, transferCutawayAnimationMs } from './sequence'
import { cityLocationCatalog } from '../../city/sourceData'
import { responseCamera, responsePulseLocation, responseRouteData, responseRoutes, scenarioLocations, visibleNodes } from './responseGeography'

type Point = [number, number]
type Geometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] }

function inRing([x, y]: Point, ring: number[][]) {
  let inside = false
  for (let i = 0, previous = ring.length - 1; i < ring.length; previous = i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[previous]
    if ((y1 > y) !== (y2 > y) && x < (x2 - x1) * (y - y1) / (y2 - y1) + x1) inside = !inside
  }
  return inside
}

function onLand(point: Point, geometry: Geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates as number[][][]] : geometry.coordinates as number[][][][]
  return polygons.some(([outer, ...holes]) => inRing(point, outer) && holes.every((hole) => !inRing(point, hole)))
}

describe('Showcase response geography', () => {
  it('keeps Shenzhen-local Showcase locations and every local link on Shenzhen land', () => {
    const boundary = JSON.parse(readFileSync(new URL('../../../public/maps/shenzhen-boundary.geojson', import.meta.url), 'utf8')).geometry as Geometry
    const nodes = Object.entries(scenarioLocations).filter(([id]) => id !== 'cross-region-target' && id !== 'neighbor-city')
    expect(nodes).toHaveLength(10)
    nodes.forEach(([id, { coordinates }]) => expect(onLand(coordinates, boundary), id).toBe(true))
    for (const route of responseRoutes) {
      const from = scenarioLocations[route.from].coordinates
      const to = scenarioLocations[route.to].coordinates
      for (let step = 0; step <= 20; step++) {
        const fraction = step / 20
        expect(onLand([from[0] + (to[0] - from[0]) * fraction, from[1] + (to[1] - from[1]) * fraction], boundary)).toBe(true)
      }
    }
  })

  it('uses the same fixed airport coordinate in the opening and flight review', () => {
    expect(openingStops[0]).toBe('airport')
    expect(scenarioLocations.airport.label).toBe('深圳机场')
    expect(scenarioLocations.airport.coordinates).toEqual(cityLocationCatalog.find((location) => location.id === 'airport')?.coordinates)
  })

  it('uses the fixed marker tuples as every completed route endpoint and derives camera focus from those nodes', () => {
    responseStages.forEach((stage) => {
      responseRouteData(stage).features.forEach((feature, index) => {
        const route = responseRoutes[index]
        expect(feature.geometry.coordinates[0]).toBe(scenarioLocations[route.from].coordinates)
        expect(feature.geometry.coordinates.at(-1)).toBe(scenarioLocations[route.to].coordinates)
      })
    })
    expect(responseRouteData('escalation').features).toHaveLength(responseRoutes.length)
    expect(responsePulseLocation('laboratory', 0)).toEqual(scenarioLocations['designated-hospital'].coordinates)
    expect(responsePulseLocation('laboratory', 1)).toEqual(scenarioLocations.laboratory.coordinates)
    expect(responseCamera('incident').center).toEqual(scenarioLocations['central-hospital'].coordinates)
    expect(responseCamera('confirmation').center).toEqual(scenarioLocations.laboratory.coordinates)
    responseStages.forEach((stage) => visibleNodes[stage].forEach((id) => expect(scenarioLocations[id].coordinates).toHaveLength(2)))
  })

  it('leaves the cutaway on screen after its entrance, hold, and exit animation', () => {
    expect(transferCutawayAnimationMs).toBe(3500)
    expect(samplingCutawayAnimationMs).toBe(3000)
    expect(cutawayStageMs).toBe(3500)
  })
})
