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
            title={metric.context ?? (metric.provenance.kind === 'derived' ? '由源材料派生' : '源材料数据')}
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
