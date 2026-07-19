"""Rule-driven Ebola importation sandbox with simple uncertainty bands.

This module is deliberately transparent and demo-friendly.  It is not a
calibrated epidemiological forecast.  The rules express a causal story:

    detection delay -> more risky contacts -> tracing pressure ->
    potentially untraced contacts -> secondary transmission risk

Interventions shorten that chain or increase response capacity.  Repeated runs
add small parameter variation and return P10 / median / P90 bands.
"""

from __future__ import annotations

from typing import Dict, Iterable

import numpy as np
import pandas as pd


METRICS = [
    "Rt",
    "projected_cases",
    "close_contacts",
    "traced_contacts",
    "missed_contacts",
    "isolated_people",
    "hospital_pressure",
    "testing_pressure",
    "score",
    "detection_delay",
]


def _simulate_once(
    interventions: Dict[str, bool],
    days: int,
    entry_mode: str,
    rng: np.random.Generator,
) -> pd.DataFrame:
    """Run one stochastic rule-model trajectory."""
    missed_at_port = entry_mode == "口岸漏检"

    # Parameter variation represents uncertainty, not measurement precision.
    base_rt = rng.triangular(1.35, 1.62, 1.95)
    delay = rng.triangular(3.8, 5.0, 6.5) if missed_at_port else rng.triangular(0.7, 1.2, 2.0)
    contact_multiplier = rng.lognormal(mean=0.0, sigma=0.14)
    transmission_multiplier = rng.lognormal(mean=0.0, sigma=0.16)

    if interventions.get("port_screening"):
        delay -= rng.uniform(0.7, 1.2)
    if interventions.get("fast_transfer"):
        delay -= rng.uniform(0.4, 0.8)
    if interventions.get("hospital_history_check"):
        delay -= rng.uniform(0.8, 1.3)
    delay = float(np.clip(delay, 0.6, 7.0))

    tracing_eff = 0.12
    if interventions.get("cdc_tracing"):
        tracing_eff += 0.38
    if interventions.get("cdc_extra_staff"):
        tracing_eff += 0.25
    tracing_eff = min(tracing_eff, 0.88)
    traceable_fraction = 0.18
    if interventions.get("cdc_tracing"):
        traceable_fraction = 0.86
    if interventions.get("cdc_extra_staff"):
        traceable_fraction = 0.97

    isolation_eff = 0.10
    if interventions.get("community_followup"):
        isolation_eff += 0.24
    if interventions.get("community_isolation"):
        isolation_eff += 0.38
    isolation_eff = min(isolation_eff, 0.88)

    healthcare_risk = rng.uniform(0.85, 1.15)
    if interventions.get("hospital_isolation"):
        healthcare_risk *= 0.35

    bed_capacity = 1.0 + 0.55 * interventions.get("health_resource_allocation", False)
    test_capacity = 1.0 + 0.55 * interventions.get("health_supplies", False)

    # Epidemiological actions have direct Rt effects. Resource actions chiefly
    # affect pressure and have only a small indirect effect.
    control = (
        0.13 * interventions.get("port_screening", False)
        + 0.10 * interventions.get("fast_transfer", False)
        + 0.14 * interventions.get("hospital_history_check", False)
        + 0.17 * interventions.get("hospital_isolation", False)
        + 0.22 * interventions.get("cdc_tracing", False)
        + 0.11 * interventions.get("cdc_extra_staff", False)
        + 0.12 * interventions.get("community_followup", False)
        + 0.19 * interventions.get("community_isolation", False)
        + 0.03 * interventions.get("health_resource_allocation", False)
        + 0.02 * interventions.get("health_supplies", False)
    )
    if not missed_at_port:
        control += 0.25
    final_rt = base_rt * max(0.24, 1.0 - control)

    cases = 1.0
    close_contacts = rng.integers(3, 7) if not missed_at_port else rng.integers(7, 13)
    traced_contacts = 0.0
    isolated_people = 0.0
    rows = []

    for day in range(1, days + 1):
        response_progress = np.clip((day - delay + 1) / max(2.0, days - delay + 1), 0, 1)
        rt = base_rt + (final_rt - base_rt) * response_progress

        symptomatic = day >= max(2, int(round(delay)) - 1)
        fluid_contact_factor = 1.0 if symptomatic else 0.28
        daily_risky_contacts = (
            (2.6 + 1.0 * day)
            * fluid_contact_factor
            * (1.0 + 0.13 * delay)
            * contact_multiplier
        )
        if day > delay:
            daily_risky_contacts *= 0.48
        if interventions.get("fast_transfer") and day <= 3:
            daily_risky_contacts *= 0.55
        if not missed_at_port:
            daily_risky_contacts *= 0.34
        close_contacts += max(0, rng.poisson(daily_risky_contacts))

        # Without an activated CDC workflow only occasional contacts are found
        # passively; a formal tracing response changes the capacity regime.
        tracing_capacity = int(rng.random() < 0.28)
        if interventions.get("cdc_tracing") and day >= int(np.floor(delay)):
            tracing_capacity += int(3 + 22 * tracing_eff + rng.normal(0, 2))
        identifiable_contacts = close_contacts * traceable_fraction
        traced_contacts = min(identifiable_contacts, traced_contacts + max(0, tracing_capacity))

        isolation_capacity = int((3 + 19 * isolation_eff) * bed_capacity + rng.normal(0, 1.5))
        isolated_people = min(traced_contacts, isolated_people + max(1, isolation_capacity))
        missed_contacts = max(close_contacts - traced_contacts, 0)

        if day >= int(np.floor(delay)) + 1:
            community_lambda = (
                missed_contacts
                * max(rt - 0.42, 0)
                * 0.021
                * transmission_multiplier
                * (1 - 0.58 * isolation_eff)
            )
            healthcare_lambda = (
                cases
                * 0.11
                * healthcare_risk
                * transmission_multiplier
            )
            new_cases = rng.poisson(max(0.0, community_lambda + healthcare_lambda))
            cases += new_cases

        suspected = max(1.0, missed_contacts * rng.uniform(0.10, 0.17))
        hospital_pressure = np.clip((cases * 8.5 + suspected * 2.0) / bed_capacity, 0, 100)
        testing_pressure = np.clip((suspected * 4.2 + cases * 1.8) / test_capacity, 0, 100)

        score = (
            100
            - max(rt - 0.55, 0) * 24
            - missed_contacts * 0.42
            - hospital_pressure * 0.16
            - testing_pressure * 0.10
        )

        rows.append(
            {
                "day": day,
                "Rt": rt,
                "projected_cases": cases,
                "close_contacts": close_contacts,
                "traced_contacts": traced_contacts,
                "missed_contacts": missed_contacts,
                "isolated_people": isolated_people,
                "hospital_pressure": hospital_pressure,
                "testing_pressure": testing_pressure,
                "score": np.clip(score, 0, 100),
                "detection_delay": delay,
            }
        )

    return pd.DataFrame(rows)


