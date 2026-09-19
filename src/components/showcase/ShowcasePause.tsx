import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

type TimerEntry = {
  callback: () => void
  remaining: number
  startedAt: number
  nativeId: number | null
}

type PauseContextValue = {
  paused: boolean
  togglePaused: () => void
  setPausableTimeout: (callback: () => void, delay: number) => number
  clearPausableTimeout: (id: number) => void
}

const PauseContext = createContext<PauseContextValue | null>(null)

export function ShowcasePauseProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const timers = useRef(new Map<number, TimerEntry>())
  const nextId = useRef(1)

  const startTimer = useCallback((id: number, entry: TimerEntry) => {
    entry.startedAt = performance.now()
    entry.nativeId = window.setTimeout(() => {
      timers.current.delete(id)
      entry.callback()
    }, entry.remaining)
  }, [])

  const setPausableTimeout = useCallback((callback: () => void, delay: number) => {
    const id = nextId.current++
    const entry: TimerEntry = { callback, remaining: Math.max(0, delay), startedAt: 0, nativeId: null }
    timers.current.set(id, entry)
    if (!pausedRef.current) startTimer(id, entry)
    return id
  }, [startTimer])

  const clearPausableTimeout = useCallback((id: number) => {
    const entry = timers.current.get(id)
    if (entry && entry.nativeId !== null) window.clearTimeout(entry.nativeId)
    timers.current.delete(id)
  }, [])

  const togglePaused = useCallback(() => {
    const next = !pausedRef.current
    pausedRef.current = next
    setPaused(next)
    const now = performance.now()
    timers.current.forEach((entry, id) => {
      if (next) {
        if (entry.nativeId !== null) window.clearTimeout(entry.nativeId)
        entry.remaining = Math.max(0, entry.remaining - (now - entry.startedAt))
        entry.nativeId = null
      } else {
        startTimer(id, entry)
      }
    })
  }, [startTimer])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || target?.matches('input, textarea, select')) return
      event.preventDefault()
      togglePaused()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePaused])

  useEffect(() => () => {
    timers.current.forEach((entry) => { if (entry.nativeId !== null) window.clearTimeout(entry.nativeId) })
    timers.current.clear()
  }, [])

  const value = useMemo(() => ({ paused, togglePaused, setPausableTimeout, clearPausableTimeout }), [paused, togglePaused, setPausableTimeout, clearPausableTimeout])
  return <PauseContext.Provider value={value}>{children}</PauseContext.Provider>
}

export function useShowcasePause() {
  const value = useContext(PauseContext)
  if (!value) throw new Error('useShowcasePause must be used inside ShowcasePauseProvider')
  return value
}
