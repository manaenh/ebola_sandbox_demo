# EVD RESPONSE DIGITAL TWIN

面向南方科技大学演示的中文埃博拉输入性疫情应急响应桌面推演。当前版本实现 Module 1 的完整可玩序列，用于验证 2.5D 数字孪生、跨事件状态持久化、确定性分支与三视图同步。

## 本地运行

需要 Node.js 22 或兼容版本。

```bash
npm install
npm run dev
```

生产构建与测试：

```bash
npm test
npm run build
```

构建产物位于 `dist/`，Vite `base` 使用相对路径，适合静态部署。

## 当前范围

- 真实 Bundibugyo 背景简报，和虚构深圳推演明确分层。
- 联合指挥公共壳、情境指标、导航和离线确定性状态。
- 共用同一 2.5D 医院场景的急诊分诊、患者拒绝和首次报告三段事件。
- 三个二选一决策形成 8 条可区分路径，并由时间调度器同步场景、指标、时间线和渐进决策树。
- Module 1 完成过渡；Module 2 尚未实现。
- 本地确定性态势摘要，无 LLM 或 API 依赖。

业务与来源规则见 [PRODUCT_SPEC.md](./PRODUCT_SPEC.md)、[SIMULATION_RULES.md](./SIMULATION_RULES.md) 和 [VISUAL_DESIGN.md](./VISUAL_DESIGN.md)。
