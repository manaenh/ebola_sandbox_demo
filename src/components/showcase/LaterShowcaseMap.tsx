import { useEffect, useRef, useState } from 'react'
import { AttributionControl, Map as MapLibreMap, Marker, type GeoJSONSource } from 'maplibre-gl'
import type { FeatureCollection, GeoJSON, LineString } from 'geojson'
import { createCommandStyle } from '../ShenzhenSituation'
import { scenarioLocations } from './responseGeography'
import { useShowcasePause } from './ShowcasePause'

export type LaterMapMoment = 'coordination' | 'rumor' | 'monitoring' | 'final'
export type LaterChoice = 'A' | 'B' | null

const EMPTY: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [] }
const regionalCenter: [number, number] = [114.4, 22.89]
const cityCenter: [number, number] = [114.08, 22.59]

export function LaterShowcaseMap({ moment, choice, active }: { moment: LaterMapMoment; choice: LaterChoice; active: boolean }) {
  const { paused } = useShowcasePause()
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const routeFrame = useRef(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (paused) {
      mapRef.current?.stop()
      cancelAnimationFrame(routeFrame.current)
    }
  }, [paused])
  const [warningShown, setWarningShown] = useState(false)

  useEffect(() => {
    if (moment !== 'coordination' || choice !== 'B' || !active) return
    const timer = window.setTimeout(() => setWarningShown(true), 1400)
    return () => window.clearTimeout(timer)
  }, [moment, choice, active])

  useEffect(() => {
    let disposed = false
    const abort = new AbortController()
    const load = async () => {
      try {
        const geo = await Promise.all(['pearl-river-delta-land', 'shenzhen-boundary', 'shenzhen-districts'].map(async name => {
          const response = await fetch(`${import.meta.env.BASE_URL}maps/${name}.geojson`, { signal: abort.signal })
          if (!response.ok) throw new Error('Map unavailable')
          return response.json() as Promise<GeoJSON>
        }))
        if (disposed || !container.current) return
        const map = new MapLibreMap({ container: container.current, style: createCommandStyle(geo[0], geo[1], geo[2]), center: regionalCenter, zoom: 8.6, pitch: 25, bearing: -8, interactive: false, attributionControl: false })
        mapRef.current = map
        map.addControl(new AttributionControl({ compact: true }))
        map.once('load', () => {
          if (disposed) return
          map.addSource('later-coordination', { type: 'geojson', data: EMPTY })
          map.addLayer({ id: 'later-coordination-line', type: 'line', source: 'later-coordination', paint: {
            'line-color': '#65e4d7', 'line-width': 2.5, 'line-opacity': 0.9, 'line-dasharray': [1.5, 1.5],
          } })
          setReady(true)
        })
        map.on('error', () => { if (!disposed) setError(true) })
      } catch { if (!disposed) setError(true) }
    }
    void load()
    return () => { disposed = true; abort.abort(); cancelAnimationFrame(routeFrame.current); markersRef.current.forEach(marker => marker.remove()); markersRef.current = []; mapRef.current?.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const regional = moment === 'coordination'
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const camera = regional ? { center: regionalCenter, zoom: 8.6, pitch: 25, bearing: -8 } : { center: cityCenter, zoom: 10.15, pitch: 30, bearing: -8 }
    if (reduced) map.jumpTo(camera)
    else map.flyTo({ ...camera, duration: 2100, curve: 1.1, essential: true })
    const source = map.getSource('later-coordination') as GeoJSONSource
    // This link is institutional coordination, never a transmission or patient path.
    cancelAnimationFrame(routeFrame.current)
    if (regional && choice === 'A' && active) {
      const from = scenarioLocations.cdc.coordinates
      const to = scenarioLocations['neighbor-city'].coordinates
      const started = performance.now()
      const draw = (now: number) => {
        const progress = reduced ? 1 : Math.min(1, (now - started) / 2300)
        const endpoint: [number, number] = [from[0] + (to[0] - from[0]) * progress, from[1] + (to[1] - from[1]) * progress]
        const link: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [{
          type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [from, endpoint] },
        }] }
        source.setData(link)
        if (progress < 1) routeFrame.current = requestAnimationFrame(draw)
      }
      routeFrame.current = requestAnimationFrame(draw)
    } else source.setData(EMPTY)
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []
    const addMarker = (coordinates: [number, number], label: string, className: string) => {
      const element = document.createElement('div')
      element.className = `showcase-later-node ${className}`
      const dot = document.createElement('i')
      const text = document.createElement('span')
      text.textContent = label
      element.append(dot, text)
      markersRef.current.push(new Marker({ element, anchor: 'center' }).setLngLat(coordinates).addTo(map))
    }
    if (regional) {
      addMarker(scenarioLocations.cdc.coordinates, '深圳 · 疾控中心', `city ${active && choice === 'A' ? 'synchronized' : ''} ${warningShown && choice === 'B' ? 'warning' : ''}`)
      addMarker(scenarioLocations['neighbor-city'].coordinates, '邻市协同点', `neighbor ${active && choice === 'A' ? 'synchronized' : ''} ${warningShown && choice === 'B' ? 'warning' : ''}`)
    } else {
      const responding = (moment === 'rumor' && choice === 'A' && active) || moment === 'monitoring' || moment === 'final'
      addMarker(scenarioLocations.health.coordinates, '卫健委', responding ? 'synchronized' : '')
      addMarker(scenarioLocations.cdc.coordinates, '疾控中心', responding ? 'synchronized' : '')
    }
    if (moment === 'rumor') {
      // Amber waves depict information circulation only. They do not mark cases or infections.
      const waveCoordinates = [scenarioLocations.airport.coordinates, scenarioLocations.home.coordinates, scenarioLocations['designated-hospital'].coordinates]
      waveCoordinates.forEach((coordinates, index) => {
        const element = document.createElement('div')
        element.className = `showcase-info-wave ${choice === 'A' && active ? 'receding' : ''}`
        element.style.animationDelay = `${index * 0.38}s`
        markersRef.current.push(new Marker({ element, anchor: 'center' }).setLngLat(coordinates).addTo(map))
      })
    }
    return () => cancelAnimationFrame(routeFrame.current)
  }, [moment, choice, active, ready, warningShown])

  return <div className="showcase-later-map" aria-label={moment === 'coordination' ? '深圳与邻市协同地图' : '深圳信息响应地图'}>
    <div ref={container} className="showcase-later-map-canvas" />
    {error && <div className="showcase-map-error">地图暂时无法载入</div>}
  </div>
}
