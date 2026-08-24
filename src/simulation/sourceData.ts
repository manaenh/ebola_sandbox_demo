import type { EventId, HotspotId, MetricValue, SimulationEventDefinition } from './types'

export const SOURCE_DOCUMENT = '埃博拉病毒病输入性疫情桌面推演脚本（用于创建demon）(发企业）.docx'

export const sourceMetric = (value: number | null, unit: MetricValue['unit'], locator: string, context?: string, displayValue?: string): MetricValue => ({
  value, displayValue, unit, context, provenance: { kind: 'source', document: SOURCE_DOCUMENT, locator },
})

export const derivedMetric = (value: number | null, unit: MetricValue['unit'], locator: string, note: string, context?: string, displayValue?: string): MetricValue => ({
  value, displayValue, unit, context, provenance: { kind: 'derived', document: SOURCE_DOCUMENT, locator, note },
})

export const eventOrder: EventId[] = ['M1-1', 'M1-2', 'M1-3']

export const simulationEvents: Record<EventId, SimulationEventDefinition> = {
  'M1-1': {
    id: 'M1-1', title: '急诊分诊卡', date: '2026.08.05', time: '10:42', isoTime: '2026-08-05T10:42:00+08:00',
    description: '周启航高热、乏力、腹泻，首次只说“非洲出差”。公共候诊区已有 18 人。',
    characters: ['周启航', '分诊护士', '候诊人员'], organizations: ['市中心医院急诊科', '院感管理'],
    visibleMetrics: ['confirmedCases', 'suspectedCases', 'assessmentRequired', 'exposureDuration'], nextEvent: 'M1-2', decisionTreeLabel: '急诊分诊',
    situationSummary: '境外旅居史与体液接触史尚未完整核实，需要决定是否立即升级处置。',
    decisions: [
      {
        id: 'rapid-epidemiology', code: 'A', title: '立即升级流行病学问诊',
        description: '追问具体旅行与体液暴露史，并先行采取隔离措施。',
        effects: {
          metricChanges: { exposureDuration: derivedMetric(null, 'minutes', 'M1-1｜处置进行中', '最终数值在隔离完成时执行', '等待隔离完成', '进行中') },
          module1Changes: { isolationScheduledFor: '11:05', exposureControlQuality: 'good' },
          sceneChanges: { interaction: 'isolation-route' },
          scheduledConsequences: [{
            id: 'm11-a-isolation-1105', type: 'patient-isolated', sourceEventId: 'M1-1', executeAt: '2026-08-05T11:05:00+08:00',
            effects: {
              metricChanges: { exposureDuration: sourceMetric(23, 'minutes', 'M1-1｜效果反馈/数据') },
              module1Changes: { isolationCompletedAt: '11:05', exposureDurationMinutes: 23 },
              sceneChanges: { patientLocation: 'isolation', interaction: 'isolation-route' },
              eventLog: [{ id: 'm11-a-isolation', time: '11:05', title: '患者进入预设隔离区', detail: '公共候诊区停留 23 分钟；需评估人员仍待逐一判定。', tone: 'complete' }],
            },
          }],
          eventLog: [{ id: 'm11-a-action', time: '10:42', title: '升级流行病学问诊', detail: '隔离通道已启动，计划于 11:05 完成隔离。', tone: 'active' }],
          outcome: { label: '隔离流程已启动', summary: '隔离通道已经启用，患者计划于 11:05 进入隔离区。', facts: ['隔离完成时刻：11:05', '候诊暴露将在隔离完成时锁定为 23 分钟'] },
          situationSummary: '隔离流程已经启动；下一步需要处理患者对采样与隔离措施的担忧。',
        },
      },
      {
        id: 'staged-assessment', code: 'B', title: '先完成急诊基础评估',
        description: '根据首轮检查结果，再决定是否升级隔离措施。',
        effects: {
          metricChanges: { exposureDuration: derivedMetric(null, 'minutes', 'M1-1｜处置进行中', '暴露窗口仍开放，最终源数据在后续时点执行', '候诊暴露仍在持续', '持续中') },
          module1Changes: { isolationScheduledFor: '12:00', exposureControlQuality: 'compromised' }, sceneChanges: {},
          scheduledConsequences: [
            {
              id: 'm11-b-vomiting-1136', type: 'vomiting-exposure', sourceEventId: 'M1-1', executeAt: '2026-08-05T11:36:00+08:00',
              effects: {
                metricChanges: { assessmentRequired: sourceMetric(21, 'people', 'M1-1｜效果反馈/数据', '新增需评估人员，不等同于高风险接触者') },
                module1Changes: { vomitingExposureOccurred: true, additionalAssessmentRequired: 21 }, sceneChanges: { exposureEvent: true },
                eventLog: [{ id: 'm11-b-exposure', time: '11:36', title: '公共候诊区发生呕吐', detail: '污染区域被圈定；新增 21 人进入暴露评估流程。', tone: 'alert' }],
              },
            },
            {
              id: 'm11-b-isolation-1200', type: 'patient-isolated', sourceEventId: 'M1-1', executeAt: '2026-08-05T12:00:00+08:00',
              effects: {
                metricChanges: { exposureDuration: sourceMetric(78, 'minutes', '干预前后效果对比｜首诊至隔离') },
                module1Changes: { isolationCompletedAt: '12:00', exposureDurationMinutes: 78 }, sceneChanges: { patientLocation: 'isolation' },
                eventLog: [{ id: 'm11-b-isolation', time: '12:00', title: '患者完成隔离', detail: '首诊至隔离 78 分钟；此前新增需评估人员 21 人。', tone: 'complete' }],
              },
            },
          ],
          eventLog: [{ id: 'm11-b-action', time: '10:42', title: '先行常规急诊评估', detail: '患者暂留急诊区域，隔离完成时刻计划为 12:00。', tone: 'active' }],
          outcome: { label: '常规评估继续', summary: '患者仍在急诊区域，隔离尚未完成，暴露窗口保持开放。', facts: ['计划隔离时刻：12:00', '后续暴露后果将在实际发生时执行'] },
          situationSummary: '患者仍在公共急诊区域，暴露窗口尚未关闭。',
        },
      },
    ],
  },
  'M1-2': {
    id: 'M1-2', title: '患者拒绝', date: '2026.08.05', time: '11:12', isoTime: '2026-08-05T11:12:00+08:00',
    description: '周启航担心被强制隔离，拒绝采血，并要求先见妻子。',
    characters: ['周启航', '分诊护士', '感染科医生'], organizations: ['市中心医院急诊科', '感染科'],
    visibleMetrics: ['suspectedCases', 'assessmentRequired', 'exposureDuration'], nextEvent: 'M1-3', decisionTreeLabel: '患者沟通',
    situationSummary: '患者拒绝采样并要求联系家属，需要在流程控制与知情沟通之间作出安排。',
    decisions: [
      {
        id: 'risk-communication', code: 'A', title: '先进行风险沟通并提供家属视频联系', description: '解释采样目的，安排与家属视频联系，争取患者配合。',
        effects: {
          module1Changes: { patientCooperative: true, communicationDelayMinutes: 15, samplingReadiness: 'improved', earlyPublicOpinionRisk: false },
          sceneChanges: { patientMood: 'cooperative', interaction: 'communication', phoneMode: 'family-video' },
          eventLog: [{ id: 'm12-a-cooperation', time: '约 15 分钟后', title: '患者同意配合采样', detail: '完成风险解释并建立家属视频联系。', tone: 'complete' }],
          outcome: { label: '沟通取得进展', summary: '患者在风险解释和家属视频联系后配合处置。', facts: ['约 15 分钟后配合', '采样准备状态改善'] },
          situationSummary: '患者已同意配合后续处置，医院仍需决定是否立即启动外部快报。',
        },
      },
      {
        id: 'direct-procedure', code: 'B', title: '按照隔离要求直接推进处置', description: '优先推进隔离与采样，后续再补充解释和家属沟通。',
        effects: {
          metricChanges: { publicOpinionRisk: sourceMetric(null, 'status', 'M1-2｜效果反馈/数据', '源脚本未提供传播量级', '上升') },
          module1Changes: { patientCooperative: false, samplingReadiness: 'blocked', earlyPublicOpinionRisk: true },
          sceneChanges: { patientMood: 'distressed', interaction: 'communication', phoneMode: 'short-video' },
          eventLog: [{ id: 'm12-b-video', time: '11:12 后', title: '患者上传短视频', detail: '舆情与沟通风险提前出现；源脚本未提供传播量级。', tone: 'alert' }],
          outcome: { label: '沟通风险提前出现', summary: '患者仍处于焦虑状态，并拍摄短视频上传。', facts: ['舆情风险上升', '未对传播量级作数值推断'] },
          situationSummary: '患者短视频使沟通风险提前出现，医院仍需决定是否立即启动外部快报。',
        },
      },
    ],
  },
  'M1-3': {
    id: 'M1-3', title: '首次报告', date: '2026.08.05', time: '11:20', isoTime: '2026-08-05T11:20:00+08:00',
    description: '感染科认为症状“不典型”，建议先等常规检验；急诊需要决定是否立即向卫健和疾控快报。',
    characters: ['急诊医生', '感染科医生', '周启航'], organizations: ['市中心医院', '卫生健康部门', '疾病预防控制机构'],
    visibleMetrics: ['suspectedCases', 'assessmentRequired', 'cdcResponse', 'responseDelay'], nextEvent: null, decisionTreeLabel: '首次报告',
    situationSummary: '临床证据尚不完整，需要决定是否先按疑似事件启动卫健和疾控响应。',
    decisions: [
      {
        id: 'early-report', code: 'A', title: '按疑似事件先行快报', description: '先启动卫健和疾控响应，后续再补充报告。',
        effects: {
          metricChanges: {
            cdcResponse: sourceMetric(null, 'status', 'M1-3｜效果反馈/数据', '疾控 12:00 前到场', '已启动'),
            responseDelay: derivedMetric(0, 'minutes', 'M1-3｜效果反馈/数据', '及时快报路径未增加脚本所述 2 小时 10 分钟延迟', '响应延迟', '低'),
          },
          module1Changes: { cdcResponseStarted: true, reportWithin15Minutes: true, responseDelayMinutes: 0, cdcArrival: 'before-12:00' },
          sceneChanges: { interaction: 'coordination', cdcResponse: 'active' },
          eventLog: [{ id: 'm13-a-report', time: '15 分钟内', title: '疑似事件快报已发出', detail: '疾控响应启动，队伍将在 12:00 前到场。', tone: 'complete' }],
          outcome: { label: '疾控响应已启动', summary: '医院在信息尚不完整时先行快报，并准备后续续报。', facts: ['15 分钟内完成报告', '疾控 12:00 前到场'] },
          situationSummary: '卫健和疾控响应已启动，首诊发现与即时控制阶段完成。',
        },
      },
      {
        id: 'await-tests', code: 'B', title: '等待首轮检查结果', description: '获得更多临床证据后再正式报告，减少不必要的响应升级。',
        effects: {
          metricChanges: {
            cdcResponse: sourceMetric(null, 'status', 'M1-3｜效果反馈/数据', '等待检验路径', '尚未启动'),
            responseDelay: sourceMetric(130, 'minutes', 'M1-3｜效果反馈/数据', '整体响应延迟 2 小时 10 分钟', '+2h10m'),
          },
          module1Changes: { cdcResponseStarted: false, reportWithin15Minutes: false, responseDelayMinutes: 130, cdcArrival: null },
          sceneChanges: { interaction: 'coordination', cdcResponse: 'delayed' },
          eventLog: [{ id: 'm13-b-delay', time: '+2 小时 10 分钟', title: '外部响应启动延迟', detail: '等待首轮检查结果使整体响应延迟 2 小时 10 分钟。', tone: 'alert' }],
          outcome: { label: '外部响应尚未启动', summary: '医院等待首轮检查结果后再报告。', facts: ['整体响应延迟 2 小时 10 分钟', '该延迟将保留到后续事件'] },
          situationSummary: '疾控响应尚未启动，累计 2 小时 10 分钟延迟将影响后续处置。',
        },
      },
    ],
  },
}

export const getEventDefinition = (id: EventId) => simulationEvents[id]

export const hotspotCopy: Record<HotspotId, { eyebrow: string; title: string; body: string }> = {
  'zhou-qihang': { eyebrow: '重点人物 · 病例编号 BH-EVD-001', title: '周启航 · 疑似病例', body: '38 岁，高热 39.1°C、乏力、腹泻、呕吐。焦虑且担心家属受到歧视。' },
  'triage-nurse': { eyebrow: '医务人员 · 急诊分诊', title: '分诊护士', body: '负责首轮风险识别、患者沟通以及院内控制措施衔接。' },
  'triage-desk': { eyebrow: '关键控制点 · 急诊分诊台', title: '急诊分诊台', body: '首诊识别、风险信息补充和首次报告均从这里发起。' },
  'waiting-area': { eyebrow: '空间区域 · 公共候诊区', title: '公共候诊区 · 18 人', body: '18 是事件发生时场内人数，不代表接触者或密切接触者；需要依据有效暴露逐人评估。' },
  'isolation-route': { eyebrow: '控制动线 · 隔离区', title: '预设隔离通道', body: '限制非必要移动，并为采样、报告和后续转运保留清晰动线。' },
}
