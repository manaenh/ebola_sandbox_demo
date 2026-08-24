import { useReducer, useState } from 'react'
import { AppShell, type AppView } from './components/AppShell'
import { BackgroundBrief } from './components/BackgroundBrief'
import { DecisionPanel } from './components/DecisionPanel'
import { HospitalScene } from './components/HospitalScene'
import { IntelDock } from './components/IntelDock'
import { MetricStrip } from './components/MetricStrip'
import { ReviewPlaceholder } from './components/ReviewPlaceholder'
import { ShenzhenSituation } from './components/ShenzhenSituation'
import { createInitialState, simulationReducer } from './simulation/reducer'
import { getEventDefinition } from './simulation/sourceData'
import type { MetricKey } from './simulation/types'

export default function App() {
  const [view, setView] = useState<AppView>('command')
  const [commandView, setCommandView] = useState<'city' | 'scene'>('city')
  const [state, dispatch] = useReducer(simulationReducer, undefined, () => createInitialState())

  const reset = () => dispatch({ type: 'RESET_MODULE' })
  const currentEvent = getEventDefinition(state.currentEventId)
  const visibleMetrics: MetricKey[] = [...currentEvent.visibleMetrics]
  if (state.currentEventId === 'M1-2' && state.module1.earlyPublicOpinionRisk) {
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
              <span className="simulation-kicker">{commandView === 'city' ? '城市联合响应' : '当前现场'}</span>
              <h1>{commandView === 'city' ? '深圳全局态势' : '首诊发现与即时控制'}</h1>
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
            <ShenzhenSituation state={state} onEnterScene={() => setCommandView('scene')} />
          ) : (
            <>
              <MetricStrip metrics={state.metrics} visibleKeys={visibleMetrics} />
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
                  onReturnToCity={() => setCommandView('city')}
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
