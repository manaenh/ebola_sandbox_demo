import { useMemo, useState } from 'react'
import type { SimulationState } from '../../simulation/types'
import { ReviewMap } from './ReviewMap'
import { getKeyDecisionPath, getReviewBeats } from './reviewData'

type Tab = 'map' | 'decisions' | 'chain'
const tabs: { id: Tab; label: string }[] = [
  { id: 'map', label: '地图回放' }, { id: 'decisions', label: '决策路径' }, { id: 'chain', label: '传播链' },
]
const institutions = ['医院', '疾控', '卫健委', '定点医院', '实验室']

export function ShowcaseReview({ state, example = false }: { state: SimulationState; example?: boolean }) {
  const [tab, setTab] = useState<Tab>('map')
  const [step, setStep] = useState(0)
  const beats = useMemo(() => getReviewBeats(state), [state])
  const path = useMemo(() => getKeyDecisionPath(state), [state])
  const beat = beats[step]

  return <section className="showcase-review" aria-label="本次推演复盘">
    <div className="showcase-review-heading">
      <small>{example ? '埃博拉示例复盘' : '截至 08月10日 · 二次病例确认'}</small>
      <h1>本次推演复盘</h1>
      <p>2例确诊 · 0死亡 · 传播链止于第二代</p>
    </div>
    <div className="showcase-review-key-path" aria-label="你的关键决策路径">
      <h2>你的关键决策路径</h2>
      <div>{path.filter((item) => item.id !== 'M3-2').map((item) => <div className={`showcase-review-key-item ${item.tone}`} key={item.id}>
        <span>{item.time}</span><strong><b>{item.code}</b>{item.choice}</strong><i aria-hidden="true">→</i><em>{item.consequence}</em>
      </div>)}</div>
    </div>
    <nav className="showcase-review-tabs" aria-label="复盘内容">{tabs.map((item) => <button type="button" key={item.id} className={tab === item.id ? 'active' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
    {tab === 'map' && <div className="showcase-review-map-layout">
      <div className="showcase-review-map-panel"><ReviewMap beat={beat} /><div className="showcase-review-map-caption" aria-live="polite"><span>{beat.time}</span><strong>{beat.sentence}</strong></div></div>
      <aside className="showcase-review-events">
        <h2>事件回放</h2>
        <div className={`showcase-review-current-event ${beat.tone}`} aria-live="polite"><time>{beat.time}</time><strong>{beat.sentence}</strong><p>{beat.consequence}</p></div>
        <div className="showcase-review-scrubber"><label htmlFor="showcase-review-time">事件时间轴</label><input id="showcase-review-time" type="range" min="0" max={beats.length - 1} step="1" value={step} onChange={(event) => setStep(Number(event.target.value))} aria-valuetext={`${beat.time}，${beat.sentence}`} /><div className="showcase-review-scrubber-ends"><span>{beats[0].time}</span><span>{beats.at(-1)?.time}</span></div></div>
        <div className="showcase-review-event-index">{beats.map((item, index) => <button type="button" key={item.time} className={step === index ? 'active' : ''} onClick={() => setStep(index)} aria-label={`${item.time}：${item.sentence}`}>{index + 1}</button>)}</div>
        <div className="showcase-review-step-controls"><button disabled={step === 0} onClick={() => setStep(step - 1)}>← 上一步</button><span>{step + 1} / {beats.length}</span><button disabled={step === beats.length - 1} onClick={() => setStep(step + 1)}>下一步 →</button></div>
      </aside>
      <div className="showcase-review-coordination"><h2>机构协同</h2><div className="showcase-review-institution-flow">{institutions.map((name, index) => <span key={name}>{name}{index < institutions.length - 1 && <i aria-hidden="true">→</i>}</span>)}</div></div>
    </div>}
    {tab === 'decisions' && <div className="showcase-review-decisions"><div className="showcase-review-section-heading"><h2>你的关键决策路径</h2><p>选择改变了处置时间、查找进展和高风险接触者数量。</p></div><ol>{path.map((item) => <li className={item.tone} key={item.id}><time>{item.time}</time><div><strong><b>{item.code}</b>{item.choice}</strong><span className="showcase-review-decision-arrow" aria-hidden="true">↓</span><p>{item.consequence}</p></div></li>)}</ol></div>}
    {tab === 'chain' && <div className="showcase-review-chain"><div className="showcase-review-section-heading"><h2>传播链</h2><p>红线只标记已确认的人际传播。</p></div><div className="showcase-review-chain-graphic" aria-label="境外源头到周启航；周启航传至沈洁；截至本次复盘无下一代病例"><span className="origin">境外源头<small>输入来源</small></span><i className="unconfirmed" aria-hidden="true" /><span>周启航<small>确诊病例 1</small></span><i className="confirmed" aria-hidden="true" /><span>沈洁<small>确诊病例 2</small></span><i className="no-next" aria-hidden="true" /><span className="none">无下一代病例<small>截至本次复盘</small></span></div><div className="showcase-review-chain-legend"><span><i />已确认传播</span><span><i />来源或未发生后续传播</span><p>候诊接触、航班同乘和协查对象不等于感染。</p></div></div>}
  </section>
}
