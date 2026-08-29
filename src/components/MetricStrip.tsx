import type { MetricKey, MetricValue } from '../simulation/types'

const config: { key: MetricKey; label: string; english: string }[] = [
  { key: 'confirmedCases', label: '确诊病例', english: 'CONFIRMED' },
  { key: 'suspectedCases', label: '疑似病例', english: 'SUSPECTED' },
  { key: 'assessmentRequired', label: '需评估人员', english: 'ASSESSMENT' },
  { key: 'riskContacts', label: '风险接触者', english: 'RISK CONTACTS' },
  { key: 'tracingProgress', label: '追踪进度', english: 'TRACING' },
  { key: 'exposureDuration', label: '暴露时长', english: 'EXPOSURE' },
  { key: 'publicOpinionRisk', label: '舆情风险', english: '' },
  { key: 'cdcResponse', label: '疾控响应', english: '' },
  { key: 'responseDelay', label: '响应延迟', english: '' },
  { key: 'transferStatus', label: '转运状态', english: '' },
  { key: 'transferWait', label: '转运等待', english: '' },
  { key: 'contaminationPressure', label: '污染处置压力', english: '' },
  { key: 'specimenStatus', label: '标本状态', english: '' },
  { key: 'laboratoryDelay', label: '实验室延迟', english: '' },
  { key: 'exposureInvestigation', label: '暴露调查', english: '' },
  { key: 'tracingActivation', label: '追踪响应', english: '' },
  { key: 'investigationTotal', label: '需调查人员', english: '' },
  { key: 'initialHighRiskLocateRate', label: '首批高风险找到率', english: '' },
  { key: 'classificationStatus', label: '风险分类', english: '' },
  { key: 'highRiskContacts', label: '高风险', english: '' },
  { key: 'mediumRiskContacts', label: '中风险', english: '' },
  { key: 'lowObservationContacts', label: '低风险观察', english: '' },
  { key: 'missingContact', label: '失联人员', english: '' },
  { key: 'monitoringStatus', label: '健康监测', english: '' },
]

const suffix: Record<MetricValue['unit'], string> = {
  people: '人',
  cases: '例',
  minutes: 'min',
  percent: '%',
  beds: '床',
  status: '',
}

type MetricStripProps = {
  metrics: Record<MetricKey, MetricValue>
  visibleKeys: MetricKey[]
}

export function MetricStrip({ metrics, visibleKeys }: MetricStripProps) {
  const visibleMetrics = config.filter((item) => visibleKeys.includes(item.key))

  return (
    <section
      className="metric-strip"
      aria-label="当前疫情与响应指标"
      style={{ gridTemplateColumns: `repeat(${visibleMetrics.length}, minmax(0, 1fr))` }}
    >
      {visibleMetrics.map((item) => {
        const metric = metrics[item.key]
        const hasDisplayValue = metric.displayValue !== undefined
        return (
          <article
            className={metric.value === null && !hasDisplayValue ? 'metric-card pending' : 'metric-card'}
            key={item.key}
            title={metric.context ?? (metric.provenance.kind === 'DERIVED_STATE'
              ? '由源材料与当前状态确定性派生'
              : metric.provenance.kind === 'SIMULATION_ASSUMPTION' ? '模拟假设' : '源材料数据')}
          >
            <div className="metric-heading">
              <span>{item.label}</span>
              {item.english && <small>{item.english}</small>}
            </div>
            <div className="metric-value">
              <strong>{metric.displayValue ?? metric.value ?? '—'}</strong>
              <span>{hasDisplayValue ? '' : metric.value === null ? '待核实' : suffix[metric.unit]}</span>
            </div>
          </article>
        )
      })}
    </section>
  )
}
