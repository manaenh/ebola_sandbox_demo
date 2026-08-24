import { useState } from 'react'
import type { SimulationState } from '../simulation/types'

type DockTab = 'tree' | 'timeline' | 'chain'

export function IntelDock({ state }: { state: SimulationState }) {
  const [tab, setTab] = useState<DockTab>('tree')
  const isResolved = state.phase === 'resolved'
  const isRapid = state.selectedDecision === 'rapid-epidemiology'

  return (
    <section className="intel-dock" aria-label="推演情报坞">
      <div className="dock-tabs" role="tablist" aria-label="情报视图">
        <button role="tab" aria-selected={tab === 'tree'} className={tab === 'tree' ? 'active' : ''} onClick={() => setTab('tree')}>动态决策树 <small>BRANCH</small></button>
        <button role="tab" aria-selected={tab === 'timeline'} className={tab === 'timeline' ? 'active' : ''} onClick={() => setTab('timeline')}>事件时间线 <small>TIMELINE</small></button>
        <button role="tab" aria-selected={tab === 'chain'} className={tab === 'chain' ? 'active' : ''} onClick={() => setTab('chain')}>传播链 <small>CHAIN</small></button>
      </div>

      {tab === 'tree' && (
        <div className="decision-tree" role="tabpanel">
          <div className="tree-node origin"><small>当前事件</small><strong>M1-1 急诊分诊卡</strong><span>10:42 · 旅行史信息不足</span></div>
          <div className="tree-branches" aria-hidden="true"><i /><i /></div>
          <div className={`tree-node branch ${isResolved && isRapid ? 'selected' : ''} ${isResolved && !isRapid ? 'dimmed' : ''}`}>
            <small>路径 A</small><strong>升级流行病学问诊</strong>
            <span>{isResolved && isRapid ? '11:05 隔离 · 23 min' : '后果未揭示'}</span>
          </div>
          <div className={`tree-node branch ${isResolved && !isRapid ? 'selected alert' : ''} ${isResolved && isRapid ? 'dimmed' : ''}`}>
            <small>路径 B</small><strong>完成基础评估</strong>
            <span>{isResolved && !isRapid ? '12:00 隔离 · 需评估 +21' : '后果未揭示'}</span>
          </div>
          <div className="tree-node locked"><small>NEXT EVENT</small><strong>后续节点</strong><span>将在下一阶段解锁</span></div>
        </div>
      )}

      {tab === 'timeline' && (
        <div className="event-timeline" role="tabpanel">
          {state.eventLog.map((event) => (
            <article key={event.id} className={`timeline-event ${event.tone}`}>
              <time>{event.time}</time><i /><div><strong>{event.title}</strong><span>{event.detail}</span></div>
            </article>
          ))}
          {!isResolved && <article className="timeline-event pending"><time>—</time><i /><div><strong>等待响应决策</strong><span>后果在提交后揭示</span></div></article>}
        </div>
      )}

      {tab === 'chain' && (
        <div className="transmission-chain" role="tabpanel">
          <div className="chain-node source"><small>境外源头</small><strong>K-113</strong><span>体液暴露</span></div>
          <div className="chain-link active"><span>7/27</span></div>
          <div className="chain-node current"><small>第一代 · 当前观察</small><strong>周启航</strong><span>BH-EVD-001</span></div>
          <div className="chain-link hidden"><span>尚未揭示</span></div>
          <div className="chain-node concealed"><small>第二代</small><strong>••••</strong><span>后续事件解锁</span></div>
          <div className="chain-note">传播链仅显示当前叙事已知信息，避免提前泄露后续结果。</div>
        </div>
      )}
    </section>
  )
}
