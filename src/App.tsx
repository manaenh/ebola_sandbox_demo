import { useReducer, useState } from 'react'
import { ShowcaseMode } from './components/showcase/ShowcaseMode'
import { ShowcasePauseProvider } from './components/showcase/ShowcasePause'
import { ShowcaseReview } from './components/showcase/ShowcaseReview'
import { createExampleReviewState } from './components/showcase/exampleReviewState'
import { PlatformWorkbench, type WorkbenchPage } from './components/platform/PlatformWorkbench'
import { AppShell, type AppView } from './components/AppShell'
import { BackgroundBrief } from './components/BackgroundBrief'
import { ContactTracingCommandScene } from './components/ContactTracingCommandScene'
import { CrossRegionTracingScene } from './components/CrossRegionTracingScene'
import { DecisionPanel } from './components/DecisionPanel'
import { HospitalScene } from './components/HospitalScene'
import { FlightExposureScene } from './components/FlightExposureScene'
import { IntelDock } from './components/IntelDock'
import { LaboratoryStatusScene } from './components/LaboratoryStatusScene'
import { MetricStrip } from './components/MetricStrip'
import { ReviewPlaceholder } from './components/ReviewPlaceholder'
import { SamplingScene } from './components/SamplingScene'
import { ShenzhenSituation } from './components/ShenzhenSituation'
import { TransportScene } from './components/TransportScene'
import { MonitoringPointScene } from './components/MonitoringPointScene'
import { SecondaryConfirmationScene } from './components/SecondaryConfirmationScene'
import { ChildCareScene } from './components/ChildCareScene'
import { createInitialState, simulationReducer } from './simulation/reducer'
import { getEventDefinition } from './simulation/sourceData'
import type { MetricKey, SimulationState } from './simulation/types'
import './components/showcase/showcase.css'

const exampleReviewState = createExampleReviewState()

