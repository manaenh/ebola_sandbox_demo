# EVD RESPONSE DIGITAL TWIN

面向南方科技大学演示的中文埃博拉输入性疫情应急响应桌面推演。当前版本只实现 M1-1 急诊分诊场景，用于验证 2.5D 数字孪生、确定性分支与三视图同步的产品方向。

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
- 联合指挥公共壳、指标带、导航和离线状态。
- M1-1 2.5D 医院分诊场景，含周启航、医护、18 位候诊者和可交互热点。
- 两条操作上合理的分支及场景/指标/时间线/决策树同步。
- 本地确定性态势摘要，无 LLM 或 API 依赖。

业务与来源规则见 [PRODUCT_SPEC.md](./PRODUCT_SPEC.md)、[SIMULATION_RULES.md](./SIMULATION_RULES.md) 和 [VISUAL_DESIGN.md](./VISUAL_DESIGN.md)。
