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
    const communicating = state.module1.communicationStatus === 'in-progress'
    const cooperative = state.module1.patientCooperative === true
    if (isolated && communicating) {
      return '患者已完成隔离，医护正在进行风险沟通和采样准备。感染科认为症状“不典型”，是否在首轮检查结果明确前先行快报？'
    }
    if (!isolated && communicating) {
      return '患者仍未完成隔离，医护正在争取其配合后续处置。感染科建议等待常规检查，急诊是否立即快报？'
    }
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

  if (state.currentEventId === 'M2-1') {
    const pressure = state.module1.downstreamResponsePressure
    const inherited = pressure === 'high'
      ? '首诊阶段已形成较高评估与协调压力。'
      : pressure === 'elevated' ? '首诊阶段仍有未完全消化的协调压力。' : ''
    return `定点医院可接收，但常备专用转运车辆预计约 70 分钟后返回。${inherited}需要确定本次医疗转运方案。`
  }

  if (state.currentEventId === 'M2-2') {
    const transfer = state.module2.additionalVomitingCleanupEvents === 2
      ? '患者在等待转运期间增加了两次呕吐处置，现场工作负荷仍较高。'
      : '患者已经完成转运交接。'
    return `${transfer}临床希望同时开展多项检测，但采样管数、包装和运输交接尚未形成一致方案。`
  }

  if (state.currentEventId === 'M2-3') {
    const lab = state.module2.laboratoryDelayMinutes === 240
      ? '此前标本处置使实验室流程累计延迟 4 小时。'
      : '标本按规范路径进入实验室。'
    return `${lab}当前 EBOV 核酸初筛阳性，疟原虫检测阴性；是否立即全面启动追踪，或先开展基础名单核查？`
  }

  if (state.currentEventId === 'M2-4') {
    return '复核实验室报告 EBOV 核酸阳性，Ct 22.6，样本符合质量要求。病例状态与联合响应机制现已更新。'
  }

  if (state.currentEventId === 'M3-1') {
    const inherited = state.module3.initialHighRiskLocateRate === 0.92
      ? '首批高风险接触者找到率为 92%，高风险查找的未解决工作量相对较低。'
      : '首批高风险接触者找到率为 61%，高风险查找仍面临较高紧迫性。'
    return `${inherited}首轮汇总 126 人需要调查，其中家庭 2 人、同行 2 人、航班 39 人、医院 24 人、交通与社区 59 人。需调查人员尚未等同于密切接触者。`
  }

  if (state.currentEventId === 'M3-2') {
    return '媒体称“全航班 298 人都是密接”。调查组需要结合症状时间、座位位置、服务行为和体液暴露完成风险分类。'
  }

  if (state.currentEventId === 'M3-3') {
    return '一名同行人员手机关机、登记地址无人，信息提示其可能已经跨区域活动；具体目的地尚未核实。是否立即发送最小必要协查信息？'
  }

  if (state.currentEventId === 'M4-1') {
    return '沈洁在个人健康监测中出现 38.1℃、乏力和恶心，距最后接触 7 天。需要决定是否立即分开并同步启动医疗转运。'
  }
  if (state.currentEventId === 'M4-2') {
    return `沈洁 EBOV 核酸阳性，Ct 27.9，序列与周启航高度一致。当前确诊病例更新为 2 例，高风险接触者为 ${state.module4.totalHighRiskContacts} 人。`
  }
  if (state.currentEventId === 'M4-3') {
    return '沈洁 8 岁女儿核酸阴性且无症状，但当前无监护人。需要在持续健康监测、儿童保护与家庭照护之间形成稳定安排。'
  }

  return getEventDefinition(state.currentEventId).description
}

