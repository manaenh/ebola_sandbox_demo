import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AttributionControl,
  type ErrorEvent as MapErrorEvent,
  type GeoJSONSource,
  Map as MapLibreMap,
  Marker as MapMarker,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker.js?url'
import type { GeoJSON } from 'geojson'
import { buildRouteGeoJSON, getVisibleMapLocations, locationCamera, regionCamera, shenzhenCamera } from '../city/mapData'
import { getCitySituation } from '../city/selectors'
import type { CityLocationId, CityLocationView } from '../city/types'
import type { SimulationState } from '../simulation/types'

type ShenzhenSituationProps = {
  state: SimulationState
  onEnterScene: () => void
}

const emptyRoutes = { type: 'FeatureCollection' as const, features: [] }

setWorkerUrl(maplibreWorkerUrl)

function createCommandStyle(regionalLand: GeoJSON, boundary: GeoJSON, districts: GeoJSON): StyleSpecification {
  return {
    version: 8,
    name: '深圳应急指挥离线底图',
    sources: {
      'regional-land': {
        type: 'geojson',
        data: regionalLand,
        attribution: 'Natural Earth',
      },
      'shenzhen-boundary': {
        type: 'geojson',
        data: boundary,
        attribution: '© OpenStreetMap contributors',
      },
      'shenzhen-districts': {
        type: 'geojson',
        data: districts,
      },
      'simulation-routes': {
        type: 'geojson',
        data: emptyRoutes,
      },
    },
    layers: [
      {
        id: 'command-background',
        type: 'background',
        paint: { 'background-color': '#051117' },
      },
      {
        id: 'regional-land-fill',
        type: 'fill',
        source: 'regional-land',
        paint: { 'fill-color': '#0a2028', 'fill-opacity': 0.96 },
      },
      {
        id: 'regional-coastline',
        type: 'line',
        source: 'regional-land',
        paint: { 'line-color': '#28515a', 'line-opacity': 0.55, 'line-width': 0.8 },
      },
      {
        id: 'shenzhen-depth',
        type: 'fill-extrusion',
        source: 'shenzhen-districts',
        paint: {
          'fill-extrusion-color': '#123943',
          'fill-extrusion-height': 420,
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.76,
          'fill-extrusion-vertical-gradient': true,
        },
      },
      {
        id: 'shenzhen-district-lines',
        type: 'line',
        source: 'shenzhen-districts',
        paint: { 'line-color': '#4b7a83', 'line-opacity': 0.3, 'line-width': 0.7 },
      },
      {
        id: 'shenzhen-outline',
        type: 'line',
        source: 'shenzhen-boundary',
        paint: { 'line-color': '#58beca', 'line-opacity': 0.72, 'line-width': 1.35 },
      },
      {
        id: 'trajectory-routes',
        type: 'line',
        source: 'simulation-routes',
        filter: ['==', ['get', 'kind'], 'trajectory'],
        paint: {
          'line-color': '#59e1ec',
          'line-opacity': 0.48,
          'line-width': 1.6,
          'line-dasharray': [2, 3],
        },
      },
      {
        id: 'response-routes',
        type: 'line',
        source: 'simulation-routes',
        filter: ['==', ['get', 'kind'], 'response'],
        paint: {
          'line-color': [
            'match', ['get', 'status'],
            'active', '#64e6c3',
            'delayed', '#ff726f',
            '#728c93',
          ],
          'line-opacity': 0.78,
          'line-width': 2.1,
          'line-dasharray': [2, 2],
        },
      },
    ],
  }
}

