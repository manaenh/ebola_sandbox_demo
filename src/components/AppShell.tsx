import type { ReactNode } from 'react'

export type AppView = 'briefing' | 'command' | 'review'

type AppShellProps = {
  view: AppView
  onViewChange: (view: AppView) => void
  children: ReactNode
}

const navItems: { id: AppView; label: string }[] = [
  { id: 'briefing', label: '背景简报' },
  { id: 'command', label: '联合指挥' },
  { id: 'review', label: '复盘评估' },
]

export function AppShell({
  view,
  onViewChange,
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
            </button>
          ))}
        </nav>

      </header>

      <main>{children}</main>
    </div>
  )
}
