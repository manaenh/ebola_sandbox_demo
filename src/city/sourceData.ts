import type { CityLocationDefinition } from './types'

export const cityLocationCatalog: CityLocationDefinition[] = [
  {
    id: 'airport', name: '深圳宝安国际机场', shortLabel: '深圳机场', category: 'trajectory', icon: 'airport',
    coordinates: [113.8030964, 22.6403727], coordinateKind: 'real', visibleByDefault: true,
    hasScene: false, relatedEvents: [],
    sourceNote: '真实地理参照：深圳宝安国际机场。演练脚本记录周启航于 08月02日乘 BH217 航班 38A 座入境深圳。',
  },
  {
    id: 'airport-bus', name: '机场巴士', shortLabel: '机场巴士', category: 'trajectory', icon: 'transport',
    coordinates: [113.918, 22.626], coordinateKind: 'scenario', visibleByDefault: false,
    hasScene: false, relatedEvents: [],
    sourceNote: '病例入境后的移动方式。点位仅用于演练轨迹表达，不对应真实站点。',
  },
  {
    id: 'home', name: '周启航家庭', shortLabel: '家庭', category: 'trajectory', icon: 'home',
    coordinates: [114.014, 22.674], coordinateKind: 'scenario', visibleByDefault: true,
    hasScene: false, relatedEvents: [],
    sourceNote: '演练位置：病例入境后的家庭活动点；不对应真实住址，接触情况待后续调查。',
  },
  {
    id: 'convenience-store', name: '便利店', shortLabel: '便利店', category: 'trajectory', icon: 'place',
    coordinates: [114.083, 22.633], coordinateKind: 'scenario', visibleByDefault: false,
    hasScene: false, relatedEvents: [],
    sourceNote: '演练位置：脚本中的便利店活动轨迹；经过不等于有效暴露。',
  },
  {
    id: 'ride-hailing', name: '网约车就诊轨迹', shortLabel: '网约车', category: 'trajectory', icon: 'transport',
    coordinates: [114.155, 22.605], coordinateKind: 'scenario', visibleByDefault: false,
    hasScene: false, relatedEvents: ['M1-1'],
    sourceNote: '演练轨迹：08月05日 10:18，病例乘网约车前往医院；点位不代表真实车辆位置。',
  },
  {
    id: 'central-hospital', name: '市中心医院', shortLabel: '市中心医院', category: 'event', icon: 'hospital',
    coordinates: [114.223, 22.581], coordinateKind: 'scenario', visibleByDefault: true,
    hasScene: true, relatedEvents: ['M1-1', 'M1-2', 'M1-3'],
    sourceNote: '演练位置：08月05日 10:42 进入急诊分诊，是首诊发现与即时控制阶段的当前现场。',
  },
  {
    id: 'cdc', name: '市疾控中心', shortLabel: '市疾控中心', category: 'response', icon: 'response',
    coordinates: [114.115, 22.549], coordinateKind: 'scenario', visibleByDefault: true,
    hasScene: false, relatedEvents: ['M1-3'],
    sourceNote: '演练位置：首次报告后负责启动外部公共卫生响应，不对应真实机构地址。',
  },
  {
    id: 'designated-hospital', name: '定点医院', shortLabel: '定点医院', category: 'response', icon: 'hospital',
    coordinates: [114.302, 22.665], coordinateKind: 'scenario', visibleByDefault: false,
    hasScene: false, relatedEvents: [],
    sourceNote: '后续演练位置，本阶段尚未启用。',
  },
  {
    id: 'laboratory', name: '市级实验室', shortLabel: '市级实验室', category: 'response', icon: 'laboratory',
    coordinates: [114.265, 22.722], coordinateKind: 'scenario', visibleByDefault: false,
    hasScene: false, relatedEvents: [],
    sourceNote: '后续演练位置，本阶段尚未启用。',
  },
]
