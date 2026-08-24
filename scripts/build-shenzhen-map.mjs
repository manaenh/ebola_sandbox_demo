import fs from 'node:fs'
import path from 'node:path'
import polygonClipping from 'polygon-clipping'

const root = process.cwd()
const sourceDir = path.join(root, '.source_extract', 'geo')
const outputDir = path.join(root, 'public', 'maps')

const districts = [
  ['5664101', '宝安区'],
  ['5664192', '光明区'],
  ['5664193', '龙华区'],
  ['5664195', '南山区'],
  ['5664191', '福田区'],
  ['5664194', '罗湖区'],
  ['5664102', '龙岗区'],
  ['5663273', '盐田区'],
  ['4590423', '坪山区'],
]

const toMultiPolygon = (geometry) => geometry.type === 'Polygon'
  ? [geometry.coordinates]
  : geometry.coordinates

// d3-geo uses the spherical winding convention: exterior rings are clockwise.
// polygon-clipping emits the opposite GeoJSON winding, so reverse every output ring.
const orientForD3 = (multiPolygon) => multiPolygon.map((polygon) =>
  polygon.map((ring) => [...ring].reverse()))

const geometryBounds = (coordinates) => {
  const result = [Infinity, Infinity, -Infinity, -Infinity]
  const visit = (value) => {
    if (typeof value[0] === 'number') {
      result[0] = Math.min(result[0], value[0])
      result[1] = Math.min(result[1], value[1])
      result[2] = Math.max(result[2], value[0])
      result[3] = Math.max(result[3], value[1])
      return
    }
    value.forEach(visit)
  }
  visit(coordinates)
  return result
}

const overlapsShenzhen = (geometry) => {
  const [west, south, east, north] = geometryBounds(geometry.coordinates)
  return west <= 114.9 && east >= 113.65 && south <= 22.9 && north >= 22.15
}

const naturalEarth = JSON.parse(fs.readFileSync(path.join(sourceDir, 'ne_10m_land.geojson'), 'utf8'))
const nearbyLand = naturalEarth.features
  .filter((feature) => overlapsShenzhen(feature.geometry))
  .map((feature) => toMultiPolygon(feature.geometry))

if (nearbyLand.length === 0) throw new Error('No Natural Earth land geometry intersects Shenzhen.')
const landMask = polygonClipping.union(...nearbyLand)

const districtFeatures = districts.map(([relationId, name]) => {
  const source = JSON.parse(fs.readFileSync(path.join(sourceDir, `district-${relationId}.json`), 'utf8'))
  const clipped = polygonClipping.intersection(toMultiPolygon(source.geometry), landMask)
  if (clipped.length === 0) throw new Error(`Land clipping removed ${name}.`)
  return {
    type: 'Feature',
    properties: {
      name,
      osmRelationId: Number(relationId),
      source: 'OpenStreetMap contributors',
      license: 'ODbL 1.0',
    },
    geometry: { type: 'MultiPolygon', coordinates: orientForD3(clipped) },
  }
})

const cityLand = polygonClipping.union(...districtFeatures.map((feature) =>
  feature.geometry.coordinates.map((polygon) => polygon.map((ring) => [...ring].reverse()))))
const sharedProperties = {
  name: '深圳市主行政区陆域',
  source: 'OpenStreetMap contributors; Natural Earth',
  sourceRelation: 3464353,
  license: 'OpenStreetMap ODbL 1.0; Natural Earth public domain',
  note: 'Built from the nine contiguous Shenzhen district subareas in OSM relation 3464353 and clipped to Natural Earth 1:10m land. The detached Shenzhen-Shanwei Special Cooperation Zone is outside this presentation frame.',
}

fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(
  path.join(outputDir, 'shenzhen-boundary.geojson'),
  JSON.stringify({ type: 'Feature', properties: sharedProperties, geometry: { type: 'MultiPolygon', coordinates: orientForD3(cityLand) } }),
)
fs.writeFileSync(
  path.join(outputDir, 'shenzhen-districts.geojson'),
  JSON.stringify({ type: 'FeatureCollection', properties: sharedProperties, features: districtFeatures }),
)

console.log(`Wrote ${districtFeatures.length} districts and the dissolved Shenzhen land boundary.`)
