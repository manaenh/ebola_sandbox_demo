import { useEffect, useMemo, useState } from 'react'
import type { SimulationState } from '../../simulation/types'
import { ReviewMap } from '../showcase/ReviewMap'
import { getReviewBeats } from '../showcase/reviewData'
import { scenarioLocations } from '../showcase/responseGeography'
import './platform.css'

export type WorkbenchPage = 'home' | 'scenario' | 'transmission'

type Props = {
  page: WorkbenchPage
  reviewState: SimulationState
  reviewIsExample: boolean
  onNavigate: (page: WorkbenchPage) => void
  onShowcase: () => void
  onReview: () => void
  onLegacy: () => void
}

const entries = [
  { number: '01', title: '情景推演', detail: '选择情景 · 应急处置', key: 'scenario' },
  { number: '02', title: '传播仿真', detail: '病例 · 暴露 · 网络', key: 'transmission' },
  { number: '03', title: '复盘评估', detail: '决策 · 后果 · 传播链', key: 'review' },
  { number: '04', title: '快速展示', detail: '五分钟示范推演', key: 'showcase' },
] as const

const mapNodes = ['airport', 'central-hospital', 'cdc', 'health', 'designated-hospital', 'laboratory'] as const
const mapLinks = [['central-hospital', 'cdc'], ['cdc', 'health'], ['central-hospital', 'designated-hospital'], ['designated-hospital', 'laboratory']] as const

function ShenzhenSilhouette() {
  const [shape, setShape] = useState<{ path: string; bounds: [number, number, number, number] } | null>(null)
  useEffect(() => {
    const abort = new AbortController()
    fetch(`${import.meta.env.BASE_URL}maps/shenzhen-boundary.geojson`, { signal: abort.signal }).then((response) => response.json()).then((data: { geometry: { coordinates: number[][][][] } }) => {
      const polygons = data.geometry.coordinates.map((polygon) => polygon[0])
      const points = polygons.flat()
      const bounds: [number, number, number, number] = [Math.min(...points.map((point) => point[0])), Math.max(...points.map((point) => point[0])), Math.min(...points.map((point) => point[1])), Math.max(...points.map((point) => point[1]))]
      const projectPoint = ([lng, lat]: number[]) => [((lng - bounds[0]) / (bounds[1] - bounds[0])) * 960 + 20, 450 - ((lat - bounds[2]) / (bounds[3] - bounds[2])) * 420]
      setShape({ bounds, path: polygons.map((ring) => `${ring.map((point, index) => `${index === 0 ? 'M' : 'L'}${projectPoint(point)[0].toFixed(1)},${projectPoint(point)[1].toFixed(1)}`).join(' ')} Z`).join(' ') })
    }).catch(() => { /* The network overlay remains useful if the local outline is unavailable. */ })
    return () => abort.abort()
  }, [])
  const project = ([lng, lat]: number[]) => shape
    ? [((lng - shape.bounds[0]) / (shape.bounds[1] - shape.bounds[0])) * 960 + 20, 450 - ((lat - shape.bounds[2]) / (shape.bounds[3] - shape.bounds[2])) * 420]
    : [500, 235]
  return <svg className="platform-shenzhen" viewBox="0 0 1000 470" role="img" aria-label="深圳示意地图与应急响应网络">
    {shape && <path className="platform-shenzhen-fill" d={shape.path} />}
    {shape && mapLinks.map(([from, to]) => { const start = project(scenarioLocations[from].coordinates); const end = project(scenarioLocations[to].coordinates); return <line key={`${from}-${to}`} className="platform-shenzhen-link" x1={start[0]} y1={start[1]} x2={end[0]} y2={end[1]} /> })}
    {shape && mapNodes.map((id) => { const [x, y] = project(scenarioLocations[id].coordinates); return <g key={id}><circle className="platform-shenzhen-node-halo" cx={x} cy={y} r="12" /><circle className="platform-shenzhen-node" cx={x} cy={y} r="3" /></g> })}
  </svg>
}