export function getModule2CompletionSummary(state: SimulationState): CompletionSummary {
  const m = state.module2
  const facts: CompletionSummary['facts'] = [
    { label: '转运结果', value: m.transferCompletedAt === '13:10' ? '13:10 完成接收' : '等待常备车辆后完成' },
    { label: '额外污染处置', value: m.additionalVomitingCleanupEvents > 0 ? `${m.additionalVomitingCleanupEvents} 次` : '未增加' },
    { label: '标本流程', value: m.outerPackagingContamination ? '外包装污染调查' : '规范交接' },
    { label: '实验室延迟', value: m.laboratoryDelayMinutes > 0 ? '4 小时' : '未增加' },
    { label: '18:00 查找进展', value: m.highRiskContactFindingProgress === null ? '待更新' : `${m.highRiskContactFindingProgress}%` },
    { label: '病例状态', value: m.confirmed ? '已确诊 · 1 例' : '高度疑似' },
  ]

  const situation = m.overallResponseWorkload === 'severe' || m.overallResponseWorkload === 'high'
    ? '患者已经完成确证，但早期暴露、转运或实验室延迟形成叠加压力。后续接触者追踪需要在更高工作负荷下推进。'
    : m.overallResponseWorkload === 'elevated'
      ? '确证与联合响应已经启动，部分前序延迟或处置负荷仍需在后续追踪阶段持续消化。'
      : '转运、标本交接和初筛升级衔接稳定，确证后联合响应网络已经启动。'

  return { facts, situation }
}

export function getModule3CompletionSummary(state: SimulationState): CompletionSummary {
  const m = state.module3
  const facts: CompletionSummary['facts'] = [
    { label: '首轮需调查', value: '126 人' },
    { label: '航班分类', value: '高 7 · 中 18 · 低观察 39' },
    { label: '高风险失访目标', value: `${m.highRiskLostToFollowUpTarget} 人` },
    { label: '失联人员', value: m.resolutionDelay === 'within-6h' ? '6 小时内找到' : '24 小时后找到' },
    { label: '跨区域协查', value: m.crossRegionCoordinationStatus === 'closed-loop' ? '已闭环' : '进行中' },
    { label: '有效传播事件', value: m.effectiveExposureEvent ? '已形成' : '未形成' },
    { label: '健康监测', value: m.monitoringPhase === 'active' ? '已进入 21 天健康监测阶段' : '尚未启动' },
  ]
  const situation = m.dinnerAttendees === 12
    ? '接触者调查与风险分类体系已经建立。失联人员曾在无症状期参加 12 人聚餐，未形成有效传播事件，相关人员仅需风险沟通；当前进入持续健康监测。'
    : '接触者调查与风险分类体系已经建立，跨区域协查未发现新的有效暴露事件；当前进入持续健康监测。'
  return { facts, situation }
}

export function getModule4CompletionSummary(state: SimulationState): CompletionSummary {
  const m = state.module4
  const facts: CompletionSummary['facts'] = [
    { label: '确诊病例', value: '2 例' },
    { label: '沈洁检测', value: 'EBOV 阳性 · Ct 27.9' },
    { label: '隔离床占用', value: '2 / 12' },
    { label: '高风险接触者', value: `${m.totalHighRiskContacts} 人` },
    { label: '儿童状态', value: '核酸阴性 · 无症状' },
    { label: '儿童照护', value: m.careStable ? '联合照护稳定' : '仍需协调' },
  ]
  const situation = m.additionalHighRiskContacts === 5
    ? '沈洁已作为第二例确诊病例管理。此前分离延迟新增 5 名高风险接触者，该工作量继续保留；儿童照护与健康监测进入持续支持阶段。'
    : '沈洁已作为第二例确诊病例管理，症状报警后的分离转运未新增高风险接触者；儿童照护与健康监测进入持续支持阶段。'
  return { facts, situation }
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
    { label: '患者沟通', value: m.communicationStatus === 'successful' ? '配合稳定' : m.communicationStatus === 'in-progress' ? '沟通进行中' : '沟通受阻' },
    { label: '舆情信号', value: m.earlyPublicOpinionSignalTriggeredByM1 ? '已出现' : 'M1 未触发' },
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
