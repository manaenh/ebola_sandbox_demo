import type { Module3State } from '../simulation/types'

const representativeSeats = Array.from({ length: 48 }, (_, index) => index)

export function FlightExposureScene({ module3 }: { module3: Module3State }) {
  const classified = module3.flightReviewCompleted
  return (
    <section className="scene-panel flight-exposure-scene" aria-labelledby="flight-exposure-title">
      <div className="panel-heading scene-heading"><div><span className="eyebrow"><b>航班暴露复核</b><small>FLIGHT REVIEW</small></span><h2 id="flight-exposure-title">座位、服务行为与体液暴露</h2></div></div>
      <div className={`flight-review-visual ${classified ? 'classified' : 'unclassified'}`}>
        <div className="flight-media-claim"><small>全航班暴露风险复核 · 298 人</small><strong>“全航班 298 人都是密接”</strong><span>这是由舆情争议触发的全航班复核，不是 M3-1 的 39 人名单扩大</span></div>
        <div className="aircraft-frame" aria-label={classified ? '航班人员已经完成风险分类' : '航班人员风险分类待完成'}>
          <div className="aircraft-nose"/>
          <div className="aircraft-cabin">
            {representativeSeats.map((seat) => <i key={seat} className={classified ? seat < 5 ? 'high' : seat < 16 ? 'medium' : seat < 36 ? 'low' : 'excluded' : ''}/>) }
          </div>
          <div className="aircraft-tail"/>
          <small>示意座位分布 · 不代表 298 个独立座位记录</small>
        </div>
        {classified ? (
          <div className="flight-classification-result" aria-live="polite">
            <article className="high"><span>高风险</span><strong>7</strong><small>体液暴露/高风险行为</small></article>
            <article className="medium"><span>中风险</span><strong>18</strong><small>需加强评估</small></article>
            <article className="low"><span>低风险观察</span><strong>39</strong><small>持续观察</small></article>
            <article className="excluded"><span>不纳入主动监测</span><strong>234</strong><small>DERIVED · 298−7−18−39</small></article>
          </div>
        ) : (
          <div className="flight-assessment-basis"><span>症状时间</span><span>座位位置</span><span>服务行为</span><span>体液暴露</span></div>
        )}
        <div className="flight-teaching-line"><strong>调查对象</strong><i/>接触<i/>有效暴露<i/>风险分类<span>任何一步都不等同于感染</span></div>
      </div>
    </section>
  )
}
