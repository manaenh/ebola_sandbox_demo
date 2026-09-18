import { useEffect, useState } from 'react'
import { LaterShowcaseMap, type LaterChoice, type LaterMapMoment } from './LaterShowcaseMap'

type Beat = 'cross-question' | 'cross-action' | 'cross-result' | 'rumor-question' | 'rumor-action' | 'rumor-result' | 'monitoring' | 'final'

export function LaterShowcase({ onComplete, onClockChange }: { onComplete: () => void; onClockChange: (time: string) => void }) {
  const [beat, setBeat] = useState<Beat>('cross-question')
  const [crossChoice, setCrossChoice] = useState<LaterChoice>(null)
  const [rumorChoice, setRumorChoice] = useState<LaterChoice>(null)
  const [monitoringStep, setMonitoringStep] = useState(0)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const cross = beat.startsWith('cross')
  const rumor = beat.startsWith('rumor')
  const moment: LaterMapMoment = cross ? 'coordination' : rumor ? 'rumor' : beat === 'monitoring' ? 'monitoring' : 'final'
  const action = beat.endsWith('action') || beat.endsWith('result')

  useEffect(() => {
    if (cross) onClockChange('2026-08-13T09:30:00+08:00')
    else if (rumor) onClockChange(beat === 'rumor-result' && rumorChoice === 'A' ? '2026-08-15T16:00:00+08:00' : '2026-08-15T10:00:00+08:00')
    else if (beat === 'monitoring') onClockChange([
      rumorChoice === 'A' ? '2026-08-15T16:00:00+08:00' : '2026-08-15T10:00:00+08:00',
      '2026-09-03T10:00:00+08:00',
      '2026-09-18T09:00:00+08:00',
    ][monitoringStep])
    else onClockChange('2026-09-18T09:00:00+08:00')
  }, [beat, cross, rumor, rumorChoice, monitoringStep, onClockChange])

  useEffect(() => {
    const next: Partial<Record<Beat, Beat>> = {
      'cross-action': 'cross-result', 'cross-result': 'rumor-question',
      'rumor-action': 'rumor-result', 'rumor-result': 'monitoring', monitoring: 'final',
    }
    if (beat === 'final') {
      const timer = window.setTimeout(onComplete, reduced ? 2400 : 5600)
      return () => window.clearTimeout(timer)
    }
    if (!next[beat]) return
    const duration = reduced ? 1800 : beat === 'cross-action' || beat === 'rumor-action' ? 6300
      : beat === 'monitoring' ? 9000 : 5500
    const timer = window.setTimeout(() => setBeat(next[beat]!), duration)
    return () => window.clearTimeout(timer)
  }, [beat, onComplete, reduced])

  useEffect(() => {
    if (beat !== 'monitoring') return
    setMonitoringStep(0)
    const first = window.setTimeout(() => setMonitoringStep(1), reduced ? 500 : 600)
    const second = window.setTimeout(() => setMonitoringStep(2), reduced ? 1000 : 3600)
    return () => { window.clearTimeout(first); window.clearTimeout(second) }
  }, [beat, reduced])

  return <div className="showcase-later-story">
    <LaterShowcaseMap moment={moment} choice={cross ? crossChoice : rumor ? rumorChoice : null} active={action} />
    {beat === 'cross-question' && <section className="showcase-later-decision" aria-live="polite">
      <small>跨市协同</small>
      <h1>邻市中风险接触者出现 37.9°C、咽痛</h1>
      <p>两地如何协同处置？</p>
      <div className="showcase-later-options">
        <button onClick={() => { setCrossChoice('A'); setBeat('cross-action') }}><b>A</b>立即点对点协同</button>
        <button onClick={() => { setCrossChoice('B'); setBeat('cross-action') }}><b>B</b>两地分别处置</button>
      </div>
    </section>}
    {beat === 'cross-action' && <div key={beat} className={`showcase-later-caption ${crossChoice === 'B' ? 'amber' : ''}`} role="status">
      {crossChoice === 'A' ? '深圳 ↔ 邻市｜2小时内完成协同闭环' : '两地信息未同步｜协同闭环延后'}
    </div>}
    {beat === 'cross-result' && <section key={beat} className="showcase-later-result cross" role="status">
      <h1>流感A阳性</h1><h2>EBOV阴性</h2>
      <small>排除埃博拉续发</small>
    </section>}
    {beat === 'rumor-question' && <section className="showcase-later-decision rumor" aria-live="polite">
      <small>谣言处置</small>
      <h1>一则不实疫情消息正在传播</h1>
      <p>如何回应？</p>
      <div className="showcase-later-options">
        <button onClick={() => { setRumorChoice('A'); setBeat('rumor-action') }}><b>A</b>立即核实并回应</button>
        <button onClick={() => { setRumorChoice('B'); setBeat('rumor-action') }}><b>B</b>稍后统一回应</button>
      </div>
    </section>}
    {beat === 'rumor-action' && <div key={beat} className="showcase-later-caption amber" role="status">
      {rumorChoice === 'A' ? '30分钟内核实回应｜专家与官方信息开始扩散' : '关键回应窗口过去｜不实消息继续扩散'}
    </div>}
    {beat === 'rumor-result' && <section key={beat} className={`showcase-later-result rumor ${rumorChoice === 'B' ? 'adverse' : ''}`} role="status">
      {rumorChoice === 'A' ? <><small>回应后 6 小时</small><h1>搜索热度 ↓43%</h1><p>官方信息压过不实消息</p></> :
        <><small>关键窗口延误 · 随后统一回应</small><h1>口罩销量 ×6</h1><h2>急诊咨询 +180%</h2></>}
      <span>信息传播示意 · 非感染传播</span>
    </section>}
    {beat === 'monitoring' && <div className="showcase-later-caption monitoring" role="status">持续健康监测 · 无新增病例</div>}
    {beat === 'final' && <section className="showcase-later-final" role="status">
      <h1>传播链止于第二代</h1>
      <p>确诊2例 · 死亡0 · 医务人员感染0</p>
    </section>}
    {rumor && <div className="showcase-later-map-key">橙色波纹：信息传播示意</div>}
  </div>
}