export function ShenzhenSituation({ state, onEnterScene }: ShenzhenSituationProps) {
  const situation = useMemo(() => getCitySituation(state), [state])
  const [selectedId, setSelectedId] = useState<CityLocationId>('central-hospital')
  const [showTrajectory, setShowTrajectory] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<MapMarker[]>([])
  const selected = situation.locations.find((location) => location.id === selectedId) ?? situation.locations[0]
  const visibleLocations = useMemo(
    () => getVisibleMapLocations(situation, showTrajectory),
    [situation, showTrajectory],
  )

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    let disposed = false
    let map: MapLibreMap | null = null
    let introTimer: number | undefined
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const base = import.meta.env.BASE_URL

    Promise.all([
      fetch(`${base}maps/pearl-river-delta-land.geojson`).then((response) => response.ok ? response.json() as Promise<GeoJSON> : Promise.reject(new Error('regional map unavailable'))),
      fetch(`${base}maps/shenzhen-boundary.geojson`).then((response) => response.ok ? response.json() as Promise<GeoJSON> : Promise.reject(new Error('boundary unavailable'))),
      fetch(`${base}maps/shenzhen-districts.geojson`).then((response) => response.ok ? response.json() as Promise<GeoJSON> : Promise.reject(new Error('districts unavailable'))),
    ]).then(([regionalLand, boundary, districts]) => {
      if (disposed || !mapContainerRef.current) return
      map = new MapLibreMap({
        container: mapContainerRef.current,
        style: createCommandStyle(regionalLand, boundary, districts),
        ...regionCamera,
        minZoom: 7.1,
        maxZoom: 15,
        maxPitch: 68,
        maxBounds: [[112.05, 21.15], [115.95, 24.05]],
        renderWorldCopies: false,
        attributionControl: false,
        canvasContextAttributes: { antialias: true },
      })
      mapRef.current = map
      map.addControl(new NavigationControl({ visualizePitch: true, showCompass: true }), 'bottom-right')
      map.addControl(new AttributionControl({ compact: true }), 'top-right')
      map.once('style.load', () => {
        setMapReady(true)
        introTimer = window.setTimeout(() => {
          if (!map) return
          if (reducedMotion) map.jumpTo(shenzhenCamera)
          else map.flyTo({ ...shenzhenCamera, duration: 1800, curve: 1.25, essential: true })
        }, 450)
      })
      map.on('error', (event: MapErrorEvent) => {
        if (/geojson|source|worker|webgl/i.test(event.error?.message ?? '')) setMapError(true)
      })
    }).catch(() => {
      if (!disposed) setMapError(true)
    })

    return () => {
      disposed = true
      if (introTimer) window.clearTimeout(introTimer)
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      map?.remove()
      if (mapRef.current === map) mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const source = map.getSource('simulation-routes') as GeoJSONSource | undefined
    source?.setData(buildRouteGeoJSON(situation, showTrajectory))
  }, [mapReady, showTrajectory, situation])

  const focusLocation = useCallback((location: CityLocationView) => {
    setSelectedId(location.id)
    mapRef.current?.flyTo({ ...locationCamera(location), duration: 1100, curve: 1.15, essential: true })
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = visibleLocations.map((location) => {
      const element = createLocationMarker(location, selectedId === location.id, () => focusLocation(location))
      return new MapMarker({ element, anchor: 'center' })
        .setLngLat(location.coordinates)
        .addTo(map)
    })
    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
    }
  }, [focusLocation, mapReady, selectedId, visibleLocations])

  const flyToPreset = (preset: typeof regionCamera) => {
    mapRef.current?.flyTo({ ...preset, duration: 1350, curve: 1.2, essential: true })
  }

  const toggleTrajectory = () => {
    const next = !showTrajectory
    setShowTrajectory(next)
    if (!next && !situation.locations.find((item) => item.id === selectedId)?.visibleByDefault) {
      setSelectedId('central-hospital')
    }
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

          <div className="city-map-canvas maplibre-command-map">
            <div ref={mapContainerRef} className="maplibre-stage" aria-label="可缩放、平移和倾斜的深圳应急指挥地图" />
            {!mapReady && !mapError && <div className="map-loading">正在载入本地地理场景…</div>}
            {mapError && <div className="map-loading error">本地地理数据未能载入</div>}
            <div className="camera-presets" aria-label="地图视角">
              <button type="button" onClick={() => flyToPreset(regionCamera)}>区域视角</button>
              <button type="button" onClick={() => flyToPreset(shenzhenCamera)}>深圳视角</button>
            </div>
            <div className="map-coordinate-readout">
              <span>PRD / SHENZHEN</span>
              <b>22.61°N&nbsp;&nbsp;114.06°E</b>
            </div>
            <div className="city-map-legend" aria-label="地图图例">
              <span><i className="event-node" />事件节点</span>
              <span><i className="response-node" />响应节点</span>
              <span><i className="trajectory-node" />病例轨迹</span>
            </div>
            <small className="city-map-note">轨迹表示移动历史，不代表有效暴露或感染。演练点位不对应真实地址。</small>
          </div>
        </section>

        <CityLocationDetail location={selected} onEnterScene={onEnterScene} />
      </div>
    </div>
  )
}

function createLocationMarker(location: CityLocationView, selected: boolean, onSelect: () => void) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `command-map-node category-${location.category} status-${location.status}${selected ? ' selected' : ''}`
  button.setAttribute('aria-label', `${location.name}，${location.statusLabel}`)

  const pulse = document.createElement('span')
  pulse.className = 'map-node-pulse'
  const core = document.createElement('span')
  core.className = `map-node-core icon-${location.icon}`
  const label = document.createElement('span')
  label.className = 'map-node-label'
  const name = document.createElement('strong')
  name.textContent = location.shortLabel
  const status = document.createElement('small')
  status.textContent = location.statusLabel
  label.append(name, status)
  button.append(pulse, core, label)
  button.addEventListener('click', (event) => {
    event.stopPropagation()
    onSelect()
  })
  return button
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