export default function App() {
  const [mode, setMode] = useState<'workbench' | 'showcase' | 'review' | 'simulation'>('workbench')
  const [workbenchPage, setWorkbenchPage] = useState<WorkbenchPage>('home')
  const [lastCompletedRun, setLastCompletedRun] = useState<SimulationState | null>(null)
  const [view, setView] = useState<AppView>('command')
  const [commandView, setCommandView] = useState<'city' | 'scene'>('city')
  const [state, dispatch] = useReducer(simulationReducer, undefined, () => createInitialState())

  const reset = () => dispatch({ type: 'RESET_MODULE' })
  const currentEvent = getEventDefinition(state.currentEventId)
  const visibleMetrics: MetricKey[] = [...currentEvent.visibleMetrics]
  if (state.currentEventId === 'M1-2' && state.module1.earlyPublicOpinionSignalTriggeredByM1) {
    visibleMetrics.push('publicOpinionRisk')
  }
  const sceneTitle = state.module === 1
    ? '首诊发现与即时控制'
    : state.module === 3 ? '接触者追踪与 21 天管理'
      : state.module === 4 ? '家庭续发疑似与传播链阻断'
      : state.currentEventId === 'M2-1' ? '安全转运'
      : state.currentEventId === 'M2-2' ? '采样与标本处置'
        : '实验室确证与响应升级'

  const enterCurrentScene = () => {
    if (state.module === 1 && state.phase === 'module-complete') {
      dispatch({ type: 'START_MODULE_2' })
    }
    if (state.module === 2 && state.phase === 'module-complete') {
      dispatch({ type: 'START_MODULE_3' })
    }
    if (state.module === 3 && state.phase === 'module-complete') {
      dispatch({ type: 'START_MODULE_4' })
    }
    setCommandView('scene')
  }

  const startNextModule = () => {
    if (state.module === 3 && state.phase === 'module-complete') {
      dispatch({ type: 'START_MODULE_4' })
      setCommandView('city')
      return
    }
    enterCurrentScene()
  }

  const advanceCurrentEvent = () => {
    const returnToMacro = state.phase === 'resolved'
      && ['M2-1', 'M2-2', 'M3-1', 'M3-2', 'M4-1', 'M4-3'].includes(state.currentEventId)
    dispatch({ type: 'ADVANCE_EVENT' })
    if (returnToMacro) setCommandView('city')
  }

  const macroDecision = (state.module === 2 && state.phase === 'module-complete')
    || (state.module === 3 && (state.currentEventId === 'M3-3' || state.phase === 'module-complete'))
    || (state.module === 4 && (state.currentEventId === 'M4-2' || state.phase === 'module-complete'))

  const openShowcase = () => {
    dispatch({ type: 'RESET_MODULE' })
    setMode('showcase')
  }
  const openLegacy = () => {
    dispatch({ type: 'RESET_MODULE' })
    setMode('simulation')
    setView('command')
    setCommandView('city')
  }
  const returnHome = () => {
    if (state.module4.secondaryConfirmed) setLastCompletedRun(state)
    setWorkbenchPage('home')
    setMode('workbench')
  }

  if (mode === 'workbench') return <PlatformWorkbench page={workbenchPage} reviewState={state.module4.secondaryConfirmed ? state : lastCompletedRun ?? exampleReviewState} reviewIsExample={!state.module4.secondaryConfirmed && !lastCompletedRun} onNavigate={setWorkbenchPage} onShowcase={openShowcase} onReview={() => setMode('review')} onLegacy={openLegacy} />
  if (mode === 'showcase') return <ShowcasePauseProvider><ShowcaseMode state={state} dispatch={dispatch} onExit={returnHome} /></ShowcasePauseProvider>
  if (mode === 'review') return <main className="showcase"><header className="showcase-header"><button className="showcase-switch" type="button" onClick={returnHome}>返回工作台 ↗</button></header><ShowcaseReview state={state.module4.secondaryConfirmed ? state : lastCompletedRun ?? exampleReviewState} example={!state.module4.secondaryConfirmed && !lastCompletedRun} /></main>

  return (
    <AppShell view={view} onViewChange={setView} onShowcase={openShowcase} onHome={returnHome}>
      {view === 'briefing' && <BackgroundBrief />}
      {view === 'review' && <ReviewPlaceholder />}
      {view === 'command' && (
        <div className="command-page">
          <div className="command-context">
            <div>
              <span className="simulation-kicker">{commandView === 'city' ? '城市联合响应' : '当前现场'}</span>
              <h1>{commandView === 'city' ? '深圳全局态势' : sceneTitle}</h1>
            </div>
            <div className="command-view-switch" role="tablist" aria-label="联合指挥视图">
              <button type="button" role="tab" aria-selected={commandView === 'city'} className={commandView === 'city' ? 'active' : ''} onClick={() => setCommandView('city')}>
                <strong>全局态势</strong><small>CITY VIEW</small>
              </button>
              <button type="button" role="tab" aria-selected={commandView === 'scene'} className={commandView === 'scene' ? 'active' : ''} onClick={() => setCommandView('scene')}>
                <strong>现场推演</strong><small>SCENE VIEW</small>
              </button>
            </div>
          </div>
          {commandView === 'city' ? (
            <ShenzhenSituation
              state={state}
              onEnterScene={enterCurrentScene}
              sidePanel={macroDecision ? (
                <DecisionPanel state={state} onResolve={(decision) => dispatch({ type: 'RESOLVE_DECISION', decision })} onAdvance={advanceCurrentEvent} onReset={reset} onReturnToCity={() => setCommandView('city')} onStartNextModule={startNextModule} />
              ) : undefined}
            />
          ) : (
            <>
              <MetricStrip metrics={state.metrics} visibleKeys={visibleMetrics} />
              <div className="workspace-grid">
                {state.scene.kind === 'hospital' && (
                  <HospitalScene eventId={state.currentEventId} scene={state.scene} activeHotspot={state.activeHotspot} onHotspot={(hotspot) => dispatch({ type: 'SELECT_HOTSPOT', hotspot })} onClearHotspot={() => dispatch({ type: 'CLEAR_HOTSPOT' })}/>
                )}
                {state.scene.kind === 'transport' && (
                  <TransportScene scene={state.scene} module1={state.module1} module2={state.module2} activeHotspot={state.activeHotspot} onHotspot={(hotspot) => dispatch({ type: 'SELECT_HOTSPOT', hotspot })} onClearHotspot={() => dispatch({ type: 'CLEAR_HOTSPOT' })}/>
                )}
                {state.scene.kind === 'sampling' && (
                  <SamplingScene scene={state.scene} module2={state.module2} activeHotspot={state.activeHotspot} onHotspot={(hotspot) => dispatch({ type: 'SELECT_HOTSPOT', hotspot })} onClearHotspot={() => dispatch({ type: 'CLEAR_HOTSPOT' })}/>
                )}
                {state.scene.kind === 'laboratory' && <LaboratoryStatusScene module2={state.module2}/>}
                {state.scene.kind === 'tracing-command' && <ContactTracingCommandScene module2={state.module2} module3={state.module3}/>} 
                {state.scene.kind === 'aircraft' && <FlightExposureScene module3={state.module3}/>} 
                {state.scene.kind === 'cross-region' && <CrossRegionTracingScene module3={state.module3}/>} 
                {state.scene.kind === 'monitoring-point' && <MonitoringPointScene module4={state.module4}/>} 
                {state.scene.kind === 'secondary-confirmation' && <SecondaryConfirmationScene module4={state.module4}/>} 
                {state.scene.kind === 'child-care' && <ChildCareScene module4={state.module4}/>} 
                <DecisionPanel
                  state={state}
                  onResolve={(decision) => dispatch({ type: 'RESOLVE_DECISION', decision })}
                  onAdvance={advanceCurrentEvent}
                  onReset={reset}
                  onReturnToCity={() => setCommandView('city')}
                  onStartNextModule={startNextModule}
                />
              </div>
              <IntelDock state={state} />
            </>
          )}
        </div>
      )}
    </AppShell>
  )
}
