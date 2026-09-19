import { useEffect, useState, type Dispatch } from 'react'
import type { SimulationAction, SimulationState } from '../../simulation/types'
import { showcaseTiming } from './timing'

const seats = Array.from({ length: 42 }, (_, index) => index)
const patientSeat = 20
// Illustrative highlights only; these positions are not individual passenger records.
const highSeats = new Set([14, 19, 21, 26])
const mediumSeats = new Set([8, 13, 27, 32])
const lowSeats = new Set([2, 10, 31, 37])
const assessmentFactors = ['症状时点', '座位位置', '服务接触', '体液暴露'] as const
const groups = [
  { key: 'high', label: '高风险', value: 'flightHighRisk' },
  { key: 'medium', label: '中风险', value: 'flightMediumRisk' },
  { key: 'low', label: '低风险观察', value: 'flightLowObservation' },
  { key: 'other', label: '其余', value: 'flightExcludedFromActiveMonitoring' },
] as const

export function FlightReviewScene({ state, dispatch, onComplete }: { state: SimulationState; dispatch: Dispatch<SimulationAction>; onComplete?: () => void }) {
  const selected = state.decisions['M3-2']
  const [reveal, setReveal] = useState(state.module3.flightReviewCompleted ? 9 : 0)
  const [choice, setChoice] = useState<'A' | 'B' | null>(
    selected === 'classify-flight-risk' ? 'A' : selected === 'uniform-flight-management' ? 'B' : null,
  )

  useEffect(() => {
    if (!choice || reveal === 9) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const firstDelay = choice === 'B' && reveal === 0
      ? (reduced ? 0 : showcaseTiming.flightUniformHold)
      : (reduced ? 0 : showcaseTiming.flightRevealStep)
    const timer = window.setTimeout(() => setReveal((current) => Math.min(9, current + 1)), firstDelay)
    return () => window.clearTimeout(timer)
  }, [choice, reveal])

  useEffect(() => {
    if (reveal !== 9 || !onComplete) return
    const timer = window.setTimeout(onComplete, showcaseTiming.flightResultHold)
    return () => window.clearTimeout(timer)
  }, [reveal, onComplete])

  const choose = (next: 'A' | 'B') => {
    if (choice || state.currentEventId !== 'M3-2' || state.phase !== 'deciding') return
    dispatch({ type: 'RESOLVE_DECISION', decision: next === 'A' ? 'classify-flight-risk' : 'uniform-flight-management' })
    setChoice(next)
    setReveal(next === 'A' ? 1 : 0)
  }

  return <section className="showcase-flight" aria-label="航班暴露风险复核">
    <div className="showcase-flight-heading">
      <small>08月07日 09:00 · 航班暴露复核</small>
      <h1>{choice ? choice === 'B' && reveal === 0 ? `${state.module3.flightPassengersTotal}名乘客先统一强化管理` : reveal < 5 ? '核实实际暴露' : '按实际暴露分类' : '全航班都要按密接管理吗？'}</h1>
      {choice === 'B' && reveal === 0 && <p className="showcase-flight-expanded">管理范围扩大</p>}
    </div>

    <div className={`showcase-aircraft ${choice === 'B' && reveal === 0 ? 'uniform' : ''} ${choice && reveal > 0 && reveal < 5 ? 'assessing' : ''}`} aria-label="示意客舱，周启航位置突出显示；彩色座位仅象征最终分层，不是真实座位记录">
      <div className="showcase-aircraft-nose" />
      <div className="showcase-aircraft-cabin">
        {seats.map((seat) => {
          const risk = reveal >= 5 && highSeats.has(seat) ? 'risk-high'
            : reveal >= 6 && mediumSeats.has(seat) ? 'risk-medium'
              : reveal >= 7 && lowSeats.has(seat) ? 'risk-low' : ''
          return <i key={seat} className={`showcase-seat ${risk} ${seat === patientSeat ? 'patient-seat' : ''}`}>
            {seat === patientSeat && <span>周启航</span>}
          </i>
        })}
      </div>
      <div className="showcase-aircraft-tail" />
    </div>
    {choice && reveal > 0 && <div className="showcase-flight-evidence" aria-label="判定依据">
      <strong>判定依据</strong>
      {assessmentFactors.map((factor, index) => reveal >= index + 1 && <span key={factor}>{factor}</span>)}
    </div>}

    {!choice ? <div className="showcase-flight-actions">
      <button onClick={() => choose('A')}><b>A</b>按暴露风险分类</button>
      <button onClick={() => choose('B')}><b>B</b>全员统一管理</button>
    </div> : <div className="showcase-flight-results" aria-live="polite">
      {groups.map((group, index) => reveal >= index + 5 && <div key={group.key} className={`showcase-flight-result result-${group.key}`}>
        <span>{group.label}</span><strong>{state.module3[group.value]}</strong>
      </div>)}
      {reveal === 9 && <p className="showcase-flight-lesson">密接判定，要看实际暴露</p>}
    </div>}
  </section>
}
