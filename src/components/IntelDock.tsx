import { useState } from 'react'
import { eventOrder, getEventDefinition } from '../simulation/sourceData'
import type { EventId, SimulationState } from '../simulation/types'

type DockTab = 'tree' | 'timeline' | 'chain'

const tabLabels: { id: DockTab; label: string }[] = [
  { id: 'tree', label: '决策树' },
  { id: 'timeline', label: '时间线' },
  { id: 'chain', label: '传播链' },
]

export function IntelDock({ state }: { state: SimulationState }) {
  const [tab, setTab] = useState<DockTab>('tree')

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

      {tab === 'tree' && <ProgressiveDecisionTree state={state} />}
      {tab === 'timeline' && <EventTimeline state={state} />}
      {tab === 'chain' && <ExposureChain />}
    </section>
  )
}

function ProgressiveDecisionTree({ state }: { state: SimulationState }) {
  const currentIndex = eventOrder.indexOf(state.currentEventId)
  const revealedEvents = eventOrder.filter((_, index) => (
    state.phase === 'module-complete' || index <= currentIndex
  ))

  return (
    <div className="progressive-tree" role="tabpanel" aria-label="首诊响应动态决策树">
      {revealedEvents.map((eventId, index) => {
        const event = getEventDefinition(eventId)
        const selectedId = state.decisions[eventId]
        const isCurrent = state.phase !== 'module-complete' && eventId === state.currentEventId

        return (
          <div className="tree-stage-wrap" key={eventId}>
            <section className={`tree-stage ${isCurrent ? 'current' : 'completed'}`}>
              <div className="stage-event-node">
                <small>{isCurrent ? '当前事件' : '已完成'}</small>
                <strong>{event.decisionTreeLabel}</strong>
                <span>{event.time}</span>
              </div>
              <div className="stage-stem" aria-hidden="true" />
              <div className="stage-branches">
                {event.decisions.map((option) => {
                  const isSelected = selectedId === option.id
                  return (
                    <div
                      className={`stage-branch ${isSelected ? 'selected' : ''} ${selectedId && !isSelected ? 'subdued' : ''}`}
                      key={option.id}
                    >
                      <i>{option.code}</i>
                      <div>
                        <strong>{option.title}</strong>
                        <small>{isSelected ? option.effects.outcome.label : isCurrent ? '可选路径' : '未选择路径'}</small>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
            {index < revealedEvents.length - 1 && <div className="tree-stage-connector" aria-hidden="true"><i /></div>}
          </div>
        )
      })}
    </div>
  )
}

function EventTimeline({ state }: { state: SimulationState }) {
  return (
    <div className="timeline-view" role="tabpanel" aria-label="首诊响应事件时间线">
      <div className="timeline-direction"><span>过去</span><i /><span>当前</span><i /><span>后续</span></div>
      <div className="event-timeline module-one-timeline">
        {eventOrder.map((eventId) => {
          const event = getEventDefinition(eventId)
          const status = timelineStatus(eventId, state)
          return (
            <TimelineItem
              key={eventId}
              date="08月05日"
              time={event.time}
              title={event.title}
              status={status}
            />
          )
        })}
      </div>
    </div>
  )
}

function timelineStatus(eventId: EventId, state: SimulationState): TimelineStatus {
  if (state.phase === 'module-complete') return 'occurred'
  if (eventId === state.currentEventId) return 'current'
  if (state.completedEventIds.includes(eventId)) return 'occurred'
  return 'pending'
}

function ExposureChain() {
  return (
    <div className="chain-view" role="tabpanel" aria-label="传播与暴露链">
      <div className="transmission-chain">
        <div className="chain-node infected"><small>已知感染者</small><strong>境外感染者</strong><span>源暴露病例</span></div>
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
    occurred: '已完成',
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
