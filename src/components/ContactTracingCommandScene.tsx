import type { Module2State, Module3State } from '../simulation/types'

const groups = [
  ['家庭', 'family'],
  ['同行', 'companions'],
  ['航班', 'flight'],
  ['医院', 'hospital'],
  ['交通与社区', 'transportCommunity'],
] as const

export function ContactTracingCommandScene({ module2, module3 }: { module2: Module2State; module3: Module3State }) {
  const priorProgress = module2.highRiskContactFindingProgress
  return (
    <section className="scene-panel tracing-command-scene" aria-labelledby="tracing-command-title">
      <div className="panel-heading scene-heading"><div><span className="eyebrow"><b>接触者调查指挥台</b><small>CONTACT TRACING</small></span><h2 id="tracing-command-title">首轮名单 · 调查与风险分类</h2></div></div>
      <div className="tracing-command-visual">
        <div className="tracing-principle"><strong>126 人需要调查</strong><span>≠ 126 名密切接触者</span></div>
        <div className="investigation-core">
          <small>首轮需调查</small><strong>126</strong><span>逐人核实暴露条件</span>
        </div>
        <div className="investigation-clusters" aria-label="首轮调查对象分组">
          {groups.map(([label, key]) => (
            <article key={key}><i/><span>{key === 'flight' ? '航班相关调查对象' : label}</span><strong>{module3.investigationGroups[key]}</strong><small>首轮名单 · 待调查/分类</small></article>
          ))}
        </div>
        <div className="tracing-readiness">
          <article><span>首批高风险找到率</span><strong>{priorProgress ?? '—'}%</strong><small>{priorProgress === 92 ? '高风险未解决工作量相对较低' : '高风险追踪紧迫性较高'} · 非 126 人完成率</small></article>
          <article><span>缺少电话号码</span><strong>18</strong><small>信息缺口</small></article>
          <article><span>身份信息不完整</span><strong>9</strong><small>不可与电话缺口直接相加</small></article>
        </div>
        <div className="tracing-targets">
          <span><b>≥90%</b> 24h 调查完成目标</span>
          <span><b>0</b> 高风险失访目标</span>
          <span><b>48h</b> 全部人员风险分类</span>
        </div>
      </div>
    </section>
  )
}
