import { useMemo, useState } from 'react'
import { getCitySituation } from '../city/selectors'
import type { CityLocationId, CityLocationKind, CityLocationView } from '../city/types'
import type { SimulationState } from '../simulation/types'

type ShenzhenSituationProps = {
  state: SimulationState
  onEnterScene: () => void
}

export function ShenzhenSituation({ state, onEnterScene }: ShenzhenSituationProps) {
  const situation = useMemo(() => getCitySituation(state), [state])
  const [selectedId, setSelectedId] = useState<CityLocationId>('central-hospital')
  const selected = situation.locations.find((location) => location.id === selectedId) ?? situation.locations[0]
  const byId = new Map(situation.locations.map((location) => [location.id, location]))

  return (
    <div className="city-situation">
      <section className="city-signal-strip" aria-label="深圳当前响应态势">
        {situation.signals.map((signal) => (
          <article className={`city-signal ${signal.tone}`} key={signal.label} title={signal.provenance === 'source' ? '源脚本数据' : '由当前推演状态确定性派生'}>
            <span>{signal.label}</span>
            <strong>{signal.value}</strong>
          </article>
        ))}
      </section>

      <div className="city-layout">
        <section className="city-map-panel" aria-labelledby="city-map-title">
          <div className="city-map-heading">
            <div>
              <span className="eyebrow"><b>深圳全局态势</b><small>CITY VIEW</small></span>
              <h2 id="city-map-title">病例轨迹与联合响应位置</h2>
            </div>
            <p>{situation.summary}</p>
          </div>

          <div className="city-map-canvas">
            <svg viewBox="0 0 1000 560" role="img" aria-label="深圳市病例移动、待调查地点与响应机构示意图。路线表示经过和调查关系，不表示疾病传播。">
              <defs>
                <pattern id="city-grid" width="38" height="38" patternUnits="userSpaceOnUse">
                  <path d="M38 0H0V38" fill="none" stroke="rgba(89,225,236,.045)" strokeWidth="1" />
                </pattern>
                <linearGradient id="city-land" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#153740" />
                  <stop offset="1" stopColor="#0d242d" />
                </linearGradient>
                <filter id="city-glow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <marker id="route-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M0 0L10 5L0 10Z" fill="context-stroke" />
                </marker>
              </defs>
              <rect width="1000" height="560" fill="#07151b" />
              <rect width="1000" height="560" fill="url(#city-grid)" />
              <path className="city-water" d="M0 418C122 376 214 420 312 402C414 383 466 426 556 449C662 476 748 430 830 455C895 475 952 507 1000 488V560H0Z" />
              <path className="shenzhen-outline" d="M105 170L182 119L286 126L346 94L451 112L520 88L610 113L673 101L752 130L839 125L920 178L893 241L925 286L878 329L898 386L828 424L747 405L686 443L604 418L549 452L485 414L403 432L353 390L271 405L230 358L157 345L128 292L77 255Z" />
              <g className="district-lines" aria-hidden="true">
                <path d="M182 119L230 358M346 94L353 390M520 88L485 414M673 101L604 418M839 125L747 405" />
                <path d="M106 221L897 221M123 291L889 291M168 354L865 354" />
              </g>
              <g className="city-labels" aria-hidden="true">
                <text x="106" y="145">宝安</text><text x="350" y="135">南山</text>
                <text x="515" y="145">福田</text><text x="660" y="151">罗湖</text>
                <text x="805" y="166">东部片区</text><text x="34" y="512">珠江口</text>
              </g>

              <g className="city-routes" aria-label="病例移动与响应路线">
                {situation.routes.map((route) => {
                  const from = byId.get(route.from)
                  const to = byId.get(route.to)
                  if (!from || !to) return null
                  const midX = (from.x + to.x) / 2
                  const midY = (from.y + to.y) / 2 - (route.kind === 'response' ? 54 : 22)
                  const path = `M${from.x} ${from.y} Q${midX} ${midY} ${to.x} ${to.y}`
                  return (
                    <g className={`city-route ${route.kind} ${route.status}`} key={route.id}>
                      <path d={path} markerEnd="url(#route-arrow)" />
                      {route.label && <text x={midX} y={midY - 8}>{route.label}</text>}
                    </g>
                  )
                })}
              </g>

              <g className="city-locations">
                {situation.locations.map((location) => (
                  <CityLocationNode
                    key={location.id}
                    location={location}
                    selected={selected.id === location.id}
                    onSelect={() => setSelectedId(location.id)}
                  />
                ))}
              </g>
            </svg>

            <div className="city-map-legend" aria-label="地图状态图例">
              <span><i className="passed" />经过</span>
              <span><i className="investigation" />待调查</span>
              <span><i className="exposure-event" />体液暴露事件</span>
              <span><i className="suspected-location" />疑似病例所在地</span>
              <span><i className="response-active" />响应机构</span>
            </div>
            <small className="city-map-note">位置与线路用于桌面推演表达，不代表精确轨迹坐标；经过不等于有效暴露或感染。</small>
          </div>
        </section>

        <CityLocationDetail location={selected} onEnterScene={onEnterScene} />
      </div>
    </div>
  )
}

