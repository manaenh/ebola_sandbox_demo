import type { Module4State } from '../simulation/types'

export function SecondaryConfirmationScene({ module4 }: { module4: Module4State }) {
  return (
    <section className="scene-card secondary-case-scene" aria-label="续发病例确证里程碑">
      <header className="scene-header"><div><span className="eyebrow"><b>检测与传播链更新</b></span><h2>沈洁 · EBOV 核酸阳性</h2></div></header>
      <div className="secondary-confirmation-body">
        <div className="pcr-orbit"><span>Ct</span><strong>27.9</strong><small>首份核酸阳性</small></div>
        <div className="sequence-status"><span>基因序列</span><strong>与指示病例高度一致</strong><small>按续发病例管理</small></div>
        <div className="mini-chain"><article><small>指示病例</small><strong>周启航</strong></article><i>→</i><article className="active"><small>续发病例</small><strong>沈洁</strong></article></div>
        <div className="confirmation-metrics"><span>确诊病例 <b>2</b></span><span>隔离床 <b>{module4.isolationBedsOccupied} / {module4.isolationBedsTotal}</b></span><span>高风险接触者 <b>{module4.totalHighRiskContacts}</b></span></div>
      </div>
    </section>
  )
}
