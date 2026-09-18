import { useEffect, useRef, useState } from 'react'
import { AttributionControl, Map as MapLibreMap, Marker, type GeoJSONSource } from 'maplibre-gl'
import type { FeatureCollection, GeoJSON, Point } from 'geojson'
import { createCommandStyle } from '../ShenzhenSituation'
import { scenarioLocations, type ShowcaseLocationId } from './responseGeography'
import { reviewRouteData, type ReviewBeat } from './reviewData'

export function ReviewMap({ beat }: { beat: ReviewBeat }) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markers = useRef<Marker[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const abort = new AbortController()
    let disposed = false
    const load = async () => {
      try {
        const data = await Promise.all(['pearl-river-delta-land', 'shenzhen-boundary', 'shenzhen-districts'].map(async (name) => {
          const response = await fetch(`${import.meta.env.BASE_URL}maps/${name}.geojson`, { signal: abort.signal })
          if (!response.ok) throw new Error('Map unavailable')
          return response.json() as Promise<GeoJSON>
        }))
        if (disposed || !container.current) return
        const map = new MapLibreMap({ container: container.current, style: createCommandStyle(data[0], data[1], data[2]), center: [114.08, 22.62], zoom: 9.8, pitch: 28, bearing: -10, interactive: false, attributionControl: false })
        mapRef.current = map
        map.addControl(new AttributionControl({ compact: true }))
        map.once('load', () => {
          if (disposed) return
          map.addSource('review-nodes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
          map.addLayer({ id: 'review-node-halo', type: 'circle', source: 'review-nodes', paint: {
            'circle-radius': ['case', ['==', ['get', 'active'], true], 23, 11],
            'circle-color': ['case', ['==', ['get', 'tone'], 'adverse'], '#ffb47b', '#75e8dc'],
            'circle-opacity': ['case', ['==', ['get', 'active'], true], 0.42, 0.12], 'circle-blur': 0.7,
          } })
          map.addLayer({ id: 'review-node-dot', type: 'circle', source: 'review-nodes', paint: {
            'circle-radius': ['case', ['==', ['get', 'active'], true], 6, 4], 'circle-color': '#102d37',
            'circle-stroke-width': 2, 'circle-stroke-color': ['case', ['==', ['get', 'tone'], 'adverse'], '#ffb47b', '#8ce9e0'],
          } })
          map.setPaintProperty('response-routes', 'line-color', '#55d7cf')
          map.setPaintProperty('response-routes', 'line-opacity', 0.9)
          map.setPaintProperty('patient-transfer-routes', 'line-color', '#c7f4f7')
          map.setPaintProperty('patient-transfer-routes', 'line-dasharray', [1, 2])
          map.setPaintProperty('specimen-transfer-routes', 'line-color', '#ebfcff')
          map.setPaintProperty('specimen-transfer-routes', 'line-dasharray', [1, 2])
          setReady(true)
        })
        map.on('error', () => { if (!disposed) setError(true) })
      } catch { if (!disposed) setError(true) }
    }
    void load()
    return () => { disposed = true; abort.abort(); markers.current.forEach((marker) => marker.remove()); markers.current = []; mapRef.current?.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    ;(map.getSource('simulation-routes') as GeoJSONSource).setData(reviewRouteData(beat))
    const active = new Set(beat.focus)
    const points: FeatureCollection<Point> = { type: 'FeatureCollection', features: beat.nodes.map((id) => ({
      type: 'Feature', properties: { id, active: active.has(id), tone: beat.tone }, geometry: { type: 'Point', coordinates: scenarioLocations[id].coordinates },
    })) }
    ;(map.getSource('review-nodes') as GeoJSONSource).setData(points)
    markers.current.forEach((marker) => marker.remove())
    markers.current = beat.nodes.map((id: ShowcaseLocationId) => {
      const element = document.createElement('span')
      element.className = `showcase-review-map-label${active.has(id) ? ' active' : ''}`
      element.textContent = scenarioLocations[id].label
      return new Marker({ element, anchor: 'left', offset: [11, 0] }).setLngLat(scenarioLocations[id].coordinates).addTo(map)
    })
    const coordinates = beat.focus.map((id) => scenarioLocations[id].coordinates)
    const xs = coordinates.map((point) => point[0]); const ys = coordinates.map((point) => point[1])
    const bounds: [[number, number], [number, number]] = [[Math.min(...xs) - 0.035, Math.min(...ys) - 0.035], [Math.max(...xs) + 0.035, Math.max(...ys) + 0.035]]
    map.fitBounds(bounds, { padding: { top: 85, bottom: 85, left: 90, right: 125 }, maxZoom: 11.5, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1100, pitch: 28, bearing: -10, essential: true })
  }, [beat, ready])

  return <div className="showcase-review-map" aria-label="深圳事件地图回放">
    <div ref={container} className="showcase-review-map-canvas" />
    {error && <p className="showcase-map-error">地图暂时无法载入</p>}
  </div>
}
