import { describe, expect, it } from 'vitest'
import { createContactMonitoring } from './monitoring'

describe('individual contact monitoring', () => {
  it('does not start a global clock when a contact has no last-exposure timestamp', () => {
    const record = createContactMonitoring('contact-a', null, '2026-08-10T10:00:00+08:00')
    expect(record.currentMonitoringDay).toBeNull()
    expect(record.monitoringStatus).toBe('not-started')
  })

  it('calculates monitoring days independently for different last-exposure times', () => {
    const asOf = '2026-08-10T10:00:00+08:00'
    const earlier = createContactMonitoring('contact-a', '2026-08-05T10:00:00+08:00', asOf)
    const later = createContactMonitoring('contact-b', '2026-08-08T10:00:00+08:00', asOf)
    expect(earlier.currentMonitoringDay).toBe(6)
    expect(later.currentMonitoringDay).toBe(3)
    expect(earlier.monitoringEndAt).not.toBe(later.monitoringEndAt)
  })
})
