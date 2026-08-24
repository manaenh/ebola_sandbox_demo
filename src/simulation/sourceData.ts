import type { DecisionOption, HotspotId } from './types'

export const SOURCE_DOCUMENT = '埃博拉病毒病输入性疫情桌面推演脚本（用于创建demon）(发企业）.docx'

export const m11Options: DecisionOption[] = [
  {
    id: 'rapid-epidemiology',
    code: 'A',
    title: '立即升级流行病学问诊',
    description: '追问具体旅行与体液暴露史，并先行采取隔离措施。',
    owner: '急诊分诊 · 院感联动',
    feedback: '11:05 隔离，公共候诊区停留 23 分钟。',
  },
  {
    id: 'staged-assessment',
    code: 'B',
    title: '先完成急诊基础评估',
    description: '根据首轮检查结果，再决定是否升级隔离措施。',
    owner: '急诊分诊 · 临床评估',
    feedback: '12:00 隔离；候诊期间发生一次呕吐，新增需评估人员 21 人。',
  },
]

export const hotspotCopy: Record<HotspotId, { eyebrow: string; title: string; body: string }> = {
  'zhou-qihang': {
    eyebrow: '重点人物 · 病例编号 BH-EVD-001',
    title: '周启航 · 疑似病例',
    body: '38 岁，高热 39.1°C、乏力、腹泻、呕吐。首次仅说明“非洲出差”，焦虑且担心家属受到歧视。',
  },
  'triage-nurse': {
    eyebrow: '医务人员 · 急诊分诊',
    title: '分诊护士',
    body: '负责首轮症状与旅行史采集。当前需要将“非洲出差”细化为具体国家、日期和体液接触史。',
  },
  'triage-desk': {
    eyebrow: '关键控制点 · 急诊分诊台',
    title: '旅行史信息缺口',
    body: '当前旅行史粒度不足。需要继续确认具体国家、时间以及是否存在体液接触。',
  },
  'waiting-area': {
    eyebrow: '空间区域 · 公共候诊区',
    title: '公共候诊区 · 18 人',
    body: '18 是事件发生时场内人数，不代表接触者或密切接触者；需要依据有效暴露逐人评估。',
  },
  'isolation-route': {
    eyebrow: '控制动线 · 隔离区',
    title: '预设隔离通道',
    body: '限制非必要移动，控制人员进出，并为后续报告、采样和专车转运保留清晰动线。',
  },
}
