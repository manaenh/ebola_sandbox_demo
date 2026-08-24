import type { KeyboardEvent } from 'react'
import { hotspotCopy } from '../simulation/sourceData'
import type { HotspotId, ScenePhase } from '../simulation/types'
import { CharacterAvatar } from './CharacterAvatar'

type HospitalSceneProps = {
  phase: ScenePhase
  activeHotspot: HotspotId | null
  onHotspot: (id: HotspotId) => void
  onClearHotspot: () => void
}

const waitingPeople = [
  [292, 324, 0], [332, 344, 1], [372, 364, 2], [412, 384, 0],
  [265, 352, 1], [305, 373, 2], [345, 393, 0], [385, 413, 1],
  [238, 382, 2], [278, 402, 0], [318, 423, 1], [358, 443, 2],
  [211, 410, 0], [251, 431, 1], [291, 451, 2], [331, 471, 0],
  [448, 348, 1], [477, 370, 2],
] as const

export function HospitalScene({ phase, activeHotspot, onHotspot, onClearHotspot }: HospitalSceneProps) {
  const trigger = (event: KeyboardEvent<SVGGElement>, id: HotspotId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onHotspot(id)
    }
  }

  const isDelayed = phase === 'exposure-event'

  return (
    <section className="scene-panel" aria-labelledby="scene-title">
      <div className="panel-heading scene-heading">
        <div>
          <span className="eyebrow"><b>数字孪生场景</b><small>DIGITAL TWIN</small></span>
          <h2 id="scene-title">市中心医院 · 急诊分诊区</h2>
        </div>
      </div>

      <div className={`scene-canvas phase-${phase}`}>
        <svg viewBox="0 0 1000 540" role="img" aria-label="市中心医院急诊分诊数字孪生场景。周启航正在分诊，分诊护士位于分诊台后，公共候诊区有十八人，右上方为隔离室。">
          <defs>
            <linearGradient id="floor" x1="0" x2="1" y1="0" y2="1">
              <stop stopColor="#15343d" />
              <stop offset="1" stopColor="#0a1d24" />
            </linearGradient>
            <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#244652" />
              <stop offset="1" stopColor="#122a32" />
            </linearGradient>
            <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <pattern id="isoGrid" width="40" height="22" patternUnits="userSpaceOnUse">
              <path d="M0 11 L20 0 L40 11 L20 22 Z" fill="none" stroke="rgba(89,225,236,.065)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width="1000" height="540" fill="#08151a" />
          <g className="scene-world" transform="translate(-40 -22) scale(1.08)">
          <path d="M78 148 L568 29 L950 202 L459 511 Z" fill="url(#floor)" stroke="rgba(96,214,225,.27)" strokeWidth="2" />
          <path d="M78 148 L568 29 L568 100 L78 219Z" fill="url(#wall)" stroke="rgba(121,206,218,.2)" />
          <path d="M568 29 L950 202 L950 273 L568 100Z" fill="#18313a" stroke="rgba(121,206,218,.2)" />
          <path d="M78 148 L568 29 L950 202 L459 511 Z" fill="url(#isoGrid)" />

          <g className="space-zones" aria-hidden="true">
            <path className="waiting-zone-floor" d="M122 277 L355 220 L536 302 L302 449Z" />
            <path className="triage-zone-floor" d="M405 227 L602 179 L725 235 L527 360Z" />
            <path className="isolation-zone-floor" d="M655 126 L818 86 L918 131 L754 234Z" />
          </g>

          <g className="ambient-lines" aria-hidden="true">
            <path d="M110 203 L568 92 L913 247" />
            <path d="M142 258 L568 154 L875 290" />
            <path d="M174 313 L568 216 L837 334" />
            <path d="M207 368 L568 278 L799 378" />
            <path d="M239 423 L568 341 L761 421" />
          </g>

          <g className="zone-sign waiting-sign" transform="translate(136 254)">
            <rect width="116" height="39" rx="4" />
            <text x="10" y="17">公共候诊区</text><text className="zone-english" x="10" y="31">WAITING AREA</text>
          </g>
          <g className="zone-sign triage-sign" transform="translate(375 211)">
            <rect width="119" height="39" rx="4" />
            <text x="10" y="17">急诊分诊台</text><text className="zone-english" x="10" y="31">TRIAGE DESK</text>
          </g>

          <g className="isolation-room">
            <path d="M668 103 L808 69 L913 116 L772 151Z" fill="#17434b" stroke="#59e1ec" strokeOpacity=".52" />
            <path d="M772 151 L913 116 L913 221 L772 257Z" fill="#112b33" stroke="#59e1ec" strokeOpacity=".3" />
            <path d="M668 103 L772 151 L772 257 L668 207Z" fill="#17343d" stroke="#59e1ec" strokeOpacity=".3" />
            <path d="M710 137 L757 159 L757 238 L710 216Z" fill="#091e25" stroke="#64e6c3" strokeOpacity=".82" />
            <path d="M719 152 L748 165 L748 210 L719 197Z" fill="#59e1ec" opacity=".13" />
          </g>
          <g className="zone-sign isolation-sign" transform="translate(827 77)">
            <rect width="105" height="39" rx="4" />
            <text x="10" y="17">隔离室</text><text className="zone-english" x="10" y="31">ISOLATION</text>
          </g>

          <g
            className={`hotspot character-hotspot nurse-hotspot ${activeHotspot === 'triage-nurse' ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="查看分诊护士信息"
            onClick={() => onHotspot('triage-nurse')}
            onKeyDown={(event) => trigger(event, 'triage-nurse')}
          >
            <CharacterAvatar role="nurse" x={535} y={268} scale={.95} facing="right" />
            <ellipse className="character-focus" cx="535" cy="268" rx="27" ry="14" />
          </g>

          <g
            className={`hotspot desk-hotspot ${activeHotspot === 'triage-desk' ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="查看急诊分诊台信息"
            onClick={() => onHotspot('triage-desk')}
            onKeyDown={(event) => trigger(event, 'triage-desk')}
          >
            <path d="M451 281 L578 250 L650 283 L523 314Z" fill="#466b73" />
            <path d="M523 314 L650 283 L650 335 L523 367Z" fill="#24434c" />
            <path d="M451 281 L523 314 L523 367 L451 331Z" fill="#31515a" />
            <path d="M491 277 L538 265 L565 277 L517 289Z" fill="#09191e" stroke="#59e1ec" strokeOpacity=".55" />
            <path d="M543 321 L619 302" stroke="rgba(89,225,236,.22)" />
            <circle className="hotspot-ring" cx="548" cy="310" r="55" />
          </g>
          <g
            className={`hotspot waiting-hotspot ${activeHotspot === 'waiting-area' ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="查看公共候诊区信息，场内十八人"
            onClick={() => onHotspot('waiting-area')}
            onKeyDown={(event) => trigger(event, 'waiting-area')}
          >
            {[0, 1, 2, 3].map((row) => (
              <g key={row} transform={`translate(${190 + row * 27} ${300 + row * 51})`}>
                <path d="M0 0 L151 71 L134 81 L-17 10Z" fill="#365760" />
                <path d="M-17 10 L134 81 L134 93 L-17 21Z" fill="#203a42" />
                <path d="M3 8 L145 75" stroke="rgba(167,206,212,.13)" />
              </g>
            ))}
            {waitingPeople.map(([x, y, variant], index) => (
              <CharacterAvatar key={index} role="public" x={x} y={y} scale={.5} variant={variant} facing={index % 3 === 0 ? 'left' : 'right'} />
            ))}
            <ellipse className="hotspot-ring" cx="330" cy="395" rx="126" ry="91" />
          </g>

          <g className={`exposure-zone ${isDelayed ? 'visible' : ''}`} aria-hidden={!isDelayed}>
            <ellipse cx="556" cy="373" rx="78" ry="43" />
            <ellipse cx="556" cy="373" rx="46" ry="26" />
            <path d="M507 399 L570 367 L629 395 L565 427Z" />
            <g className="exposure-label" transform="translate(491 438)">
              <rect width="151" height="36" rx="4" />
              <text x="10" y="16">体液暴露事件 · 待评估 +21</text>
              <text className="zone-english" x="10" y="29">EXPOSURE EVENT</text>
            </g>
          </g>

          <g
            className={`hotspot character-hotspot patient-hotspot ${activeHotspot === 'zhou-qihang' ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="查看周启航信息"
            onClick={() => onHotspot('zhou-qihang')}
            onKeyDown={(event) => trigger(event, 'zhou-qihang')}
          >
            <ellipse className="patient-scan" cx="0" cy="7" rx="39" ry="20" />
            <CharacterAvatar role="patient" scale={1.22} facing="left" unwell />
            <ellipse className="character-focus" cx="0" cy="5" rx="34" ry="18" />
          </g>

          <g className="patient-marker">
            <path d="M16-61 L42-76 H119" />
            <rect x="40" y="-91" width="139" height="25" rx="12" />
            <text x="52" y="-75">周启航 · 疑似病例</text>
          </g>

          <g
            className={`hotspot route-hotspot ${activeHotspot === 'isolation-route' ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="查看由分诊台通往隔离室的预设隔离通道"
            onClick={() => onHotspot('isolation-route')}
            onKeyDown={(event) => trigger(event, 'isolation-route')}
          >
            <path className="route-corridor" d="M591 352 C661 319 684 261 746 219" />
            <path className="route-line" d="M591 352 C661 319 684 261 746 219" />
            <path className="route-arrow" d="M735 219 L753 215 L745 232Z" />
            <circle className="hotspot-ring" cx="692" cy="273" r="45" />
          </g>

          <g className="scene-scale" transform="translate(90 493)">
            <path d="M0 0 H104 M0-5 V5 M52-5 V5 M104-5 V5" />
            <text x="0" y="18">0</text><text x="44" y="18">5m</text><text x="94" y="18">10m</text>
          </g>
          </g>
        </svg>

        {activeHotspot && (
          <aside className={`hotspot-card card-${activeHotspot}`} aria-live="polite">
            <button type="button" className="hotspot-close" onClick={onClearHotspot} aria-label="关闭场景信息">×</button>
            <small>{hotspotCopy[activeHotspot].eyebrow}</small>
            <strong>{hotspotCopy[activeHotspot].title}</strong>
            <p>{hotspotCopy[activeHotspot].body}</p>
          </aside>
        )}
      </div>
    </section>
  )
}
