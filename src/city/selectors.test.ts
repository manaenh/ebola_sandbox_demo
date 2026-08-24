import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createInitialState, simulationReducer } from '../simulation/reducer'
import type { DecisionId, SimulationState } from '../simulation/types'
import { getCitySituation } from './selectors'

const choose = (state: SimulationState, decision: DecisionId) => simulationReducer(state, { type: 'RESOLVE_DECISION', decision })
const next = (state: SimulationState) => simulationReducer(state, { type: 'ADVANCE_EVENT' })

function play(first: DecisionId, second: DecisionId, third: DecisionId) {
  let state = next(choose(createInitialState(), first))
  state = next(choose(state, second))
  return next(choose(state, third))
}

describe('Shenzhen city situation selector', () => {
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
    expect(boundary.type).toBe('Feature')
    expect(boundary.geometry.type).toBe('MultiPolygon')
    expect(boundary.properties.sourceRelation).toBe(3464353)
    expect(boundary.properties.source).toContain('OpenStreetMap')
    expect(districts.type).toBe('FeatureCollection')
    expect(districts.features).toHaveLength(9)
    expect(districts.features.every((feature: { geometry: { type: string } }) => feature.geometry.type === 'MultiPolygon')).toBe(true)
  })

  it('keeps the default map focused and exposes movement only as a trajectory layer', () => {
    const situation = getCitySituation(createInitialState())
    expect(situation.locations.filter((item) => item.visibleByDefault).map((item) => item.id)).toEqual([
      'airport', 'home', 'central-hospital', 'cdc',
    ])
    expect(situation.routes.filter((route) => route.kind === 'trajectory')).toHaveLength(5)
    expect(situation.routes.every((route) => route.kind === 'trajectory' || route.kind === 'response')).toBe(true)
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
      expect.objectContaining({ label: '沟通信号', value: '舆情风险已出现' }),
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
})
