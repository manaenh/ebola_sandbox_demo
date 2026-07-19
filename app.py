from __future__ import annotations

import time
from datetime import date, timedelta
from pathlib import Path
from typing import Dict

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import pydeck as pdk
import streamlit as st

from scenarios import SCENARIOS
from simulation import identify_weaknesses, range_text, simulate_ensemble, summarize


st.set_page_config(
    page_title="埃博拉输入性传播模拟",
    page_icon="🧭",
    layout="wide",
    initial_sidebar_state="expanded",
)
st.markdown(
    f"<style>{(Path(__file__).parent / 'styles.css').read_text(encoding='utf-8')}</style>",
    unsafe_allow_html=True,
)

DAYS = 14
LOCATIONS = {
    "深圳宝安国际机场": (22.6393, 113.8107, "输入点"),
    "海关/机场急救中心": (22.6275, 113.8230, "筛查与闭环转运"),
    "入境酒店/交通节点": (22.5660, 113.9010, "短暂停留"),
    "城中村社区": (22.6500, 114.0300, "家庭与照护接触"),
    "基层诊所": (22.6560, 114.0450, "漏诊与不安全诊疗风险"),
    "定点医院": (22.5480, 114.0850, "隔离收治与PPE防护"),
    "疾控中心": (22.5431, 114.0579, "流调追踪与应急指挥"),
    "隔离点": (22.5860, 113.9500, "密接隔离管理"),
    "物流站点/学校企业": (22.6140, 114.1300, "聚集性风险"),
}
EVENTS = {
    1: ("口岸输入", "境外暴露人员抵达深圳，出现低热与肌肉酸痛。"),
    2: ("识别窗口", "接触史问询与闭环转运决定风险能否被挡在口岸。"),
    3: ("进入城市", "漏检后经交通与住宿节点进入社区，接触开始累积。"),
    4: ("症状进展", "发热、乏力等症状加重，家庭照护接触风险上升。"),
    5: ("基层就诊", "旅居史识别和PPE防护决定是否出现不安全医疗暴露。"),
    6: ("病例发现", "医院识别后上报，疾控开始重建活动轨迹。"),
    7: ("启动流调", "追踪速度开始影响潜在未追踪密接规模。"),
    8: ("社区干预", "健康监测与密接隔离开始压低二代传播风险。"),
    9: ("资源统筹", "定点床位、检测与PPE物资影响医疗系统压力。"),
    10: ("协同处置", "医院、疾控、社区形成发现—追踪—隔离闭环。"),
    11: ("风险收敛", "有效干预下传播压制指标逐步降至临界线以下。"),
    12: ("查漏补缺", "针对未追踪密接和薄弱场所开展补充流调。"),
    13: ("解除压力", "医疗与检测压力逐步回落，风险区域被圈定。"),
    14: ("复盘报告", "生成策略差异、关键短板与未来模型升级建议。"),
}
GROUPS = [
    ("口岸", [("接触史专项问询", "port_screening"), ("可疑人员闭环转运", "fast_transfer")]),
    ("医院", [("发热门诊旅居史识别", "hospital_history_check"), ("隔离收治/PPE防护", "hospital_isolation")]),
    ("疾控", [("启动流调追踪", "cdc_tracing"), ("增派流调队伍", "cdc_extra_staff")]),
    ("社区", [("密接健康监测", "community_followup"), ("密接隔离管理", "community_isolation")]),
    ("卫健委", [("统筹定点床位", "health_resource_allocation"), ("调配检测/PPE物资", "health_supplies")]),
]
ALL_KEYS = [key for _, actions in GROUPS for _, key in actions]
ACTION_EFFECTS = {
    "port_screening": "发现延迟缩短，口岸漏检风险下降",
    "fast_transfer": "减少入境后无防护接触",
    "hospital_history_check": "医疗机构更早识别并上报疑似病例",
    "hospital_isolation": "降低医护与其他患者的体液暴露风险",
    "cdc_tracing": "追踪链启动，潜在未追踪密接下降",
    "cdc_extra_staff": "提升流调吞吐量，缓解追踪压力",
    "community_followup": "异常症状更早进入发现链",
    "community_isolation": "减少未发病密接引发二代传播的机会",
    "health_resource_allocation": "扩充定点收治能力，降低医疗压力",
    "health_supplies": "缓解检测与PPE物资压力",
}

