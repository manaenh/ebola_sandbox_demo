import { useEffect, useState, type Dispatch } from 'react'
import type { SimulationAction, SimulationState } from '../../simulation/types'
import { MonitoringPointScene } from '../MonitoringPointScene'
import { monitoringConsequenceTime } from './sequence'
import { showcaseTiming } from './timing'
import { useShowcasePause } from './ShowcasePause'

export function MonitoringHeroScene({ state, dispatch, onComplete }: {
  state: SimulationState
  dispatch: Dispatch<SimulationAction>
  onComplete: () => void
}) {
  const { setPausableTimeout, clearPausableTimeout } = useShowcasePause()
  const delayed = state.module4.separationStatus === 'delayed'
  const immediate = state.module4.separationStatus === 'immediate'
  const completed = state.module4.transferStatus === 'completed'
  const targetTime = monitoringConsequenceTime(state)
  const [elapsedHours, setElapsedHours] = useState(0)
  const [showDecision, setShowDecision] = useState(false)

  useEffect(() => {
    if (state.phase !== 'deciding') return
    const timer = setPausableTimeout(() => setShowDecision(true), showcaseTiming.monitoringDecisionReveal)
    return () => clearPausableTimeout(timer)
  }, [state.phase, setPausableTimeout, clearPausableTimeout])

  useEffect(() => {
    if (!delayed || completed) return
    let cancelled = false
    let timer = 0
    const tick = () => {
      if (cancelled) return
      setElapsedHours((hours) => Math.min(4, hours + 1))
      timer = setPausableTimeout(tick, showcaseTiming.monitoringHourTick)
    }
    timer = setPausableTimeout(tick, showcaseTiming.monitoringHourTick)
    return () => { cancelled = true; clearPausableTimeout(timer) }
  }, [delayed, completed, setPausableTimeout, clearPausableTimeout])

  useEffect(() => {
    if (!targetTime || completed) return
    const timer = setPausableTimeout(
      () => dispatch({ type: 'ADVANCE_TIME', simulationTime: targetTime }),
      delayed ? showcaseTiming.monitoringDelayedAction : showcaseTiming.monitoringImmediateAction,
    )
    return () => clearPausableTimeout(timer)
  }, [targetTime, completed, delayed, dispatch, setPausableTimeout, clearPausableTimeout])

  useEffect(() => {
    if (!completed) return
    const timer = setPausableTimeout(onComplete, showcaseTiming.monitoringConsequenceHold)
    return () => clearPausableTimeout(timer)
  }, [completed, onComplete, setPausableTimeout, clearPausableTimeout])

  return <section className={`showcase-monitoring ${immediate ? 'choice-a' : ''} ${delayed ? 'choice-b' : ''}`} aria-label="沈洁健康监测报警">
    <div className="showcase-monitoring-heading">
      <small>08月10日 07:20｜集中健康监测点</small>
      <h1>沈洁｜周启航妻子 · 健康监测对象</h1>
      <p>38.1°C · 乏力 · 恶心</p>
    </div>
    <div className="showcase-monitoring-scene" inert>
      <MonitoringPointScene module4={state.module4} />
    </div>
    {delayed && !completed && <div className="showcase-monitoring-clock" role="status">+{elapsedHours}h</div>}
    {state.phase === 'deciding' && showDecision && <div className="showcase-monitoring-decision">
      <h2>监测对象出现发热，怎么处理？</h2>
      <div>
        <button onClick={() => dispatch({ type: 'RESOLVE_DECISION', decision: 'immediate-monitoring-separation' })}><b>A</b>立即隔离并转运</button>
        <button onClick={() => dispatch({ type: 'RESOLVE_DECISION', decision: 'continue-monitoring-assessment' })}><b>B</b>继续观察后再转运</button>
      </div>
    </div>}
    {completed && <div className={`showcase-monitoring-result ${delayed ? 'delayed' : ''}`} role="status">
      <strong>{delayed ? `共享卫生间暴露${state.module4.sharedBathroomExposureDurationMinutes / 60}小时` : `${state.module4.transferCompletedWithinMinutes}分钟内完成转运`}</strong>
      <span>{delayed ? `新增${state.module4.additionalHighRiskContacts}名高风险接触者` : '未新增高风险暴露'}</span>
    </div>}
  </section>
}

export function SecondaryCaseHero({ state }: { state: SimulationState }) {
  const { setPausableTimeout, clearPausableTimeout } = useShowcasePause()
  const [showChain, setShowChain] = useState(false)
  useEffect(() => {
    const timer = setPausableTimeout(() => setShowChain(true), showcaseTiming.transmissionReveal)
    return () => clearPausableTimeout(timer)
  }, [setPausableTimeout, clearPausableTimeout])

  return <section className="showcase-secondary" aria-label="沈洁二次病例确诊">
    {state.module4.secondaryConfirmed && <div className="showcase-secondary-result" role="status">
      <small>08月10日 15:30 · 检测结果</small>
      <h1>沈洁 EBOV 核酸阳性</h1>
      <strong>确诊病例 {state.module4.confirmedCases}</strong>
    </div>}
    {showChain && state.module4.secondaryConfirmed && state.module4.sequenceConsistentWithIndex && <div className="showcase-transmission" aria-label="已确认传播关系：周启航传至沈洁">
      <span>周启航</span><i aria-hidden="true" /><span>沈洁</span>
    </div>}
  </section>
}
