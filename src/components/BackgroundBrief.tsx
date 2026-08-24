export function BackgroundBrief() {
  return (
    <div className="briefing-page">
      <header className="briefing-hero">
        <div>
          <span className="real-world-badge">REAL WORLD · 真实疫情背景</span>
          <h1>Bundibugyo 病毒病<br />全球背景简报</h1>
          <p>该页面与深圳虚构桌面推演完全分离。数据被冻结在演示资料的来源截止日，不随网络自动更新。</p>
        </div>
        <div className="briefing-date"><small>DATA AS OF</small><strong>2026.07.30</strong><span>WHO DON 614</span></div>
      </header>
      <section className="world-stat-grid">
        <article><small>确诊病例</small><strong>3,605</strong><span>CONFIRMED CASES</span></article>
        <article><small>死亡病例</small><strong>1,587</strong><span>DEATHS</span></article>
        <article><small>粗病死率</small><strong>44%</strong><span>CRUDE CFR</span></article>
        <article><small>受影响卫生区</small><strong>49</strong><span>HEALTH ZONES</span></article>
      </section>
      <section className="briefing-content-grid">
        <article className="brief-card">
          <span className="eyebrow">DISEASE PROFILE</span><h2>必须被正确理解的传播边界</h2>
          <p>主要通过直接接触有症状感染者或死者的体液传播，经破损皮肤或黏膜进入；不通过空气传播。潜伏期通常为 2—21 天，发病前无传染性。</p>
        </article>
        <article className="brief-card">
          <span className="eyebrow">CLINICAL SIGNAL</span><h2>胃肠道症状可能主导</h2>
          <p>用户提供背景材料强调 Bundibugyo 病毒病可表现为发热、呕吐、腹泻和脱水，明显出血并非识别的必要前提。这正是 M1-1 的早期识别难点。</p>
        </article>
        <article className="brief-card source-card">
          <span className="eyebrow">SOURCE CONTROL</span><h2>来源与产品口径</h2>
          <p>演示基线来自用户提供 PDF，并以 WHO Disease Outbreak News 614 核对。深圳病例、航班、机构与推演后果全部来自虚构桌面脚本。</p>
          <a href="https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON614" target="_blank" rel="noreferrer">查看 WHO DON 614 ↗</a>
        </article>
      </section>
    </div>
  )
}