UNCERTAINTY_RUNS = 40


@st.cache_data(show_spinner=False, max_entries=64)
def cached_ensemble(
    intervention_items: tuple[tuple[str, bool], ...],
    days: int,
    entry_mode: str,
) -> pd.DataFrame:
    """Cache model outputs so timeline changes do not rerun the ensemble."""
    return simulate_ensemble(
        dict(intervention_items),
        days=days,
        entry_mode=entry_mode,
        runs=UNCERTAINTY_RUNS,
    )


def apply_preset(name: str) -> None:
    for key, value in SCENARIOS[name]["interventions"].items():
        st.session_state[f"ctrl_{key}"] = value
    st.session_state.template = name


def strategy_mode_changed() -> None:
    """Preset modes overwrite the visible decisions; custom preserves them."""
    selected = st.session_state.strategy_mode
    if selected != "自定义":
        apply_preset(selected)


def status_for(rt: float):
    if rt > 1.15:
        return "扩散中", "risk-red"
    if rt >= 0.85:
        return "临界", "risk-yellow"
    return "受控", "risk-green"


def display_range(row: pd.Series, metric: str, suffix: str = "") -> str:
    return f"{range_text(row, metric)}{suffix}"


def interpolate(ensemble: pd.DataFrame, day: float) -> pd.Series:
    """Linearly interpolate ensemble values for smooth map playback."""
    if day <= 1:
        return ensemble.iloc[0]
    if day >= float(ensemble["day"].max()):
        return ensemble.iloc[-1]
    lower_day = int(np.floor(day))
    upper_day = int(np.ceil(day))
    if lower_day == upper_day:
        return ensemble.loc[ensemble["day"] == lower_day].iloc[0]
    lower = ensemble.loc[ensemble["day"] == lower_day].iloc[0].copy()
    upper = ensemble.loc[ensemble["day"] == upper_day].iloc[0]
    fraction = day - lower_day
    for column in ensemble.columns:
        if pd.api.types.is_numeric_dtype(ensemble[column]):
            lower[column] = lower[column] * (1 - fraction) + upper[column] * fraction
    lower["day"] = day
    return lower


def location_risk(name: str, row: pd.Series, actions: Dict[str, bool], day: float, entry_mode: str) -> float:
    rt = row["Rt_median"]
    missed = row["missed_contacts_median"]
    pressure = row["hospital_pressure_median"]
    onset = {
        "深圳宝安国际机场": 1, "海关/机场急救中心": 1,
        "入境酒店/交通节点": 2, "城中村社区": 3, "基层诊所": 5,
        "定点医院": 6, "疾控中心": 7, "隔离点": 8, "物流站点/学校企业": 9,
    }[name]
    if day < onset:
        return 0.04
    base = 0.16 + min(0.46, missed / 115) + max(0, rt - 0.75) * 0.18
    if name in ("深圳宝安国际机场", "海关/机场急救中心"):
        base = 0.78 if entry_mode == "口岸漏检" else 0.22
        if actions["port_screening"]:
            base *= 0.55
    elif name == "基层诊所":
        base = 0.72 if not actions["hospital_history_check"] else 0.25
        if actions["hospital_isolation"]:
            base *= 0.65
    elif name == "定点医院":
        base = 0.20 + pressure / 135
        if actions["hospital_isolation"]:
            base *= 0.60
        if actions["health_resource_allocation"]:
            base *= 0.72
    elif name == "疾控中心":
        base = 0.24 if actions["cdc_tracing"] else 0.64
    elif name == "隔离点":
        base = 0.18 if actions["community_isolation"] else 0.62
    elif name == "物流站点/学校企业" and rt < 1:
        base *= 0.45
    return float(np.clip(base, 0.04, 1.0))


