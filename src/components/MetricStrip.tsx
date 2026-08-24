import type { MetricKey, MetricValue } from '../simulation/types'

const config: { key: MetricKey; label: string; english: string }[] = [
  { key: 'confirmedCases', label: '确诊病例', english: 'CONFIRMED' },
  { key: 'suspectedCases', label: '疑似病例', english: 'SUSPECTED' },
  { key: 'assessmentRequired', label: '需评估人员', english: 'ASSESSMENT' },
  { key: 'riskContacts', label: '风险接触者', english: 'RISK CONTACTS' },
  { key: 'tracingProgress', label: '追踪进度', english: 'TRACING' },
  { key: 'exposureDuration', label: '暴露时长', english: 'EXPOSURE' },
]

const suffix: Record<MetricValue['unit'], string> = {
  people: '人',
  cases: '例',
  minutes: 'min',
  percent: '%',
  beds: '床',
}

type MetricStripProps = {
  metrics: Record<MetricKey, MetricValue>
  visibleKeys: MetricKey[]
}

export function MetricStrip({ metrics, visibleKeys }: MetricStripProps) {
  const visibleMetrics = config.filter((item) => visibleKeys.includes(item.key))

  return (
    <section className="metric-strip" aria-label="当前疫情与响应指标">
      {visibleMetrics.map((item) => {
        const metric = metrics[item.key]
        return (
          <article
            className={metric.value === null ? 'metric-card pending' : 'metric-card'}
            key={item.key}
            title={metric.context ?? (metric.provenance.kind === 'derived' ? '由源材料派生' : '源材料数据')}
          >
            <div className="metric-heading">
              <span>{item.label}</span>
              <small>{item.english}</small>
            </div>
            <div className="metric-value">
              <strong>{metric.value ?? '—'}</strong>
              <span>{metric.value === null ? '待核实' : suffix[metric.unit]}</span>
            </div>
          </article>
        )
      })}
    </section>
  )
}
