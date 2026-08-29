import { getEventDefinition } from '../simulation/sourceData'
import { getCurrentEventDescription, getModule1CompletionSummary, getModule2CompletionSummary, getModule3CompletionSummary, getModule4CompletionSummary } from '../simulation/selectors'
import type { DecisionId, SimulationState } from '../simulation/types'

type DecisionPanelProps = {
  state: SimulationState
  onResolve: (decision: DecisionId) => void
  onAdvance: () => void
  onReset: () => void
  onReturnToCity: () => void
  onStartNextModule?: () => void
}

export function DecisionPanel({ state, onResolve, onAdvance, onReset, onReturnToCity, onStartNextModule }: DecisionPanelProps) {
  if (state.phase === 'module-complete') {
    if (state.module === 1) return <Module1Complete state={state} onReset={onReset} onReturnToCity={onReturnToCity} />
    if (state.module === 2) return <Module2Complete state={state} onReset={onReset} onReturnToCity={onReturnToCity} onStartNextModule={onStartNextModule} />
    if (state.module === 3) return <Module3Complete state={state} onReset={onReset} onReturnToCity={onReturnToCity} onStartNextModule={onStartNextModule} />
    return <Module4Complete state={state} onReset={onReset} onReturnToCity={onReturnToCity} />
  }

  const event = getEventDefinition(state.currentEventId)
  const selectedId = state.decisions[state.currentEventId]
  const selected = event.decisions.find((option) => option.id === selectedId)
  const isAlertOutcome = selectedId === 'staged-assessment'
    || selectedId === 'direct-procedure'
    || selectedId === 'await-tests'
    || selectedId === 'wait-regular-transfer'
    || selectedId === 'routine-multi-test'
    || selectedId === 'await-confirmation'
    || selectedId === 'uniform-interim-management'
    || selectedId === 'uniform-flight-management'
    || selectedId === 'await-complete-itinerary'
    || selectedId === 'continue-monitoring-assessment'
    || selectedId === 'immediate-guardianship'

  if (state.phase === 'milestone') {
    const secondary = state.currentEventId === 'M4-2'
    return (
      <aside className="decision-panel confirmation-milestone" aria-labelledby="decision-title">
        <div className="panel-heading"><div><span className="eyebrow"><b>确证里程碑</b></span><h2 id="decision-title">{event.title}</h2></div></div>
        <div className="event-time">{event.date} <strong>{event.time}</strong></div>
        <div className="confirmation-result"><span>{secondary ? '沈洁 · EBOV 核酸' : 'EBOV 核酸复核'}</span><strong>阳性</strong><small>{secondary ? 'Ct 27.9 · 与指示病例序列高度一致' : 'Ct 22.6 · 样本符合质量要求'}</small></div>
        <div className="milestone-actions">
          {secondary ? <>
            <div><span>病例状态</span><strong>确诊病例 · 2 例</strong></div>
            <div><span>传播关系</span><strong>周启航 → 沈洁</strong></div>
            <div><span>隔离床占用</span><strong>2 / 12</strong></div>
            <div><span>高风险接触者</span><strong>{state.module4.totalHighRiskContacts} 人</strong></div>
          </> : <>
            <div><span>病例状态</span><strong>确诊病例 · 1 例</strong></div>
            <div><span>联合指挥</span><strong>已启动</strong></div>
            <div><span>每日风险评估</span><strong>已启动</strong></div>
            <div><span>一致性核对目标</span><strong>30 分钟内</strong></div>
            <div><span>首轮统一信息目标</span><strong>2 小时内</strong></div>
          </>}
        </div>
        <button className="advance-button" type="button" onClick={onAdvance}>{secondary ? '进入儿童照护' : '完成本模块'} <span>→</span></button>
        <div className="assistant-summary"><strong>态势研判</strong><p>{state.situationSummary}</p></div>
      </aside>
    )
  }

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
      <p className="event-brief">{getCurrentEventDescription(state)}</p>

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

function Module1Complete({ state, onReset, onReturnToCity }: { state: SimulationState; onReset: () => void; onReturnToCity: () => void }) {
  const summary = getModule1CompletionSummary(state)

  return (
    <aside className="decision-panel module-complete" aria-labelledby="module-complete-title">
      <div className="completion-mark" aria-hidden="true">✓</div>
      <span className="eyebrow"><b>阶段完成</b></span>
      <h2 id="module-complete-title">首诊发现与即时控制完成</h2>
      <p>{summary.situation}</p>
      <div className="completion-summary">
        {summary.facts.map((fact) => (
          <div key={fact.label}><small>{fact.label}</small><strong>{fact.value}</strong></div>
        ))}
      </div>
      <button className="next-module-button" type="button" onClick={onReturnToCity}>查看下一项转运任务</button>
      <small className="next-module-note">从全局态势进入医疗转运现场</small>
      <button className="return-city-button" type="button" onClick={onReturnToCity}>返回全局态势</button>
      <button className="reset-button" type="button" onClick={onReset}>重新推演本模块</button>
    </aside>
  )
}

function Module2Complete({ state, onReset, onReturnToCity, onStartNextModule }: { state: SimulationState; onReset: () => void; onReturnToCity: () => void; onStartNextModule?: () => void }) {
  const summary = getModule2CompletionSummary(state)
  return (
    <aside className="decision-panel module-complete" aria-labelledby="module-two-complete-title">
      <div className="completion-mark" aria-hidden="true">✓</div>
      <span className="eyebrow"><b>阶段完成</b></span>
      <h2 id="module-two-complete-title">转运、采样与实验室确证完成</h2>
      <p>{summary.situation}</p>
      <div className="completion-summary">
        {summary.facts.map((fact) => <div key={fact.label}><small>{fact.label}</small><strong>{fact.value}</strong></div>)}
      </div>
      <button className="return-city-button" type="button" onClick={onReturnToCity}>返回深圳全局态势</button>
      <button className="next-module-button" type="button" onClick={onStartNextModule ?? onReturnToCity}>进入接触者调查指挥台</button>
      <small className="next-module-note">当前深圳全局态势保留，进入后开始首轮 126 人调查。</small>
      <button className="reset-button" type="button" onClick={onReset}>重新开始完整推演</button>
    </aside>
  )
}

function Module3Complete({ state, onReset, onReturnToCity, onStartNextModule }: { state: SimulationState; onReset: () => void; onReturnToCity: () => void; onStartNextModule?: () => void }) {
  const summary = getModule3CompletionSummary(state)
  return (
    <aside className="decision-panel module-complete" aria-labelledby="module-three-complete-title">
      <div className="completion-mark" aria-hidden="true">✓</div>
      <span className="eyebrow"><b>阶段完成</b></span>
      <h2 id="module-three-complete-title">接触者追踪与 21 天管理体系已建立</h2>
      <p>{summary.situation}</p>
      <div className="completion-summary">
        {summary.facts.map((fact) => <div key={fact.label}><small>{fact.label}</small><strong>{fact.value}</strong></div>)}
      </div>
      <div className="monitoring-completion-strip"><span>健康监测阶段</span><strong>已进入 21 天健康监测</strong><small>个体周期分别从各自最后暴露时间起算</small></div>
      <button className="return-city-button" type="button" onClick={onReturnToCity}>查看当前追踪态势</button>
      <button className="next-module-button" type="button" onClick={onStartNextModule}>进入家庭续发疑似与传播链阻断</button>
      <small className="next-module-note">沈洁的个体健康监测记录将在 08月10日触发症状报警。</small>
      <button className="reset-button" type="button" onClick={onReset}>重新开始完整推演</button>
    </aside>
  )
}

function Module4Complete({ state, onReset, onReturnToCity }: { state: SimulationState; onReset: () => void; onReturnToCity: () => void }) {
  const summary = getModule4CompletionSummary(state)
  return <aside className="decision-panel module-complete" aria-labelledby="module-four-complete-title">
    <div className="completion-mark" aria-hidden="true">✓</div>
    <span className="eyebrow"><b>阶段完成</b></span>
    <h2 id="module-four-complete-title">家庭续发病例与传播链处置完成</h2>
    <p>{summary.situation}</p>
    <div className="completion-summary">{summary.facts.map((fact) => <div key={fact.label}><small>{fact.label}</small><strong>{fact.value}</strong></div>)}</div>
    <button className="return-city-button" type="button" onClick={onReturnToCity}>返回深圳全局响应态势</button>
    <button className="next-module-button" type="button" disabled>进入下一响应阶段</button>
    <small className="next-module-note">Module 5 尚未实施</small>
    <button className="reset-button" type="button" onClick={onReset}>重新开始完整推演</button>
  </aside>
}