def make_map(ensemble: pd.DataFrame, actions: Dict[str, bool], day: float, entry_mode: str) -> pdk.Deck:
    row = interpolate(ensemble, day)
    points = []
    for name, (lat, lon, desc) in LOCATIONS.items():
        risk = location_risk(name, row, actions, day, entry_mode)
        color = [255, 65, 55] if risk > 0.62 else [255, 176, 0] if risk > 0.34 else [0, 208, 132]
        points.append({
            "name": name, "lat": lat, "lon": lon, "desc": desc,
            "risk": round(risk * 100), "height": 300 + risk * 7500,
            "radius": 650 + risk * 2300, "color": color + [210],
            "halo": color + [38],
        })
    point_df = pd.DataFrame(points)

    spread_routes = [
        ("深圳宝安国际机场", "入境酒店/交通节点", 2),
        ("入境酒店/交通节点", "城中村社区", 3),
        ("城中村社区", "基层诊所", 5),
        ("基层诊所", "定点医院", 6),
        ("城中村社区", "物流站点/学校企业", 9),
    ]
    response_routes = []
    if actions["cdc_tracing"]:
        response_routes += [("疾控中心", "城中村社区", 7), ("疾控中心", "基层诊所", 7)]
    if actions["community_isolation"]:
        response_routes += [("城中村社区", "隔离点", 8)]
    if actions["health_resource_allocation"]:
        response_routes += [("疾控中心", "定点医院", 9)]

    arcs = []
    for source, target, start in spread_routes + response_routes:
        if day < start:
            continue
        response = (source, target, start) in response_routes
        slat, slon, _ = LOCATIONS[source]
        tlat, tlon, _ = LOCATIONS[target]
        arcs.append({
            "source": [slon, slat], "target": [tlon, tlat],
            "source_color": [0, 217, 255, 210] if response else [255, 55, 48, 210],
            "target_color": [0, 208, 132, 210] if response else [255, 176, 0, 190],
            "width": 5 if response else 3,
        })

    layers = [
        pdk.Layer("ScatterplotLayer", point_df, get_position="[lon, lat]", get_radius="radius",
                  get_fill_color="halo", pickable=False),
        pdk.Layer("ColumnLayer", point_df, get_position="[lon, lat]", get_elevation="height",
                  radius=430, get_fill_color="color", elevation_scale=1, disk_resolution=48, pickable=True),
        pdk.Layer("ScatterplotLayer", point_df, get_position="[lon, lat]", get_radius=260,
                  get_fill_color="color", get_line_color=[235, 255, 255, 230], stroked=True, pickable=True),
        pdk.Layer("ArcLayer", pd.DataFrame(arcs), get_source_position="source", get_target_position="target",
                  get_source_color="source_color", get_target_color="target_color", get_width="width", pickable=False),
    ]
    # A visible containment ring appears only when tracing + isolation form a closure.
    if actions["cdc_tracing"] and actions["community_isolation"] and day >= 8:
        ring_df = point_df[point_df["name"].isin(["城中村社区", "基层诊所"])].copy()
        ring_df["ring_radius"] = 4300
        layers.append(pdk.Layer(
            "ScatterplotLayer", ring_df, get_position="[lon, lat]", get_radius="ring_radius",
            filled=False, stroked=True, get_line_color=[0, 225, 190, 235],
            line_width_min_pixels=5, pickable=False,
        ))

    return pdk.Deck(
        layers=layers,
        initial_view_state=pdk.ViewState(latitude=22.58, longitude=113.98, zoom=9.3, pitch=53, bearing=-13),
        map_style="dark",
        tooltip={"html": "<b>{name}</b><br/>风险指数：{risk}<br/>{desc}",
                 "style": {"backgroundColor": "#061523", "color": "white"}},
    )


def strategy_explanation(actions: Dict[str, bool]) -> tuple[list[str], list[str]]:
    controls = []
    if actions["hospital_history_check"]:
        controls.append("医院旅居史识别提前发现病例")
    if actions["cdc_tracing"]:
        controls.append("疾控流调降低潜在未追踪密接")
    if actions["community_isolation"]:
        controls.append("社区隔离压低二代传播风险")
    if actions["health_resource_allocation"]:
        controls.append("卫健委统筹资源缓解医疗压力")
    risks = list(identify_weaknesses(actions))
    return controls[:4], risks[:4]


