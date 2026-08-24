import type { CityLocationDefinition } from './types'

export const cityLocationCatalog: CityLocationDefinition[] = [
  {
    id: 'airport', name: '深圳机场 / 入境点', shortLabel: '深圳机场', kind: 'entry',
    x: 176, y: 224, hasScene: false, relatedEvents: [],
    sourceNote: '08月02日，BH217 航班 38A 座入境深圳。',
  },
  {
    id: 'airport-transit', name: '机场交通', shortLabel: '机场交通', kind: 'transport',
    x: 300, y: 284, hasScene: false, relatedEvents: [],
    sourceNote: '入境后的交通轨迹包含机场巴士。',
  },
  {
    id: 'home', name: '周启航家庭', shortLabel: '家庭', kind: 'residence',
    x: 456, y: 236, hasScene: false, relatedEvents: [],
    sourceNote: '入境后的家庭活动点，接触情况待后续调查。',
  },
  {
    id: 'community', name: '便利店 / 社区活动点', shortLabel: '社区活动点', kind: 'community',
    x: 554, y: 344, hasScene: false, relatedEvents: [],
    sourceNote: '入境后的便利店及社区活动轨迹。',
  },
  {
    id: 'ride-hailing', name: '网约车就诊轨迹', shortLabel: '网约车', kind: 'transport',
    x: 678, y: 292, hasScene: false, relatedEvents: ['M1-1'],
    sourceNote: '08月05日 10:18，乘网约车前往医院。',
  },
  {
    id: 'central-hospital', name: '市中心医院', shortLabel: '市中心医院', kind: 'hospital',
    x: 776, y: 202, hasScene: true, relatedEvents: ['M1-1', 'M1-2', 'M1-3'],
    sourceNote: '08月05日 10:42 进入急诊分诊，Module 1 当前现场。',
  },
  {
    id: 'cdc', name: '市疾病预防控制机构', shortLabel: '市疾控机构', kind: 'response',
    x: 732, y: 416, hasScene: false, relatedEvents: ['M1-3'],
    sourceNote: '首次报告后负责启动外部公共卫生响应。',
  },
  {
    id: 'designated-hospital', name: '定点医院', shortLabel: '定点医院', kind: 'hospital',
    x: 850, y: 344, hasScene: false, relatedEvents: [],
    sourceNote: '后续转运场景位置，本模块尚未启用。',
  },
  {
    id: 'laboratory', name: '市级实验室', shortLabel: '市级实验室', kind: 'laboratory',
    x: 896, y: 466, hasScene: false, relatedEvents: [],
    sourceNote: '后续实验室处置位置，本模块尚未启用。',
  },
]