function CityLocationNode({ location, selected, onSelect }: { location: CityLocationView; selected: boolean; onSelect: () => void }) {
  const labelOnLeft = location.x > 720
  return (
    <g
      className={`city-location status-${location.status} ${selected ? 'selected' : ''}`}
      transform={`translate(${location.x} ${location.y})`}
      role="button"
      tabIndex={0}
      aria-label={`${location.name}，${location.statusLabel}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <circle className="location-pulse" r="23" />
      <circle className="location-core" r="12" />
      <LocationGlyph kind={location.kind} />
      <g className={`location-label ${labelOnLeft ? 'left' : ''}`} transform={labelOnLeft ? 'translate(-16 -18)' : 'translate(16 -18)'}>
        <rect x={labelOnLeft ? -132 : 0} width="132" height="40" rx="4" />
        <text className="location-name" x={labelOnLeft ? -122 : 10} y="16">{location.shortLabel}</text>
        <text className="location-status" x={labelOnLeft ? -122 : 10} y="31">{location.statusLabel}</text>
      </g>
    </g>
  )
}

function LocationGlyph({ kind }: { kind: CityLocationKind }) {
  if (kind === 'hospital' || kind === 'response') {
    return <path className="location-glyph" d="M-5-1H-1V-5H3V-1H7V3H3V7H-1V3H-5Z" />
  }
  if (kind === 'residence') {
    return <path className="location-glyph" d="M-6 0L1-6L8 0V7H3V2H-1V7H-6Z" />
  }
  if (kind === 'entry') {
    return <path className="location-glyph" d="M-7 2L7-4L2 3L6 6L3 7L-1 4L-5 7L-3 3Z" />
  }
  if (kind === 'transport') {
    return <path className="location-glyph" d="M-7-4H5L8 2V6H5A3 3 0 01-1 6H-4A3 3 0 01-10 6V0Z" />
  }
  if (kind === 'laboratory') {
    return <path className="location-glyph" d="M-3-7H4M-1-7V-1L-6 7H9L3-1V-7" />
  }
  return <circle className="location-glyph" r="5" />
}

function CityLocationDetail({ location, onEnterScene }: { location: CityLocationView; onEnterScene: () => void }) {
  return (
    <aside className={`city-location-detail status-${location.status}`} aria-live="polite">
      <div className="location-detail-heading">
        <span>{location.statusLabel}</span>
        <small>{location.kind === 'hospital' ? '医疗机构' : location.kind === 'response' ? '响应机构' : '轨迹位置'}</small>
      </div>
      <h2>{location.name}</h2>
      <p>{location.detail}</p>
      {location.facts.length > 0 && (
        <div className="location-facts">
          {location.facts.map((fact) => (
            <div key={fact.label} title={fact.provenance === 'source' ? '源脚本数据' : '由当前推演状态确定性派生'}>
              <span>{fact.label}</span><strong>{fact.value}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="location-source">
        <span>情景依据</span>
        <p>{location.sourceNote}</p>
      </div>
      {location.hasScene ? (
        <button className="enter-scene-button" type="button" onClick={onEnterScene}>
          进入现场推演 <span>→</span>
        </button>
      ) : (
        <div className="scene-unavailable">当前地点暂无线下场景</div>
      )}
    </aside>
  )
}
