import type { SimulationState } from '../simulation/types'
import { cityLocationCatalog } from './sourceData'
import type { CityLocationId, CityLocationStatus, CityRoute, CitySignal, CitySituation } from './types'

const statusLabel: Record<CityLocationStatus, string> = {
  passed: '经过', investigation: '待调查', 'exposure-event': '体液暴露事件',
  'suspected-location': '疑似病例所在地', 'response-ready': '响应待命',
  'response-active': '响应已启动', 'response-delayed': '响应延迟',
  'transfer-pending': '医疗转运待启动', 'transfer-active': '医疗转运进行中',
  'patient-received': '患者已接收', 'specimen-in-transit': '标本运输中',
  'laboratory-active': '实验室处置中', 'confirmed-location': '确诊病例所在地', future: '后续启用',
  'investigation-pending': '调查进行中', contacted: '已联系', classified: '已完成分类',
  'cross-region-search': '跨区域协查中', 'monitoring-active': '21 天监测中',
  'symptom-alert': '症状报警', 'care-active': '照护协调中',
}

const module2Available = (state: SimulationState) =>
  (state.module === 1 && state.phase === 'module-complete') || state.module2.started

const laboratoryVisible = (state: SimulationState) =>
  state.module2.samplingProtocol !== 'pending' || ['M2-2', 'M2-3', 'M2-4'].includes(state.currentEventId)

const module3Available = (state: SimulationState) => state.module3.started || (state.module === 2 && state.phase === 'module-complete')

function module3ClusterFacts(id: CityLocationId, state: SimulationState) {
  const m = state.module3
  if (!module3Available(state)) return []
  const counts: Partial<Record<CityLocationId, number>> = {
    home: m.investigationGroups.family + m.investigationGroups.companions,
    airport: m.investigationGroups.flight,
    'central-hospital': m.investigationGroups.hospital,
    'transport-community-cluster': m.investigationGroups.transportCommunity,
  }
  const count = counts[id]
  if (count === undefined) return []
  const facts: Array<{ label: string; value: string; provenance: 'source' | 'derived' }> = [
    { label: '需调查', value: `${count} 人`, provenance: 'source' },
  ]
  if (id === 'airport' && m.flightReviewCompleted) {
    facts[0] = { label: '首轮航班相关调查对象', value: '39 人', provenance: 'source' }
    facts.push({ label: '全航班暴露复核', value: '298 人', provenance: 'source' })
    facts.push({ label: '复核后分类', value: '7 高 / 18 中 / 39 低风险观察', provenance: 'source' })
    facts.push({ label: '不纳入主动监测', value: '234 人', provenance: 'derived' })
  }
  return facts
}

function hospitalFacts(state: SimulationState) {
  const m = state.module1
  const exposure = m.exposureDurationMinutes === null
    ? m.isolationScheduledFor === '12:00' ? '仍在持续' : m.isolationScheduledFor === '11:05' ? '隔离处理中' : '待决策'
    : `${m.exposureDurationMinutes} 分钟`
  const assessment = m.additionalAssessmentRequired > 0 ? `新增 ${m.additionalAssessmentRequired} 人` : m.exposureControlQuality === 'good' ? '相对受控' : '待调查'
  const facts: Array<{ label: string; value: string; provenance: 'source' | 'derived' }> = [
    { label: '候诊暴露', value: exposure, provenance: m.exposureDurationMinutes === null ? 'derived' : 'source' },
    { label: '评估负荷', value: assessment, provenance: m.additionalAssessmentRequired > 0 ? 'source' : 'derived' },
  ]
  if (m.earlyPublicOpinionSignalTriggeredByM1) facts.push({ label: '沟通信号', value: 'M1 舆情信号已出现', provenance: 'source' })
  if (state.module2.additionalVomitingCleanupEvents > 0) facts.push({ label: '转运等待处置', value: '新增 2 次', provenance: 'source' })
  return facts
}