def band_chart(frames: dict[str, pd.DataFrame], metric: str, title: str, y_title: str) -> go.Figure:
    colors = {"基线：漏检/低干预": "#ff554d", "当前策略": "#00d9ff", "强化协同": "#00d084"}
    fig = go.Figure()
    for name, frame in frames.items():
        color = colors[name]
        if name == "当前策略":
            fig.add_trace(go.Scatter(x=frame.day, y=frame[f"{metric}_high"], line=dict(width=0),
                                     hoverinfo="skip", showlegend=False))
            fig.add_trace(go.Scatter(x=frame.day, y=frame[f"{metric}_low"], line=dict(width=0),
                                     fill="tonexty", fillcolor="rgba(0,217,255,.13)",
                                     hoverinfo="skip", showlegend=False))
        fig.add_trace(go.Scatter(x=frame.day, y=frame[f"{metric}_median"], name=name,
                                 mode="lines", line=dict(color=color, width=4 if name == "当前策略" else 2)))
    if metric == "Rt":
        fig.add_hline(y=1, line_dash="dash", line_color="rgba(255,255,255,.55)")
    fig.update_layout(
        title=title, height=320, margin=dict(l=10, r=10, t=48, b=10),
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(4,18,34,.55)",
        font=dict(color="#e5f7ff"), legend=dict(orientation="h", y=1.12),
        xaxis=dict(title="推演日", gridcolor="rgba(255,255,255,.07)"),
        yaxis=dict(title=y_title, gridcolor="rgba(255,255,255,.07)"),
    )
    return fig


# State and sidebar
if "template" not in st.session_state:
    st.session_state.template = "标准干预"
if "strategy_mode" not in st.session_state:
    st.session_state.strategy_mode = "标准干预"
if "simulation_day" not in st.session_state:
    st.session_state.simulation_day = DAYS
for key in ALL_KEYS:
    st.session_state.setdefault(f"ctrl_{key}", SCENARIOS["标准干预"]["interventions"][key])

with st.sidebar:
    st.markdown("## 场景与策略控制")
    st.selectbox("病原模板", ["埃博拉"], help="后续可扩展其他新发传染病模板")
    entry_mode = st.radio(
        "输入方式",
        ["口岸漏检", "口岸发现"],
        horizontal=True,
        help="决定输入病例是在口岸被闭环处置，还是进入社区后才被发现。",
    )
    if entry_mode == "口岸漏检":
        st.warning("口岸未识别：病例进入社区，发现更晚、接触更多。")
    else:
        st.success("口岸发现：病例在入境环节被识别并闭环转运，发现更早、社区接触更少。")
    sim_date = st.date_input(
        "场景起始日期",
        value=date(2024, 8, 1),
        help="只用于标记时间线和复盘报告；推演参数仍按相对的 Day 1–14 计算。",
    )
    st.caption("起始日期不改变模型结果，只把 Day 1–14 映射到具体日期。")
    st.markdown("#### 策略模式")
    strategy_mode = st.radio(
        "选择预设方案或进入自定义",
        ["低干预", "标准干预", "强化协同", "自定义"],
        key="strategy_mode",
        on_change=strategy_mode_changed,
        label_visibility="collapsed",
    )
    if strategy_mode == "自定义":
        st.success(
            f"自定义模式：已保留「{st.session_state.template}」的开关状态，"
            "现在可以继续启用或取消任意决策。"
        )
    else:
        st.info(
            f"已锁定「{strategy_mode}」：{SCENARIOS[strategy_mode]['description']}"
        )

    editable = strategy_mode == "自定义"
    enabled_count = sum(bool(st.session_state[f"ctrl_{key}"]) for key in ALL_KEYS)
    enabled_labels = [
        label
        for _, role_actions in GROUPS
        for label, key in role_actions
        if st.session_state[f"ctrl_{key}"]
    ]
    if enabled_labels:
        st.markdown("**当前启用：** " + "、".join(enabled_labels))
    else:
        st.warning("当前模板未主动启用任何协同处置动作。")
    st.markdown(f"#### 多角色决策　`{enabled_count}/10 已启用`")
    for role, actions in GROUPS:
        st.markdown(f'<div class="compact-role-title">{role}</div>', unsafe_allow_html=True)
        cols = st.columns(2)
        for index, (label, key) in enumerate(actions):
            cols[index].checkbox(
                label,
                key=f"ctrl_{key}",
                help=ACTION_EFFECTS[key],
                disabled=not editable,
            )

    st.markdown("#### 动态推演")
    speed_label = st.select_slider(
        "播放速度",
        options=["慢速", "演示", "快速"],
        value="演示",
    )
    playback = st.button("▶ 从 Day 1 播放至 Day 14", width="stretch", type="primary")
    if playback:
        # This is set before the slider is instantiated, keeping metrics and
        # the final animation frame synchronized at Day 14.
        st.session_state.simulation_day = DAYS
    day = st.slider("推演进度", 1, DAYS, format="Day %d", key="simulation_day")
    st.info(
        f"结果基于左侧开关。策略改变时运行{UNCERTAINTY_RUNS}次轻量模拟；"
        "拖动日期直接读取缓存，不会重新计算。"
    )
    st.caption("地图为演示坐标，可替换为真实点位。")

