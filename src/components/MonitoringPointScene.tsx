import type { Module4State } from '../simulation/types'

export function MonitoringPointScene({ module4 }: { module4: Module4State }) {
  const delayed = module4.separationStatus === 'delayed'
  return (
    <section className="scene-card module-four-scene" aria-label="集中健康监测点数字孪生场景">
      <header className="scene-header"><div><span className="eyebrow"><b>集中健康监测点</b> DIGITAL TWIN</span><h2>症状报警与转运准备</h2></div></header>
      <div className="monitoring-twin">
        <div className="monitor-room"><span>受控监测房间</span><i className="bed" /></div>
        <div className={`shared-bathroom ${delayed ? 'alert' : ''}`}><span>共用卫生间</span><small>{delayed ? '暴露窗口仍开放' : '动线已限制'}</small></div>
        <div className="corridor-line" />
        <Person className="shen" label="沈洁" detail="38.1℃ · 乏力 · 恶心" />
        <Person className="monitor-staff" label="监测人员" detail="症状核实与分离" />
        <div className={`transfer-ready ${module4.transferStatus}`}><i>+</i><strong>医疗转运</strong><span>{module4.transferStatus === 'waiting' ? '等待升级' : module4.transferStatus === 'completed' ? '已完成' : '准备中'}</span></div>
        <div className="child-status"><strong>8 岁女儿</strong><span>照护状态待协调</span></div>
        {delayed && <div className="exposure-pulse">共用设施接触管理</div>}
      </div>
    </section>
  )
}

function Person({ className, label, detail }: { className: string; label: string; detail: string }) {
  return <div className={`monitor-person ${className}`}><i className="head"/><i className="body"/><span><strong>{label}</strong><small>{detail}</small></span></div>
}