function designatedHospitalFacts(state: SimulationState) {
  const m = state.module2
  const facts: Array<{ label: string; value: string; provenance: 'source' | 'derived' }> = []
  if (m.transferCompletedAt) facts.push({ label: '接收完成', value: m.transferCompletedAt, provenance: 'source' })
  else if (m.transferStatus === 'waiting') facts.push({ label: '车辆等待', value: '约 70 分钟', provenance: 'source' })
  else if (module2Available(state)) facts.push({ label: '接收能力', value: '已就绪', provenance: 'source' })
  if (m.samplingProtocol !== 'pending') facts.push({ label: '采样路径', value: m.samplingProtocol === 'standardized' ? '规范采样' : '常规多项目', provenance: 'derived' })
  return facts
}

function laboratoryFacts(state: SimulationState) {
  const m = state.module2
  const facts: Array<{ label: string; value: string; provenance: 'source' | 'derived' }> = []
  if (m.specimenReachedLaboratoryAt) facts.push({ label: '标本到达', value: m.specimenReachedLaboratoryAt, provenance: 'source' })
  if (m.laboratoryDelayMinutes > 0) facts.push({ label: '流程延迟', value: '4 小时', provenance: 'source' })
  if (m.preliminaryPositive) facts.push({ label: '初筛结果', value: 'EBOV 核酸阳性', provenance: 'source' })
  if (m.confirmed) facts.push({ label: '复核结果', value: '阳性 · Ct 22.6', provenance: 'source' })
  return facts
}

function getLocationStatus(id: CityLocationId, state: SimulationState): CityLocationStatus {
  const m2 = state.module2
  const m3 = state.module3
  const m4 = state.module4
  if (id === 'monitoring-site') return m4.alertTriggered ? m4.secondaryConfirmed ? 'confirmed-location' : 'symptom-alert' : 'monitoring-active'
  if (id === 'child-care-support') return m4.childCareMode === 'coordinated' ? 'care-active' : m4.started ? 'investigation-pending' : 'future'
  if (id === 'cross-region-target') {
    if (!module3Available(state)) return 'future'
    if (m3.missingTravelerStatus === 'found') return m3.contactInfrastructureEstablished ? 'monitoring-active' : 'contacted'
    return 'cross-region-search'
  }
  if (id === 'transport-community-cluster') {
    if (!module3Available(state)) return 'future'
    return m3.riskClassificationStatus === 'completed' ? 'classified' : 'investigation-pending'
  }
  if (module3Available(state) && ['airport', 'home'].includes(id)) {
    if (id === 'airport' && m3.flightReviewCompleted) return 'classified'
    if (m3.riskClassificationStatus === 'completed') return 'classified'
    return 'investigation-pending'
  }
  if (id === 'central-hospital') {
    if (m2.confirmed && m2.transferStatus === 'waiting') return 'confirmed-location'
    if (m2.transferStatus === 'preparing') return 'transfer-active'
    if (m2.transferStatus === 'waiting') return 'response-delayed'
    return state.module1.vomitingExposureOccurred ? 'exposure-event' : 'suspected-location'
  }
  if (id === 'designated-hospital') {
    if (!module2Available(state)) return 'future'
    if (m2.confirmed || m2.transferStatus === 'completed' || m2.transferStatus === 'completed-after-wait') return m2.confirmed ? 'confirmed-location' : 'patient-received'
    if (m2.transferStatus === 'preparing') return 'transfer-active'
    return 'response-ready'
  }
  if (id === 'laboratory') {
    if (!laboratoryVisible(state)) return 'future'
    if (m2.confirmed) return 'response-active'
    if (m2.preliminaryPositive || m2.specimenStatus === 'processing-delayed') return 'laboratory-active'
    if (m2.specimenStatus === 'in-transit') return 'specimen-in-transit'
    return 'response-ready'
  }
  if (id === 'cdc') {
    if (m2.jointCommandActivated || m2.tracingMode !== 'not-started') return 'response-active'
    if (state.module1.reportWithin15Minutes === true) return 'response-active'
    if (state.module1.reportWithin15Minutes === false) return 'response-delayed'
    return 'response-ready'
  }
  if (id === 'airport') return 'passed'
  return 'investigation'
}

