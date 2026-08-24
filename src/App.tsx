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
    <AppShell
      view={view}
      onViewChange={setView}
      simulationTime={state.simulationTime}
      onReset={reset}
    >
      {view === 'briefing' && <BackgroundBrief />}
      {view === 'review' && <ReviewPlaceholder />}
      {view === 'command' && (
        <div className="command-page">
          <div className="command-context">
            <div>
              <span className="simulation-kicker">模拟场景 · 深圳市输入性疫情情景推演</span>
              <h1>埃博拉输入性疫情联合响应</h1>
            </div>
            <div className="phase-indicator">
              <span>PHASE 01</span><strong>首诊发现与即时控制</strong><small>1 / 7 MODULES</small>
            </div>
          </div>
          <MetricStrip metrics={state.metrics} />
          <div className="workspace-grid">
            <HospitalScene
              phase={state.scenePhase}
              activeHotspot={state.activeHotspot}
              onHotspot={(hotspot) => dispatch({ type: 'SELECT_HOTSPOT', hotspot })}
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
