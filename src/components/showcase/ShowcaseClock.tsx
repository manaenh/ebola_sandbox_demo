import { useEffect, useRef, useState } from 'react'

const chinaOffsetMs = 8 * 60 * 60 * 1000

export function formatShowcaseTime(timestamp: number) {
  const time = new Date(timestamp + chinaOffsetMs)
  const two = (value: number) => String(value).padStart(2, '0')
  return `${two(time.getUTCMonth() + 1)}月${two(time.getUTCDate())}日 ${two(time.getUTCHours())}:${two(time.getUTCMinutes())}`
}

export function ShowcaseClock({ targetTime }: { targetTime: string }) {
  const target = Date.parse(targetTime)
  const displayedTime = useRef(target)
  const [label, setLabel] = useState(() => formatShowcaseTime(target))

  useEffect(() => {
    if (!Number.isFinite(target)) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = displayedTime.current
    const duration = reduced ? 0 : Math.abs(target - start) > 24 * 60 * 60 * 1000 ? 2100 : 1250
    if (duration === 0 || start === target) {
      displayedTime.current = target
      setLabel(formatShowcaseTime(target))
      return
    }
    let frame = 0
    const started = performance.now()
    const tick = (now: number) => {
      const fraction = Math.min(1, (now - started) / duration)
      const eased = fraction * fraction * (3 - 2 * fraction)
      displayedTime.current = start + (target - start) * eased
      setLabel(formatShowcaseTime(displayedTime.current))
      if (fraction < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return <div className="showcase-scenario-clock" aria-label={`推演时间 ${label}`}><span>推演时间</span><i /> <time>{label}</time></div>
}
