import type { Module3State } from '../simulation/types'

export function CrossRegionTracingScene({ module3 }: { module3: Module3State }) {
  const resolved = module3.missingTravelerStatus === 'found'
  return (
    <section className="scene-panel cross-region-scene" aria-labelledby="cross-region-title">
      <div className="panel-heading scene-heading"><div><span className="eyebrow"><b>跨区域协查</b><small>COORDINATION</small></span><h2 id="cross-region-title">失联同行人员 · 信息核查</h2></div></div>
      <div className="cross-region-visual">
        <div className="cross-region-route-scene"><span>深圳调查组</span><i/><strong>跨区域协查目标</strong><small>演练位置 · 真实目的地未核实</small></div>
        <div className="missing-person-status"><small>人员状态</small><strong>{resolved ? '已找到' : '查找中'}</strong><span>{module3.crossRegionCoordinationMode === 'minimum-necessary' ? '最小必要信息已传递' : '身份与行程继续核实'}</span></div>
        {resolved && module3.dinnerAttendees === 12 && (
          <div className="dinner-exposure-teaching"><strong>12 人聚餐</strong><span>发生于无症状期</span><i>→</i><b>未形成有效传播事件</b><small>仅需风险沟通，不自动列为高风险接触者</small></div>
        )}
        <div className="monitoring-preview"><span>监测阶段</span><strong>接触者持续健康监测中</strong><small>每人根据各自最后暴露时间计算 21 天周期</small></div>
      </div>
    </section>
  )
}
