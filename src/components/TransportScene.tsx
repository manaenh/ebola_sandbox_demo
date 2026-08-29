import type { KeyboardEvent } from 'react'
import type { HotspotId, Module1State, Module2State, SceneState } from '../simulation/types'
import { CharacterAvatar } from './CharacterAvatar'
import { SceneInfoCard } from './SceneInfoCard'

type Props = {
  scene: SceneState
  module1: Module1State
  module2: Module2State
  activeHotspot: HotspotId | null
  onHotspot: (id: HotspotId) => void
  onClearHotspot: () => void
}

export function TransportScene({ scene, module1, module2, activeHotspot, onHotspot, onClearHotspot }: Props) {
  const trigger = (event: KeyboardEvent<SVGGElement>, id: HotspotId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onHotspot(id)
    }
  }
  const select = (id: HotspotId) => ({
    role: 'button' as const,
    tabIndex: 0,
    onClick: () => onHotspot(id),
    onKeyDown: (event: KeyboardEvent<SVGGElement>) => trigger(event, id),
  })
  const waiting = scene.transferMotion === 'waiting'
  const loading = scene.transferMotion === 'loading' || scene.transferMotion === 'preparing'
  const inheritedPressure = module1.downstreamResponsePressure === 'high' || module1.downstreamResponsePressure === 'elevated'

  return (
    <section className="scene-panel transport-scene" aria-labelledby="transport-scene-title">
      <div className="panel-heading scene-heading">
        <div><span className="eyebrow"><b>医疗转运场景</b><small>DIGITAL TWIN</small></span><h2 id="transport-scene-title">隔离出口 · 专业转运准备区</h2></div>
      </div>
      <div className="scene-canvas module2-canvas">
        <svg viewBox="0 0 1100 540" role="img" aria-label="患者从市中心医院隔离出口进入感染性疾病转运车辆的数字孪生场景">
          <defs>
            <linearGradient id="transfer-floor" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#173640"/><stop offset="1" stopColor="#081920"/></linearGradient>
            <linearGradient id="vehicle-body" x1="0" x2="1"><stop stopColor="#d2e1df"/><stop offset="1" stopColor="#6f9397"/></linearGradient>
            <filter id="transfer-glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <path d="M102 376 L540 154 L1007 333 L566 522Z" fill="url(#transfer-floor)" stroke="#376872"/>
          <g opacity=".22" stroke="#4f7c84">
            {[0,1,2,3,4,5,6].map((i) => <path key={`h${i}`} d={`M${145+i*62} ${394+i*2} L${572+i*51} ${177+i*19}`} />)}
            {[0,1,2,3,4,5].map((i) => <path key={`v${i}`} d={`M${191+i*75} ${331-i*39} L${643+i*73} ${505-i*30}`} />)}
          </g>

          <g className="transport-hospital">
            <path d="M120 210 L401 95 L568 160 L286 280Z" fill="#14343d" stroke="#4d8992"/>
            <path d="M286 280 L568 160 L568 329 L286 449Z" fill="#0d252d" stroke="#396b73"/>
            <path d="M120 210 L286 280 L286 449 L120 375Z" fill="#183b44" stroke="#396b73"/>
            <path d="M305 278 L401 237 L401 356 L305 397Z" fill="#07161c" stroke="#64e6c3" strokeWidth="2"/>
            <path d="M320 286 L386 258 L386 334 L320 363Z" fill="#59e1ec" opacity=".12"/>
            <g className="module-zone-sign" transform="translate(137 229)"><rect width="151" height="54" rx="6"/><text x="14" y="23">医院隔离出口</text><text className="zone-english" x="14" y="43">ISOLATION EXIT</text></g>
          </g>

          <g className={`transfer-path ${loading ? 'active' : ''}`} {...select('transfer-route')} aria-label="查看医疗转运路线">
            <path d="M386 365 C505 402 617 383 742 326"/>
            <path className="route-arrow" d="M732 318 L754 319 L741 337Z"/>
          </g>

          <g className={`transfer-vehicle ${scene.transferVehicle !== 'none' ? 'ready' : ''}`} transform="translate(708 221)" {...select('transfer-vehicle')} aria-label="查看转运车辆">
            <ellipse cx="121" cy="150" rx="149" ry="31" fill="#02080b" opacity=".46"/>
            <path d="M0 58 L198 18 L285 58 L87 103Z" fill="url(#vehicle-body)" stroke="#9ac6c8"/>
            <path d="M87 103 L285 58 L285 130 L87 177Z" fill="#496f76" stroke="#7ca2a6"/>
            <path d="M0 58 L87 103 L87 177 L0 130Z" fill="#789ba0" stroke="#b3d1d1"/>
            <path d="M178 38 L230 29 L262 48 L209 59Z" fill="#16343c"/>
            <path d="M20 70 L68 94 L68 135 L20 112Z" fill="#0a252d" opacity=".78"/>
            <path d="M115 105 L157 96 L157 139 L115 150Z" fill="#0a252d" opacity=".8"/>
            <circle cx="72" cy="166" r="25" fill="#071218" stroke="#708e93" strokeWidth="5"/>
            <circle cx="244" cy="126" r="25" fill="#071218" stroke="#708e93" strokeWidth="5"/>
            <path d="M36 118 H67 M51 103 V133" stroke="#64e6c3" strokeWidth="6"/>
            <g className="vehicle-beacon" filter="url(#transfer-glow)"><rect x="126" y="29" width="30" height="7" rx="3" fill={waiting ? '#ffb45b' : '#59e1ec'}/></g>
          </g>

          <g className="transfer-team-hotspot" transform="translate(610 376)" {...select('transfer-team')} aria-label="查看专业转运组">
            <CharacterAvatar role="paramedic" x={-34} y={0} scale={1.18}/>
            <CharacterAvatar role="paramedic" x={38} y={-18} scale={1.12} facing="left" variant={2}/>
          </g>
          <g className={`transport-patient ${loading ? 'loading' : ''}`} transform={loading ? 'translate(706 374)' : 'translate(454 378)'}>
            <CharacterAvatar role="patient" scale={1.25} unwell facing="left"/>
            <ellipse className="patient-scan" cx="0" cy="7" rx="42" ry="22"/>
            <g className="compact-character-label" transform="translate(22 -93)"><rect width="146" height="36" rx="18"/><text x="15" y="23">周启航 · 待转运</text></g>
          </g>

          {waiting && (
            <g className="cleanup-events">
              <ellipse cx="373" cy="375" rx="54" ry="28"/><ellipse cx="435" cy="403" rx="46" ry="24"/>
              <g transform="translate(291 424)"><CharacterAvatar role="cleaner" scale={1.05}/></g>
              <g className="module-alert-label" transform="translate(348 435)"><rect width="188" height="40" rx="5"/><text x="13" y="25">新增污染处置 · 2 次</text></g>
            </g>
          )}

          <g className="transfer-status-rail" transform="translate(646 82)">
            <text x="0" y="0">TRANSFER STATUS</text>
            <circle cx="7" cy="26" r="6"/><path d="M18 26 H245"/>
            <text className="status-main" x="0" y="58">{waiting ? '车辆等待中' : loading ? '备用转运准备中' : '等待方案确认'}</text>
            <text className="status-sub" x="0" y="82">{waiting ? `预计等待约 ${module2.transferWaitMinutes} 分钟` : inheritedPressure ? '承接前序较高响应压力' : '感染控制与交接清单待确认'}</text>
          </g>
        </svg>
        <SceneInfoCard hotspot={activeHotspot} onClose={onClearHotspot}/>
      </div>
    </section>
  )
}
