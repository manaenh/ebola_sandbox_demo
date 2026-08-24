import { m11Options } from '../simulation/sourceData'
import type { DecisionId, SimulationState } from '../simulation/types'

type DecisionPanelProps = {
  state: SimulationState
  onResolve: (decision: DecisionId) => void
  onReset: () => void
}

export function DecisionPanel({ state, onResolve, onReset }: DecisionPanelProps) {
  const selected = m11Options.find((option) => option.id === state.selectedDecision)
  const rapid = state.selectedDecision === 'rapid-epidemiology'

  return (
    <aside className="decision-panel" aria-labelledby="decision-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow"><b>当前事件</b></span>
          <h2 id="decision-title">急诊分诊卡</h2>
        </div>
        <span className="node-chip">M1-1</span>
      </div>

      <div className="event-time">2026.08.05 <strong>10:42</strong></div>
      <p className="event-brief">
        周启航高热、乏力、腹泻，首次只说“非洲出差”。公共候诊区已有 <b>18 人</b>。
      </p>

      {state.phase === 'deciding' ? (
        <>
          <div className="decision-prompt">
            <strong>选择响应方式</strong>
          </div>
          <div className="decision-options">
            {m11Options.map((option) => (
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
      ) : (
        <div className={rapid ? 'outcome-card controlled' : 'outcome-card exposed'} aria-live="polite">
          <span className="outcome-label">已执行 · 方案 {selected?.code}</span>
          <h3>{selected?.title}</h3>
          <p>{selected?.feedback}</p>
          <div className="outcome-grid">
            <div><small>隔离时刻</small><strong>{rapid ? '11:05' : '12:00'}</strong></div>
            <div><small>候诊停留</small><strong>{rapid ? '23' : '78'}<em> min</em></strong></div>
            <div><small>新增需评估</small><strong>{rapid ? '待核定' : '21 人'}</strong></div>
          </div>
          <div className="interpretation-note">
            <span>态势解读</span>
            {rapid
              ? '隔离通道已启用。当前没有来源支持的接触者分类结果，系统保持“待核实”。'
              : '候诊区发生体液污染事件。21 人进入评估流程，不等同于 21 名风险接触者。'}
          </div>
          <button className="reset-button" type="button" onClick={onReset}>重置节点并比较另一方案</button>
        </div>
      )}

      <div className="assistant-summary">
        <strong>态势研判</strong>
        <p>
          {state.phase === 'deciding'
            ? '当前存在境外旅居史与体液接触史，建议立即完成风险识别。'
            : rapid
              ? '患者已于 11:05 隔离，下一步应完成暴露评估与记录。'
              : '候诊区发生体液污染，21 人需进入暴露评估流程。'}
        </p>
      </div>
    </aside>
  )
}
