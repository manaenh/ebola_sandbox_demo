import { getEventDefinition } from '../simulation/sourceData'
import type { DecisionId, SimulationState } from '../simulation/types'

type DecisionPanelProps = {
  state: SimulationState
  onResolve: (decision: DecisionId) => void
  onAdvance: () => void
  onReset: () => void
}

export function DecisionPanel({ state, onResolve, onAdvance, onReset }: DecisionPanelProps) {
  if (state.phase === 'module-complete') {
    return <ModuleComplete state={state} onReset={onReset} />
  }

  const event = getEventDefinition(state.currentEventId)
  const selectedId = state.decisions[state.currentEventId]
  const selected = event.decisions.find((option) => option.id === selectedId)
  const isAlertOutcome = selectedId === 'staged-assessment'
    || selectedId === 'direct-procedure'
    || selectedId === 'await-tests'

  return (
    <aside className="decision-panel" aria-labelledby="decision-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow"><b>当前事件</b></span>
          <h2 id="decision-title">{event.title}</h2>
        </div>
      </div>

      <div className="event-time">{event.date} <strong>{event.time}</strong></div>
      <div className="event-organizations">{event.organizations.join(' · ')}</div>
      <p className="event-brief">{event.description}</p>

      {state.phase === 'deciding' ? (
        <>
          <div className="decision-prompt">
            <strong>选择响应方式</strong>
          </div>
          <div className="decision-options">
            {event.decisions.map((option) => (
              <button key={option.id} type="button" onClick={() => onResolve(option.id)}>
                <span className="option-code">{option.code}</span>
                <span className="option-copy">
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : selected ? (
        <div className={isAlertOutcome ? 'outcome-card exposed' : 'outcome-card controlled'} aria-live="polite">
          <span className="outcome-label">已执行 · 方案 {selected.code}</span>
          <h3>{selected.effects.outcome.label}</h3>
          <p>{selected.effects.outcome.summary}</p>
          <div className="outcome-facts">
            {selected.effects.outcome.facts.map((fact) => <span key={fact}>{fact}</span>)}
          </div>
          <button className="advance-button" type="button" onClick={onAdvance}>
            {event.nextEvent ? '继续推演' : '完成本模块'} <span>→</span>
          </button>
        </div>
      ) : null}

      <div className="assistant-summary">
        <strong>态势研判</strong>
        <p>{state.situationSummary}</p>
      </div>
    </aside>
  )
}

function ModuleComplete({ state, onReset }: { state: SimulationState; onReset: () => void }) {
  const assessment = state.persistent.assessmentRequired === null
    ? '待核定'
    : `${state.persistent.assessmentRequired} 人`
  const response = state.persistent.cdcResponseStarted
    ? '疾控响应已启动'
    : `响应延迟 +${Math.floor(state.persistent.responseDelayMinutes / 60)}h${state.persistent.responseDelayMinutes % 60}m`

  return (
    <aside className="decision-panel module-complete" aria-labelledby="module-complete-title">
      <div className="completion-mark" aria-hidden="true">✓</div>
      <span className="eyebrow"><b>阶段完成</b></span>
      <h2 id="module-complete-title">首诊发现与即时控制完成</h2>
      <p>三项决策已写入当前推演路径，关键状态将带入后续模块。</p>
      <div className="completion-summary">
        <div><small>隔离时刻</small><strong>{state.persistent.isolationTime ?? '待核定'}</strong></div>
        <div><small>需评估人员</small><strong>{assessment}</strong></div>
        <div><small>报告与响应</small><strong>{response}</strong></div>
      </div>
      {state.persistent.earlyPublicOpinionRisk && (
        <div className="completion-risk">患者短视频已使舆情风险提前出现</div>
      )}
      <button className="next-module-button" type="button" disabled>进入转运与实验室处置</button>
      <small className="next-module-note">下一模块将在后续阶段实现</small>
      <button className="reset-button" type="button" onClick={onReset}>重新推演本模块</button>
    </aside>
  )
}
