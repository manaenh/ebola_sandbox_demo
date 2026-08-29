import { hotspotCopy } from '../simulation/sourceData'
import type { HotspotId } from '../simulation/types'

export function SceneInfoCard({ hotspot, onClose }: { hotspot: HotspotId | null; onClose: () => void }) {
  if (!hotspot) return null
  const copy = hotspotCopy[hotspot]
  return (
    <aside className="scene-context-card" aria-live="polite">
      <button type="button" onClick={onClose} aria-label="关闭场景信息">×</button>
      <small>{copy.eyebrow}</small>
      <strong>{copy.title}</strong>
      <p>{copy.body}</p>
    </aside>
  )
}