function getLocationDetail(id: CityLocationId, state: SimulationState): string {
  const m2 = state.module2
  const m3 = state.module3
  const m4 = state.module4
  if (id === 'monitoring-site') return m4.secondaryConfirmed
    ? '沈洁已确诊为续发病例；此前症状报警后的分离与转运后果保留在接触者管理中。'
    : '沈洁个人健康监测记录触发 38.1℃、乏力和恶心报警，距最后接触 7 天。'
  if (id === 'child-care-support') return '沈洁女儿核酸阴性且无症状；该演练点表达儿童保护、监护协调和家庭联系，不对应真实地址。'
  if (id === 'transport-community-cluster') return '交通与社区相关的 59 人需要调查和逐人风险分类；调查对象不等于密切接触者。'
  if (id === 'cross-region-target') {
    if (m3.missingTravelerStatus === 'found' && m3.dinnerAttendees === 12) return '失联同行人员已找到。其无症状期参加 12 人聚餐，未形成有效传播事件，仅需开展风险沟通。'
    if (m3.missingTravelerStatus === 'found') return '失联同行人员已在 6 小时内找到，未发现新的有效暴露。'
    return '失联同行人员可能离开深圳，正在通过邻省 / 跨区域协查目标开展查找；源脚本未给出具体目的地。'
  }
  if (id === 'central-hospital') {
    if (m2.transferStatus === 'waiting') return '患者继续留在急诊隔离间等待常备车辆，期间新增两次呕吐处置；这不代表新增感染。'
    if (m2.transferStatus === 'preparing') return '备用专业转运方案已经启动，患者正在按照感染控制与交接要求装载。'
    if (module2Available(state) && !m2.started) {
      return state.module1.vomitingExposureOccurred
        ? '院内体液暴露评估仍在进行，新增 21 人需评估（不代表发生 21 例感染）；下一项任务是安全转运患者。'
        : '首诊阶段已经完成，下一项任务是将患者安全转运至定点医院。'
    }
    if (state.module1.vomitingExposureOccurred) return '院内发生体液暴露事件，相关人员进入暴露评估流程；这不代表发生 21 例感染。'
    if (state.module1.exposureControlQuality === 'good') return '疑似病例已较早进入隔离流程，院内暴露范围相对受控。'
    return '疑似病例当前位于急诊区域，等待首轮风险识别与隔离决策。'
  }
  if (id === 'designated-hospital') {
    if (m2.samplingProtocol !== 'pending') return '患者已进入受控采样与标本处置流程。'
    if (m2.transferStatus === 'completed' || m2.transferStatus === 'completed-after-wait') return '患者转运交接已完成，定点医院开始后续采样准备。'
    return '定点医院已具备接收条件，等待医疗转运路线启动。'
  }
  if (id === 'laboratory') {
    if (m2.confirmed) return '复核实验室报告 EBOV 核酸阳性，联合指挥与每日风险评估已经启动。'
    if (m2.preliminaryPositive) return '市级实验室 EBOV 核酸初筛阳性，系统正在等待或推进复核。'
    if (m2.outerPackagingContamination) return '外包装污染模拟阳性，暴露调查已经启动，实验室流程延迟 4 小时。'
    return '实验室等待或接收经专人运输的规范包装标本。'
  }
  if (id === 'cdc') {
    if (m3.contactInfrastructureEstablished) return '接触者调查与风险分类体系已建立，当前进入 21 天持续健康监测；每人周期按各自最后暴露时间起算。'
    if (m3.started) return `首轮 126 人需要调查，正在进行联系、信息核实和风险分类。首批高风险接触者找到率为 ${m3.initialHighRiskLocateRate === null ? '—' : m3.initialHighRiskLocateRate * 100}%，该比率不以 126 人为分母。`
    if (m2.jointCommandActivated) return '复核确证后联合指挥机制和每日风险评估已经启动。'
    if (m2.tracingMode === 'full') return '初筛阳性后已全面启动接触者调查、风险分类和持续追踪。'
    if (m2.tracingMode === 'preliminary') return '市疾控正在开展基础名单核查与初步联系，等待复核后全面升级。'
    if (state.module1.reportWithin15Minutes === true) return '医院已先行快报，疾控响应已启动。'
    if (state.module1.reportWithin15Minutes === false) return '外部响应累计延迟 2 小时 10 分钟。'
    return '首次报告决策尚未完成，疾控机构保持待命。'
  }
  return cityLocationCatalog.find((location) => location.id === id)?.sourceNote ?? ''
}

