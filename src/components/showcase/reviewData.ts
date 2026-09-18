import type { FeatureCollection, LineString } from 'geojson'
import { eventOrder, getEventDefinition } from '../../simulation/sourceData'
import type { SimulationState } from '../../simulation/types'
import { scenarioLocations, type ShowcaseLocationId } from './responseGeography'

type ReviewRoute = { from: ShowcaseLocationId; to: ShowcaseLocationId; kind: 'response' | 'transfer' | 'specimen' }
export type ReviewBeat = {
  time: string
  sentence: string
  consequence: string
  tone: 'controlled' | 'adverse' | 'neutral'
  focus: ShowcaseLocationId[]
  nodes: ShowcaseLocationId[]
  routes: ReviewRoute[]
}

const route = (from: ShowcaseLocationId, to: ShowcaseLocationId, kind: ReviewRoute['kind']): ReviewRoute => ({ from, to, kind })
const hospitalToCdc = route('central-hospital', 'cdc', 'response')
const cdcToHealth = route('cdc', 'health', 'response')
const hospitalToDesignated = route('central-hospital', 'designated-hospital', 'transfer')
const designatedToLab = route('designated-hospital', 'laboratory', 'specimen')

export function getReviewBeats(state: SimulationState): ReviewBeat[] {
  const delayedIsolation = state.module1.additionalAssessmentRequired > 0
  const delayedMonitoring = state.module4.additionalHighRiskContacts > 0
  const found = state.module3.initialHighRiskLocateRate
  return [
    { time: '08月05日 10:42', sentence: '市中心医院接诊周启航', consequence: `${delayedIsolation ? '隔离延迟' : '立即隔离'} → 候诊暴露 ${state.module1.exposureDurationMinutes ?? '—'} 分钟${delayedIsolation ? '，+21 人需评估' : ''}`, tone: delayedIsolation ? 'adverse' : 'controlled', focus: ['central-hospital'], nodes: ['central-hospital'], routes: [] },
    { time: '08月05日 11:20', sentence: '医院上报疑似病例，疾控与卫健委介入', consequence: state.module1.reportWithin15Minutes ? '快速上报，响应启动' : '报告延后，响应承压', tone: state.module1.reportWithin15Minutes ? 'controlled' : 'adverse', focus: ['central-hospital', 'cdc', 'health'], nodes: ['central-hospital', 'cdc', 'health'], routes: [hospitalToCdc, cdcToHealth] },
    { time: '08月05日 12:05', sentence: '市中心医院发起转运，定点医院准备接收', consequence: state.module2.transferWaitMinutes > 0 ? `等待 ${state.module2.transferWaitMinutes} 分钟后完成转运` : '启用备用转运方案', tone: state.module2.transferWaitMinutes > 0 ? 'adverse' : 'controlled', focus: ['central-hospital', 'designated-hospital'], nodes: ['central-hospital', 'designated-hospital'], routes: [hospitalToDesignated] },
    { time: '08月05日 13:30', sentence: '定点医院采样，标本送往市级实验室', consequence: state.module2.laboratoryDelayMinutes > 0 ? `实验室流程延迟 ${state.module2.laboratoryDelayMinutes} 分钟` : '标本进入检测流程', tone: state.module2.laboratoryDelayMinutes > 0 ? 'adverse' : 'controlled', focus: ['designated-hospital', 'laboratory'], nodes: ['designated-hospital', 'laboratory'], routes: [designatedToLab] },
    { time: '08月05日 18:40', sentence: '市级实验室复核阳性', consequence: '确诊病例 1，深圳启动联合应急响应', tone: 'neutral', focus: ['laboratory', 'cdc', 'health'], nodes: ['laboratory', 'cdc', 'health'], routes: [route('laboratory', 'cdc', 'response'), cdcToHealth] },
    { time: '08月07日 09:00', sentence: '深圳机场启动航班暴露复核', consequence: `首批高风险找到率 ${found === null ? '—' : `${Math.round(found * 100)}%`}；航班按实际暴露分类`, tone: found === 0.61 ? 'adverse' : 'controlled', focus: ['airport'], nodes: ['airport'], routes: [] },
    { time: '08月08日', sentence: '疾控启动跨区域协查', consequence: '同行者已找到', tone: 'controlled', focus: ['cdc', 'cross-region-target'], nodes: ['cdc', 'cross-region-target'], routes: [route('cdc', 'cross-region-target', 'response')] },
    { time: '08月10日 07:20', sentence: '沈洁在健康监测中出现症状', consequence: delayedMonitoring ? '延后转运 → 共享卫生间暴露 4 小时，+5 名高风险接触者' : '立即隔离转运 → 50 分钟内完成，未新增高风险暴露', tone: delayedMonitoring ? 'adverse' : 'controlled', focus: ['monitoring-site', 'designated-hospital'], nodes: ['monitoring-site', 'designated-hospital'], routes: [route('monitoring-site', 'designated-hospital', 'transfer')] },
    { time: '08月10日 15:30', sentence: '沈洁核酸阳性', consequence: '确诊病例 2；周启航 → 沈洁传播关系确认', tone: 'neutral', focus: ['monitoring-site', 'laboratory'], nodes: ['monitoring-site', 'laboratory'], routes: [] },
  ]
}