frame_delay = {"慢速": 0.24, "演示": 0.13, "快速": 0.06}[speed_label]

actions = {key: bool(st.session_state[f"ctrl_{key}"]) for key in ALL_KEYS}
current = cached_ensemble(tuple(sorted(actions.items())), DAYS, entry_mode)
baseline = cached_ensemble(
    tuple(sorted(SCENARIOS["低干预"]["interventions"].items())),
    DAYS,
    "口岸漏检",
)
strong = cached_ensemble(
    tuple(sorted(SCENARIOS["强化协同"]["interventions"].items())),
    DAYS,
    entry_mode,
)
frames = {"基线：漏检/低干预": baseline, "当前策略": current, "强化协同": strong}
row = interpolate(current, day)
status, status_class = status_for(row["Rt_median"])
event_title, event_text = EVENTS[day]
current_calendar_date = sim_date + timedelta(days=day - 1)
current_date_label = f"{current_calendar_date.month}月{current_calendar_date.day}日"
controls, risks = strategy_explanation(actions)
strategy_label = (
    f"自定义（基于{st.session_state.template}）"
    if strategy_mode == "自定义"
    else strategy_mode
)

# Header and story
st.markdown(
    """<div class="hero"><div><div class="main-title">埃博拉输入性传播模拟</div>
    <div class="sub-title">可配置多角色公共卫生沙盘 · 同一输入病例，不同策略，未来结果不同</div></div>
    <div class="hero-badge">规则驱动样机 · 推演预测</div></div>""", unsafe_allow_html=True,
)
sim_date_label = f"{sim_date.year}年{sim_date.month}月{sim_date.day}日"
st.markdown(
    f"""<div class="story-card"><b>场景导入｜{sim_date_label}</b>　
    一名从刚果返回的援外医护/工程医疗保障人员抵达深圳宝安国际机场，曾接触疑似埃博拉患者，
    入境时出现低热和肌肉酸痛。平台推演风险如何由口岸进入社区，以及多角色干预如何改变传播路径、
    Rt、密接追踪和医疗资源压力。<br/><span style="color:#8fb3c5">
    当前为规则驱动沙盘样机，主要验证交互逻辑与场景推演闭环；所有输出均为推演预测。</span></div>""",
    unsafe_allow_html=True,
)

st.markdown(
    f"""<div class="status-strip">
    <div><span>输入方式</span><b>{entry_mode}</b></div>
    <div><span>当前阶段</span><b>Day {day} · {current_date_label} · {event_title}</b></div>
    <div><span>传播状态</span><b class="{status_class}">{status}</b></div>
    <div><span>当前策略</span><b>{strategy_label}</b></div></div>""",
    unsafe_allow_html=True,
)

