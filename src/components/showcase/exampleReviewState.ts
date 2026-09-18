import { createInitialState, simulationReducer } from '../../simulation/reducer'
import { crossRegionEntryActions, curatedActions, flightEntryActions, monitoringConsequenceTime, openingConsequenceTime, type ResponseStage } from './sequence'

// A completed example run for visitors who open 复盘中心 before playing Showcase.
// Every state change still passes through the existing reducer.
export function createExampleReviewState() {
  let state = simulationReducer(createInitialState(), { type: 'RESOLVE_DECISION', decision: 'rapid-epidemiology' })
  const firstConsequence = openingConsequenceTime(state)
  if (firstConsequence) state = simulationReducer(state, { type: 'ADVANCE_TIME', simulationTime: firstConsequence })
  for (const stage of ['incident', 'coordination', 'transfer-scene', 'transfer', 'sampling-scene', 'laboratory', 'confirmation'] as ResponseStage[]) {
    state = curatedActions(stage, state).reduce(simulationReducer, state)
  }
  state = flightEntryActions(state).reduce(simulationReducer, state)
  state = simulationReducer(state, { type: 'RESOLVE_DECISION', decision: 'classify-flight-risk' })
  state = crossRegionEntryActions(state).reduce(simulationReducer, state)
  state = simulationReducer(state, { type: 'START_MODULE_4' })
  state = simulationReducer(state, { type: 'RESOLVE_DECISION', decision: 'immediate-monitoring-separation' })
  const monitoringConsequence = monitoringConsequenceTime(state)
  if (monitoringConsequence) state = simulationReducer(state, { type: 'ADVANCE_TIME', simulationTime: monitoringConsequence })
  return simulationReducer(state, { type: 'ADVANCE_EVENT' })
}
