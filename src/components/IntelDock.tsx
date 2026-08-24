import { useState } from 'react'
import type { SimulationState } from '../simulation/types'

type DockTab = 'tree' | 'timeline' | 'chain'

const tabLabels: { id: DockTab; label: string }[] = [
  { id: 'tree', label: '决策树' },
  { id: 'timeline', label: '时间线' },
  { id: 'chain', label: '传播链' },
]

export function IntelDock({ state }: { state: SimulationState }) {
  const [tab, setTab] = useState<DockTab>('tree')
  const isResolved = state.phase === 'resolved'
  const isRapid = state.selectedDecision === 'rapid-epidemiology'

  return (
    <section className="intel-dock" aria-label="推演信息视图">
      <div className="dock-tabs" role="tablist" aria-label="信息视图切换">
        {tabLabels.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'active' : ''}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'tree' && (
        <div className="decision-tree" role="tabpanel" aria-label="M1-1 动态决策树">
          <div className="tree-root-node">
            <small>当前事件</small>
            <strong>M1-1 · 急诊分诊卡</strong>
            <span>我在这里 · 选择响应路径</span>
          </div>
          <div className="tree-main-stem" aria-hidden="true" />
          <div className="tree-paths">
            <section className={`tree-path path-a ${isResolved && isRapid ? 'selected' : ''} ${isResolved && !isRapid ? 'subdued' : ''}`}>
              <div className="tree-action-node">
                <i>A</i><div><small>方案 A</small><strong>立即升级流行病学问诊</strong></div>
              </div>
              <div className="tree-path-stem" aria-hidden="true" />
              <div className={`tree-consequence ${isResolved && isRapid ? 'revealed' : 'concealed'}`}>
                <small>{isResolved && isRapid ? '已发生结果' : '结果待揭示'}</small>
                <strong>{isResolved && isRapid ? '11:05 完成隔离' : '••••••'}</strong>
                <span>{isResolved && isRapid ? '公共候诊区停留 23 分钟' : '选择后显示后果'}</span>
              </div>
            </section>

            <section className={`tree-path path-b ${isResolved && !isRapid ? 'selected alert' : ''} ${isResolved && isRapid ? 'subdued' : ''}`}>
              <div className="tree-action-node">
                <i>B</i><div><small>方案 B</small><strong>先完成急诊基础评估</strong></div>
              </div>
              <div className="tree-path-stem" aria-hidden="true" />
              <div className={`tree-consequence ${isResolved && !isRapid ? 'revealed alert' : 'concealed'}`}>
                <small>{isResolved && !isRapid ? '已发生结果' : '结果待揭示'}</small>
                <strong>{isResolved && !isRapid ? '12:00 完成隔离' : '••••••'}</strong>
                <span>{isResolved && !isRapid ? '发生呕吐 · 新增需评估 21 人' : '选择后显示后果'}</span>
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === 'timeline' && (
        <div className="timeline-view" role="tabpanel" aria-label="M1-1 事件时间线">
          <div className="timeline-direction"><span>过去</span><i /><span>当前</span><i /><span>后续</span></div>
          <div className="event-timeline">
            <TimelineItem date="07月27日" time="境外" title="发生体液暴露" status="occurred" />
            <TimelineItem date="08月03日" time="—" title="出现乏力、低热" status="occurred" />
            <TimelineItem date="08月05日" time="10:18" title="抵达市中心医院" status="occurred" />
            <TimelineItem date="08月05日" time="10:42" title="急诊分诊卡" status={isResolved ? 'occurred' : 'current'} />
            {isResolved && (
              <TimelineItem
                date="08月05日"
                time={isRapid ? '11:05' : '12:00'}
                title={isRapid ? '患者进入隔离区' : '呕吐事件后完成隔离'}
                status="current"
              />
            )}
            <TimelineItem date="08月05日" time="11:12" title="M1-2 · 患者沟通" status="pending" />
          </div>
        </div>
      )}

      {tab === 'chain' && (
        <div className="chain-view" role="tabpanel" aria-label="传播与暴露链">
          <div className="transmission-chain">
            <div className="chain-node infected"><small>已知感染者</small><strong>K-113</strong><span>境外病例</span></div>
            <div className="chain-relation effective"><span>07月27日 · 有效暴露</span><i /></div>
            <div className="chain-node suspected"><small>当前调查对象</small><strong>周启航</strong><span>疑似病例</span></div>
            <div className="chain-relation contact"><span>接触调查尚未启动</span><i /></div>
            <div className="chain-node unrevealed"><small>后续关系</small><strong>待揭示</strong><span>不提前显示结果</span></div>
          </div>
          <div className="chain-legend">
            <span><i className="infected" />感染</span>
            <span><i className="effective" />有效暴露</span>
            <span><i className="contact" />接触但尚未判定</span>
            <span><i className="unrevealed" />尚未发生或揭示</span>
            <strong>接触 ≠ 有效暴露 ≠ 感染</strong>
          </div>
        </div>
      )}
    </section>
  )
}

type TimelineStatus = 'occurred' | 'current' | 'pending'

function TimelineItem({
  date,
  time,
  title,
  status,
}: {
  date: string
  time: string
  title: string
  status: TimelineStatus
}) {
  const statusLabel: Record<TimelineStatus, string> = {
    occurred: '已发生',
    current: '当前',
    pending: '待发生',
  }

  return (
    <article className={`timeline-item ${status}`}>
      <div className="timeline-date"><span>{date}</span><strong>{time}</strong></div>
      <i className="timeline-marker" />
      <div className="timeline-copy"><strong>{title}</strong><span>{statusLabel[status]}</span></div>
    </article>
  )
}
