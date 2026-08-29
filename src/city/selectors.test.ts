import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createInitialState, simulationReducer } from '../simulation/reducer'
import type { DecisionId, SimulationState } from '../simulation/types'
import { buildRouteGeoJSON, eventContextCamera, getVisibleMapLocations, locationCamera, regionCamera, shenzhenCamera } from './mapData'
import { getEventMapContext } from './eventMapContext'
import { getCitySituation } from './selectors'

const choose = (state: SimulationState, decision: DecisionId) => simulationReducer(state, { type: 'RESOLVE_DECISION', decision })
const next = (state: SimulationState) => simulationReducer(state, { type: 'ADVANCE_EVENT' })

function play(first: DecisionId, second: DecisionId, third: DecisionId) {
  let state = next(choose(createInitialState(), first))
  state = next(choose(state, second))
  return next(choose(state, third))
}

const startM2 = (state: SimulationState) => simulationReducer(state, { type: 'START_MODULE_2' })

function startM3() {
  let state = startM2(play('rapid-epidemiology', 'risk-communication', 'early-report'))
  state = next(choose(state, 'backup-transfer'))
  state = next(choose(state, 'standardized-sampling'))
  state = next(choose(state, 'escalate-on-screening'))
  state = next(state)
  return simulationReducer(state, { type: 'START_MODULE_3' })
}

function startM4() {
  let state = startM3()
  state = next(choose(state, 'classify-investigation-list'))
  state = next(choose(state, 'classify-flight-risk'))
  state = next(choose(state, 'minimum-info-coordination'))
  return simulationReducer(state, { type: 'START_MODULE_4' })
}

