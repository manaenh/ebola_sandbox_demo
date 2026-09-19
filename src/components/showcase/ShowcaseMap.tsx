import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker, AttributionControl, type GeoJSONSource } from 'maplibre-gl'
import type { GeoJSON, FeatureCollection, LineString } from 'geojson'
import { createCommandStyle } from '../ShenzhenSituation'
import { cityLocationCatalog } from '../../city/sourceData'
import { buildRouteGeoJSON, locationCamera, shenzhenCamera } from '../../city/mapData'
import type { CityLocationView } from '../../city/types'
import { openingStops } from './sequence'
import { scenarioLocations } from './responseGeography'
import { showcaseTiming } from './timing'

const locations: CityLocationView[] = openingStops.map((id) => ({
  ...cityLocationCatalog.find((location) => location.id === id)!,
  coordinates: scenarioLocations[id].coordinates,
  visibleByDefault: true, status: 'passed', statusLabel: '', detail: '', facts: [],
}))
const trajectory = buildRouteGeoJSON({ locations, signals: [], summary: '', routes: locations.slice(1).map((location, index) => ({
  id: `showcase-${index}`, from: locations[index].id, to: location.id, kind: 'trajectory', status: 'completed',
})) }, true)

export function ShowcaseMap({ onComplete }: { onComplete: () => void }) {
  const container = useRef<HTMLDivElement>(null)
  const complete = useRef(onComplete)
  complete.current = onComplete
  const [step, setStep] = useState(-1)
  const [error, setError] = useState(false)

  useEffect(() => {
    let disposed = false
    let map: MapLibreMap | undefined
    let frame = 0
    const markers: Marker[] = []
    const abort = new AbortController()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const base = import.meta.env.BASE_URL
    const load = async () => {
      try {
        const data = await Promise.all(['pearl-river-delta-land', 'shenzhen-boundary', 'shenzhen-districts'].map(async (name) => {
          const response = await fetch(`${base}maps/${name}.geojson`, { signal: abort.signal })
          if (!response.ok) throw new Error('Map unavailable')
          return response.json() as Promise<GeoJSON>
        }))
        if (disposed || !container.current) return
        map = new MapLibreMap({ container: container.current, style: createCommandStyle(data[0], data[1], data[2]), ...shenzhenCamera, interactive: false, attributionControl: false })
        map.addControl(new AttributionControl({ compact: true }))
        map.on('error', () => { if (!disposed) setError(true) })
        map.once('load', () => {
          if (disposed || !map) return
          const activeMap = map
          let lastStep = -1
          let flying = false
          const start = performance.now()
          const animate = (now: number) => {
            if (disposed) return
            const elapsed = now - start
            const progress = Math.max(0, Math.min(4, (elapsed - 1_200) / 900))
            const nextStep = elapsed < 600 ? -1 : Math.floor(progress)
            if (nextStep !== lastStep) {
              setStep(nextStep)
              for (let index = lastStep + 1; index <= nextStep; index++) {
                const location = locations[index]
                const element = document.createElement('div')
                element.className = `showcase-marker ${index === 0 ? 'entry-alert' : ''}`
                const pulse = document.createElement('i')
                pulse.className = 'showcase-pulse'
                const label = document.createElement('span')
                label.textContent = scenarioLocations[openingStops[index]].label
                element.append(pulse, label)
                if (index === 0) {
                  for (let ring = 1; ring <= 2; ring++) {
                    const echo = document.createElement('i')
                    echo.className = `showcase-pulse alert-echo-${ring}`
                    element.append(echo)
                  }
                }
                markers.push(new Marker({ element }).setLngLat(location.coordinates).addTo(activeMap))
              }
              lastStep = nextStep
            }
            const features = trajectory.features.flatMap((feature, index) => {
              const fraction = Math.min(1, Math.max(0, progress - index))
              if (!fraction) return []
              const points = feature.geometry.coordinates
              const count = reduced ? points.length : Math.max(2, Math.ceil(fraction * points.length))
              return [{ ...feature, geometry: { ...feature.geometry, coordinates: points.slice(0, count) } }]
            })
            const routes: FeatureCollection<LineString> = { type: 'FeatureCollection', features }
            ;(activeMap.getSource('simulation-routes') as GeoJSONSource).setData(routes)
            if (elapsed >= showcaseTiming.openingRouteComplete - showcaseTiming.openingHospitalFlight && !flying) {
              flying = true
              const camera = locationCamera(locations[4])
              if (reduced) activeMap.jumpTo(camera)
              else activeMap.flyTo({ ...camera, duration: showcaseTiming.openingHospitalFlight, curve: 1.15, essential: true })
            }
            if (elapsed >= showcaseTiming.openingRouteComplete) { complete.current(); return }
            frame = requestAnimationFrame(animate)
          }
          frame = requestAnimationFrame(animate)
        })
      } catch {
        if (!disposed) setError(true)
      }
    }
    void load()
    return () => { disposed = true; abort.abort(); cancelAnimationFrame(frame); markers.forEach((marker) => marker.remove()); map?.remove() }
  }, [])

  return <section className="showcase-map" aria-label="病例进入深圳的移动轨迹">
    <div ref={container} className="showcase-map-canvas" />
    <div className="showcase-map-caption" aria-live="polite">
      {(error || step >= 0) && <h1>{error ? '地图暂时无法载入' : '疑似输入病例进入深圳'}</h1>}
    </div>
    <footer><button onClick={() => complete.current()}>{error ? '进入医院场景' : '跳过开场 →'}</button></footer>
  </section>
}