map_col, right_col = st.columns([3.5, 1.15], gap="large")
with map_col:
    st.markdown('<div class="section-title">深圳城市风险与响应态势</div>', unsafe_allow_html=True)
    map_placeholder = st.empty()
    progress_placeholder = st.empty()
    stage_placeholder = st.empty()

    if playback:
        animation_frames = np.linspace(1, DAYS, 40)
        progress_bar = progress_placeholder.progress(0, text="正在播放推演：Day 1")
        for index, animation_day in enumerate(animation_frames):
            visible_day = min(DAYS, max(1, int(np.floor(animation_day))))
            frame_title, frame_text = EVENTS[visible_day]
            frame_date = sim_date + timedelta(days=visible_day - 1)
            frame_date_label = f"{frame_date.month}月{frame_date.day}日"
            map_placeholder.pydeck_chart(
                make_map(current, actions, float(animation_day), entry_mode),
                width="stretch",
                height=650,
            )
            stage_placeholder.markdown(
                f"""<div class="today-card"><div class="today-stage">
                动态推演 · DAY {visible_day} · {frame_date_label} · {frame_title}</div>
                <div class="today-text">{frame_text}</div><div class="mini-sub">
                红/橙：风险扩散　蓝色弧线：响应链路　蓝绿环：追踪与隔离形成控制圈</div></div>""",
                unsafe_allow_html=True,
            )
            progress_bar.progress(
                int((index + 1) / len(animation_frames) * 100),
                text=f"正在播放推演：Day {visible_day}",
            )
            time.sleep(frame_delay)
        progress_placeholder.empty()
    else:
        map_placeholder.pydeck_chart(
            make_map(current, actions, day, entry_mode),
            width="stretch",
            height=650,
        )
        stage_placeholder.markdown(
            f"""<div class="today-card"><div class="today-stage">DAY {day} · {current_date_label} · {event_title}</div>
            <div class="today-text">{event_text}</div><div class="mini-sub">
            红/橙：风险扩散　蓝色弧线：响应链路　蓝绿环：追踪与隔离形成控制圈</div></div>""",
            unsafe_allow_html=True,
        )

with right_col:
    st.markdown('<div class="section-title">关键推演指标</div>', unsafe_allow_html=True)
    st.markdown(
        f"""<div class="rt-card {status_class}"><div class="rt-label">传播压制指标 Rt</div>
        <div class="rt-value">{row['Rt_median']:.2f}</div><div class="rt-desc">{status}</div>
        <div class="rt-note">可能范围：{row['Rt_low']:.2f}–{row['Rt_high']:.2f}<br/>
        Rt &lt; 1 表示传播趋于受控</div></div>""",
        unsafe_allow_html=True,
    )
    for label, metric, suffix in [
        ("推演病例数区间", "projected_cases", " 例"),
        ("潜在未追踪密接", "missed_contacts", " 人"),
        (
            """医疗资源压力指数
            <span class="help-dot" title="0–100相对压力值，仅用于策略比较。">?</span>""",
            "hospital_pressure",
            "",
        ),
    ]:
        st.markdown(
            f"""<div class="mini-metric"><div class="mini-label">{label}</div>
            <div class="mini-value">{display_range(row, metric, suffix)}</div>
            <div class="mini-sub">典型值（可能范围）</div></div>""", unsafe_allow_html=True,
        )
    weakness = " + ".join(risks[:2]) if risks else "协同链条完整"
    st.markdown(f"""<div class="alert-card"><b>防控短板提示</b><br/>{weakness}</div>""", unsafe_allow_html=True)
    st.markdown('<div class="section-title small">当前策略解释</div>', unsafe_allow_html=True)
    if controls:
        st.markdown("**本轮主要控制路径**\n\n" + "\n\n".join(f"{i}. {x}" for i, x in enumerate(controls, 1)))
    if risks:
        st.markdown("**当前主要风险**\n\n" + "\n\n".join(f"{i}. {x}" for i, x in enumerate(risks, 1)))

# Mini comparison is deliberately on the main screen.
st.markdown('<div class="section-title">同一输入病例 · 三种策略结果</div>', unsafe_allow_html=True)
comparison_rows = []
for name, frame in frames.items():
    final = frame.iloc[-1]
    comparison_rows.append({
        "策略": name,
        "传播状态 / Rt": f"{status_for(final['Rt_median'])[0]} / {final['Rt_median']:.2f}",
        "推演病例": range_text(final, "projected_cases"),
        "潜在未追踪密接": range_text(final, "missed_contacts"),
        "医疗压力": range_text(final, "hospital_pressure"),
    })
