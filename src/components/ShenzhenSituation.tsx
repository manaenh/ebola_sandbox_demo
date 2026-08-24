import { useEffect, useMemo, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { getCitySituation } from '../city/selectors'
import type { CityLocationIcon, CityLocationId, CityLocationView } from '../city/types'
import type { SimulationState } from '../simulation/types'

type ShenzhenSituationProps = {
  state: SimulationState
  onEnterScene: () => void
}

type GeographicFeature = Feature<Polygon | MultiPolygon>
type GeographicCollection = FeatureCollection<Polygon | MultiPolygon>

const MAP_SIZE: [number, number] = [1000, 560]

export function ShenzhenSituation({ state, onEnterScene }: ShenzhenSituationProps) {
  const situation = useMemo(() => getCitySituation(state), [state])
  const [selectedId, setSelectedId] = useState<CityLocationId>('central-hospital')
  const [showTrajectory, setShowTrajectory] = useState(false)
  const [boundary, setBoundary] = useState<GeographicFeature | null>(null)
  const [districts, setDistricts] = useState<GeographicCollection | null>(null)
  const [mapError, setMapError] = useState(false)

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    Promise.all([
      fetch(`${base}maps/shenzhen-boundary.geojson`).then((response) => {
        if (!response.ok) throw new Error('boundary unavailable')
        return response.json() as Promise<GeographicFeature>
      }),
      fetch(`${base}maps/shenzhen-districts.geojson`).then((response) => {
        if (!response.ok) throw new Error('districts unavailable')
        return response.json() as Promise<GeographicCollection>
      }),
    ]).then(([nextBoundary, nextDistricts]) => {
      setBoundary(nextBoundary)
      setDistricts(nextDistricts)
    }).catch(() => setMapError(true))
  }, [])

  const projection = useMemo(() => boundary
    ? geoMercator().fitExtent([[48, 48], [952, 506]], boundary)
    : null, [boundary])
  const path = useMemo(() => projection ? geoPath(projection) : null, [projection])
  const projectLocation = (coordinates: [number, number]) => projection?.(coordinates) ?? null
  const selected = situation.locations.find((location) => location.id === selectedId) ?? situation.locations[0]
  const byId = new Map(situation.locations.map((location) => [location.id, location]))
  const visibleLocations = situation.locations.filter((location) =>
    location.visibleByDefault || (showTrajectory && location.category === 'trajectory'))
  const visibleIds = new Set(visibleLocations.map((location) => location.id))
  const visibleRoutes = situation.routes.filter((route) =>
    route.kind === 'response' || (showTrajectory && visibleIds.has(route.from) && visibleIds.has(route.to)))

  const toggleTrajectory = () => {
    const next = !showTrajectory
    setShowTrajectory(next)
    if (!next && !byId.get(selectedId)?.visibleByDefault) setSelectedId('central-hospital')
  }

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
              <h2 id="city-map-title">城市事件与联合响应</h2>
            </div>
            <p>{situation.summary}</p>
            <button className="trajectory-toggle" type="button" aria-pressed={showTrajectory} onClick={toggleTrajectory}>
              <span className="toggle-indicator" />病例轨迹
            </button>
          </div>

          <div className="city-map-canvas">
            <svg viewBox={`0 0 ${MAP_SIZE[0]} ${MAP_SIZE[1]}`} role="img" aria-label="基于真实深圳地理边界绘制的事件、响应机构和可选病例移动轨迹。轨迹不表示疾病传播。">
              <defs>
                <linearGradient id="city-land" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#15333b" />
                  <stop offset="1" stopColor="#0c222a" />
                </linearGradient>
                <filter id="city-glow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <marker id="route-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M0 0L10 5L0 10Z" fill="context-stroke" />
                </marker>
              </defs>
              <rect width="1000" height="560" className="city-water" />

              {mapError && <text className="map-message" x="500" y="280">本地深圳地理数据未能载入</text>}
              {!mapError && !boundary && <text className="map-message" x="500" y="280">正在载入本地地理数据…</text>}
              {boundary && path && (
                <>
                  <path className="shenzhen-outline" d={path(boundary) ?? undefined} />
                  <g className="district-lines" aria-hidden="true">
                    {districts?.features.map((district, index) => (
                      <path key={String(district.properties?.osmRelationId ?? index)} d={path(district) ?? undefined} />
                    ))}
                  </g>
                  <text className="shenzhen-map-label" x="585" y="157">深圳</text>

                  <g className="city-routes" aria-label="病例轨迹与响应连接">
                    {visibleRoutes.map((route) => {
                      const from = byId.get(route.from)
                      const to = byId.get(route.to)
                      const start = from && projectLocation(from.coordinates)
                      const end = to && projectLocation(to.coordinates)
                      if (!start || !end) return null
                      const midX = (start[0] + end[0]) / 2
                      const lift = route.kind === 'response' ? 42 : 16
                      const midY = (start[1] + end[1]) / 2 - lift
                      return (
                        <g className={`city-route ${route.kind} ${route.status}`} key={route.id}>
                          <path d={`M${start[0]} ${start[1]} Q${midX} ${midY} ${end[0]} ${end[1]}`} markerEnd="url(#route-arrow)" />
                          {route.label && <text x={midX} y={midY - 7}>{route.label}</text>}
                        </g>
                      )
                    })}
                  </g>

                  <g className="city-locations">
                    {visibleLocations.map((location) => {
                      const point = projectLocation(location.coordinates)
                      if (!point) return null
                      return (
                        <CityLocationNode
                          key={location.id}
                          location={location}
                          point={point}
                          selected={selected.id === location.id}
                          onSelect={() => setSelectedId(location.id)}
                        />
                      )
                    })}
                  </g>
                </>
              )}
            </svg>

            <div className="city-map-legend" aria-label="地图图例">
              <span><i className="event-node" />事件节点</span>
              <span><i className="response-node" />响应节点</span>
              <span><i className="trajectory-node" />病例轨迹</span>
            </div>
            <small className="city-map-note">轨迹表示移动历史，不代表有效暴露或感染。演练点位不对应真实地址。</small>
            <small className="map-attribution">地理数据 © OpenStreetMap contributors · Natural Earth</small>
          </div>
        </section>

        <CityLocationDetail location={selected} onEnterScene={onEnterScene} />
      </div>
    </div>
  )
}

