import { useReducer, useState } from 'react'
import { AppShell, type AppView } from './components/AppShell'
import { BackgroundBrief } from './components/BackgroundBrief'
import { DecisionPanel } from './components/DecisionPanel'
import { HospitalScene } from './components/HospitalScene'
import { IntelDock } from './components/IntelDock'
import { MetricStrip } from './components/MetricStrip'
import { ReviewPlaceholder } from './components/ReviewPlaceholder'
import { createInitialState, simulationReducer } from './simulation/reducer'

export default function App() {
  const [view, setView] = useState<AppView>('command')
  const [state, dispatch] = useReducer(simulationReducer, undefined, () => createInitialState())

  const reset = () => dispatch({ type: 'RESET_NODE' })

  return (
    <AppShell view={view} onViewChange={setView}>
      {view === 'briefing' && <BackgroundBrief />}
      {view === 'review' && <ReviewPlaceholder />}
      {view === 'command' && (
        <div className="command-page">
          <div className="command-context">
            <div>
              <span className="simulation-kicker">模块 1</span>
              <h1>首诊发现与即时控制</h1>
            </div>
            <div className="phase-indicator">
              <span>M1-1</span><strong>急诊分诊卡</strong>
            </div>
          </div>
          <MetricStrip
            metrics={state.metrics}
            visibleKeys={['confirmedCases', 'suspectedCases', 'assessmentRequired', 'exposureDuration']}
          />
          <div className="workspace-grid">
            <HospitalScene
              phase={state.scenePhase}
              activeHotspot={state.activeHotspot}
              onHotspot={(hotspot) => dispatch({ type: 'SELECT_HOTSPOT', hotspot })}
              onClearHotspot={() => dispatch({ type: 'CLEAR_HOTSPOT' })}
            />
            <DecisionPanel
              state={state}
              onResolve={(decision) => dispatch({ type: 'RESOLVE_DECISION', decision })}
              onReset={reset}
            />
          </div>
          <IntelDock state={state} />
        </div>
      )}
    </AppShell>
  )
}