function transferLabel(status: SimulationState['module2']['transferStatus']) {
  if (status === 'preparing') return '准备中'
  if (status === 'waiting') return '等待约 70 分钟'
  if (status === 'completed' || status === 'completed-after-wait') return '已完成'
  return '待启动'
}

function specimenLabel(status: SimulationState['module2']['specimenStatus']) {
  if (status === 'in-transit') return '专人运输中'
  if (status === 'received') return '实验室已接收'
  if (status === 'processing-delayed') return '污染处置中'
  if (status === 'confirmed-quality') return '质量符合要求'
  return '待采样'
}

function workloadLabel(status: SimulationState['module2']['overallResponseWorkload'] | SimulationState['module2']['transferPressure']) {
  if (status === 'severe') return '叠加压力很高'
  if (status === 'high') return '较高'
  if (status === 'elevated') return '上升'
  if (status === 'controlled') return '相对受控'
  return '待评估'
}

function getSignals(state: SimulationState): CitySignal[] {
  const m1 = state.module1
  const m2 = state.module2
  const m3 = state.module3
  const m4 = state.module4
  if (m4.started) return [
    { label: '确诊病例', value: `${m4.confirmedCases} 例`, tone: m4.secondaryConfirmed ? 'alert' : 'active', provenance: 'source' },
    { label: '沈洁状态', value: m4.secondaryConfirmed ? '续发病例确诊' : '症状报警', tone: 'alert', provenance: 'source' },
    { label: '高风险接触者', value: `${m4.totalHighRiskContacts} 人`, tone: m4.additionalHighRiskContacts === 5 ? 'alert' : 'active', provenance: 'source' },
    { label: '隔离床', value: `${m4.isolationBedsOccupied} / ${m4.isolationBedsTotal}`, tone: 'neutral', provenance: 'source' },
  ]
  if (module3Available(state)) {
    if (m3.contactInfrastructureEstablished) return [
      { label: '需调查', value: '126 人', tone: 'active', provenance: 'source' },
      { label: '航班分类', value: '7 高 / 18 中 / 39 低', tone: 'active', provenance: 'source' },
      { label: '高风险失访目标', value: '0', tone: 'active', provenance: 'source' },
      { label: '健康监测', value: '持续监测中', tone: 'active', provenance: 'derived' },
    ]
    if (state.currentEventId === 'M3-3') return [
      { label: '需调查', value: '126 人', tone: 'active', provenance: 'source' },
      { label: '失联人员', value: m3.missingTravelerStatus === 'found' ? '已找到' : '1 人', tone: m3.missingTravelerStatus === 'found' ? 'active' : 'alert', provenance: 'source' },
      { label: '协查范围', value: '跨区域', tone: 'active', provenance: 'derived' },
      { label: '有效暴露', value: m3.missingTravelerStatus === 'found' ? '未形成' : '待核实', tone: 'neutral', provenance: m3.missingTravelerStatus === 'found' ? 'source' : 'derived' },
    ]
    return [
      { label: '需调查', value: '126 人', tone: 'active', provenance: 'source' },
      { label: '首批高风险找到率', value: `${m3.initialHighRiskLocateRate === null ? m2.highRiskContactFindingProgress ?? '—' : m3.initialHighRiskLocateRate * 100}%`, tone: m3.initialHighRiskLocateRate === 0.61 ? 'alert' : 'active', provenance: 'source' },
      { label: '信息缺口', value: '18 缺电话 / 9 身份不完整', tone: 'alert', provenance: 'source' },
      { label: '调查压力', value: workloadLabel(m3.tracingOperationalPressure), tone: ['high', 'severe'].includes(m3.tracingOperationalPressure) ? 'alert' : 'neutral', provenance: 'derived' },
    ]
  }
  if (m2.confirmed) return [
    { label: '当前病例', value: '确诊 1 例', tone: 'alert', provenance: 'source' },
    { label: '联合指挥', value: '已启动', tone: 'active', provenance: 'source' },
    { label: '18:00 查找进展', value: `${m2.highRiskContactFindingProgress ?? '—'}%`, tone: m2.highRiskContactFindingProgress === 61 ? 'alert' : 'active', provenance: 'source' },
    { label: '综合工作负荷', value: workloadLabel(m2.overallResponseWorkload), tone: ['high','severe'].includes(m2.overallResponseWorkload) ? 'alert' : 'neutral', provenance: 'derived' },
  ]
  if (m2.preliminaryPositive) return [
    { label: '病例状态', value: '初筛阳性', tone: 'alert', provenance: 'source' },
    { label: '追踪响应', value: m2.tracingMode === 'full' ? '全面追踪' : m2.tracingMode === 'preliminary' ? '基础调查' : '待启动', tone: m2.tracingMode === 'full' ? 'active' : 'alert', provenance: 'derived' },
    { label: '实验室延迟', value: m2.laboratoryDelayMinutes ? '+4h' : '未增加', tone: m2.laboratoryDelayMinutes ? 'alert' : 'neutral', provenance: 'source' },
    { label: '前序评估负荷', value: m1.additionalAssessmentRequired ? `新增 ${m1.additionalAssessmentRequired} 人` : '相对受控', tone: m1.additionalAssessmentRequired ? 'alert' : 'neutral', provenance: m1.additionalAssessmentRequired ? 'source' : 'derived' },
  ]
  if (m2.samplingProtocol !== 'pending' || state.currentEventId === 'M2-2') return [
    { label: '患者位置', value: '定点医院', tone: 'active', provenance: 'derived' },
    { label: '标本状态', value: specimenLabel(m2.specimenStatus), tone: m2.outerPackagingContamination ? 'alert' : 'active', provenance: m2.outerPackagingContamination ? 'source' : 'derived' },
    { label: '暴露调查', value: m2.exposureInvestigationStarted ? '已启动' : '未触发', tone: m2.exposureInvestigationStarted ? 'alert' : 'neutral', provenance: 'source' },
    { label: '实验室延迟', value: m2.laboratoryDelayMinutes ? '+4h' : '未增加', tone: m2.laboratoryDelayMinutes ? 'alert' : 'neutral', provenance: 'source' },
  ]
  if (module2Available(state) && !m2.started) return [
    { label: '当前任务', value: '医疗转运', tone: 'active', provenance: 'derived' },
    { label: '评估工作量', value: m1.additionalAssessmentRequired ? `新增 ${m1.additionalAssessmentRequired} 人` : '相对受控', tone: m1.additionalAssessmentRequired ? 'alert' : 'neutral', provenance: m1.additionalAssessmentRequired ? 'source' : 'derived' },
    { label: '外部响应', value: m1.reportWithin15Minutes === false ? '延迟 2h10m' : '已启动', tone: m1.reportWithin15Minutes === false ? 'alert' : 'active', provenance: m1.reportWithin15Minutes === false ? 'source' : 'derived' },
    { label: '前序承接压力', value: workloadLabel(m2.transferPressure), tone: m2.transferPressure === 'high' ? 'alert' : 'neutral', provenance: 'derived' },
  ]
  if (module2Available(state)) return [
    { label: '当前任务', value: '医疗转运', tone: 'active', provenance: 'derived' },
    { label: '转运状态', value: transferLabel(m2.transferStatus), tone: m2.transferStatus === 'waiting' ? 'alert' : 'active', provenance: 'derived' },
    { label: '污染处置', value: m2.additionalVomitingCleanupEvents ? '新增 2 次' : '相对受控', tone: m2.additionalVomitingCleanupEvents ? 'alert' : 'neutral', provenance: m2.additionalVomitingCleanupEvents ? 'source' : 'derived' },
    { label: '承接压力', value: workloadLabel(m2.transferPressure), tone: m2.transferPressure === 'high' ? 'alert' : 'neutral', provenance: 'derived' },
  ]
  const assessment = m1.additionalAssessmentRequired > 0 ? `新增 ${m1.additionalAssessmentRequired} 人` : m1.exposureControlQuality === 'good' ? '相对受控' : '待调查'
  return [
    { label: '当前病例', value: '疑似 1 例', tone: 'active', provenance: 'derived' },
    { label: '院内暴露', value: m1.exposureDurationMinutes === null ? '动态评估' : `${m1.exposureDurationMinutes} 分钟`, tone: m1.exposureControlQuality === 'compromised' ? 'alert' : 'neutral', provenance: m1.exposureDurationMinutes === null ? 'derived' : 'source' },
    { label: '评估工作量', value: assessment, tone: m1.additionalAssessmentRequired > 0 ? 'alert' : 'neutral', provenance: m1.additionalAssessmentRequired > 0 ? 'source' : 'derived' },
    { label: '外部响应', value: m1.reportWithin15Minutes === true ? '已启动' : m1.reportWithin15Minutes === false ? '延迟 2h10m' : '待决策', tone: m1.reportWithin15Minutes === false ? 'alert' : m1.reportWithin15Minutes === true ? 'active' : 'neutral', provenance: m1.reportWithin15Minutes === false ? 'source' : 'derived' },
  ]
}