comparison_html_rows = ""
for comparison in comparison_rows:
    if comparison["策略"].startswith("基线"):
        value_class = "bad-cell"
    elif comparison["策略"] == "强化协同":
        value_class = "good-cell"
    else:
        value_class = "current-cell"
    comparison_html_rows += (
        "<tr>"
        f"<td class='{value_class}'>{comparison['策略']}</td>"
        f"<td>{comparison['传播状态 / Rt']}</td>"
        f"<td>{comparison['推演病例']}</td>"
        f"<td>{comparison['潜在未追踪密接']}</td>"
        f"<td>{comparison['医疗压力']}</td>"
        "</tr>"
    )
st.markdown(
    f"""<div class="compare-box main-compare">
    <table class="compare-table">
        <thead><tr>
            <th>策略</th><th>传播状态 / Rt</th><th>推演病例</th>
            <th>潜在未追踪密接</th><th>医疗压力</th>
        </tr></thead>
        <tbody>{comparison_html_rows}</tbody>
    </table></div>""",
    unsafe_allow_html=True,
)

tab_rt, tab_compare, tab_timeline, tab_report, tab_model, tab_future = st.tabs(
    ["Rt趋势", "策略对比", "推演时间线", "复盘报告", "模型说明", "未来升级路径"]
)
with tab_rt:
    st.plotly_chart(band_chart({"当前策略": current}, "Rt", "传播压制指标 Rt（阴影为可能范围）", "Rt"),
                    width="stretch")
with tab_compare:
    a, b = st.columns(2)
    a.plotly_chart(band_chart(frames, "Rt", "Rt曲线对比", "Rt"), width="stretch")
    b.plotly_chart(band_chart(frames, "projected_cases", "推演病例数对比", "病例"), width="stretch")
    c, d = st.columns(2)
    c.plotly_chart(band_chart(frames, "missed_contacts", "潜在未追踪密接", "人数"), width="stretch")
    d.plotly_chart(band_chart(frames, "hospital_pressure", "医疗资源压力指数", "指数"), width="stretch")
with tab_timeline:
    columns = st.columns(7)
    for d in range(1, DAYS + 1):
        title, text = EVENTS[d]
        timeline_date = sim_date + timedelta(days=d - 1)
        timeline_date_label = f"{timeline_date.month}月{timeline_date.day}日"
        with columns[(d - 1) % 7]:
            active = "active" if d <= day else ""
            st.markdown(
                f'<div class="timeline-native {active}"><div class="timeline-native-day">'
                f'Day {d} · {timeline_date_label}</div>'
                f'<div class="timeline-native-text">{title}<br/>{text}</div></div>', unsafe_allow_html=True,
            )
with tab_report:
    report = summarize(current.iloc[:day], strategy_label, actions, entry_mode)
    st.markdown(f'<div class="report-box"><div class="report-title">本轮推演结论</div>{report}</div>',
                unsafe_allow_html=True)
    st.download_button("导出复盘报告", report, file_name="埃博拉输入性传播推演复盘.txt", mime="text/plain")
with tab_model:
    st.markdown(
        """<div class="report-box"><div class="report-title">模型边界与可信表达</div>
        <b>传播机制：</b>本样机以症状出现后的体液接触、污染物、
        不安全医疗暴露、延迟隔离和漏追密接为主要风险链。<br/><br/>
        <b>不确定性：</b>相同规则运行40次，对发现延迟、接触规模、传播机会和处置能力加入小幅随机扰动，
        展示典型结果及较低到较高的可能范围。该范围用于策略比较，并非统计置信区间。<br/><br/>
        <b>重要声明：</b>当前为规则驱动沙盘样机，主要验证交互逻辑与场景推演闭环，
        未经真实数据校准，不用于临床、疫情研判或现实决策。</div>""", unsafe_allow_html=True,
    )
with tab_future:
    st.markdown(
        """<div class="report-box"><div class="report-title">从样机到可配置平台</div>
        <b>模型层：</b>接入 SEIR / SEIAR、ABM、多层接触网络与医院感染模型。<br/>
        <b>数据层：</b>接入真实人口流动、口岸记录、活动轨迹、医疗资源和检测能力数据。<br/>
        <b>决策层：</b>加入资源优化、策略自动搜索、AI辅助决策与“人机协同/全AI”演练模式。<br/>
        <b>平台层：</b>扩展病原模板、角色权限、场景编辑、回放、报告生成与专家校准。</div>""",
        unsafe_allow_html=True,
    )