describe('Shenzhen city situation selector', () => {
  it('uses separate CSS classes for the cross-region scene and its small legend symbol', () => {
    const styles = fs.readFileSync(path.resolve('src/styles.css'), 'utf8')
    const mapView = fs.readFileSync(path.resolve('src/components/ShenzhenSituation.tsx'), 'utf8')
    expect(styles).toContain('.cross-region-route-scene')
    expect(styles).toContain('.cross-region-route-legend')
    expect(styles).not.toMatch(/\.cross-region-route\s*\{/)
    expect(mapView).toContain('className="cross-region-route-legend"')
  })

  it('models movement and investigation without implying citywide infection', () => {
    const situation = getCitySituation(createInitialState())
    expect(situation.locations.find((item) => item.id === 'airport')?.status).toBe('passed')
    expect(situation.locations.find((item) => item.id === 'home')?.status).toBe('investigation')
    expect(situation.locations.find((item) => item.id === 'central-hospital')?.status).toBe('suspected-location')
    expect(situation.locations.every((item) => !item.status.includes('infected'))).toBe(true)
    expect(situation.summary).toContain('不代表沿途发生传播')
    expect(situation.locations.some((item) => item.id === 'convenience-store')).toBe(true)
    expect(situation.locations.some((item) => item.shortLabel === '社区活动点')).toBe(false)
    expect(situation.locations.find((item) => item.id === 'airport')?.coordinateKind).toBe('real')
    expect(situation.locations.find((item) => item.id === 'central-hospital')?.coordinateKind).toBe('scenario')
  })

  it('ships real geographic geometry as local files for offline rendering', () => {
    const boundary = JSON.parse(fs.readFileSync(path.resolve('public/maps/shenzhen-boundary.geojson'), 'utf8'))
    const districts = JSON.parse(fs.readFileSync(path.resolve('public/maps/shenzhen-districts.geojson'), 'utf8'))
    const regionalLand = JSON.parse(fs.readFileSync(path.resolve('public/maps/pearl-river-delta-land.geojson'), 'utf8'))
    expect(boundary.type).toBe('Feature')
    expect(boundary.geometry.type).toBe('MultiPolygon')
    expect(boundary.properties.sourceRelation).toBe(3464353)
    expect(boundary.properties.source).toContain('OpenStreetMap')
    expect(districts.type).toBe('FeatureCollection')
    expect(districts.features).toHaveLength(9)
    expect(districts.features.every((feature: { geometry: { type: string } }) => feature.geometry.type === 'MultiPolygon')).toBe(true)
    expect(regionalLand.geometry.type).toBe('MultiPolygon')
    expect(regionalLand.properties.source).toBe('Natural Earth')
  })

  it('keeps the default map focused and exposes movement only as a trajectory layer', () => {
    const situation = getCitySituation(createInitialState())
    expect(getVisibleMapLocations(situation, false).map((item) => item.id)).toEqual([
      'airport', 'home', 'central-hospital', 'cdc',
    ])
    expect(getVisibleMapLocations(situation, true).map((item) => item.id)).toEqual([
      'airport', 'airport-bus', 'home', 'convenience-store', 'ride-hailing', 'central-hospital', 'cdc',
    ])
    expect(buildRouteGeoJSON(situation, false).features).toHaveLength(1)
    expect(buildRouteGeoJSON(situation, true).features).toHaveLength(6)
    expect(buildRouteGeoJSON(situation, true).features.filter((feature) => feature.properties?.meaning === 'movement-history')).toHaveLength(5)
  })

  it('provides wider, Shenzhen, and location camera levels without changing simulation state', () => {
    const situation = getCitySituation(createInitialState())
    const hospital = situation.locations.find((item) => item.id === 'central-hospital')!
    expect(regionCamera.zoom).toBeLessThan(shenzhenCamera.zoom)
    expect(shenzhenCamera.pitch).toBeGreaterThan(0)
    expect(locationCamera(hospital).zoom).toBeGreaterThan(shenzhenCamera.zoom)
    expect(locationCamera(hospital).center).toEqual(hospital.coordinates)
  })

  it('shows the early-control and timely-response path without creating contact counts', () => {
    const state = play('rapid-epidemiology', 'risk-communication', 'early-report')
    const situation = getCitySituation(state)
    const hospital = situation.locations.find((item) => item.id === 'central-hospital')!
    const cdc = situation.locations.find((item) => item.id === 'cdc')!
    expect(hospital.status).toBe('suspected-location')
    expect(hospital.facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '候诊暴露', value: '23 分钟' }),
      expect.objectContaining({ label: '评估负荷', value: '相对受控' }),
    ]))
    expect(cdc.status).toBe('response-active')
    expect(state.metrics.riskContacts.value).toBeNull()
  })

  it('shows +21 as assessment workload and the delayed CDC route, never infections', () => {
    const state = play('staged-assessment', 'direct-procedure', 'await-tests')
    const situation = getCitySituation(state)
    const hospital = situation.locations.find((item) => item.id === 'central-hospital')!
    const cdc = situation.locations.find((item) => item.id === 'cdc')!
    expect(hospital.status).toBe('exposure-event')
    expect(hospital.detail).toContain('不代表发生 21 例感染')
    expect(hospital.facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '候诊暴露', value: '78 分钟' }),
      expect.objectContaining({ label: '评估负荷', value: '新增 21 人' }),
      expect.objectContaining({ label: '沟通信号', value: 'M1 舆情信号已出现' }),
    ]))
    expect(cdc.status).toBe('response-delayed')
    expect(situation.signals.find((item) => item.label === '外部响应')?.value).toBe('延迟 2h10m')
    expect(state.metrics.confirmedCases.value).toBe(0)
    expect(state.metrics.riskContacts.value).toBeNull()
  })

  it('produces a visibly distinct macro state for all eight Module 1 paths', () => {
    const first: DecisionId[] = ['rapid-epidemiology', 'staged-assessment']
    const second: DecisionId[] = ['risk-communication', 'direct-procedure']
    const third: DecisionId[] = ['early-report', 'await-tests']
    const fingerprints: string[] = []
    first.forEach((a) => second.forEach((b) => third.forEach((c) => {
      const situation = getCitySituation(play(a, b, c))
      const hospital = situation.locations.find((item) => item.id === 'central-hospital')!
      const cdc = situation.locations.find((item) => item.id === 'cdc')!
      fingerprints.push(JSON.stringify({ hospital: hospital.status, facts: hospital.facts, cdc: cdc.status }))
    })))
    expect(new Set(fingerprints).size).toBe(8)
  })

  it('reveals a medical-transfer task after Module 1 without implying disease spread', () => {
    const module1 = play('rapid-epidemiology', 'risk-communication', 'early-report')
    const situation = getCitySituation(module1)
    expect(getVisibleMapLocations(situation, false).map((item) => item.id)).toContain('designated-hospital')
    const transfer = situation.routes.find((route) => route.id === 'patient-transfer')!
    expect(transfer.kind).toBe('transfer')
    expect(transfer.status).toBe('pending')
    const transferFeature = buildRouteGeoJSON(situation, false).features.find((feature) => feature.properties?.id === 'patient-transfer')
    expect(transferFeature?.properties?.meaning).toBe('medical-transfer')
    expect(situation.summary).toContain('医疗转运')
  })

  it('progressively activates designated hospital and specimen route from Module 2 state', () => {
    let state = startM2(play('rapid-epidemiology', 'risk-communication', 'early-report'))
    state = choose(state, 'backup-transfer')
    let situation = getCitySituation(state)
    expect(situation.routes.find((route) => route.id === 'patient-transfer')?.status).toBe('active')

    state = next(state)
    state = choose(state, 'standardized-sampling')
    situation = getCitySituation(state)
    expect(getVisibleMapLocations(situation, false).map((item) => item.id)).toContain('laboratory')
    expect(situation.routes.find((route) => route.id === 'specimen-transfer')).toMatchObject({ kind: 'specimen', status: 'active' })
    expect(buildRouteGeoJSON(situation, false).features.find((feature) => feature.properties?.id === 'specimen-transfer')?.properties?.meaning).toBe('specimen-transfer')
  })

  it('shows delayed specimen handling and final response network from actual branch state', () => {
    let state = startM2(play('staged-assessment', 'direct-procedure', 'await-tests'))
    state = next(choose(state, 'wait-regular-transfer'))
    state = next(choose(state, 'routine-multi-test'))
    expect(getCitySituation(state).routes.find((route) => route.id === 'specimen-transfer')?.status).toBe('delayed')
    state = next(choose(state, 'await-confirmation'))
    const situation = getCitySituation(state)
    expect(situation.locations.find((item) => item.id === 'designated-hospital')?.status).toBe('confirmed-location')
    expect(situation.locations.find((item) => item.id === 'laboratory')?.status).toBe('response-active')
    expect(situation.locations.find((item) => item.id === 'cdc')?.status).toBe('response-active')
    expect(situation.signals.find((item) => item.label === '当前病例')?.value).toBe('确诊 1 例')
    expect(state.module1.additionalAssessmentRequired).toBe(21)
  })

  it('shows aggregate Module 3 investigation clusters rather than 126 person markers', () => {
    const state = startM3()
    const situation = getCitySituation(state)
    const visible = getVisibleMapLocations(situation, false)
    expect(situation.signals.find((item) => item.label === '需调查')?.value).toBe('126 人')
    expect(visible.map((item) => item.id)).toContain('transport-community-cluster')
    expect(visible.find((item) => item.id === 'airport')?.facts).toContainEqual(expect.objectContaining({ label: '需调查', value: '39 人' }))
    expect(visible.find((item) => item.id === 'home')?.facts).toContainEqual(expect.objectContaining({ label: '需调查', value: '4 人' }))
    expect(situation.locations).toHaveLength(13)
    expect(situation.summary).toContain('不代表感染地点')
    expect(state.metrics.riskContacts.value).toBeNull()
  })

  it('adds a cross-region coordination route with an explicit scenario target', () => {
    let state = startM3()
    state = next(choose(state, 'classify-investigation-list'))
    state = next(choose(state, 'classify-flight-risk'))
    const situation = getCitySituation(state)
    const target = situation.locations.find((item) => item.id === 'cross-region-target')!
    expect(target.visibleByDefault).toBe(true)
    expect(target.coordinateKind).toBe('scenario')
    expect(target.sourceNote).toContain('未给出具体省市')
    expect(situation.routes.find((item) => item.id === 'cross-region-coordination')).toMatchObject({ kind: 'cross-region', status: 'active' })
    expect(buildRouteGeoJSON(situation, false).features.find((feature) => feature.properties?.id === 'cross-region-coordination')?.properties?.meaning).toBe('cross-region-coordination')
  })

  it('shows the delayed dinner outcome as no effective exposure after Module 3 completion', () => {
    let state = startM3()
    state = next(choose(state, 'classify-investigation-list'))
    state = next(choose(state, 'classify-flight-risk'))
    state = next(choose(state, 'await-complete-itinerary'))
    const situation = getCitySituation(state)
    const target = situation.locations.find((item) => item.id === 'cross-region-target')!
    expect(target.detail).toContain('12 人聚餐')
    expect(target.detail).toContain('未形成有效传播事件')
    expect(situation.signals.find((item) => item.label === '高风险失访目标')?.value).toBe('0')
    expect(state.module3.highRiskLostToFollowUpActual).toBeNull()
    expect(state.metrics.confirmedCases.value).toBe(1)
  })

  it('derives geographic focus from the current event instead of a global hospital default', () => {
    let state = createInitialState()
    expect(getEventMapContext(state)).toMatchObject({ focusType: 'location', primaryLocation: 'central-hospital' })

    state = play('rapid-epidemiology', 'risk-communication', 'early-report')
    state = startM2(state)
    expect(getEventMapContext(state)).toMatchObject({
      focusType: 'route', route: { from: 'central-hospital', to: 'designated-hospital' },
    })
    state = next(choose(state, 'backup-transfer'))
    expect(getEventMapContext(state)).toMatchObject({
      focusType: 'route', route: { from: 'designated-hospital', to: 'laboratory' },
    })
    state = next(choose(state, 'standardized-sampling'))
    expect(getEventMapContext(state)).toMatchObject({ focusType: 'multi-location', relatedLocations: ['laboratory', 'cdc'] })
    state = next(choose(state, 'escalate-on-screening'))
    expect(getEventMapContext(state).focusType).toBe('city-wide')
  })

  it('moves Module 3 focus from city-wide clusters to airport, then cross-region and back to city-wide monitoring', () => {
    let state = startM3()
    expect(getEventMapContext(state)).toMatchObject({ focusType: 'city-wide', cameraPreset: 'city-wide' })
    state = next(choose(state, 'classify-investigation-list'))
    expect(getEventMapContext(state)).toMatchObject({ focusType: 'location', primaryLocation: 'airport' })
    expect(eventContextCamera(getEventMapContext(state), getCitySituation(state)).center)
      .toEqual(getCitySituation(state).locations.find((item) => item.id === 'airport')?.coordinates)
    state = next(choose(state, 'classify-flight-risk'))
    expect(getEventMapContext(state)).toMatchObject({ focusType: 'cross-region', primaryLocation: 'cross-region-target' })
    state = next(choose(state, 'minimum-info-coordination'))
    expect(getEventMapContext(state)).toMatchObject({ focusType: 'city-wide', cameraPreset: 'city-wide' })
  })

  it('moves Module 4 from the monitoring point through medical transfer to the updated city response', () => {
    let state = startM4()
    expect(getEventMapContext(state)).toMatchObject({ focusType: 'location', primaryLocation: 'monitoring-site' })
    let situation = getCitySituation(state)
    expect(situation.locations.find((item) => item.id === 'monitoring-site')).toMatchObject({ visibleByDefault: true, status: 'symptom-alert' })
    state = choose(state, 'continue-monitoring-assessment')
    expect(getEventMapContext(state)).toMatchObject({ focusType: 'route', route: { from: 'monitoring-site', to: 'designated-hospital' } })
    situation = getCitySituation(state)
    expect(situation.routes.find((item) => item.id === 'monitoring-transfer')).toMatchObject({ kind: 'transfer', status: 'delayed' })
    state = next(state)
    expect(state.currentEventId).toBe('M4-2')
    expect(situation.locations.every((item) => !item.status.includes('infected'))).toBe(true)
    expect(getCitySituation(state).signals.find((item) => item.label === '确诊病例')?.value).toBe('2 例')
  })
})
