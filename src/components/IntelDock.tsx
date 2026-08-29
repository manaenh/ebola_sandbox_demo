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
      {tab === 'chain' && <ExposureChain state={state} />}
    </section>
  )
}

function ProgressiveDecisionTree({ state }: { state: SimulationState }) {
  const currentIndex = eventOrder.indexOf(state.currentEventId)
  const revealedEvents = eventOrder.filter((_, index) => index <= currentIndex)

  return (
    <div className="progressive-tree" role="tabpanel" aria-label="当前推演动态决策树">
      {revealedEvents.map((eventId, index) => {
        const event = getEventDefinition(eventId)
        const selectedId = state.decisions[eventId]
        const isCurrent = state.phase !== 'module-complete' && eventId === state.currentEventId

        return (
          <div className="tree-stage-wrap" key={eventId}>
            <section className={`tree-stage ${isCurrent ? 'current' : 'completed'}`}>
              <div className="stage-event-node">
                <small>{event.kind === 'milestone' ? '响应里程碑' : isCurrent ? '当前事件' : '已完成'}</small>
                <strong>{event.decisionTreeLabel}</strong>
                <span>{event.time}</span>
              </div>
              {event.kind === 'milestone' ? (
                <div className="stage-milestone-result"><strong>{eventId === 'M4-2' ? '确诊病例 · 2 例' : '确诊病例 · 1 例'}</strong><small>{eventId === 'M4-2' ? '周启航 → 沈洁' : '联合响应已启动'}</small></div>
              ) : (
                <>
                  <div className="stage-stem" aria-hidden="true" />
                  <div className="stage-branches">
                    {event.decisions.map((option) => {
                      const isSelected = selectedId === option.id
                      return (
                        <div className={`stage-branch ${isSelected ? 'selected' : ''} ${selectedId && !isSelected ? 'subdued' : ''}`} key={option.id}>
                          <i>{option.code}</i>
                          <div>
                            <strong>{option.title}</strong>
                            <small>{isSelected ? option.effects.outcome.label : isCurrent ? '可选路径' : '未选择路径'}</small>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {selectedId && (
                    <div className="stage-rejoin" aria-label="两条处置路径汇入下一共同事件">
                      <i aria-hidden="true" />
                      <span>进入下一共同事件</span>
                    </div>
                  )}
                </>
              )}
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
    <div className="timeline-view" role="tabpanel" aria-label="应急响应事件时间线">
      <div className="timeline-direction"><span>过去</span><i /><span>当前</span><i /><span>后续</span></div>
      <div className="event-timeline module-one-timeline">
        {eventOrder.map((eventId) => {
          const event = getEventDefinition(eventId)
          const status = timelineStatus(eventId, state)
          return (
            <TimelineItem
              key={eventId}
              date={`${event.date.slice(5, 7)}月${event.date.slice(8, 10)}日`}
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
  if (eventId === state.currentEventId) return state.phase === 'module-complete' ? 'occurred' : 'current'
  if (state.completedEventIds.includes(eventId)) return 'occurred'
  return 'pending'
}

function ExposureChain({ state }: { state: SimulationState }) {
  const caseLabel = state.module2.confirmed ? '确诊病例' : '疑似病例'
  const tracingLabel = state.module2.tracingMode === 'full'
    ? '全面接触调查已启动'
    : state.module2.tracingMode === 'preliminary' ? '基础名单核查中' : '接触调查尚未启动'
  return (
    <div className="chain-view" role="tabpanel" aria-label="传播与暴露链">
      <div className="transmission-chain">
        <div className="chain-node infected"><small>已知感染者</small><strong>境外感染者</strong><span>源暴露病例</span></div>
        <div className="chain-relation effective"><span>07月27日 · 有效暴露</span><i /></div>
        <div className={state.module2.confirmed ? 'chain-node infected' : 'chain-node suspected'}><small>当前调查对象</small><strong>周启航</strong><span>{caseLabel}</span></div>
        <div className={`chain-relation ${state.module4.secondaryConfirmed ? 'effective' : 'contact'}`}><span>{state.module4.secondaryConfirmed ? '家庭体液暴露 · 已确认传播关系' : tracingLabel}</span><i /></div>
        <div className={state.module4.secondaryConfirmed ? 'chain-node infected' : 'chain-node unrevealed'}><small>{state.module4.secondaryConfirmed ? '续发病例' : '后续关系'}</small><strong>{state.module4.secondaryConfirmed ? '沈洁' : '待揭示'}</strong><span>{state.module4.secondaryConfirmed ? '确诊病例 · Ct 27.9' : '不提前显示结果'}</span></div>
      </div>
      <div className="chain-legend">
        <span><i className="infected" />感染</span>
        <span><i className="effective" />有效暴露</span>
        <span><i className="contact" />接触但尚未判定</span>
        <span><i className="unrevealed" />尚未发生或揭示</span>
        <strong>病例轨迹 ≠ 接触者调查 ≠ 已确认传播链</strong>
        <strong>接触 ≠ 有效暴露 ≠ 密切接触者 ≠ 感染</strong>
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
