import { useReducer, useState } from 'react'
import { AppShell, type AppView } from './components/AppShell'
import { BackgroundBrief } from './components/BackgroundBrief'
import { DecisionPanel } from './components/DecisionPanel'
import { HospitalScene } from './components/HospitalScene'
import { IntelDock } from './components/IntelDock'
import { MetricStrip } from './components/MetricStrip'
import { ReviewPlaceholder } from './components/ReviewPlaceholder'
import { createInitialState, simulationReducer } from './simulation/reducer'
import { getEventDefinition } from './simulation/sourceData'
import type { MetricKey } from './simulation/types'

export default function App() {
  const [view, setView] = useState<AppView>('command')
  const [state, dispatch] = useReducer(simulationReducer, undefined, () => createInitialState())

  const reset = () => dispatch({ type: 'RESET_MODULE' })
  const currentEvent = getEventDefinition(state.currentEventId)
  const visibleMetrics: MetricKey[] = [...currentEvent.visibleMetrics]
  if (state.currentEventId === 'M1-2' && state.persistent.earlyPublicOpinionRisk) {
    visibleMetrics.push('publicOpinionRisk')
  }

  return (
    <AppShell view={view} onViewChange={setView}>
      {view === 'briefing' && <BackgroundBrief />}
      {view === 'review' && <ReviewPlaceholder />}
      {view === 'command' && (
        <div className="command-page">
          <div className="command-context">
            <div>
              <span className="simulation-kicker">当前场景</span>
              <h1>首诊发现与即时控制</h1>
            </div>
          </div>
          <MetricStrip
            metrics={state.metrics}
            visibleKeys={visibleMetrics}
          />
          <div className="workspace-grid">
            <HospitalScene
              eventId={state.currentEventId}
              scene={state.scene}
              activeHotspot={state.activeHotspot}
              onHotspot={(hotspot) => dispatch({ type: 'SELECT_HOTSPOT', hotspot })}
              onClearHotspot={() => dispatch({ type: 'CLEAR_HOTSPOT' })}
            />
            <DecisionPanel
              state={state}
              onResolve={(decision) => dispatch({ type: 'RESOLVE_DECISION', decision })}
              onAdvance={() => dispatch({ type: 'ADVANCE_EVENT' })}
              onReset={reset}
            />
          </div>
          <IntelDock state={state} />
        </div>
      )}
    </AppShell>
  )
}
