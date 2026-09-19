import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react'
import type { SimulationAction, SimulationState } from '../../simulation/types'
import { getEventDefinition } from '../../simulation/sourceData'
import { HospitalScene } from '../HospitalScene'
import { TransportScene } from '../TransportScene'
import { SamplingScene } from '../SamplingScene'
import { ShowcaseMap } from './ShowcaseMap'
import { ResponseMap } from './ResponseMap'
import { FlightReviewScene } from './FlightReviewScene'
import { MonitoringHeroScene, SecondaryCaseHero } from './MonitoringHeroScene'
import { ShowcaseReview } from './ShowcaseReview'
import { LaterShowcase } from './LaterShowcase'
import { ShowcaseClock } from './ShowcaseClock'
import { crossRegionEntryActions, curatedActions, cutawayStageMs, flightEntryActions, openingConsequenceTime, responseSentences, responseStages, samplingCutawayAnimationMs, transferCutawayAnimationMs, type ResponseStage } from './sequence'
import { showcaseTiming } from './timing'
import { useShowcasePause } from './ShowcasePause'
import './showcase.css'

export function ShowcaseMode({ state, dispatch, onExit }: {
  state: SimulationState
  dispatch: Dispatch<SimulationAction>
  onExit: () => void
}) {
  const { paused, togglePaused, setPausableTimeout, clearPausableTimeout } = useShowcasePause()
  const [inHospital, setInHospital] = useState(state.phase !== 'deciding')
  const [showConsequence, setShowConsequence] = useState(false)
  const [previousSentence, setPreviousSentence] = useState<string | null>(null)
  const [laterClockTime, setLaterClockTime] = useState<string | null>(null)
  const [flightView, setFlightView] = useState<'none' | 'map' | 'cabin' | 'cross-region' | 'monitoring-map' | 'monitoring' | 'case-confirmation' | 'later' | 'review'>(() => {
    if (state.module4.secondaryConfirmed && state.currentEventId !== 'M4-2') return 'review'
    if (state.currentEventId === 'M4-2') return 'case-confirmation'
    if (state.currentEventId === 'M4-1') return 'monitoring'
    return state.currentEventId === 'M3-2' ? 'cabin' : 'none'
  })
  const activeSentence = useRef<string | null>(null)
  const [responseStage, setResponseStage] = useState<ResponseStage | null>(() => {
    if (state.currentEventId === 'M2-4') return 'escalation'
    if (state.currentEventId === 'M2-3') return 'laboratory'
    if (state.currentEventId === 'M2-2') return 'laboratory'
    if (state.currentEventId === 'M2-1') return 'transfer'
    return null
  })
  const isOpening = state.currentEventId === 'M1-1'
  const targetTime = openingConsequenceTime(state)
  const controlled = state.module1.isolationCompletedAt !== null && state.module1.exposureControlQuality === 'good'
  const expanded = state.module1.vomitingExposureOccurred
  const finished = controlled || expanded

  useEffect(() => {
    if (!inHospital || !targetTime || finished) return
    dispatch({ type: 'ADVANCE_TIME', simulationTime: targetTime })
  }, [dispatch, inHospital, targetTime, finished])

  useEffect(() => {
    if (!inHospital || !finished) return
    // Give the existing movement/exposure animation the stage before revealing copy.
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : showcaseTiming.consequenceReveal
    const timer = setPausableTimeout(() => setShowConsequence(true), delay)
    return () => clearPausableTimeout(timer)
  }, [inHospital, finished, setPausableTimeout, clearPausableTimeout])

  useEffect(() => {
    if (!showConsequence || responseStage || !isOpening) return
    const timer = setPausableTimeout(() => setResponseStage('incident'), showcaseTiming.consequenceHold)
    return () => clearPausableTimeout(timer)
  }, [showConsequence, responseStage, isOpening, setPausableTimeout, clearPausableTimeout])

  useEffect(() => {
    if (!responseStage) return
    curatedActions(responseStage, state).forEach(dispatch)
    // A stage dispatches its curated actions once; state changes must not replay them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseStage, dispatch])

  useEffect(() => {
    if (!responseStage) return
    if (responseStage === 'transfer-scene' && state.scene.kind !== 'transport') return
    if (responseStage === 'sampling-scene' && state.scene.kind !== 'sampling') return
    const index = responseStages.indexOf(responseStage)
    if (index === responseStages.length - 1) return
    const duration = responseStage === 'confirmation' ? showcaseTiming.responseConfirmation
      : responseStage === 'transfer-scene' || responseStage === 'sampling-scene' ? cutawayStageMs
        : responseStage === 'incident' ? showcaseTiming.responseIncident : showcaseTiming.responseBeat
    const timer = setPausableTimeout(() => setResponseStage(responseStages[index + 1]), duration)
    return () => clearPausableTimeout(timer)
  }, [responseStage, state.scene.kind, setPausableTimeout, clearPausableTimeout])

  useEffect(() => {
    if (responseStage !== 'escalation' || flightView !== 'none') return
    const timer = setPausableTimeout(() => {
      flightEntryActions(state).forEach(dispatch)
      setFlightView('map')
    }, showcaseTiming.escalationHold)
    return () => clearPausableTimeout(timer)
  }, [responseStage, flightView, state, dispatch, setPausableTimeout, clearPausableTimeout])

  useEffect(() => {
    if (flightView !== 'map') return
    const timer = setPausableTimeout(() => setFlightView('cabin'), showcaseTiming.airportMapHold)
    return () => clearPausableTimeout(timer)
  }, [flightView, setPausableTimeout, clearPausableTimeout])

  const handleFlightComplete = useCallback(() => {
    if (state.currentEventId !== 'M3-2' || state.phase !== 'resolved') return
    crossRegionEntryActions(state).forEach(dispatch)
    setFlightView('cross-region')
  }, [state, dispatch])

  useEffect(() => {
    if (flightView !== 'cross-region' || state.module !== 3 || state.phase !== 'module-complete') return
    const timer = setPausableTimeout(() => setFlightView('monitoring-map'), showcaseTiming.crossRegionHold)
    return () => clearPausableTimeout(timer)
  }, [flightView, state.module, state.phase, setPausableTimeout, clearPausableTimeout])

  useEffect(() => {
    if (flightView !== 'monitoring-map' || state.module !== 3 || state.phase !== 'module-complete') return
    const timer = setPausableTimeout(() => {
      dispatch({ type: 'START_MODULE_4' })
      setFlightView('monitoring')
    }, showcaseTiming.monitoringMapHold)
    return () => clearPausableTimeout(timer)
  }, [flightView, state.module, state.phase, dispatch, setPausableTimeout, clearPausableTimeout])

  const handleMonitoringComplete = useCallback(() => {
    if (state.currentEventId !== 'M4-1' || state.module4.transferStatus !== 'completed') return
    dispatch({ type: 'ADVANCE_EVENT' })
    setFlightView('case-confirmation')
  }, [state.currentEventId, state.module4.transferStatus, dispatch])

  const handleLaterComplete = useCallback(() => setFlightView('review'), [])

  useEffect(() => {
    if (flightView !== 'case-confirmation' || !state.module4.secondaryConfirmed) return
    const timer = setPausableTimeout(() => setFlightView('later'), showcaseTiming.secondaryCaseHold)
    return () => clearPausableTimeout(timer)
  }, [flightView, state.module4.secondaryConfirmed, setPausableTimeout, clearPausableTimeout])

  useEffect(() => {
    const nextSentence = responseStage ? responseSentences[responseStage] ?? null : null
    const oldSentence = activeSentence.current
    activeSentence.current = nextSentence
    if (!oldSentence || oldSentence === nextSentence) return
    setPreviousSentence(oldSentence)
    const timer = setPausableTimeout(() => setPreviousSentence(null), 550)
    return () => clearPausableTimeout(timer)
  }, [responseStage, setPausableTimeout, clearPausableTimeout])

  return <main className={`showcase ${paused ? 'showcase-paused' : ''}`}>
    {flightView !== 'review' && <div className="showcase-time-controls">
      <ShowcaseClock targetTime={flightView === 'later' && laterClockTime ? laterClockTime : state.simulationTime} />
      <button className="showcase-pause-toggle" onClick={togglePaused} aria-pressed={paused} aria-label={paused ? '继续展示' : '暂停展示'} title={paused ? '继续（空格）' : '暂停（空格）'}>{paused ? '▶' : 'Ⅱ'}</button>
    </div>}
    <header className="showcase-header">
      <button className="showcase-switch" onClick={onExit}>返回工作台 ↗</button>
    </header>
    {flightView === 'review' ? <ShowcaseReview state={state} />
      : flightView === 'later' ? <LaterShowcase onClockChange={setLaterClockTime} onComplete={handleLaterComplete} />
      : flightView === 'case-confirmation' ? <SecondaryCaseHero state={state} />
      : flightView === 'monitoring' ? <MonitoringHeroScene state={state} dispatch={dispatch} onComplete={handleMonitoringComplete} />
        : flightView === 'cross-region' || flightView === 'monitoring-map' ? <div className="showcase-response-story">
          <ResponseMap stage="escalation" crossRegionBeat={flightView === 'cross-region'} focusMonitoring={flightView === 'monitoring-map'} />
          {flightView === 'cross-region' ? <div className="showcase-response-caption" role="status">08月08日｜启动跨区域协查，同行者已找到</div> : <>
            <div className="showcase-response-caption outgoing" aria-hidden="true">08月08日｜启动跨区域协查，同行者已找到</div>
            <div className="showcase-response-caption monitoring-caption" role="status">08月10日 07:20｜集中健康监测点</div>
          </>}
        </div>
          : flightView === 'cabin' ? <FlightReviewScene state={state} dispatch={dispatch} onComplete={handleFlightComplete} /> : responseStage ? <div className="showcase-response-story">
      <ResponseMap stage={responseStage} focusAirport={flightView === 'map'} />
      {responseStage === 'transfer-scene' && state.scene.kind === 'transport' && <div className="showcase-micro-scene" style={{ animationDuration: `${transferCutawayAnimationMs}ms` }} inert>
        <TransportScene scene={state.scene} module1={state.module1} module2={state.module2} activeHotspot={null} onHotspot={() => {}} onClearHotspot={() => {}} />
      </div>}
      {responseStage === 'sampling-scene' && state.scene.kind === 'sampling' && <div className="showcase-micro-scene" style={{ animationDuration: `${samplingCutawayAnimationMs}ms` }} inert>
        <SamplingScene scene={state.scene} module2={state.module2} activeHotspot={null} onHotspot={() => {}} onClearHotspot={() => {}} />
      </div>}
      {previousSentence && <div className="showcase-response-caption outgoing" aria-hidden="true">{previousSentence}</div>}
      {responseSentences[responseStage] && <div key={responseStage} className="showcase-response-caption" role="status">{responseSentences[responseStage]}</div>}
      {responseStage === 'confirmation' && state.module2.confirmed && <div className="showcase-confirmation" role="status"><small>复核结果</small><h1>埃博拉病毒核酸阳性</h1><strong>确诊病例 1</strong></div>}
      {responseStage === 'escalation' && flightView === 'none' && <div className="showcase-escalation" role="status"><h1>深圳启动联合应急响应</h1><strong>确诊病例 1</strong></div>}
      {flightView === 'map' && <div className="showcase-airport-caption" role="status">08月07日 09:00｜启动航班暴露复核</div>}
    </div>
      : !isOpening ? <div className="showcase-unavailable"><h1>开场演示已结束</h1><p>当前进度已进入后续事件，可返回完整推演继续。</p><button onClick={onExit}>返回完整推演</button></div>
      : !inHospital ? <ShowcaseMap onComplete={() => setInHospital(true)} />
        : <div className="showcase-hospital">
          <div inert><HospitalScene compactPatientLabel eventId={state.currentEventId} scene={state.scene} activeHotspot={null} onHotspot={() => {}} onClearHotspot={() => {}} /></div>
          {state.phase === 'deciding' && <section className="showcase-overlay" aria-live="polite">
            <small>08月05日 10:42 · 市中心医院急诊</small>
            <h1>一名境外返深旅客出现高热、腹泻，候诊区已有18人</h1>
            <p className="showcase-question">存在输入性传染病风险，现在如何处置？</p>
            <div className="showcase-decisions">{getEventDefinition('M1-1').decisions.map((option) => <button key={option.id} onClick={() => dispatch({ type: 'RESOLVE_DECISION', decision: option.id })}><span>{option.code}：</span>{option.id === 'rapid-epidemiology' ? '立即隔离，进一步核实旅行与接触史' : '先按常规急诊流程检查'}</button>)}</div>
          </section>}
          {finished && showConsequence && <section className={`showcase-overlay showcase-consequence ${controlled ? 'controlled' : 'expanded'}`} aria-live="polite">
            <h1>{controlled ? `${state.module1.isolationCompletedAt} 完成隔离` : '隔离延迟，候诊区发生呕吐'}</h1>
            <p className="showcase-result">{controlled ? `候诊暴露 ${state.module1.exposureDurationMinutes} 分钟` : `新增 ${state.module1.additionalAssessmentRequired} 人需评估`}</p>
            <small>{controlled ? '患者已转入隔离区' : ''}</small>
          </section>}
        </div>}
  </main>
}