export function getCitySituation(state: SimulationState): CitySituation {
  const showModule2 = module2Available(state)
  const showLaboratory = laboratoryVisible(state)
  const showModule3 = module3Available(state)
  const showModule4 = state.module4.started
  const locations = cityLocationCatalog.map((location) => {
    const status = getLocationStatus(location.id, state)
    const visibleByDefault = location.visibleByDefault
      || (location.id === 'designated-hospital' && showModule2)
      || (location.id === 'laboratory' && showLaboratory)
      || (location.id === 'transport-community-cluster' && showModule3)
      || (location.id === 'cross-region-target' && state.currentEventId === 'M3-3')
      || (location.id === 'monitoring-site' && showModule4)
      || (location.id === 'child-care-support' && (state.currentEventId === 'M4-3' || (state.module === 4 && state.phase === 'module-complete')))
    const hasScene = location.hasScene
      || (location.id === 'designated-hospital' && showModule2)
      || (location.id === 'laboratory' && showLaboratory)
      || (location.id === 'airport' && state.currentEventId === 'M3-2')
      || (location.id === 'monitoring-site' && state.currentEventId === 'M4-1')
      || (location.id === 'child-care-support' && state.currentEventId === 'M4-3')
    const module3Facts = module3ClusterFacts(location.id, state)
    const facts = module3Facts.length > 0 ? module3Facts : location.id === 'central-hospital' ? hospitalFacts(state)
      : location.id === 'designated-hospital' ? designatedHospitalFacts(state)
        : location.id === 'laboratory' ? laboratoryFacts(state)
          : location.id === 'cdc' && state.module1.reportWithin15Minutes !== null
            ? [{ label: '响应状态', value: state.module2.jointCommandActivated ? '联合指挥已启动' : state.module1.reportWithin15Minutes ? '12:00 前到场' : '+2 小时 10 分钟', provenance: 'source' as const }]
            : []
    return { ...location, visibleByDefault, hasScene, status, statusLabel: statusLabel[status], detail: getLocationDetail(location.id, state), facts }
  })

  const routes: CityRoute[] = [
    { id: 'arrival-transit', from: 'airport', to: 'airport-bus', kind: 'trajectory', status: 'completed' },
    { id: 'transit-home', from: 'airport-bus', to: 'home', kind: 'trajectory', status: 'completed' },
    { id: 'home-store', from: 'home', to: 'convenience-store', kind: 'trajectory', status: 'completed' },
    { id: 'store-ride', from: 'convenience-store', to: 'ride-hailing', kind: 'trajectory', status: 'completed' },
    { id: 'ride-hospital', from: 'ride-hailing', to: 'central-hospital', kind: 'trajectory', status: 'completed', label: '08月05日 10:18' },
    { id: 'cdc-hospital', from: 'cdc', to: 'central-hospital', kind: 'response', status: state.module2.jointCommandActivated || state.module2.tracingMode !== 'not-started' || state.module1.reportWithin15Minutes === true ? 'active' : state.module1.reportWithin15Minutes === false ? 'delayed' : 'pending' },
  ]
  if (showModule2) routes.push({
    id: 'patient-transfer', from: 'central-hospital', to: 'designated-hospital', kind: 'transfer', label: '医疗转运',
    status: state.module2.transferStatus === 'completed' || state.module2.transferStatus === 'completed-after-wait' ? 'completed' : state.module2.transferStatus === 'preparing' ? 'active' : state.module2.transferStatus === 'waiting' ? 'delayed' : 'pending',
  })
  if (showLaboratory) routes.push({
    id: 'specimen-transfer', from: 'designated-hospital', to: 'laboratory', kind: 'specimen', label: '标本运输',
    status: state.module2.specimenStatus === 'received' || state.module2.confirmed ? 'completed' : state.module2.outerPackagingContamination ? 'delayed' : state.module2.specimenStatus === 'in-transit' ? 'active' : 'pending',
  })
  if (showModule3) {
    routes.push(
      { id: 'investigation-home', from: 'cdc', to: 'home', kind: 'investigation', status: state.module3.riskClassificationStatus === 'completed' ? 'completed' : 'active' },
      { id: 'investigation-flight', from: 'cdc', to: 'airport', kind: 'investigation', status: state.module3.flightReviewCompleted ? 'completed' : 'active' },
      { id: 'investigation-hospital', from: 'cdc', to: 'central-hospital', kind: 'investigation', status: state.module3.riskClassificationStatus === 'completed' ? 'completed' : 'active' },
      { id: 'investigation-community', from: 'cdc', to: 'transport-community-cluster', kind: 'investigation', status: state.module3.riskClassificationStatus === 'completed' ? 'completed' : 'active' },
    )
  }
  if (state.currentEventId === 'M3-3' || state.module3.missingTravelerStatus === 'found') routes.push({
    id: 'cross-region-coordination', from: 'cdc', to: 'cross-region-target', kind: 'cross-region',
    status: state.module3.missingTravelerStatus === 'found' ? 'completed' : 'active', label: '跨区域协查',
  })
  if (showModule4) routes.push({
    id: 'monitoring-transfer', from: 'monitoring-site', to: 'designated-hospital', kind: 'transfer', label: '医疗转运',
    status: state.module4.transferStatus === 'completed' ? 'completed' : state.module4.transferStatus === 'waiting' ? 'delayed' : state.module4.transferStatus === 'preparing' ? 'active' : 'pending',
  })

  const summary = state.module4.secondaryConfirmed ? `沈洁已确诊为第二例病例，传播链与接触者管理已更新；高风险接触者为 ${state.module4.totalHighRiskContacts} 人，不代表城市级扩散。`
    : state.module4.alertTriggered ? '沈洁的个体健康监测记录触发症状报警；地图显示监测点至定点医院的医疗转运，不代表疾病扩散。'
    : state.module3.contactInfrastructureEstablished ? '接触者调查体系已建立，当前进入 21 天健康监测；地图表示调查与协查工作，不是疫情扩散图。'
    : state.currentEventId === 'M3-3' ? '一名同行人员失联，协查视角扩展至深圳以外；目标位置是演练表达，不是源脚本指定的真实城市。'
      : showModule3 ? '126 人需要调查并逐人分类；聚类节点表示追踪工作集中位置，不代表感染地点。'
        : state.module2.confirmed ? '病例已经实验室确证；定点医院、实验室、市疾控中心和联合指挥网络均已激活。'
    : state.module2.preliminaryPositive ? '实验室初筛阳性；地图显示响应与调查网络，不代表深圳出现城市级传播。'
      : state.module2.samplingProtocol !== 'pending' || state.currentEventId === 'M2-2' ? '患者已进入采样与标本处置阶段，标本运输路线不代表患者移动或疾病传播。'
        : showModule2 ? '下一项任务是将患者从市中心医院安全转运至定点医院；线路表示医疗转运。'
          : state.module1.downstreamResponsePressure === 'high' ? '医院暴露评估工作量扩大，同时外部响应延迟；后续调查将面临叠加压力。'
            : '当前问题集中在市中心医院；既往入境后轨迹需要逐点调查，不代表沿途发生传播。'

  return { locations, routes, signals: getSignals(state), summary }
}