function CityLocationNode({ location, point, selected, onSelect }: {
  location: CityLocationView
  point: [number, number]
  selected: boolean
  onSelect: () => void
}) {
  const labelOnLeft = point[0] > 720
  return (
    <g
      className={`city-location category-${location.category} status-${location.status} ${selected ? 'selected' : ''}`}
      transform={`translate(${point[0]} ${point[1]})`}
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
      <circle className="location-pulse" r={location.category === 'trajectory' ? 17 : 23} />
      <circle className="location-core" r={location.category === 'trajectory' ? 8 : 12} />
      <LocationGlyph icon={location.icon} />
      <g className={`location-label ${labelOnLeft ? 'left' : ''}`} transform={labelOnLeft ? 'translate(-16 -18)' : 'translate(16 -18)'}>
        <rect x={labelOnLeft ? -132 : 0} width="132" height="40" rx="4" />
        <text className="location-name" x={labelOnLeft ? -122 : 10} y="16">{location.shortLabel}</text>
        <text className="location-status" x={labelOnLeft ? -122 : 10} y="31">{location.statusLabel}</text>
      </g>
    </g>
  )
}

function LocationGlyph({ icon }: { icon: CityLocationIcon }) {
  if (icon === 'hospital' || icon === 'response') {
    return <path className="location-glyph" d="M-5-1H-1V-5H3V-1H7V3H3V7H-1V3H-5Z" />
  }
  if (icon === 'home') {
    return <path className="location-glyph" d="M-6 0L1-6L8 0V7H3V2H-1V7H-6Z" />
  }
  if (icon === 'airport') {
    return <path className="location-glyph" d="M-7 2L7-4L2 3L6 6L3 7L-1 4L-5 7L-3 3Z" />
  }
  if (icon === 'transport') {
    return <path className="location-glyph" d="M-7-4H5L8 2V6H5A3 3 0 01-1 6H-4A3 3 0 01-10 6V0Z" />
  }
  if (icon === 'laboratory') {
    return <path className="location-glyph" d="M-3-7H4M-1-7V-1L-6 7H9L3-1V-7" />
  }
  return <circle className="location-glyph" r="4" />
}

function CityLocationDetail({ location, onEnterScene }: { location: CityLocationView; onEnterScene: () => void }) {
  const categoryLabel = location.category === 'event' ? '事件节点' : location.category === 'response' ? '响应节点' : '病例轨迹'
  return (
    <aside className={`city-location-detail status-${location.status}`} aria-live="polite">
      <div className="location-detail-heading">
        <span>{location.statusLabel}</span>
        <small>{categoryLabel}</small>
      </div>
      <h2>{location.name}</h2>
      <div className={`coordinate-badge ${location.coordinateKind}`}>{location.coordinateKind === 'real' ? '真实地理位置' : '演练位置'}</div>
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
        <div className="scene-unavailable">当前地点暂无现场场景</div>
      )}
    </aside>
  )
}
