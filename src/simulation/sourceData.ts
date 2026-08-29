import type { EventId, HotspotId, MetricValue, Provenance, SimulationEventDefinition } from './types'

export const SOURCE_DOCUMENT = '埃博拉病毒病输入性疫情桌面推演脚本（用于创建demon）(发企业）.docx'

export const sourceFact = (locator: string, note?: string): Provenance => ({
  kind: 'SOURCE_FACT', document: SOURCE_DOCUMENT, locator, note,
})

export const scheduledSourceConsequence = (locator: string, note?: string): Provenance => ({
  kind: 'SCHEDULED_SOURCE_CONSEQUENCE', document: SOURCE_DOCUMENT, locator, note,
})

export const derivedState = (locator: string, note: string): Provenance => ({
  kind: 'DERIVED_STATE', document: SOURCE_DOCUMENT, locator, note,
})

export const simulationAssumption = (locator: string, note: string): Provenance => ({
  kind: 'SIMULATION_ASSUMPTION', document: SOURCE_DOCUMENT, locator, note,
})

export const sourceMetric = (value: number | null, unit: MetricValue['unit'], locator: string, context?: string, displayValue?: string): MetricValue => ({
  value, displayValue, unit, context, provenance: sourceFact(locator),
})

export const derivedMetric = (value: number | null, unit: MetricValue['unit'], locator: string, note: string, context?: string, displayValue?: string): MetricValue => ({
  value, displayValue, unit, context, provenance: derivedState(locator, note),
})

export const eventOrder: EventId[] = ['M1-1', 'M1-2', 'M1-3', 'M2-1', 'M2-2', 'M2-3', 'M2-4', 'M3-1', 'M3-2', 'M3-3', 'M4-1', 'M4-2', 'M4-3']

