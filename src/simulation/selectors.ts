import { getEventDefinition } from './sourceData'
import type { SimulationState } from './types'

export function getCurrentEventDescription(state: SimulationState): string {
  if (state.currentEventId === 'M1-2') {
    return state.scene.patientLocation === 'isolation'
      ? '周启航已经完成隔离，但因担心强制措施和家属情况，拒绝采血，并要求先联系妻子。'
      : '周启航仍在急诊区域等待进一步处置，对采样和升级隔离产生抵触，并要求先见妻子。'
  }

  if (state.currentEventId === 'M1-3') {
    const isolated = state.scene.patientLocation === 'isolation'
    const cooperative = state.module1.patientCooperative === true
    if (isolated && cooperative) {
      return '患者已完成隔离并开始配合采样，但感染科认为当前临床表现“不典型”。是否在首轮检验结果尚未明确前启动快报？'
    }
    if (isolated) {
      return '患者已完成隔离，但相关短视频已经上传。感染科认为症状“不典型”，急诊需要决定是否立即启动外部报告。'
    }
    if (cooperative) {
      return '患者已愿意配合后续处置，但目前仍未完成隔离。感染科建议等待常规检查，急诊是否先行快报？'
    }
    return '患者仍未完成隔离，且相关短视频已经上传。感染科仍认为症状“不典型”，是否立即启动卫健和疾控响应？'
  }

  return getEventDefinition(state.currentEventId).description
}

export type CompletionSummary = {
  facts: Array<{ label: string; value: string }>
  situation: string
}

export function getModule1CompletionSummary(state: SimulationState): CompletionSummary {
  const m = state.module1
  const facts: CompletionSummary['facts'] = [
    { label: '隔离完成', value: m.isolationCompletedAt ?? '待完成' },
    { label: '候诊暴露', value: m.exposureDurationMinutes === null ? '待核定' : `${m.exposureDurationMinutes} 分钟` },
  ]
  if (m.additionalAssessmentRequired > 0) {
    facts.push({ label: '新增需评估', value: `${m.additionalAssessmentRequired} 人` })
  }
  facts.push(
    { label: '患者沟通', value: m.patientCooperative ? '配合稳定' : '沟通受阻' },
    { label: '舆情信号', value: m.earlyPublicOpinionRisk ? '已出现' : '未触发' },
    { label: '疾控响应', value: m.reportWithin15Minutes ? '及时启动' : '延迟 2 小时 10 分钟' },
  )

  if (m.downstreamResponsePressure === 'controlled') {
    return { facts, situation: '病例已较早完成隔离，患者配合稳定，外部响应及时启动。院内暴露范围得到初步控制。' }
  }
  if (m.downstreamResponsePressure === 'high') {
    return { facts, situation: '院内暴露范围扩大，同时外部响应延迟。后续接触者调查将面对更大的评估规模和更晚的启动时间。' }
  }
  if (m.exposureControlQuality === 'compromised' && m.cooperationQuality === 'stable') {
    return { facts, situation: '早期暴露范围已经扩大，但患者沟通取得进展，后续采样和暴露史补充具备较好基础。' }
  }
  if (m.exposureControlQuality === 'good' && m.cooperationQuality === 'strained') {
    return { facts, situation: '院内暴露得到较早控制，但患者沟通与舆情信号增加了后续协调压力。' }
  }
  if (m.responseSpeed === 'delayed') {
    return { facts, situation: '院内处置状态已经保存，但外部响应延迟将传递到后续调查与资源协调。' }
  }
  return { facts, situation: '当前路径已形成可供后续转运、实验室处置和接触者调查使用的首诊状态。' }
}
