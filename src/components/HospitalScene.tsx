import type { KeyboardEvent } from 'react'
import { hotspotCopy } from '../simulation/sourceData'
import type { HotspotId, ScenePhase } from '../simulation/types'

type HospitalSceneProps = {
  phase: ScenePhase
  activeHotspot: HotspotId | null
  onHotspot: (id: HotspotId) => void
}

type AvatarProps = {
  x: number
  y: number
  scale?: number
  shirt?: string
  trousers?: string
  hair?: string
  facing?: 'left' | 'right'
}

function Avatar({
  x,
  y,
  scale = 1,
  shirt = '#50707a',
  trousers = '#21343c',
  hair = '#172126',
  facing = 'right',
}: AvatarProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${facing === 'left' ? -scale : scale} ${scale})`}>
      <ellipse cx="0" cy="5" rx="15" ry="7" fill="rgba(0,0,0,.28)" />
      <path d="M-7-13 L-9 1 L-4 2 L0-10 L4 2 L9 1 L7-13Z" fill={trousers} />
      <path d="M-10-37 Q0-43 10-37 L8-14 Q0-10-8-14Z" fill={shirt} />
      <path d="M-8-34 L-16-20" stroke="#c99575" strokeWidth="5" strokeLinecap="round" />
      <path d="M8-34 L14-19" stroke="#c99575" strokeWidth="5" strokeLinecap="round" />
      <circle cx="0" cy="-51" r="10" fill="#c99575" />
      <path d="M-9-54 Q-4-65 7-60 Q12-56 8-48 Q5-57-9-52Z" fill={hair} />
      <path d="M5-51 l5 2 -5 2" fill="#c99575" />
    </g>
  )
}

function WaitingPerson({ x, y, hue }: { x: number; y: number; hue: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(.62)`} opacity=".9">
      <ellipse cx="0" cy="4" rx="14" ry="6" fill="rgba(0,0,0,.24)" />
      <path d="M-8-31 Q0-37 8-31 L7-10 L-7-10Z" fill={`hsl(${hue} 22% 38%)`} />
      <path d="M-6-10 L-7 1 M6-10 L7 1" stroke="#263a42" strokeWidth="5" />
      <circle cx="0" cy="-42" r="9" fill="#be8c70" />
      <path d="M-8-44 Q-2-53 8-45 L7-40 Q0-46-8-41Z" fill="#172126" />
    </g>
  )
}

const waitingPeople = [
  [320, 315, 186], [360, 335, 210], [401, 354, 168], [441, 375, 222],
  [290, 344, 198], [329, 365, 178], [371, 384, 206], [410, 405, 154],
  [258, 374, 214], [300, 397, 174], [339, 416, 194], [380, 438, 225],
  [230, 405, 185], [268, 426, 218], [308, 447, 164], [348, 467, 202],
  [455, 326, 190], [486, 348, 230],
]

