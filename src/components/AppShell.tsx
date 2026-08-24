import type { ReactNode } from 'react'

export type AppView = 'briefing' | 'command' | 'review'

type AppShellProps = {
  view: AppView
  onViewChange: (view: AppView) => void
  simulationTime: string
  onReset: () => void
  children: ReactNode
}

const navItems: { id: AppView; label: string; english: string }[] = [
  { id: 'briefing', label: '背景简报', english: 'BRIEFING' },
  { id: 'command', label: '联合指挥', english: 'COMMAND' },
  { id: 'review', label: '复盘评估', english: 'AFTER ACTION' },
]

function formatSimulationTime(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  }).format(date)
}

export function AppShell({
  view,
  onViewChange,
  simulationTime,
  onReset,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <div className="brand-title">埃博拉疫情应急推演</div>
            <div className="brand-subtitle">EVD RESPONSE DIGITAL TWIN</div>
          </div>
        </div>

        <nav className="primary-nav" aria-label="主导航">
          {navItems.map((item) => (
            <button
              className={view === item.id ? 'nav-item active' : 'nav-item'}
              key={item.id}
              onClick={() => onViewChange(item.id)}
              type="button"
            >
              <span>{item.label}</span>
              <small>{item.english}</small>
            </button>
          ))}
        </nav>

        <div className="topbar-status">
          <div className="sim-badge">
            <span className="pulse-dot" />
            情景推演 · 模拟场景
          </div>
          <div className="clock-block">
            <small>SIMULATION TIME</small>
            <strong>{formatSimulationTime(simulationTime)}</strong>
          </div>
          <button className="icon-button" type="button" onClick={onReset} title="重置 M1-1">
            ↻
            <span className="sr-only">重置 M1-1</span>
          </button>
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}
