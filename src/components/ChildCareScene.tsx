import type { Module4State } from '../simulation/types'

export function ChildCareScene({ module4 }: { module4: Module4State }) {
  return (
    <section className="scene-card child-care-scene" aria-label="儿童照护协调场景">
      <header className="scene-header"><div><span className="eyebrow"><b>儿童照护与社区支持</b></span><h2>监护安排协调</h2></div></header>
      <div className="care-network">
        <CareNode className="child" title="8 岁女儿" detail="核酸阴性 · 无症状" />
        <CareNode className="grandmother" title="外祖母" detail="提出家庭照护诉求" />
        <CareNode className="services" title="联合照护组" detail="儿童保护 · 医疗 · 社区" />
        <CareNode className="parent" title="远程亲子联系" detail="沈洁 · 定点医院" />
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"><path d="M22 30 L48 14 L78 30 L48 49 Z" /></svg>
        <div className="care-status"><strong>{module4.childCareMode === 'pending' ? '照护方案待确定' : module4.careStable ? '联合照护稳定' : '照护协调受阻'}</strong><span>健康监测与儿童权益同步保障</span></div>
      </div>
    </section>
  )
}

function CareNode({ className, title, detail }: { className: string; title: string; detail: string }) {
  return <article className={`care-node ${className}`}><i/><strong>{title}</strong><span>{detail}</span></article>
}
