import type { KeyboardEvent } from 'react'
import type { HotspotId, Module2State, SceneState } from '../simulation/types'
import { CharacterAvatar } from './CharacterAvatar'
import { SceneInfoCard } from './SceneInfoCard'

type Props = {
  scene: SceneState
  module2: Module2State
  activeHotspot: HotspotId | null
  onHotspot: (id: HotspotId) => void
  onClearHotspot: () => void
}

export function SamplingScene({ scene, module2, activeHotspot, onHotspot, onClearHotspot }: Props) {
  const trigger = (event: KeyboardEvent<SVGGElement>, id: HotspotId) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onHotspot(id) }
  }
  const select = (id: HotspotId) => ({ role: 'button' as const, tabIndex: 0, onClick: () => onHotspot(id), onKeyDown: (event: KeyboardEvent<SVGGElement>) => trigger(event, id) })
  const contaminated = scene.specimenVisual === 'contaminated'
  const standardized = scene.interaction === 'sampling-standardized'

  return (
    <section className="scene-panel sampling-scene" aria-labelledby="sampling-scene-title">
      <div className="panel-heading scene-heading"><div><span className="eyebrow"><b>采样与标本处置</b><small>DIGITAL TWIN</small></span><h2 id="sampling-scene-title">定点医院 · 受控采样区</h2></div></div>
      <div className="scene-canvas module2-canvas">
        <svg viewBox="0 0 1140 540" role="img" aria-label="定点医院受控采样、三重包装与标本交接数字孪生场景">
          <defs><linearGradient id="sample-floor" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#153641"/><stop offset="1" stopColor="#081820"/></linearGradient></defs>
          <path d="M114 365 L546 141 L1011 333 L572 520Z" fill="url(#sample-floor)" stroke="#376872"/>
          <g opacity=".2" stroke="#4f7c84">{[0,1,2,3,4,5,6].map((i)=><path key={i} d={`M${158+i*66} ${381-i*1} L${577+i*58} ${164+i*23}`}/>)}</g>
          <path d="M122 206 L547 75 L943 221" fill="none" stroke="#386a73" strokeWidth="2"/>
          <path d="M122 206 V365 M547 75 V141 M943 221 V333" fill="none" stroke="#2c5962"/>

          <g className="module-zone-sign" transform="translate(400 145)"><rect width="178" height="54" rx="6"/><text x="14" y="23">规范采样工作站</text><text className="zone-english" x="14" y="43">SAMPLING STATION</text></g>

          <g transform="translate(466 282)"><CharacterAvatar role="nurse" scale={1.18} facing="left"/></g>
          <g transform="translate(595 266)"><CharacterAvatar role="doctor" scale={1.14}/></g>

          <g className="sampling-station" {...select('sampling-station')} aria-label="查看规范采样工作站">
            <path d="M384 289 L575 239 L701 294 L510 348Z" fill="#57767b" stroke="#7fa0a3"/>
            <path d="M510 348 L701 294 L701 383 L510 441Z" fill="#27454d"/>
            <path d="M384 289 L510 348 L510 441 L384 382Z" fill="#35565e"/>
          </g>

          <g transform="translate(344 330)"><CharacterAvatar role="patient" scale={1.28} unwell/><ellipse className="patient-scan" cx="0" cy="7" rx="40" ry="21"/></g>

          <g className={`sample-package ${contaminated ? 'contaminated' : standardized ? 'sealed' : ''}`} transform="translate(730 275)" {...select('sample-package')} aria-label="查看标本包装状态">
            <ellipse cx="76" cy="112" rx="102" ry="25" fill="#02090c" opacity=".4"/>
            <path d="M0 30 L97 5 L166 34 L68 61Z" fill="#315761" stroke="#79a4aa"/>
            <path d="M68 61 L166 34 L166 111 L68 139Z" fill="#1b3942" stroke="#5d838a"/>
            <path d="M0 30 L68 61 L68 139 L0 106Z" fill="#294b54"/>
            <path d="M30 44 L92 28 L132 45 L70 63Z" fill="none" stroke={contaminated ? '#ff726f' : '#64e6c3'} strokeWidth="3"/>
            <rect x="84" y="62" width="70" height="28" rx="3" fill="#0b2027" stroke="#8fb1b5"/>
            <text x="119" y="81" textAnchor="middle">SPECIMEN</text>
            {contaminated && <><ellipse className="package-alert-ring" cx="79" cy="76" rx="110" ry="68"/><g className="module-alert-label" transform="translate(-2 153)"><rect width="188" height="40" rx="5"/><text x="13" y="25">外包装污染模拟阳性</text></g></>}
            {standardized && <g className="package-check" transform="translate(142 4)"><circle r="17"/><path d="M-7 0 L-1 7 L10-8"/></g>}
          </g>

          <g className={`specimen-route ${scene.specimenVisual === 'in-transit' ? 'active' : ''}`} {...select('handover-route')} aria-label="查看标本运输交接路线">
            <path d="M878 411 C930 392 970 351 997 302"/><path className="route-arrow" d="M985 307 L1003 291 L1001 315Z"/>
          </g>
          <g className="handover-port" transform="translate(930 184)"><path d="M0 30 L88 8 L137 30 L49 53Z" fill="#244650" stroke="#5d8990"/><path d="M49 53 L137 30 V104 L49 128Z" fill="#112c34"/><path d="M0 30 L49 53 V128 L0 104Z" fill="#1b3c45"/><g className="module-zone-sign" transform="translate(-9 -38)"><rect width="151" height="54" rx="6"/><text x="14" y="23">专人运输交接</text><text className="zone-english" x="14" y="43">HANDOVER</text></g></g>

          <g className="sampling-status-rail" transform="translate(70 50)"><text>SPECIMEN CONTROL</text><circle cx="7" cy="27" r="6"/><path d="M18 27 H245"/><text className="status-main" x="0" y="60">{contaminated ? '暴露调查已启动' : standardized ? '三重包装已完成' : '等待采样方案'}</text><text className="status-sub" x="0" y="84">实验室延迟：{module2.laboratoryDelayMinutes > 0 ? '4 小时' : '未增加'}</text></g>
        </svg>
        <SceneInfoCard hotspot={activeHotspot} onClose={onClearHotspot}/>
      </div>
    </section>
  )
}
