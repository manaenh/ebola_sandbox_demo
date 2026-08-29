import type { ContactMonitoring } from './types'

const DAY_MS = 24 * 60 * 60 * 1000
const MONITORING_DAYS = 21

export function createContactMonitoring(
  contactId: string,
  lastExposureAt: string | null,
  asOf: string,
): ContactMonitoring {
  if (!lastExposureAt) return {
    contactId,
    lastExposureAt: null,
    monitoringStartAt: null,
    monitoringEndAt: null,
    currentMonitoringDay: null,
    monitoringStatus: 'not-started',
    symptomaticAlert: false,
  }

  const exposureTime = new Date(lastExposureAt).getTime()
  const asOfTime = new Date(asOf).getTime()
  const monitoringEndTime = exposureTime + MONITORING_DAYS * DAY_MS
  const elapsedDays = Math.floor(Math.max(0, asOfTime - exposureTime) / DAY_MS)
  const completed = asOfTime >= monitoringEndTime

  return {
    contactId,
    lastExposureAt,
    monitoringStartAt: lastExposureAt,
    monitoringEndAt: new Date(monitoringEndTime).toISOString(),
    currentMonitoringDay: completed ? MONITORING_DAYS : Math.min(MONITORING_DAYS, elapsedDays + 1),
    monitoringStatus: completed ? 'completed' : 'active',
    symptomaticAlert: false,
  }
}