export function HospitalScene({ phase, activeHotspot, onHotspot }: HospitalSceneProps) {
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
          <span className="eyebrow">DIGITAL TWIN / M1-1</span>
          <h2 id="scene-title">市中心医院 · 急诊分诊区</h2>
        </div>
        <div className="scene-legend">
          <span><i className="legend-dot patient" />重点人物</span>
          <span><i className="legend-dot control" />控制节点</span>
          <span><i className="legend-dot public" />公共区域</span>
        </div>
      </div>

      <div className={`scene-canvas phase-${phase}`}>
        <svg viewBox="0 0 1000 540" role="img" aria-label="2.5D 医院急诊分诊区，周启航正在分诊，候诊区有十八人，右上方为隔离通道">
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
            <pattern id="isoGrid" width="40" height="22" patternUnits="userSpaceOnUse" patternTransform="skewY(-1)">
              <path d="M0 11 L20 0 L40 11 L20 22 Z" fill="none" stroke="rgba(89,225,236,.08)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width="1000" height="540" fill="#08151a" />
          <path d="M95 148 L566 34 L939 202 L467 505 Z" fill="url(#floor)" stroke="rgba(96,214,225,.26)" strokeWidth="2" />
          <path d="M95 148 L566 34 L566 101 L95 215Z" fill="url(#wall)" stroke="rgba(121,206,218,.2)" />
          <path d="M566 34 L939 202 L939 268 L566 101Z" fill="#18313a" stroke="rgba(121,206,218,.2)" />
          <path d="M95 148 L566 34 L939 202 L467 505 Z" fill="url(#isoGrid)" />

          <g className="ambient-lines" aria-hidden="true">
            <path d="M126 201 L566 95 L901 244" />
            <path d="M157 254 L566 155 L864 286" />
            <path d="M189 307 L566 215 L827 329" />
            <path d="M220 360 L566 276 L790 372" />
            <path d="M251 413 L566 336 L752 414" />
          </g>

          <g className="zone-label" transform="translate(154 236)">
            <text>PUBLIC WAITING</text><text y="16">公共候诊区</text>
          </g>
          <g className="zone-label" transform="translate(490 232)">
            <text>TRIAGE</text><text y="16">急诊分诊</text>
          </g>
          <g className="zone-label" transform="translate(725 99)">
            <text>ISOLATION</text><text y="16">隔离通道</text>
          </g>

          <g className="isolation-room">
            <path d="M688 91 L805 62 L891 101 L773 131Z" fill="#153d45" stroke="#59e1ec" strokeOpacity=".45" />
            <path d="M773 131 L891 101 L891 193 L773 224Z" fill="#112b33" stroke="#59e1ec" strokeOpacity=".28" />
            <path d="M688 91 L773 131 L773 224 L688 181Z" fill="#17343d" stroke="#59e1ec" strokeOpacity=".28" />
            <path d="M724 119 L760 136 L760 207 L724 188Z" fill="#0a2229" stroke="#64e6c3" strokeOpacity=".7" />
            <path d="M731 133 L752 143 L752 181 L731 171Z" fill="#59e1ec" opacity=".13" />
            <text x="790" y="115" className="room-code">ISO-01</text>
          </g>

          <g
            className={`hotspot triage-hotspot ${activeHotspot === 'triage' ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="查看分诊台信息"
            onClick={() => onHotspot('triage')}
            onKeyDown={(event) => trigger(event, 'triage')}
          >
            <path d="M461 273 L568 246 L635 277 L527 307Z" fill="#3b6068" />
            <path d="M527 307 L635 277 L635 327 L527 357Z" fill="#24434c" />
            <path d="M461 273 L527 307 L527 357 L461 323Z" fill="#31515a" />
            <path d="M493 269 L535 258 L559 269 L517 280Z" fill="#09191e" stroke="#59e1ec" strokeOpacity=".45" />
            <text x="540" y="326" className="desk-label">TRIAGE 01</text>
            <Avatar x={495} y={268} scale={0.78} shirt="#4b9aa3" trousers="#17343b" />
            <circle className="hotspot-ring" cx="535" cy="298" r="45" />
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
              <g key={row} transform={`translate(${205 + row * 31} ${286 + row * 52})`}>
                <path d="M0 0 L140 66 L124 77 L-16 11Z" fill="#31515b" />
                <path d="M-16 11 L124 77 L124 88 L-16 22Z" fill="#203a42" />
              </g>
            ))}
            {waitingPeople.map(([x, y, hue], index) => <WaitingPerson key={index} x={x} y={y} hue={hue} />)}
            <circle className="hotspot-ring" cx="343" cy="383" r="104" />
          </g>

          <g className={`exposure-zone ${isDelayed ? 'visible' : ''}`} aria-hidden={!isDelayed}>
            <ellipse cx="512" cy="352" rx="70" ry="39" />
            <ellipse cx="512" cy="352" rx="42" ry="24" />
            <path d="M465 382 L531 350 L590 379 L523 413Z" />
            <text x="474" y="430">EXPOSURE EVENT · 待评估 +21</text>
          </g>

          <g
            className={`hotspot patient-hotspot ${activeHotspot === 'zhou-qihang' ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="查看周启航信息"
            onClick={() => onHotspot('zhou-qihang')}
            onKeyDown={(event) => trigger(event, 'zhou-qihang')}
          >
            <ellipse className="patient-scan" cx="0" cy="6" rx="34" ry="17" />
            <Avatar x={0} y={0} scale={1.12} shirt="#286078" trousers="#172a36" facing="left" />
            <path d="M14-34 q20 5 19 27 l-13 1 q2-20-13-22Z" fill="#9a7045" stroke="#d09a5b" strokeWidth="1" />
            <circle className="hotspot-ring" cx="0" cy="-25" r="44" />
          </g>

          <g className="patient-tag">
            <path d="M18-68 L64-94 H177" />
            <rect x="61" y="-115" width="176" height="48" rx="5" />
            <text x="75" y="-96">BH-EVD-001 · 周启航</text>
            <text x="75" y="-79" className="tag-secondary">39.1°C · GI SYMPTOMS</text>
          </g>

          <g
            className={`hotspot route-hotspot ${activeHotspot === 'isolation-route' ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="查看隔离通道信息"
            onClick={() => onHotspot('isolation-route')}
            onKeyDown={(event) => trigger(event, 'isolation-route')}
          >
            <path className="route-line" d="M566 312 C650 281 675 224 738 175" />
            <path className="route-arrow" d="M728 177 L744 171 L738 187Z" />
            <circle className="hotspot-ring" cx="700" cy="220" r="42" />
          </g>

          <g className="scene-scale" transform="translate(96 490)">
            <path d="M0 0 H104 M0-5 V5 M52-5 V5 M104-5 V5" />
            <text x="0" y="18">0</text><text x="44" y="18">5m</text><text x="94" y="18">10m</text>
          </g>
        </svg>

        <div className="scene-hud top-left">
          <span>FLOOR 01 / EMERGENCY</span>
          <strong>{phase === 'observing' ? '事件观察中' : phase === 'isolated' ? '隔离通道已启用' : '暴露事件处置中'}</strong>
        </div>
        <div className="scene-hud bottom-right">
          <span>SCENE INTEGRITY</span>
          <strong>LOCAL · 100%</strong>
        </div>

        {activeHotspot && (
          <aside className="hotspot-card" aria-live="polite">
            <small>{hotspotCopy[activeHotspot].eyebrow}</small>
            <strong>{hotspotCopy[activeHotspot].title}</strong>
            <p>{hotspotCopy[activeHotspot].body}</p>
          </aside>
        )}
      </div>
    </section>
  )
}