export type KeyDecision = { id: string; time: string; choice: string; code: 'A' | 'B'; consequence: string; tone: 'controlled' | 'adverse' | 'neutral' }

export function getKeyDecisionPath(state: SimulationState): KeyDecision[] {
  const result: KeyDecision[] = []
  if (state.decisions['M1-1']) result.push({ id: 'M1-1', time: '08月05日 · 首诊', code: state.decisions['M1-1'] === 'rapid-epidemiology' ? 'A' : 'B',
    choice: state.decisions['M1-1'] === 'rapid-epidemiology' ? '立即隔离' : '先常规评估',
    consequence: `隔离 ${state.module1.exposureDurationMinutes ?? '—'} min → +${state.module1.additionalAssessmentRequired} 人需评估`,
    tone: state.module1.additionalAssessmentRequired > 0 ? 'adverse' : 'controlled' })
  if (state.decisions['M2-3']) result.push({ id: 'M2-3', time: '08月05日 · 追踪', code: state.decisions['M2-3'] === 'escalate-on-screening' ? 'A' : 'B',
    choice: state.decisions['M2-3'] === 'escalate-on-screening' ? '立即启动追踪' : '复核后全面追踪',
    consequence: `首批高风险找到率 ${state.module3.initialHighRiskLocateRate === null ? '—' : `${Math.round(state.module3.initialHighRiskLocateRate * 100)}%`}`,
    tone: state.module3.initialHighRiskLocateRate === 0.61 ? 'adverse' : 'controlled' })
  if (state.decisions['M3-2']) result.push({ id: 'M3-2', time: '08月07日 · 航班', code: state.decisions['M3-2'] === 'classify-flight-risk' ? 'A' : 'B',
    choice: state.decisions['M3-2'] === 'classify-flight-risk' ? '按暴露风险分类' : '全员统一管理',
    consequence: `${state.decisions['M3-2'] === 'uniform-flight-management' ? '先扩大管理范围 → ' : ''}最终分类 7 / 18 / 39 / 234`, tone: 'neutral' })
  if (state.decisions['M4-1']) result.push({ id: 'M4-1', time: '08月10日 · 监测', code: state.decisions['M4-1'] === 'immediate-monitoring-separation' ? 'A' : 'B',
    choice: state.decisions['M4-1'] === 'immediate-monitoring-separation' ? '立即隔离转运' : '延后转运',
    consequence: state.module4.additionalHighRiskContacts > 0 ? `共享卫生间暴露 4 小时 → +${state.module4.additionalHighRiskContacts} 名高风险接触者` : '50 分钟内转运 → 未新增高风险暴露',
    tone: state.module4.additionalHighRiskContacts > 0 ? 'adverse' : 'controlled' })
  return result
}

export function reviewRouteData(beat: ReviewBeat): FeatureCollection<LineString> {
  return { type: 'FeatureCollection', features: beat.routes.map((item, index) => ({
    type: 'Feature', properties: { id: `review-${index}`, kind: item.kind, status: 'active' },
    geometry: { type: 'LineString', coordinates: [scenarioLocations[item.from].coordinates, scenarioLocations[item.to].coordinates] },
  })) }
}

const shortDecisions: Record<string, string> = {
  'rapid-epidemiology': '立即隔离，核实旅行与接触史', 'staged-assessment': '先按常规急诊流程检查',
  'risk-communication': '解释风险并联系家属', 'direct-procedure': '直接推进隔离与采样',
  'early-report': '先上报疑似病例', 'await-tests': '等待检查后报告',
  'backup-transfer': '启用备用转运车辆', 'wait-regular-transfer': '等待常备转运车辆',
  'standardized-sampling': '规范采样与送检', 'routine-multi-test': '按常规流程采样送检',
  'escalate-on-screening': '初筛阳性后启动追踪', 'await-confirmation': '复核后全面追踪',
  'classify-investigation-list': '按实际暴露分类', 'uniform-interim-management': '先统一管理调查对象',
  'classify-flight-risk': '按暴露风险分类', 'uniform-flight-management': '全员统一管理后复核',
  'minimum-info-coordination': '立即跨区域协查', 'await-complete-itinerary': '核实行程后协查',
  'immediate-monitoring-separation': '立即隔离并转运', 'continue-monitoring-assessment': '继续观察后转运',
}

export function getReviewDecisions(state: SimulationState) {
  return eventOrder.flatMap((id) => {
    const selected = state.decisions[id]
    if (!selected || !id.startsWith('M') || id === 'M4-3') return []
    const event = getEventDefinition(id)
    const option = event.decisions.find((decision) => decision.id === selected)
    if (!option) return []
    return [{ id, module: event.module, time: `${event.date.slice(5).replace('.', '月')}日 ${event.time}`, event: event.decisionTreeLabel,
      choice: shortDecisions[selected] ?? option.title, code: option.code }]
  })
}