function TransmissionPage({ state, example }: { state: SimulationState; example: boolean }) {
  const [step, setStep] = useState(0)
  const beats = useMemo(() => getReviewBeats(state), [state])
  const beat = beats[step]
  const confirmed = step < 4 ? 0 : step < 8 ? 1 : 2
  return <main className="platform-content platform-transmission">
    <div className="platform-page-title"><span>02 / 传播仿真</span><h1>传播仿真</h1><p>{example ? '示范情景回放' : '当前推演回放'} · 深圳输入性埃博拉疫情</p></div>
    <div className="platform-transmission-grid"><div className="platform-transmission-map"><ReviewMap beat={beat} /><div className="platform-map-overlay"><time>{beat.time}</time><strong>{beat.sentence}</strong></div></div><aside className="platform-transmission-panel">
      <span className="platform-panel-kicker">时间轴 / {String(step + 1).padStart(2, '0')}</span><h2>{beat.sentence}</h2><p className={beat.tone}>{beat.consequence}</p>
      <label htmlFor="platform-time">事件进程</label><input id="platform-time" type="range" min="0" max={beats.length - 1} value={step} onChange={(event) => setStep(Number(event.target.value))} aria-valuetext={`${beat.time}，${beat.sentence}`} />
      <div className="platform-time-controls"><button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>← 上一步</button><span>{step + 1} / {beats.length}</span><button type="button" disabled={step === beats.length - 1} onClick={() => setStep(step + 1)}>下一步 →</button></div>
      <div className="platform-transmission-readout"><span>已确认病例 <strong>{confirmed}</strong></span><span>新增需评估 <strong>{state.module1.additionalAssessmentRequired}</strong></span></div>
      <div className="platform-transmission-network"><small>接触与传播关系</small><div className="platform-network-source">周启航 <span>{confirmed ? '确诊病例 1' : '疑似病例'}</span></div><div className="platform-network-branches"><span className="exposure">候诊接触 <small>暴露调查</small></span>{step >= 5 && <span className="exposure">航班同乘 <small>风险分类</small></span>}{step >= 7 && <span className={step >= 8 ? 'confirmed' : 'exposure'}>沈洁 <small>{step >= 8 ? '确诊病例 2' : '健康监测'}</small></span>}</div><p>{step >= 8 ? '红线仅表示已确认传播' : '接触与同乘不等于感染'}</p></div>
    </aside></div>
    <div className="platform-map-legend"><span><i className="node" />病例与机构节点</span><span><i className="amber" />暴露调查</span><span><i className="teal" />机构协同</span><span><i className="red" />确认传播</span></div>
  </main>
}

export function PlatformWorkbench({ page, reviewState, reviewIsExample, onNavigate, onShowcase, onReview, onLegacy }: Props) {
  const open = (key: typeof entries[number]['key']) => {
    if (key === 'showcase') onShowcase()
    else if (key === 'review') onReview()
    else onNavigate(key)
  }
  return <div className="platform">
    <header className="platform-header"><button type="button" className="platform-brand" onClick={() => onNavigate('home')}><span className="platform-brand-mark" aria-hidden="true"><span /></span><span>传染病传播与应急决策推演平台</span></button><nav aria-label="主导航"><button type="button" className={page === 'home' ? 'active' : ''} onClick={() => onNavigate('home')}>总览</button><button type="button" className={page === 'scenario' ? 'active' : ''} onClick={() => onNavigate('scenario')}>情景推演</button><button type="button" className={page === 'transmission' ? 'active' : ''} onClick={() => onNavigate('transmission')}>传播仿真</button><button type="button" onClick={onReview}>复盘评估</button></nav></header>
    {page === 'home' && <main className="platform-content platform-home"><section className="platform-home-hero"><div className="platform-home-title"><span className="platform-serial">应急响应 / 推演系统</span><h1>传染病传播与<br />应急决策推演平台</h1><p>传播仿真 · 多角色决策 · 部门协同 · 复盘评估</p></div><div className="platform-home-map"><ShenzhenSilhouette /><span>深圳 · 应急响应网络</span></div></section>
      <section className="platform-entry-list" aria-label="平台入口">{entries.map((entry) => <button type="button" className="platform-entry" key={entry.key} onClick={() => open(entry.key)}><span className="platform-entry-number">{entry.number}</span><strong>{entry.title}</strong><span className="platform-entry-detail">{entry.detail}</span><span className="platform-entry-arrow" aria-hidden="true">↗</span></button>)}</section>
      <div className="platform-scenario-line"><span className="platform-scenario-status" aria-hidden="true" /><span>示范情景 · 深圳输入性埃博拉疫情</span><span className="platform-scenario-meta">当前可用</span></div></main>}
    {page === 'scenario' && <main className="platform-content platform-scenario"><div className="platform-page-title"><span>01 / 情景推演</span><h1>选择情景</h1><p>进入响应推演，处理关键决策节点。</p></div><section className="platform-scenario-select"><div><span className="platform-scenario-index">示范情景 / 01</span><h2>深圳输入性埃博拉疫情</h2><p>首诊识别 · 联合响应 · 航班暴露复核 · 二次病例</p><div className="platform-scenario-tags"><span>深圳</span><span>输入性疫情</span><span>多部门协同</span></div><button type="button" onClick={onShowcase}>进入情景推演 <span aria-hidden="true">→</span></button></div><div className="platform-scenario-map"><ShenzhenSilhouette /></div></section><p className="platform-scenario-note">当前仅开放该示范情景。后续情景将接入同一推演框架。</p></main>}
    {page === 'transmission' && <TransmissionPage state={reviewState} example={reviewIsExample} />}
    <footer className="platform-footer"><span>示范情景 · 深圳输入性埃博拉疫情</span><button type="button" onClick={onLegacy}>内部模式 ↗</button></footer>
  </div>
}
