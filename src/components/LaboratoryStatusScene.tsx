import type { Module2State } from '../simulation/types'

export function LaboratoryStatusScene({ module2 }: { module2: Module2State }) {
  const confirmed = module2.confirmed
  const progress = module2.highRiskContactFindingProgress
  return (
    <section className="scene-panel laboratory-status-scene" aria-labelledby="laboratory-scene-title">
      <div className="panel-heading scene-heading"><div><span className="eyebrow"><b>实验室与联合响应</b><small>LAB STATUS</small></span><h2 id="laboratory-scene-title">核酸检测 · 响应升级</h2></div></div>
      <div className={`laboratory-command-visual ${confirmed ? 'confirmed' : 'screening-positive'}`}>
        <div className="lab-ambient-grid" aria-hidden="true"/>
        <section className="lab-result-core">
          <span>{confirmed ? '复核结果' : '市级初筛'}</span>
          <div className="lab-result-orbit"><i/><i/><i/><strong>EBOV</strong></div>
          <h3>核酸{confirmed ? '复核阳性' : '初筛阳性'}</h3>
          <p>{confirmed ? 'Ct 22.6 · 样本质量符合要求' : '疟原虫检测阴性 · 复核进行中'}</p>
        </section>
        <section className="lab-process-line" aria-label="实验室与响应流程">
          <article className="complete"><i>01</i><span>标本接收</span><strong>{module2.specimenReachedLaboratoryAt ?? (module2.laboratoryDelayMinutes ? '流程延迟' : '已完成')}</strong></article>
          <b/>
          <article className="complete"><i>02</i><span>核酸初筛</span><strong>阳性</strong></article>
          <b/>
          <article className={confirmed ? 'complete' : 'active'}><i>03</i><span>复核检测</span><strong>{confirmed ? '阳性' : '进行中'}</strong></article>
          <b/>
          <article className={confirmed ? 'complete' : ''}><i>04</i><span>追踪响应</span><strong>{confirmed ? '全面启动' : module2.tracingMode === 'full' ? '全面追踪' : module2.tracingMode === 'preliminary' ? '基础调查' : '待启动'}</strong></article>
        </section>
        <aside className="lab-response-readout">
          <div><span>实验室延迟</span><strong>{module2.laboratoryDelayMinutes ? '+4h' : '未增加'}</strong></div>
          <div><span>追踪模式</span><strong>{module2.tracingMode === 'full' ? '全面追踪' : module2.tracingMode === 'preliminary' ? '基础调查' : '待启动'}</strong></div>
          <div><span>18:00 查找进展</span><strong>{progress === null ? '待更新' : `${progress}%`}</strong></div>
        </aside>
      </div>
    </section>
  )
}