def simulate_ensemble(
    interventions: Dict[str, bool],
    days: int = 14,
    entry_mode: str = "口岸漏检",
    runs: int = 100,
    seed: int = 20240801,
) -> pd.DataFrame:
    """Return day-level P10, median and P90 uncertainty bands."""
    trajectories = []
    for run in range(runs):
        rng = np.random.default_rng(seed + run * 7919)
        frame = _simulate_once(interventions, days, entry_mode, rng)
        frame["run"] = run
        trajectories.append(frame)

    all_runs = pd.concat(trajectories, ignore_index=True)
    output = pd.DataFrame({"day": range(1, days + 1)})
    for metric in METRICS:
        grouped = all_runs.groupby("day")[metric]
        output[f"{metric}_low"] = grouped.quantile(0.10).to_numpy()
        output[f"{metric}_median"] = grouped.median().to_numpy()
        output[f"{metric}_high"] = grouped.quantile(0.90).to_numpy()
    return output


def simulate(
    interventions: Dict[str, bool],
    days: int = 14,
    entry_mode: str = "口岸漏检",
) -> pd.DataFrame:
    """Compatibility helper returning the ensemble median trajectory."""
    ensemble = simulate_ensemble(interventions, days=days, entry_mode=entry_mode)
    result = pd.DataFrame({"day": ensemble["day"]})
    for metric in METRICS:
        result[metric] = ensemble[f"{metric}_median"]
    # Legacy aliases retained for small downstream integrations.
    result["confirmed_cases"] = result["projected_cases"]
    result["testing_backlog"] = result["testing_pressure"]
    return result


def range_text(row: pd.Series, metric: str, decimals: int = 0) -> str:
    """Format median and P10–P90 range for UI/report output."""
    median = row[f"{metric}_median"]
    low = row[f"{metric}_low"]
    high = row[f"{metric}_high"]
    if decimals:
        return f"{median:.{decimals}f}（{low:.{decimals}f}–{high:.{decimals}f}）"
    return f"{median:.0f}（{low:.0f}–{high:.0f}）"


def identify_weaknesses(interventions: Dict[str, bool]) -> Iterable[str]:
    """Explain the most important inactive links in the response chain."""
    checks = [
        ("port_screening", "口岸接触史识别不足"),
        ("hospital_history_check", "医疗机构旅居史识别不足"),
        ("cdc_tracing", "流调追踪启动不足"),
        ("cdc_extra_staff", "流调人力不足"),
        ("community_isolation", "密接隔离管理不足"),
        ("health_resource_allocation", "定点床位统筹不足"),
    ]
    return [label for key, label in checks if not interventions.get(key)]


def summarize(
    ensemble: pd.DataFrame,
    scenario_name: str,
    interventions: Dict[str, bool],
    entry_mode: str,
) -> str:
    """Generate a concise, uncertainty-aware replay conclusion."""
    last = ensemble.iloc[-1]
    rt = last["Rt_median"]
    status = "扩散中" if rt > 1.15 else "临界" if rt >= 0.85 else "受控"
    weaknesses = list(identify_weaknesses(interventions))
    weakness_text = "、".join(weaknesses[:3]) if weaknesses else "暂无明显协同短板"

    return (
        f"本轮采用「{scenario_name}」，输入方式为「{entry_mode}」。"
        f"推演期末传播状态为“{status}”，传播压制指标 Rt 为 {range_text(last, 'Rt', 2)}；"
        f"推演病例数为 {range_text(last, 'projected_cases')}，"
        f"潜在未追踪密接为 {range_text(last, 'missed_contacts')}，"
        f"医疗资源压力指数为 {range_text(last, 'hospital_pressure')}。"
        f"当前主要短板：{weakness_text}。"
        "结果来自规则模型的多次随机扰动，用于比较策略方向，不代表真实疫情预测。"
    )
