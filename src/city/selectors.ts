import type { SimulationState } from '../simulation/types'
import { cityLocationCatalog } from './sourceData'
import type { CityLocationId, CityLocationStatus, CityRoute, CitySignal, CitySituation } from './types'

const statusLabel: Record<CityLocationStatus, string> = {
  passed: '经过',
  investigation: '待调查',
  'exposure-event': '体液暴露事件',
  'suspected-location': '疑似病例所在地',
  'response-ready': '响应待命',
  'response-active': '响应已启动',
  'response-delayed': '响应延迟',
  future: '后续启用',
}

function hospitalFacts(state: SimulationState) {
  const m = state.module1
  const exposure = m.exposureDurationMinutes === null
    ? m.isolationScheduledFor === '12:00' ? '仍在持续' : m.isolationScheduledFor === '11:05' ? '隔离处理中' : '待决策'
    : `${m.exposureDurationMinutes} 分钟`
  const assessment = m.additionalAssessmentRequired > 0
    ? `新增 ${m.additionalAssessmentRequired} 人`
    : m.exposureControlQuality === 'good' ? '相对受控' : '待调查'
  const facts: Array<{ label: string; value: string; provenance: 'source' | 'derived' }> = [
    { label: '候诊暴露', value: exposure, provenance: m.exposureDurationMinutes === null ? 'derived' : 'source' },
    { label: '评估负荷', value: assessment, provenance: m.additionalAssessmentRequired > 0 ? 'source' : 'derived' },
  ]
  if (m.earlyPublicOpinionRisk) facts.push({ label: '沟通信号', value: '舆情风险已出现', provenance: 'source' })
  return facts
}

function getLocationStatus(id: CityLocationId, state: SimulationState): CityLocationStatus {
  if (id === 'central-hospital') {
    return state.module1.vomitingExposureOccurred ? 'exposure-event' : 'suspected-location'
  }
  if (id === 'cdc') {
    if (state.module1.reportWithin15Minutes === true) return 'response-active'
    if (state.module1.reportWithin15Minutes === false) return 'response-delayed'
    return 'response-ready'
  }
  if (id === 'designated-hospital' || id === 'laboratory') return 'future'
  if (id === 'airport') return 'passed'
  return 'investigation'
}

function getLocationDetail(id: CityLocationId, state: SimulationState): string {
  if (id === 'central-hospital') {
    if (state.module1.vomitingExposureOccurred) return '院内发生体液暴露事件，相关人员进入暴露评估流程；这不代表发生 21 例感染。'
    if (state.module1.exposureControlQuality === 'good') return '疑似病例已较早进入隔离流程，院内暴露范围相对受控。'
    if (state.module1.exposureControlQuality === 'compromised') return '疑似病例仍处于延迟隔离路径，院内暴露窗口尚未关闭。'
    return '疑似病例当前位于急诊区域，等待首轮风险识别与隔离决策。'
  }
  if (id === 'cdc') {
    if (state.module1.reportWithin15Minutes === true) return '医院已先行快报，疾控响应已启动，计划于 12:00 前到场。'
    if (state.module1.reportWithin15Minutes === false) return '医院等待首轮检查结果，外部响应累计延迟 2 小时 10 分钟。'
    return '首次报告决策尚未完成，疾控机构保持待命。'
  }
  return cityLocationCatalog.find((location) => location.id === id)?.sourceNote ?? ''
}

function getSignals(state: SimulationState): CitySignal[] {
  const m = state.module1
  const assessment = m.additionalAssessmentRequired > 0
    ? `新增 ${m.additionalAssessmentRequired} 人`
    : m.exposureControlQuality === 'good' ? '相对受控' : '待调查'
  const response = m.reportWithin15Minutes === true
    ? '已启动'
    : m.reportWithin15Minutes === false ? '延迟 2h10m' : '待决策'
  return [
    { label: '当前病例', value: '疑似 1 例', tone: 'active', provenance: 'derived' },
    { label: '院内暴露', value: m.exposureDurationMinutes === null ? '动态评估' : `${m.exposureDurationMinutes} 分钟`, tone: m.exposureControlQuality === 'compromised' ? 'alert' : 'neutral', provenance: m.exposureDurationMinutes === null ? 'derived' : 'source' },
    { label: '评估工作量', value: assessment, tone: m.additionalAssessmentRequired > 0 ? 'alert' : 'neutral', provenance: m.additionalAssessmentRequired > 0 ? 'source' : 'derived' },
    { label: '外部响应', value: response, tone: m.reportWithin15Minutes === false ? 'alert' : m.reportWithin15Minutes === true ? 'active' : 'neutral', provenance: m.reportWithin15Minutes === false ? 'source' : 'derived' },
  ]
}

export function getCitySituation(state: SimulationState): CitySituation {
  const locations = cityLocationCatalog.map((location) => {
    const status = getLocationStatus(location.id, state)
    const facts = location.id === 'central-hospital'
      ? hospitalFacts(state)
      : location.id === 'cdc' && state.module1.reportWithin15Minutes !== null
        ? [{ label: '响应状态', value: state.module1.reportWithin15Minutes ? '12:00 前到场' : '+2 小时 10 分钟', provenance: 'source' as const }]
        : []
    return { ...location, status, statusLabel: statusLabel[status], detail: getLocationDetail(location.id, state), facts }
  })

  const routes: CityRoute[] = [
    { id: 'arrival-transit', from: 'airport', to: 'airport-bus', kind: 'trajectory', status: 'completed' },
    { id: 'transit-home', from: 'airport-bus', to: 'home', kind: 'trajectory', status: 'completed' },
    { id: 'home-store', from: 'home', to: 'convenience-store', kind: 'trajectory', status: 'completed' },
    { id: 'store-ride', from: 'convenience-store', to: 'ride-hailing', kind: 'trajectory', status: 'completed' },
    { id: 'ride-hospital', from: 'ride-hailing', to: 'central-hospital', kind: 'trajectory', status: 'completed', label: '08月05日 10:18' },
    {
      id: 'cdc-hospital', from: 'cdc', to: 'central-hospital', kind: 'response',
      status: state.module1.reportWithin15Minutes === true ? 'active' : state.module1.reportWithin15Minutes === false ? 'delayed' : 'pending',
    },
  ]

  const summary = state.module1.downstreamResponsePressure === 'high'
    ? '医院暴露评估工作量扩大，同时外部响应延迟；后续调查将面临叠加压力。'
    : state.module1.additionalAssessmentRequired > 0
      ? '医院已出现体液暴露事件，新增 21 人需要评估；该人数不代表感染或高风险接触者。'
      : state.module1.earlyPublicOpinionRisk
        ? '当前问题仍集中在医院，同时出现患者沟通与舆情风险信号。'
        : state.module1.reportWithin15Minutes === true
          ? '当前疑似病例位于市中心医院，院内处置与外部公共卫生响应已经衔接。'
          : '当前问题集中在市中心医院；既往入境后轨迹需要逐点调查，不代表沿途发生传播。'

  return { locations, routes, signals: getSignals(state), summary }
}
