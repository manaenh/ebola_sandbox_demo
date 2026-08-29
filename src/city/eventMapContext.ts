import type { SimulationState } from '../simulation/types'
import type { EventMapContext } from './types'

export function getEventMapContext(state: SimulationState): EventMapContext {
  const event = state.currentEventId

  if (event.startsWith('M1-')) return {
    key: `${event}:hospital`, focusType: 'location', primaryLocation: 'central-hospital',
    relatedLocations: ['central-hospital'], cameraPreset: 'location-close',
  }

  if (event === 'M2-1') {
    const received = state.module2.transferStatus === 'completed' || state.module2.transferStatus === 'completed-after-wait'
    return received ? {
      key: `${event}:received`, focusType: 'location', primaryLocation: 'designated-hospital',
      relatedLocations: ['designated-hospital'], cameraPreset: 'location-close',
    } : {
      key: `${event}:transfer`, focusType: 'route', primaryLocation: 'central-hospital',
      relatedLocations: ['central-hospital', 'designated-hospital'],
      route: { from: 'central-hospital', to: 'designated-hospital' }, cameraPreset: 'route-local',
    }
  }

  if (event === 'M2-2') return {
    key: `${event}:specimen`, focusType: 'route', primaryLocation: 'designated-hospital',
    relatedLocations: ['designated-hospital', 'laboratory'],
    route: { from: 'designated-hospital', to: 'laboratory' }, cameraPreset: 'route-local',
  }

  if (event === 'M2-3') return {
    key: `${event}:lab-cdc`, focusType: 'multi-location', primaryLocation: 'laboratory',
    relatedLocations: ['laboratory', 'cdc'], cameraPreset: 'response-network',
  }

  if (event === 'M2-4' || (state.module === 2 && state.phase === 'module-complete')) return {
    key: `${event}:city-response`, focusType: 'city-wide',
    relatedLocations: ['designated-hospital', 'laboratory', 'cdc'], cameraPreset: 'city-wide',
  }

  if (event === 'M3-1') return {
    key: `${event}:investigation-clusters`, focusType: 'city-wide',
    relatedLocations: ['home', 'airport', 'central-hospital', 'transport-community-cluster', 'cdc'], cameraPreset: 'city-wide',
  }

  if (event === 'M3-2') {
    if (state.phase === 'resolved') return {
      key: `${event}:review-resolved`, focusType: 'multi-location', primaryLocation: 'airport',
      relatedLocations: ['airport', 'cdc'], cameraPreset: 'response-network',
    }
    return {
      key: `${event}:airport`, focusType: 'location', primaryLocation: 'airport',
      relatedLocations: ['airport'], cameraPreset: 'location-close',
    }
  }

  if (event === 'M3-3' && state.phase !== 'module-complete') return {
    key: `${event}:cross-region:${state.module3.missingTravelerStatus}`,
    focusType: 'cross-region', primaryLocation: 'cross-region-target',
    relatedLocations: ['cdc', 'cross-region-target'],
    route: { from: 'cdc', to: 'cross-region-target' }, cameraPreset: 'cross-region',
  }

  if (event === 'M4-1') {
    const moving = state.phase === 'resolved' || state.module4.transferStatus === 'completed'
    return moving ? {
      key: `${event}:monitoring-transfer:${state.module4.transferStatus}`, focusType: 'route', primaryLocation: 'monitoring-site',
      relatedLocations: ['monitoring-site', 'designated-hospital'], route: { from: 'monitoring-site', to: 'designated-hospital' }, cameraPreset: 'route-local',
    } : {
      key: `${event}:monitoring-alert`, focusType: 'location', primaryLocation: 'monitoring-site', relatedLocations: ['monitoring-site'], cameraPreset: 'location-close',
    }
  }
  if (event === 'M4-2') return {
    key: `${event}:secondary-case`, focusType: 'multi-location', primaryLocation: 'designated-hospital',
    relatedLocations: ['monitoring-site', 'designated-hospital', 'laboratory', 'cdc'], cameraPreset: 'response-network',
  }
  if (event === 'M4-3' && state.phase !== 'module-complete') return {
    key: `${event}:child-care`, focusType: 'location', primaryLocation: 'child-care-support', relatedLocations: ['child-care-support'], cameraPreset: 'location-close',
  }
  if (state.module === 4 && state.phase === 'module-complete') return {
    key: 'm4:city-response', focusType: 'city-wide', relatedLocations: ['monitoring-site', 'designated-hospital', 'cdc', 'child-care-support'], cameraPreset: 'city-wide',
  }

  return {
    key: `${event}:monitoring`, focusType: 'city-wide',
    relatedLocations: ['home', 'airport', 'central-hospital', 'transport-community-cluster', 'cdc'], cameraPreset: 'city-wide',
  }
}
