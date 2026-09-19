import { useEffect, useMemo, useRef, useState } from 'react'
import { AttributionControl, Map as MapLibreMap, Marker, type GeoJSONSource } from 'maplibre-gl'
import type { FeatureCollection, GeoJSON, LineString, Point } from 'geojson'
import { createCommandStyle } from '../ShenzhenSituation'
import type { ResponseStage } from './sequence'
import { responseCamera, responsePulseLocation, responseRouteData, scenarioLocations, visibleNodes, type ShowcaseLocationId } from './responseGeography'
import { useShowcasePause } from './ShowcasePause'

export function ResponseMap({ stage, focusAirport = false, crossRegionBeat = false, focusMonitoring = false }: { stage: ResponseStage; focusAirport?: boolean; crossRegionBeat?: boolean; focusMonitoring?: boolean }) {
  const { paused } = useShowcasePause()
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef(new Map<ShowcaseLocationId, Marker>())
  const pulseRef = useRef<Marker | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  useEffect(() => {
    if (paused) mapRef.current?.stop()
  }, [paused])

  useEffect(() => {
    let disposed = false
    const abort = new AbortController()
    const base = import.meta.env.BASE_URL
    const load = async () => {
      try {
        const data = await Promise.all(['pearl-river-delta-land', 'shenzhen-boundary', 'shenzhen-districts'].map(async (name) => {
          const response = await fetch(`${base}maps/${name}.geojson`, { signal: abort.signal })
          if (!response.ok) throw new Error('Map unavailable')
          return response.json() as Promise<GeoJSON>
        }))
        if (disposed || !container.current) return
        const map = new MapLibreMap({ container: container.current, style: createCommandStyle(data[0], data[1], data[2]), ...responseCamera('incident'), interactive: false, attributionControl: false })
        mapRef.current = map
        map.addControl(new AttributionControl({ compact: true }))
        map.once('load', () => {
          if (disposed) return
          map.addSource('showcase-nodes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
          map.addLayer({ id: 'showcase-node-halos', type: 'circle', source: 'showcase-nodes', paint: {
            'circle-radius': ['case', ['==', ['get', 'id'], 'monitoring-site'], 22, 16], 'circle-color': ['case', ['in', ['get', 'id'], ['literal', ['central-hospital', 'airport']]], '#ff5968', '#7ce6e0'],
            'circle-opacity': 0.16, 'circle-blur': 0.65,
          } })
          map.addLayer({ id: 'showcase-node-dots', type: 'circle', source: 'showcase-nodes', paint: {
            'circle-radius': ['case', ['==', ['get', 'id'], 'monitoring-site'], 8, 6], 'circle-color': '#0e3338', 'circle-stroke-width': 2,
            'circle-stroke-color': ['case', ['in', ['get', 'id'], ['literal', ['central-hospital', 'airport']]], '#ff696d', '#85dcd5'],
          } })
          map.setPaintProperty('response-routes', 'line-color', '#49d5ce')
          map.setPaintProperty('patient-transfer-routes', 'line-color', '#d2faff')
          map.setPaintProperty('patient-transfer-routes', 'line-width', 1.8)
          map.setPaintProperty('patient-transfer-routes', 'line-dasharray', [1, 2])
          map.setPaintProperty('specimen-transfer-routes', 'line-color', '#f0ffff')
          map.setPaintProperty('specimen-transfer-routes', 'line-width', 1.7)
          map.setPaintProperty('specimen-transfer-routes', 'line-dasharray', [1, 2])
          setReady(true)
        })
        map.on('error', () => { if (!disposed) setError(true) })
      } catch { if (!disposed) setError(true) }
    }
    void load()
    return () => { disposed = true; abort.abort(); markersRef.current.forEach((marker) => marker.remove()); markersRef.current.clear(); pulseRef.current?.remove(); pulseRef.current = null; mapRef.current?.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const source = map.getSource('simulation-routes') as GeoJSONSource
    const crossRoute: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [{
      type: 'Feature', properties: { id: 'showcase-cross-region', kind: 'response', status: 'active' },
      geometry: { type: 'LineString', coordinates: [scenarioLocations.cdc.coordinates, scenarioLocations['cross-region-target'].coordinates] },
    }] }
    let fadeTimer: number | undefined
    if (focusMonitoring) {
      map.setPaintProperty('response-routes', 'line-opacity-transition', { duration: 550 })
      map.setPaintProperty('response-routes', 'line-opacity', 0)
      fadeTimer = window.setTimeout(() => source.setData({ type: 'FeatureCollection', features: [] }), 600)
    } else {
      map.setPaintProperty('response-routes', 'line-opacity', 0.78)
      source.setData(crossRegionBeat ? crossRoute : responseRouteData(stage))
    }
    const nodeIds: ShowcaseLocationId[] = focusMonitoring ? ['monitoring-site'] : crossRegionBeat ? ['cdc', 'cross-region-target']
      : focusAirport ? [...visibleNodes[stage], 'airport'] : visibleNodes[stage]
    const nodes: FeatureCollection<Point> = { type: 'FeatureCollection', features: nodeIds.map((id) => ({
      type: 'Feature', properties: { id }, geometry: { type: 'Point', coordinates: scenarioLocations[id].coordinates },
    })) }
    ;(map.getSource('showcase-nodes') as GeoJSONSource).setData(nodes)
    pulseRef.current?.remove()
    pulseRef.current = null
    let frame = 0
    const origin = crossRegionBeat ? null : responsePulseLocation(stage, 0)
    if (origin && !reducedMotion) {
      const element = document.createElement('div')
      element.className = 'showcase-route-pulse'
      pulseRef.current = new Marker({ element, anchor: 'center' }).setLngLat(origin).addTo(map)
      const started = performance.now()
      const animatePulse = (now: number) => {
        const progress = Math.min(1, (now - started) / 1900)
        const position = responsePulseLocation(stage, progress)
        if (position) pulseRef.current?.setLngLat(position)
        if (progress < 1) frame = requestAnimationFrame(animatePulse)
        else { pulseRef.current?.remove(); pulseRef.current = null }
      }
      frame = requestAnimationFrame(animatePulse)
    }
    nodeIds.filter((id) => id !== 'airport').forEach((id) => {
      let marker = markersRef.current.get(id)
      if (!marker) {
        const element = document.createElement('div')
        const label = document.createElement('span')
        label.textContent = scenarioLocations[id].label
        element.append(label)
        marker = new Marker({ element, anchor: 'center' }).setLngLat(scenarioLocations[id].coordinates).addTo(map)
        markersRef.current.set(id, marker)
      }
      marker.getElement().className = `showcase-response-label node-${id}`
    })
    markersRef.current.forEach((marker, id) => {
      if (!nodeIds.includes(id)) { marker.remove(); markersRef.current.delete(id) }
    })
    if (focusAirport && !markersRef.current.has('airport')) {
      const element = document.createElement('div')
      element.className = 'showcase-airport-label'
      const label = document.createElement('span')
      label.textContent = scenarioLocations.airport.label
      element.append(label)
      markersRef.current.set('airport', new Marker({ element, anchor: 'center' }).setLngLat(scenarioLocations.airport.coordinates).addTo(map))
    }
    const cdc = scenarioLocations.cdc.coordinates
    const target = scenarioLocations['cross-region-target'].coordinates
    const camera = focusMonitoring ? { center: scenarioLocations['monitoring-site'].coordinates, zoom: 11.3, pitch: 45, bearing: -14 }
      : crossRegionBeat ? { center: [(cdc[0] + target[0]) / 2, (cdc[1] + target[1]) / 2] as [number, number], zoom: 8.7, pitch: 35, bearing: -14 }
      : focusAirport ? { center: scenarioLocations.airport.coordinates, zoom: 11.6, pitch: 48, bearing: -14 } : responseCamera(stage)
    const moveCamera = () => {
      if (reducedMotion) map.jumpTo(camera)
      else map.flyTo({ ...camera, duration: focusAirport ? 2400 : focusMonitoring ? 2100 : crossRegionBeat ? 2100 : 1700, curve: 1.15, essential: true })
    }
    const flightTimer = (focusAirport || focusMonitoring) && !reducedMotion ? window.setTimeout(moveCamera, focusMonitoring ? 350 : 500) : undefined
    if (flightTimer === undefined) moveCamera()
    return () => { cancelAnimationFrame(frame); if (flightTimer !== undefined) window.clearTimeout(flightTimer); if (fadeTimer !== undefined) window.clearTimeout(fadeTimer); pulseRef.current?.remove(); pulseRef.current = null }
  }, [stage, ready, reducedMotion, focusAirport, crossRegionBeat, focusMonitoring])

  return <div className="showcase-response-map" aria-label="深圳病例处置和机构协同地图">
    <div ref={container} className="showcase-response-canvas" />
    {error && <div className="showcase-map-error">地图暂时无法载入</div>}
  </div>
}