export const simulationEvents: Record<EventId, SimulationEventDefinition> = {
  'M1-1': {
    module: 1, kind: 'decision', sceneKind: 'hospital',
    id: 'M1-1', title: '急诊分诊卡', date: '2026.08.05', time: '10:42', isoTime: '2026-08-05T10:42:00+08:00',
    description: '周启航高热、乏力、腹泻，首次只说“非洲出差”。公共候诊区已有 18 人。',
    characters: ['周启航', '分诊护士', '候诊人员'], organizations: ['市中心医院急诊科', '院感管理'],
    visibleMetrics: ['confirmedCases', 'suspectedCases', 'assessmentRequired', 'exposureDuration'], nextEvent: 'M1-2', decisionTreeLabel: '急诊分诊',
    situationSummary: '境外旅居史与体液接触史尚未完整核实，需要决定是否立即升级处置。',
    provenance: sourceFact('M1-1｜事件注入'),
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
            provenance: scheduledSourceConsequence('M1-1｜干预前后效果对比', '11:05 隔离及 23 分钟暴露由源脚本明确给出'),
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
              id: 'm11-b-vomiting-window', type: 'vomiting-exposure', sourceEventId: 'M1-1', executeAt: '2026-08-05T11:36:00+08:00',
              provenance: simulationAssumption('M1-1｜延迟隔离期间', '源脚本只说明延迟隔离期间发生呕吐；11:36 仅为引擎内部排序时刻，不向观众作为源事实展示'),
              effects: {
                metricChanges: { assessmentRequired: sourceMetric(21, 'people', 'M1-1｜效果反馈/数据', '新增需评估人员，不等同于高风险接触者') },
                module1Changes: { vomitingExposureOccurred: true, additionalAssessmentRequired: 21 }, sceneChanges: { exposureEvent: true },
                eventLog: [{ id: 'm11-b-exposure', time: '延迟隔离期间', title: '公共候诊区发生呕吐', detail: '污染区域被圈定；新增 21 人进入暴露评估流程。源脚本未给出该事件的精确时刻。', tone: 'alert', provenance: simulationAssumption('M1-1｜延迟隔离期间', '内部执行时刻为 11:36；用户界面仅显示时间窗口') }],
              },
            },
            {
              id: 'm11-b-isolation-1200', type: 'patient-isolated', sourceEventId: 'M1-1', executeAt: '2026-08-05T12:00:00+08:00',
              provenance: scheduledSourceConsequence('M1-1｜干预前后效果对比', '12:00 隔离及 78 分钟暴露由源脚本明确给出'),
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
    module: 1, kind: 'decision', sceneKind: 'hospital',
    id: 'M1-2', title: '患者拒绝', date: '2026.08.05', time: '11:12', isoTime: '2026-08-05T11:12:00+08:00',
    description: '周启航担心被强制隔离，拒绝采血，并要求先见妻子。',
    characters: ['周启航', '分诊护士', '感染科医生'], organizations: ['市中心医院急诊科', '感染科'],
    visibleMetrics: ['suspectedCases', 'assessmentRequired', 'exposureDuration'], nextEvent: 'M1-3', decisionTreeLabel: '患者沟通',
    situationSummary: '患者拒绝采样并要求联系家属，需要在流程控制与知情沟通之间作出安排。',
    provenance: sourceFact('M1-2｜事件注入'),
    decisions: [
      {
        id: 'risk-communication', code: 'A', title: '先进行风险沟通并提供家属视频联系', description: '解释采样目的，安排与家属视频联系，争取患者配合。',
        effects: {
          module1Changes: { communicationStatus: 'in-progress', communicationDelayMinutes: 15, samplingReadiness: 'delayed' },
          sceneChanges: { patientMood: 'resistant', interaction: 'communication', phoneMode: 'family-video' },
          scheduledConsequences: [{
            id: 'm12-a-cooperation-1127', type: 'patient-cooperation', sourceEventId: 'M1-2', executeAt: '2026-08-05T11:27:00+08:00',
            provenance: scheduledSourceConsequence('M1-2｜效果反馈/数据', '患者约 15 分钟后配合；11:27 由 11:12 加 15 分钟确定'),
            effects: {
              module1Changes: { patientCooperative: true, communicationStatus: 'successful', samplingReadiness: 'improved' },
              sceneChanges: { patientMood: 'cooperative', phoneMode: 'family-video' },
              eventLog: [{ id: 'm12-a-cooperation', time: '约 11:27', title: '患者同意配合采样', detail: '风险沟通持续约 15 分钟后，患者开始配合后续处置。', tone: 'complete' }],
            },
          }],
          eventLog: [{ id: 'm12-a-communication', time: '11:12', title: '风险沟通与家属视频联系开始', detail: '医护正在解释采样目的，患者尚未完全配合。', tone: 'active' }],
          outcome: { label: '风险沟通正在进行', summary: '医护已开始解释措施并安排家属视频联系，预计约 15 分钟后形成配合。', facts: ['当前状态：沟通进行中', '预计约 11:27 后配合'] },
          situationSummary: '风险沟通正在进行，患者尚未完全配合采样；外部报告决策将与沟通过程并行发生。',
        },
      },
      {
        id: 'direct-procedure', code: 'B', title: '按照隔离要求直接推进处置', description: '优先推进隔离与采样，后续再补充解释和家属沟通。',
        effects: {
          metricChanges: { publicOpinionRisk: sourceMetric(null, 'status', 'M1-2｜效果反馈/数据', '源脚本未提供传播量级', '上升') },
          module1Changes: { patientCooperative: false, communicationStatus: 'strained', samplingReadiness: 'delayed', earlyPublicOpinionSignalTriggeredByM1: true },
          sceneChanges: { patientMood: 'distressed', interaction: 'communication', phoneMode: 'short-video' },
          eventLog: [{ id: 'm12-b-video', time: '11:12 后', title: '患者上传短视频', detail: '舆情与沟通风险提前出现；源脚本未提供传播量级。', tone: 'alert' }],
          outcome: { label: '沟通风险提前出现', summary: '患者仍处于焦虑状态，并拍摄短视频上传。', facts: ['舆情风险上升', '未对传播量级作数值推断'] },
          situationSummary: '患者短视频使沟通风险提前出现，医院仍需决定是否立即启动外部快报。',
        },
      },
    ],
  },
  'M1-3': {
    module: 1, kind: 'decision', sceneKind: 'hospital',
    id: 'M1-3', title: '首次报告', date: '2026.08.05', time: '11:20', isoTime: '2026-08-05T11:20:00+08:00',
    description: '感染科认为症状“不典型”，建议先等常规检验；急诊需要决定是否立即向卫健和疾控快报。',
    characters: ['急诊医生', '感染科医生', '周启航'], organizations: ['市中心医院', '卫生健康部门', '疾病预防控制机构'],
    visibleMetrics: ['suspectedCases', 'assessmentRequired', 'cdcResponse', 'responseDelay'], nextEvent: null, decisionTreeLabel: '首次报告',
    situationSummary: '临床证据尚不完整，需要决定是否先按疑似事件启动卫健和疾控响应。',
    provenance: sourceFact('M1-3｜事件注入'),
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
  'M2-1': {
    id: 'M2-1', module: 2, kind: 'decision', sceneKind: 'transport',
    title: '转运请求', date: '2026.08.05', time: '12:05', isoTime: '2026-08-05T12:05:00+08:00',
    description: '定点医院已经具备接收条件，但常备专用转运车辆正在执行任务，预计约 70 分钟后返回。',
    characters: ['周启航', '转运组', '院感人员'], organizations: ['市中心医院', '市急救中心', '公安交通保障'],
    visibleMetrics: ['transferStatus', 'transferWait', 'contaminationPressure', 'responseDelay'], nextEvent: 'M2-2', decisionTreeLabel: '转运请求',
    situationSummary: '患者仍在隔离区域，需要在备用专业转运能力与等待常备车辆之间确定安全转运方案。',
    provenance: sourceFact('M2-1｜事件注入'),
    decisions: [
      {
        id: 'backup-transfer', code: 'A', title: '启用备用专业转运方案',
        description: '落实感染控制、路线和交接要求后，启用备用转运能力。',
        effects: {
          metricChanges: {
            transferStatus: sourceMetric(null, 'status', 'M2-1｜效果反馈/数据', '启用机动组，13:10 完成接收', '转运准备中'),
            transferWait: derivedMetric(65, 'minutes', 'M2-1｜12:05 至 13:10', '由源脚本两个时间点确定性换算', '预计转运用时'),
            contaminationPressure: derivedMetric(null, 'status', 'M2-1｜备用转运路径', '未增加等待分支中的两次呕吐处置', '相对受控'),
          },
          module2Changes: { transferStatus: 'preparing', transferWaitMinutes: 0, contaminationHandlingWorkload: 'baseline', occupationalExposurePressure: 'baseline' },
          sceneChanges: { kind: 'transport', patientLocation: 'vehicle', interaction: 'transfer-preparation', transferVehicle: 'backup', transferMotion: 'loading', cleanupEvents: 0 },
          scheduledConsequences: [{
            id: 'm21-a-transfer-1310', type: 'transfer-completed', sourceEventId: 'M2-1', executeAt: '2026-08-05T13:10:00+08:00',
            provenance: scheduledSourceConsequence('M2-1｜效果反馈/数据', '备用转运路径约 13:10 完成接收'),
            effects: {
              metricChanges: { transferStatus: sourceMetric(null, 'status', 'M2-1｜效果反馈/数据', '机动组 13:10 完成接收', '已完成') },
              module2Changes: { transferStatus: 'completed', transferCompletedAt: '13:10' },
              sceneChanges: { patientLocation: 'designated-hospital', transferMotion: 'arrived' },
              eventLog: [{ id: 'm21-a-arrival', time: '13:10', title: '定点医院完成接收', detail: '备用专业转运方案完成患者交接。', tone: 'complete' }],
            },
          }],
          eventLog: [{ id: 'm21-a-dispatch', time: '12:05', title: '备用专业转运方案启动', detail: '转运组完成感染控制、路线和交接清单准备。', tone: 'active' }],
          outcome: { label: '备用转运能力已启用', summary: '转运组按照感染控制与交接要求装载患者，计划于 13:10 完成接收。', facts: ['定点医院接收：约 13:10', '未增加等待分支中的呕吐处置'] },
          situationSummary: '备用专业转运能力已经启动；Module 1 的评估负荷和响应延迟仍持续影响协调压力。',
        },
      },
      {
        id: 'wait-regular-transfer', code: 'B', title: '等待常备专用转运车辆返回',
        description: '维持患者就地隔离，待常备车辆约 70 分钟后返回再转运。',
        effects: {
          metricChanges: {
            transferStatus: sourceMetric(null, 'status', 'M2-1｜效果反馈/数据', '等待常备车辆返回', '等待中'),
            transferWait: sourceMetric(70, 'minutes', 'M2-1｜事件注入', '常备车辆预计 70 分钟返回'),
            contaminationPressure: sourceMetric(2, 'status', 'M2-1｜效果反馈/数据', '患者在急诊隔离间增加 2 次呕吐处置', '增加 2 次处置'),
          },
          module2Changes: { transferStatus: 'waiting', transferWaitMinutes: 70, additionalVomitingCleanupEvents: 2, contaminationHandlingWorkload: 'increased', occupationalExposurePressure: 'increased' },
          sceneChanges: { kind: 'transport', patientLocation: 'isolation', interaction: 'transfer-waiting', transferVehicle: 'regular-pending', transferMotion: 'waiting', cleanupEvents: 2 },
          eventLog: [{ id: 'm21-b-wait', time: '等待期间', title: '隔离间增加两次呕吐处置', detail: '污染处置与职业暴露管理工作量增加；未据此推断新增感染。', tone: 'alert' }],
          outcome: { label: '患者继续就地隔离等待', summary: '常备车辆返回前患者留在急诊隔离间，期间增加两次呕吐处置。', facts: ['车辆预计约 70 分钟后返回', '新增污染处置事件：2 次', '不等同于新增感染'] },
          situationSummary: '转运等待使污染处置和职业暴露管理压力增加；若 Module 1 已有较高负荷，当前压力将进一步叠加。',
        },
      },
    ],
  },
  'M2-2': {
    id: 'M2-2', module: 2, kind: 'decision', sceneKind: 'sampling',
    title: '采样争议', date: '2026.08.05', time: '13:30', isoTime: '2026-08-05T13:30:00+08:00',
    description: '临床希望同时开展多项检测，但采样人员对采样管数、包装和运输交接存在不确定。',
    characters: ['周启航', '采样人员', '院感人员'], organizations: ['定点医院', '专家组', '标本转运人员'],
    visibleMetrics: ['specimenStatus', 'laboratoryDelay', 'exposureInvestigation', 'contaminationPressure'], nextEvent: 'M2-3', decisionTreeLabel: '采样与包装',
    situationSummary: '采样项目、包装与运输交接需要在检测需求和生物安全纪律之间形成一致方案。',
    provenance: sourceFact('M2-2｜事件注入'),
    decisions: [
      {
        id: 'standardized-sampling', code: 'A', title: '按最小必要原则规范采样与送检',
        description: '专家确定必要项目，完成双人核对、三重包装、专人运输和交接追踪。',
        effects: {
          metricChanges: {
            specimenStatus: sourceMetric(null, 'status', 'M2-2｜效果反馈/数据', '规范路径无泄漏，17:40 到达实验室', '专人运输中'),
            laboratoryDelay: sourceMetric(0, 'minutes', 'M2-2｜效果反馈/数据', '规范路径未增加实验室延迟'),
            exposureInvestigation: derivedMetric(null, 'status', 'M2-2｜规范路径', '外包装未发生模拟污染', '未触发'),
          },
          module2Changes: { samplingProtocol: 'standardized', specimenStatus: 'in-transit', outerPackagingContamination: false, exposureInvestigationStarted: false, laboratoryDelayMinutes: 0 },
          sceneChanges: { kind: 'sampling', patientLocation: 'designated-hospital', interaction: 'sampling-standardized', specimenVisual: 'in-transit' },
          scheduledConsequences: [{
            id: 'm22-a-lab-1740', type: 'specimen-received', sourceEventId: 'M2-2', executeAt: '2026-08-05T17:40:00+08:00',
            provenance: scheduledSourceConsequence('M2-2｜效果反馈/数据', '规范路径标本于 17:40 到达实验室'),
            effects: {
              metricChanges: { specimenStatus: sourceMetric(null, 'status', 'M2-2｜效果反馈/数据', '17:40 到达实验室', '实验室已接收') },
              module2Changes: { specimenStatus: 'received', specimenReachedLaboratoryAt: '17:40' },
              sceneChanges: { specimenVisual: 'received' },
              eventLog: [{ id: 'm22-a-received', time: '17:40', title: '标本到达实验室', detail: '包装完整，交接追踪记录已闭环。', tone: 'complete' }],
            },
          }],
          eventLog: [{ id: 'm22-a-package', time: '13:30 后', title: '规范采样与三重包装完成', detail: '双人核对后由专人运输，禁止使用气动物流。', tone: 'active' }],
          outcome: { label: '规范采样流程已完成', summary: '必要检测项目由专家确定，标本经双人核对和三重包装后进入专人运输。', facts: ['外包装无泄漏', '计划 17:40 到达实验室'] },
          situationSummary: '标本包装与交接状态稳定，实验室流程未增加额外延迟。',
        },
      },
      {
        id: 'routine-multi-test', code: 'B', title: '按常规流程尽快完成采样送检',
        description: '优先推进常规采样和送检，未完成高致病性病原体专项包装与交接核对。',
        effects: {
          metricChanges: {
            specimenStatus: sourceMetric(null, 'status', 'M2-2｜效果反馈/数据', '外层污染模拟阳性', '外包装污染待处置'),
            laboratoryDelay: sourceMetric(240, 'minutes', 'M2-2｜效果反馈/数据', '实验室流程延迟 4 小时', '+4h'),
            exposureInvestigation: sourceMetric(null, 'status', 'M2-2｜效果反馈/数据', '启动暴露调查', '已启动'),
          },
          module2Changes: { samplingProtocol: 'routine-multi-test', specimenStatus: 'processing-delayed', outerPackagingContamination: true, exposureInvestigationStarted: true, laboratoryDelayMinutes: 240 },
          sceneChanges: { kind: 'sampling', patientLocation: 'designated-hospital', interaction: 'sampling-routine', specimenVisual: 'contaminated' },
          eventLog: [{ id: 'm22-b-contamination', time: '送检交接时', title: '外包装污染模拟阳性', detail: '暴露调查启动，实验室流程延迟 4 小时；未据此推断感染。', tone: 'alert' }],
          outcome: { label: '标本外包装进入污染处置', summary: '外层包装污染模拟阳性，相关人员进入暴露调查，实验室流程受到延迟。', facts: ['暴露调查已启动', '实验室流程延迟 4 小时', '不等同于人员感染'] },
          situationSummary: '标本处置缺陷增加暴露调查工作量，并将 4 小时实验室延迟传递到后续响应。',
        },
      },
    ],
  },
  'M2-3': {
    id: 'M2-3', module: 2, kind: 'decision', sceneKind: 'laboratory',
    title: '实验室初筛阳性', date: '2026.08.06', time: '06:30', isoTime: '2026-08-06T06:30:00+08:00',
    description: '市级实验室报告 EBOV 核酸初筛阳性，疟原虫检测阴性；复核结果预计约 12 小时后形成。',
    characters: ['实验室人员', '疾控人员', '卫健应急人员'], organizations: ['市级实验室', '卫生健康部门', '疾病预防控制机构'],
    visibleMetrics: ['suspectedCases', 'tracingActivation', 'tracingProgress', 'laboratoryDelay'], nextEvent: 'M2-4', decisionTreeLabel: '初筛阳性响应',
    situationSummary: '初筛结果已经显著提高事件等级，需要决定是否在最终复核前启动接触者追踪和联合响应。',
    provenance: sourceFact('M2-3｜事件注入'),
    decisions: [
      {
        id: 'escalate-on-screening', code: 'A', title: '按高度疑似状态立即全面启动追踪',
        description: '最终复核前即启动接触者调查、风险分类和持续追踪。',
        effects: {
          metricChanges: {
            tracingActivation: sourceMetric(null, 'status', 'M2-3｜干预和措施', '初筛阳性后立即启动追踪', '已启动'),
            tracingProgress: derivedMetric(null, 'percent', 'M2-3｜效果执行中', '92% 在 18:00 的定时后果执行', '截至 18:00', '追踪中'),
          },
          module2Changes: { preliminaryPositive: true, tracingMode: 'full', fullTracingActivated: true },
          sceneChanges: { kind: 'laboratory', interaction: 'laboratory-alert' },
          scheduledConsequences: [{
            id: 'm23-a-tracing-1800', type: 'tracing-progress', sourceEventId: 'M2-3', executeAt: '2026-08-06T18:00:00+08:00',
            provenance: scheduledSourceConsequence('M2-3｜效果反馈/数据', '全面启动路径截至 18:00 找到首批高风险接触者 92%'),
            effects: {
              metricChanges: { tracingProgress: sourceMetric(92, 'percent', 'M2-3｜效果反馈/数据', '18:00 已找到首批高风险接触者 92%') },
              module2Changes: { highRiskContactFindingProgress: 92, findingProgressAsOf: '18:00' },
              eventLog: [{ id: 'm23-a-progress', time: '18:00', title: '首批高风险接触者查找进展更新', detail: '已找到 92%；风险分类与人数将在接触者模块中展开。', tone: 'complete' }],
            },
          }],
          eventLog: [{ id: 'm23-a-escalate', time: '06:30', title: '高度疑似响应升级', detail: '接触者追踪、续报与风险评估立即启动。', tone: 'active' }],
          outcome: { label: '追踪与续报已经启动', summary: '系统按高度疑似状态升级，不等待最终复核结果。', facts: ['18:00 首批高风险接触者找到率：92%', '最终风险分类尚待后续模块完成'] },
          situationSummary: '追踪已经启动；既往响应延迟、评估工作量和实验室延迟仍会共同影响执行压力。',
        },
      },
      {
        id: 'await-confirmation', code: 'B', title: '先开展基础名单核查，等待复核后全面升级',
        description: '先核实名单并进行初步联系，最终确证后再进入全面追踪。',
        effects: {
          metricChanges: {
            tracingActivation: derivedMetric(null, 'status', 'M2-3｜等待复核路径', '61% 结果说明确证前已有基础名单核查与初步联系，但尚未全面追踪', '基础调查中'),
            tracingProgress: derivedMetric(null, 'percent', 'M2-3｜效果执行中', '61% 在 18:00 的定时后果执行', '截至 18:00', '有限查找'),
          },
          module2Changes: { preliminaryPositive: true, tracingMode: 'preliminary', fullTracingActivated: false },
          sceneChanges: { kind: 'laboratory', interaction: 'laboratory-alert' },
          scheduledConsequences: [{
            id: 'm23-b-tracing-1800', type: 'tracing-progress', sourceEventId: 'M2-3', executeAt: '2026-08-06T18:00:00+08:00',
            provenance: scheduledSourceConsequence('M2-3｜效果反馈/数据', '基础调查路径截至 18:00 找到首批高风险接触者 61%'),
            effects: {
              metricChanges: { tracingProgress: sourceMetric(61, 'percent', 'M2-3｜效果反馈/数据', '等待复核路径截至 18:00 仅找到 61%') },
              module2Changes: { highRiskContactFindingProgress: 61, findingProgressAsOf: '18:00' },
              eventLog: [{ id: 'm23-b-progress', time: '18:00', title: '基础调查进展更新', detail: '通过名单核实和初步联系，截至 18:00 找到 61%。', tone: 'alert' }],
            },
          }],
          eventLog: [{ id: 'm23-b-wait', time: '06:30', title: '基础名单核查启动', detail: '先开展名单核实、初步联系和地址确认，确证后再全面升级追踪。', tone: 'active' }],
          outcome: { label: '基础调查已经启动', summary: '系统先进行必要的信息核实与初步联系，等待复核后全面升级。', facts: ['18:00 首批高风险接触者找到率：61%', '确证前为基础调查，确证后全面追踪'] },
          situationSummary: '基础名单核查和初步联系已经启动；全面风险分类与持续追踪等待复核后升级。',
        },
      },
    ],
  },
  'M2-4': {
    id: 'M2-4', module: 2, kind: 'milestone', sceneKind: 'laboratory',
    title: '复核确证', date: '2026.08.06', time: '18:40', isoTime: '2026-08-06T18:40:00+08:00',
    description: '复核实验室报告 EBOV 核酸阳性，Ct 22.6；样本符合质量要求。',
    characters: ['复核实验室人员', '疾控人员', '联合指挥人员'], organizations: ['复核实验室', '卫生健康部门', '疾病预防控制机构'],
    visibleMetrics: ['confirmedCases', 'suspectedCases', 'tracingProgress', 'cdcResponse'], nextEvent: null, decisionTreeLabel: '复核确证',
    situationSummary: '复核结果已形成，病例口径、联合指挥和统一信息发布目标同步启动。',
    provenance: sourceFact('M2-4｜事件注入与复核结果'),
    decisions: [],
  },
  'M3-1': {
    id: 'M3-1', module: 3, kind: 'decision', sceneKind: 'tracing-command',
    title: '首轮名单', date: '2026.08.06', time: '19:30', isoTime: '2026-08-06T19:30:00+08:00',
    description: '首轮汇总 126 人需要调查，其中 18 人缺少电话号码、9 人身份信息不完整。需调查人员尚未等同于风险接触者。',
    characters: ['接触者调查组', '流调人员', '信息核查人员'], organizations: ['市疾病预防控制机构', '区级调查组', '交通与航空协查单位'],
    visibleMetrics: ['investigationTotal', 'initialHighRiskLocateRate', 'classificationStatus', 'missingContact'], nextEvent: 'M3-2', decisionTreeLabel: '首轮名单',
    situationSummary: '126 人是需要逐一调查的初始名单，不是 126 名密切接触者；需要确定名单管理和风险分类方式。',
    provenance: sourceFact('M3-1｜事件注入与首轮需调查名单'),
    decisions: [
      {
        id: 'classify-investigation-list', code: 'A', title: '按暴露信息逐人分类并建立监测',
        description: '依据最后暴露时间、接触方式和体液暴露，逐人分类并确定每日监测方式。',
        effects: {
          metricChanges: { classificationStatus: derivedMetric(null, 'status', 'M3-1｜逐人风险分类', '风险分类流程已启动，源脚本未提供该时点完成比例', '分类进行中') },
          module3Changes: { initialListManagementMode: 'risk-based', investigationStatus: 'contacted', riskClassificationStatus: 'in-progress', contactInfrastructureEstablished: true, lastExposureTrackingEnabled: true },
          sceneChanges: { kind: 'tracing-command', interaction: 'contact-investigation' },
          eventLog: [{ id: 'm31-a-classify', time: '19:30', title: '逐人风险分类启动', detail: '调查组依据最后暴露、接触方式和体液暴露建立分类与监测记录。', tone: 'active' }],
          outcome: { label: '分层调查流程已建立', summary: '126 名调查对象进入逐人核实和风险分类流程，不预先等同于密切接触者。', facts: ['24 小时调查完成目标 ≥90%', '48 小时内完成全部风险分类', '高风险失访目标：0'] },
          situationSummary: '逐人分类和监测记录已经建立；既有 92%/61% 仅表示首批高风险接触者找到率，不作为 126 人名单的完成比例。',
        },
      },
      {
        id: 'uniform-interim-management', code: 'B', title: '分类完成前先统一管理调查对象',
        description: '先对 126 名调查对象采取统一临时管理，再逐步补齐信息并完成风险分类。',
        effects: {
          metricChanges: { classificationStatus: derivedMetric(null, 'status', 'M3-1｜统一临时管理', '分类仍需继续，未虚构额外成本或完成比例', '统一管理中') },
          module3Changes: { initialListManagementMode: 'uniform-interim', investigationStatus: 'contacted', riskClassificationStatus: 'in-progress', contactInfrastructureEstablished: true, lastExposureTrackingEnabled: true },
          sceneChanges: { kind: 'tracing-command', interaction: 'contact-investigation' },
          eventLog: [{ id: 'm31-b-uniform', time: '19:30', title: '统一临时管理启动', detail: '调查对象先进入统一管理，风险分类与信息补全继续推进。', tone: 'active' }],
          outcome: { label: '统一临时管理已启动', summary: '126 名调查对象暂按统一方式管理，同时继续完成逐人分类；这不代表 126 人均为密切接触者。', facts: ['24 小时调查完成目标 ≥90%', '48 小时内完成全部风险分类', '未添加未经来源支持的成本数值'] },
          situationSummary: '统一临时管理扩大了当前管理范围，但名单仍必须依据真实暴露逐人分类。',
        },
      },
    ],
  },
  'M3-2': {
    id: 'M3-2', module: 3, kind: 'decision', sceneKind: 'aircraft',
    title: '航班争议', date: '2026.08.07', time: '09:00', isoTime: '2026-08-07T09:00:00+08:00',
    description: '首轮名单中的航班相关调查对象为 39 人。此后媒体称“全航班 298 人都是密接”，舆情争议触发对 298 人的独立全航班暴露风险复核。',
    characters: ['航班调查组', '机组人员', '乘客调查对象'], organizations: ['疾病预防控制机构', '航空公司', '口岸与交通协查单位'],
    visibleMetrics: ['investigationTotal', 'highRiskContacts', 'mediumRiskContacts', 'lowObservationContacts'], nextEvent: 'M3-3', decisionTreeLabel: '航班争议',
    situationSummary: '航班乘客需要依据症状时序、座位、服务行为和体液暴露分类，不能把整架航班直接等同于密切接触者。',
    provenance: sourceFact('M3-2｜事件注入与航班风险分类'),
    decisions: [
      {
        id: 'classify-flight-risk', code: 'A', title: '依据暴露条件完成航班风险分类',
        description: '结合症状时间、座位、服务行为和体液暴露，逐层确定管理范围。',
        effects: {
          metricChanges: {
            highRiskContacts: sourceMetric(7, 'people', 'M3-2｜效果反馈/数据', '航班复核后高风险 7 人'),
            mediumRiskContacts: sourceMetric(18, 'people', 'M3-2｜效果反馈/数据', '航班复核后中风险 18 人'),
            lowObservationContacts: sourceMetric(39, 'people', 'M3-2｜效果反馈/数据', '航班复核后低风险观察 39 人'),
          },
          module3Changes: { flightReviewCompleted: true, flightManagementMode: 'risk-based', flightHighRisk: 7, flightMediumRisk: 18, flightLowObservation: 39, flightExcludedFromActiveMonitoring: 234 },
          sceneChanges: { kind: 'aircraft', interaction: 'flight-classification' },
          eventLog: [{ id: 'm32-a-flight-review', time: '09:00 后', title: '航班风险分类完成', detail: '复核形成高风险 7 人、中风险 18 人、低风险观察 39 人；其余乘客不纳入主动监测。', tone: 'complete' }],
          outcome: { label: '航班人员已完成分层', summary: '座位关系、服务行为和体液暴露共同决定管理级别，而非仅以同乘航班判定。', facts: ['高风险：7 人', '中风险：18 人', '低风险观察：39 人', '其余乘客不纳入主动监测'] },
          situationSummary: '航班调查已从“298 人全部密接”的单一叙事转为基于有效暴露的分层管理。',
        },
      },
      {
        id: 'uniform-flight-management', code: 'B', title: '分类完成前统一强化管理航班人员',
        description: '先对全航班人员采取统一强化管理，并同步完成座位和暴露复核。',
        effects: {
          metricChanges: {
            highRiskContacts: sourceMetric(7, 'people', 'M3-2｜效果反馈/数据', '航班复核后高风险 7 人'),
            mediumRiskContacts: sourceMetric(18, 'people', 'M3-2｜效果反馈/数据', '航班复核后中风险 18 人'),
            lowObservationContacts: sourceMetric(39, 'people', 'M3-2｜效果反馈/数据', '航班复核后低风险观察 39 人'),
          },
          module3Changes: { flightReviewCompleted: true, flightManagementMode: 'uniform-interim', flightHighRisk: 7, flightMediumRisk: 18, flightLowObservation: 39, flightExcludedFromActiveMonitoring: 234 },
          sceneChanges: { kind: 'aircraft', interaction: 'flight-classification' },
          eventLog: [{ id: 'm32-b-flight-review', time: '风险复核后', title: '统一管理下完成航班分类', detail: '初期管理范围较广，复核后仍按 7/18/39 形成分层，其余乘客退出主动监测。', tone: 'complete' }],
          outcome: { label: '统一管理后完成风险复核', summary: '全航班人员先进入强化管理，但最终仍依据症状时序和有效暴露完成分类。', facts: ['高风险：7 人', '中风险：18 人', '低风险观察：39 人', '其余乘客退出主动监测'] },
          situationSummary: '航班人员已经完成风险分类；统一临时管理形成较高协调压力，但没有改变源脚本的最终分类结果。',
        },
      },
    ],
  },
  'M3-3': {
    id: 'M3-3', module: 3, kind: 'decision', sceneKind: 'cross-region',
    title: '失联人员', date: '2026.08.08', time: '16:00', isoTime: '2026-08-08T16:00:00+08:00',
    description: '一名同行人员手机关机、登记地址无人，社交媒体信息提示其可能已前往外省。具体目的地尚未核实。',
    characters: ['失联同行人员', '跨区域协查人员', '接收地调查人员'], organizations: ['深圳市疾病预防控制机构', '跨区域协查机构'],
    visibleMetrics: ['missingContact', 'classificationStatus', 'monitoringStatus', 'highRiskContacts'], nextEvent: null, decisionTreeLabel: '失联人员',
    situationSummary: '当前需要在最小必要信息快速协查与等待完整身份行程之间确定协调方式；演练不指定真实外省目的地。',
    provenance: sourceFact('M3-3｜事件注入与跨区域协查'),
    decisions: [
      {
        id: 'minimum-info-coordination', code: 'A', title: '以最小必要信息立即启动跨区域协查',
        description: '要求接收确认、每日反馈和结案回执，并继续补充身份与行程信息。',
        effects: {
          metricChanges: { missingContact: derivedMetric(null, 'status', 'M3-3｜跨区域协查进行中', '6 小时内找到的源结果尚未执行', '跨区域查找中') },
          module3Changes: { missingTravelerStatus: 'searching', crossRegionCoordinationMode: 'minimum-necessary', crossRegionCoordinationStatus: 'active', lostToFollowUpStatus: 'active' },
          sceneChanges: { kind: 'cross-region', interaction: 'cross-region-coordination' },
          scheduledConsequences: [{
            id: 'm33-a-found-within-6h', type: 'missing-traveler-found', sourceEventId: 'M3-3', executeAt: '2026-08-08T22:00:00+08:00',
            provenance: simulationAssumption('M3-3｜6 小时内找到', '22:00 仅作为“6 小时内”后果的内部执行边界，正常 UI 不宣称精确找到时刻'),
            effects: {
              metricChanges: { missingContact: sourceMetric(null, 'status', 'M3-3｜效果反馈/数据', '6 小时内找到且无新增暴露', '已找到') },
              module3Changes: { missingTravelerStatus: 'found', resolutionDelay: 'within-6h', dinnerAttendees: 0, dinnerOccurredWhileAsymptomatic: false, effectiveExposureEvent: false, riskCommunicationOnly: false, crossRegionCoordinationStatus: 'closed-loop', lostToFollowUpStatus: 'resolved' },
              eventLog: [{ id: 'm33-a-found', time: '6 小时内', title: '跨区域协查找到失联人员', detail: '接收确认和反馈链闭环，未发现新的有效暴露事件。', tone: 'complete' }],
            },
          }],
          eventLog: [{ id: 'm33-a-coordinate', time: '16:00', title: '最小必要信息协查启动', detail: '协查信息已传递，并要求接收确认、每日反馈和结案回执。', tone: 'active' }],
          outcome: { label: '跨区域协查已经启动', summary: '接收地先依据最小必要信息开展查找，身份和行程细节同步补充。', facts: ['源结果：6 小时内找到', '未发现新增有效暴露', '演练不指定真实目的地'] },
          situationSummary: '跨区域协查链已经启动；找到结果将在时间推进后执行。',
        },
      },
      {
        id: 'await-complete-itinerary', code: 'B', title: '待身份与行程明确后启动正式协查',
        description: '继续核实身份、地址和出行信息，信息较完整后再发送正式协查。',
        effects: {
          metricChanges: { missingContact: derivedMetric(null, 'status', 'M3-3｜信息补全路径', '24 小时后找到的源结果尚未执行', '信息核实中') },
          module3Changes: { missingTravelerStatus: 'searching', crossRegionCoordinationMode: 'awaiting-details', crossRegionCoordinationStatus: 'active', lostToFollowUpStatus: 'active' },
          sceneChanges: { kind: 'cross-region', interaction: 'cross-region-coordination' },
          scheduledConsequences: [{
            id: 'm33-b-found-after-24h', type: 'missing-traveler-found', sourceEventId: 'M3-3', executeAt: '2026-08-09T16:01:00+08:00',
            provenance: simulationAssumption('M3-3｜24 小时后找到', '16:01 仅为引擎表达“24 小时后”的内部时刻，正常 UI 不展示该精确分钟'),
            effects: {
              metricChanges: { missingContact: sourceMetric(null, 'status', 'M3-3｜效果反馈/数据', '24 小时后找到；曾参加 12 人聚餐但当时无症状', '已找到') },
              module3Changes: { missingTravelerStatus: 'found', resolutionDelay: 'after-24h', dinnerAttendees: 12, dinnerOccurredWhileAsymptomatic: true, effectiveExposureEvent: false, riskCommunicationOnly: true, crossRegionCoordinationStatus: 'closed-loop', lostToFollowUpStatus: 'resolved' },
              eventLog: [{ id: 'm33-b-found', time: '24 小时后', title: '失联人员被找到', detail: '其曾参加 12 人聚餐，但当时无症状，未形成有效传播事件；仅需风险沟通。', tone: 'complete' }],
            },
          }],
          eventLog: [{ id: 'm33-b-verify', time: '16:00', title: '继续补全身份与行程', detail: '正式跨区域协查等待更完整的信息。', tone: 'active' }],
          outcome: { label: '身份与行程核实继续', summary: '调查组先补充关键信息，再启动正式跨区域协查。', facts: ['源结果：24 小时后找到', '曾参加 12 人聚餐', '聚餐时无症状，不形成有效传播事件'] },
          situationSummary: '失联人员查找仍在继续；是否形成有效暴露必须依据其当时症状与暴露方式判断。',
        },
      },
    ],
  },
  'M4-1': {
    id: 'M4-1', module: 4, kind: 'decision', sceneKind: 'monitoring-point',
    title: '监测报警', date: '2026.08.10', time: '07:20', isoTime: '2026-08-10T07:20:00+08:00',
    description: '沈洁在集中健康监测点出现 38.1℃、乏力和恶心，距最后接触 7 天。',
    characters: ['沈洁', '健康监测人员', '转运人员', '沈洁的女儿'], organizations: ['集中健康监测点', '疾病预防控制机构', '定点医院'],
    visibleMetrics: ['secondaryCaseStatus', 'monitoringStatus', 'transferStatus', 'highRiskContacts'], nextEvent: 'M4-2', decisionTreeLabel: '监测报警',
    situationSummary: '一名正在个体健康监测中的接触者触发症状报警，需要决定分离与转运如何同步推进。',
    provenance: sourceFact('M4-1｜监测报警事件注入'),
    decisions: [
      {
        id: 'immediate-monitoring-separation', code: 'A', title: '立即分开并同步启动转运',
        description: '同步联系转运、采样并重新核对最后暴露时间。',
        effects: {
          metricChanges: {
            transferStatus: derivedMetric(null, 'status', 'M4-1｜即时响应进行中', '50 分钟内完成转运的后果尚未执行', '转运准备中'),
            highRiskContacts: sourceMetric(11, 'people', 'M4-1｜高风险接触者基线', '及时响应路径没有新增高风险接触者'),
          },
          module4Changes: { separationStatus: 'immediate', transferStatus: 'preparing', transferDelayMinutes: 50 },
          sceneChanges: { kind: 'monitoring-point', interaction: 'monitoring-alert', transferMotion: 'preparing' },
          scheduledConsequences: [{
            id: 'm41-a-transfer-within-50m', type: 'monitoring-transfer-completed', sourceEventId: 'M4-1', executeAt: '2026-08-10T08:10:00+08:00',
            provenance: scheduledSourceConsequence('M4-1｜50 分钟内完成转运', '源脚本支持“50 分钟内完成”；08:10 仅作为该上限的内部执行边界'),
            effects: {
              metricChanges: { transferStatus: sourceMetric(null, 'status', 'M4-1｜效果反馈/数据', '转运在 50 分钟内完成', '50 分钟内完成') },
              module4Changes: { transferStatus: 'completed', transferCompletedWithinMinutes: 50, sharedBathroomExposureDurationMinutes: 0, sharedBathroomExposureOccurred: false, additionalHighRiskContacts: 0, totalHighRiskContacts: 11 },
              sceneChanges: { transferMotion: 'arrived' },
              eventLog: [{ id: 'm41-a-transfer', time: '50 分钟内', title: '沈洁完成分离与转运', detail: '未形成同住或其他监测人员暴露；高风险接触者保持 11 人。', tone: 'complete' }],
            },
          }],
          eventLog: [{ id: 'm41-a-start', time: '07:20', title: '症状报警响应启动', detail: '沈洁与其他监测人员分开，转运、采样与暴露时间核对同步启动。', tone: 'active' }],
          outcome: { label: '分离与转运同步启动', summary: '监测点已经启动受控分离和医疗转运准备。', facts: ['转运目标：50 分钟内完成', '新增高风险接触者：0 人'] },
          situationSummary: '沈洁已经与其他监测人员分开，转运和采样准备同步进行。',
        },
      },
      {
        id: 'continue-monitoring-assessment', code: 'B', title: '暂按原监测流程继续评估',
        description: '进一步确认症状和转运条件后，再升级分离与转运。',
        effects: {
          metricChanges: { transferStatus: derivedMetric(null, 'status', 'M4-1｜延迟路径', '4 小时后果尚未执行', '等待升级'), highRiskContacts: sourceMetric(11, 'people', 'M4-1｜高风险接触者基线') },
          module4Changes: { separationStatus: 'delayed', transferStatus: 'waiting', transferDelayMinutes: 240 },
          sceneChanges: { kind: 'monitoring-point', interaction: 'monitoring-alert', transferMotion: 'waiting' },
          scheduledConsequences: [{
            id: 'm41-b-transfer-after-4h', type: 'monitoring-transfer-completed', sourceEventId: 'M4-1', executeAt: '2026-08-10T11:20:00+08:00',
            provenance: scheduledSourceConsequence('M4-1｜效果反馈/数据', '延迟 4 小时、共用卫生间及新增 5 名高风险接触者由源脚本明确给出'),
            effects: {
              metricChanges: { transferStatus: sourceMetric(null, 'status', 'M4-1｜效果反馈/数据', '延迟 4 小时后完成处置', '延迟 4 小时'), highRiskContacts: sourceMetric(16, 'people', 'M4-1｜效果反馈/数据', '高风险接触者由 11 增至 16') },
              module4Changes: { transferStatus: 'completed', sharedBathroomExposureDurationMinutes: 240, sharedBathroomExposureOccurred: true, additionalHighRiskContacts: 5, totalHighRiskContacts: 16 },
              sceneChanges: { transferMotion: 'arrived', exposureEvent: true },
              eventLog: [{ id: 'm41-b-exposure', time: '延迟 4 小时期间', title: '共用卫生间暴露管理启动', detail: '沈洁与其他监测人员共用卫生间，新增 5 人被判定为高风险接触者；不等同于感染。', tone: 'alert' }],
            },
          }],
          eventLog: [{ id: 'm41-b-wait', time: '07:20', title: '继续原监测流程', detail: '分离与转运升级暂缓，症状评估继续。', tone: 'active' }],
          outcome: { label: '继续监测评估', summary: '沈洁暂未完成独立分离，转运状态保持等待。', facts: ['处置延迟：4 小时', '后果将在时间推进时执行'] },
          situationSummary: '症状报警尚未转入即时分离，监测点内的暴露管理窗口仍然开放。',
        },
      },
    ],
  },
  'M4-2': {
    id: 'M4-2', module: 4, kind: 'milestone', sceneKind: 'secondary-confirmation',
    title: '检测结果', date: '2026.08.10', time: '15:30', isoTime: '2026-08-10T15:30:00+08:00',
    description: '沈洁首份 EBOV 核酸阳性，Ct 27.9；基因序列与指示病例高度一致，按续发病例管理。',
    characters: ['沈洁', '实验室人员', '流行病学调查人员'], organizations: ['定点医院', '实验室', '疾病预防控制机构'],
    visibleMetrics: ['confirmedCases', 'secondaryCaseStatus', 'isolationBeds', 'highRiskContacts'], nextEvent: 'M4-3', decisionTreeLabel: '检测结果',
    situationSummary: '沈洁成为第二例确诊病例；传播链和风险评估需要更新，但此前转运分支造成的暴露管理后果必须保留。',
    provenance: sourceFact('M4-2｜检测结果与续发病例管理'), decisions: [],
  },
  'M4-3': {
    id: 'M4-3', module: 4, kind: 'decision', sceneKind: 'child-care',
    title: '儿童照护', date: '2026.08.12', time: '08:00', isoTime: '2026-08-12T08:00:00+08:00',
    description: '沈洁 8 岁女儿 EBOV 核酸阴性、无症状，当前无监护人；外祖母要求将其接回家。',
    characters: ['沈洁的女儿', '外祖母', '儿童保护与社区工作人员', '医疗人员'], organizations: ['民政与儿童保护机构', '妇联', '医疗机构', '社区支持单位'],
    visibleMetrics: ['childCareStatus', 'temperatureMonitoringCompliance'], nextEvent: null, decisionTreeLabel: '儿童照护',
    situationSummary: '检测阴性且无症状的儿童仍需要稳定监护、健康监测、心理支持和远程亲子联系。',
    provenance: sourceFact('M4-3｜儿童照护事件注入'),
    decisions: [
      {
        id: 'coordinated-child-care', code: 'A', title: '建立联合照护与家庭联系方案',
        description: '明确监护安排，并提供心理支持和远程亲子联系。',
        effects: {
          metricChanges: { childCareStatus: sourceMetric(null, 'status', 'M4-3｜效果反馈/数据', '照护保持稳定', '联合照护稳定'), temperatureMonitoringCompliance: sourceMetric(100, 'percent', 'M4-3｜效果反馈/数据', '每日体温监测依从性 100%') },
          module4Changes: { childCareMode: 'coordinated', careStable: true, temperatureMonitoringCompliance: 100, familyMonitoringSiteConflictEvent: false },
          sceneChanges: { kind: 'child-care', interaction: 'child-care-coordination', phoneMode: 'family-video' },
          eventLog: [{ id: 'm43-a-care', time: '08:00 后', title: '儿童联合照护方案建立', detail: '监护、心理支持与远程亲子联系形成闭环；每日体温监测依从性 100%。', tone: 'complete' }],
          outcome: { label: '联合照护方案已建立', summary: '儿童照护保持稳定，健康监测与家庭联系同步延续。', facts: ['女儿：核酸阴性、无症状', '每日体温监测依从性：100%'] },
          situationSummary: '儿童联合照护已经形成闭环，没有产生新的病例或传播事件。',
        },
      },
      {
        id: 'immediate-guardianship', code: 'B', title: '优先解决当前监护需求',
        description: '正式联合方案完成前，先安排家属处理当前照护。',
        effects: {
          metricChanges: { childCareStatus: sourceMetric(null, 'status', 'M4-3｜效果反馈/数据', '出现模拟家属强行进入监测点事件', '照护协调受阻'), temperatureMonitoringCompliance: derivedMetric(null, 'percent', 'M4-3｜照护协调路径', '源脚本未提供该分支监测依从率', '待协调') },
          module4Changes: { childCareMode: 'immediate-guardianship', careStable: false, temperatureMonitoringCompliance: null, familyMonitoringSiteConflictEvent: true },
          sceneChanges: { kind: 'child-care', interaction: 'child-care-coordination' },
          eventLog: [{ id: 'm43-b-conflict', time: '照护协调期间', title: '监测点出现家属进入冲突', detail: '模拟家属试图强行进入监测点；未产生儿童或家属感染。', tone: 'alert' }],
          outcome: { label: '当前监护需求优先处理', summary: '家属照护诉求先行，但联合照护与监测点秩序仍需继续协调。', facts: ['女儿：核酸阴性、无症状', '出现模拟家属进入冲突'] },
          situationSummary: '当前监护诉求尚未形成稳定联合方案，监测点秩序与家庭沟通需要继续协调。',
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
  'transfer-vehicle': { eyebrow: '转运资源 · 专用车辆', title: '感染性疾病转运车辆', body: '车辆状态与感染控制准备共同决定患者何时能够安全离开隔离区域。' },
  'transfer-team': { eyebrow: '响应人员 · 转运组', title: '专业转运组', body: '负责个人防护、患者装载、车内污染控制和接收交接。' },
  'transfer-route': { eyebrow: '医疗转运 · 演练路线', title: '市中心医院 → 定点医院', body: '该线路表达患者医疗转运，不代表疾病传播。' },
  'sampling-station': { eyebrow: '采样控制点', title: '规范采样工作站', body: '由专家确定必要项目，并通过双人核对降低采样与标识差错。' },
  'sample-package': { eyebrow: '标本状态', title: '三重包装与外层检查', body: '包装完整性、外层清洁和清晰标识决定后续运输与实验室接收状态。' },
  'handover-route': { eyebrow: '标本运输', title: '专人运输与交接追踪', body: '该线路表达标本交接，不代表患者移动或疾病传播。' },
}
