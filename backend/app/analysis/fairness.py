from typing import Any

import numpy as np
import pandas as pd
from scipy.stats import t
from fastapi import HTTPException

from app.services.datasets import _json_scalar


def _group_stats(frame: pd.DataFrame, group_column: str, metric_column: str, min_size: int) -> list[dict[str, Any]]:
    result = []
    for group, subset in frame.groupby(group_column, dropna=True, sort=True, observed=False):
        nums = pd.to_numeric(subset[metric_column], errors="coerce").dropna().astype(float)
        nums = nums[np.isfinite(nums)]
        if nums.empty:
            continue
        count = int(nums.count())
        mean = float(nums.mean())
        std = float(nums.std(ddof=1)) if count > 1 else None
        if count > 1 and std is not None:
            half = float(t.ppf(0.975, count - 1) * std / np.sqrt(count))
            confidence_interval = [mean - half, mean + half]
        else:
            confidence_interval = None
        result.append({
            "group": str(_json_scalar(group)),
            "sample_size": count,
            "mean": mean,
            "median": float(nums.median()),
            "minimum": float(nums.min()),
            "maximum": float(nums.max()),
            "std_dev": std,
            "confidence_interval_95": confidence_interval,
            "below_minimum_sample_size": count < min_size,
        })
    return result


def analyze_frame(
    frame: pd.DataFrame,
    group_column: str,
    metric_column: str,
    direction: str,
    threshold_percent: float,
    minimum_group_size: int,
    context_column: str | None = None,
) -> dict[str, Any]:
    missing = [column for column in (group_column, metric_column) if column not in frame.columns]
    if missing:
        raise HTTPException(status_code=422, detail=f"Selected column not found: {', '.join(missing)}")
    if group_column == metric_column:
        raise HTTPException(status_code=422, detail="Choose different group and metric columns.")
    working = frame.copy()
    working[metric_column] = pd.to_numeric(working[metric_column], errors="coerce")
    working = working.replace([np.inf, -np.inf], np.nan).dropna(subset=[group_column, metric_column])
    if working.empty:
        raise HTTPException(status_code=422, detail="No rows have both a group value and a numeric metric value.")
    raw_groups = _group_stats(working, group_column, metric_column, minimum_group_size)
    if len(raw_groups) < 2:
        raise HTTPException(status_code=422, detail="At least two groups with numeric values are required.")

    context_result: dict[str, Any] = {"requested": context_column is not None, "applied": False, "column": context_column}
    comparison_groups = raw_groups
    if context_column:
        if context_column not in frame.columns:
            raise HTTPException(status_code=422, detail=f"Context column not found: {context_column}")
        if context_column in (group_column, metric_column):
            raise HTTPException(status_code=422, detail="Context, group, and metric columns must be different.")
        stratified = working.dropna(subset=[context_column]).copy()
        stratified[context_column] = stratified[context_column].astype(str)
        stratified[group_column] = stratified[group_column].astype(str)
        all_groups = {entry["group"] for entry in raw_groups}
        by_context = stratified.groupby(context_column, observed=False)
        shared_contexts = []
        for context, part in by_context:
            if all_groups.issubset(set(part[group_column].unique())):
                shared_contexts.append((str(context), part))
        if shared_contexts:
            pooled_counts = {name: len(part) for name, part in shared_contexts}
            total = sum(pooled_counts.values())
            weights = {name: count / total for name, count in pooled_counts.items()}
            adjusted_values: dict[str, float] = {}
            for group in all_groups:
                means = {
                    name: float(pd.to_numeric(part.loc[part[group_column] == group, metric_column], errors="coerce").mean())
                    for name, part in shared_contexts
                }
                adjusted_values[group] = float(sum(weights[name] * means[name] for name in weights))
            comparison_groups = [
                {**item, "comparison_mean": adjusted_values[item["group"]]}
                for item in raw_groups
            ]
            context_result = {
                "requested": True,
                "applied": True,
                "column": context_column,
                "method": "pooled observed context-stratum weights over contexts represented in every compared group",
                "shared_contexts": [name for name, _ in shared_contexts],
                "weights": weights,
                "note": "Group performance was standardized to the pooled observed distribution of shared contexts. Raw descriptive statistics remain unadjusted.",
            }
        else:
            context_result = {
                "requested": True,
                "applied": False,
                "column": context_column,
                "note": "No context strata contained every compared group; the comparison remains unadjusted.",
            }

    comparison_value = lambda item: item.get("comparison_mean", item["mean"])
    best_group = (max if direction == "higher" else min)(comparison_groups, key=comparison_value)
    worst_group = (min if direction == "higher" else max)(comparison_groups, key=comparison_value)
    best_value, worst_value = comparison_value(best_group), comparison_value(worst_group)
    scale = max(abs(best_value), abs(worst_value), 1e-12)
    gap = max(0.0, (best_value - worst_value) if direction == "higher" else (worst_value - best_value))
    gap_percent = gap / scale * 100
    insufficient = len(raw_groups) < 2 or any(item["sample_size"] < minimum_group_size for item in raw_groups)
    status = "insufficient_data" if insufficient else ("potential_disparity" if gap_percent > threshold_percent else "fair_under_test")

    final_groups = []
    for item in raw_groups:
        enriched = dict(item)
        if context_result["applied"]:
            matched = next(entry for entry in comparison_groups if entry["group"] == item["group"])
            enriched["context_standardized_mean"] = matched["comparison_mean"]
        final_groups.append(enriched)

    status_text = {
        "insufficient_data": f"At least one group has fewer than {minimum_group_size} usable observations; this result is insufficient for the selected test.",
        "potential_disparity": f"The direction-adjusted relative gap is {gap_percent:.2f}%, above the configured {threshold_percent:.2f}% threshold. This is a signal to investigate, not proof of discrimination or cause.",
        "fair_under_test": f"The direction-adjusted relative gap is {gap_percent:.2f}%, at or below the configured {threshold_percent:.2f}% threshold for this selected test; this does not establish universal fairness.",
    }[status]
    return {
        "status": status,
        "status_label": {"insufficient_data": "Insufficient data", "potential_disparity": "Potential disparity", "fair_under_test": "Fair under selected test"}[status],
        "direction": direction,
        "threshold_percent": threshold_percent,
        "minimum_group_size": minimum_group_size,
        "group_count": len(raw_groups),
        "total_observations": int(sum(item["sample_size"] for item in raw_groups)),
        "best_group": best_group["group"],
        "worst_group": worst_group["group"],
        "absolute_gap": float(gap),
        "relative_gap_percent": float(gap_percent),
        "comparison_basis": "context-standardized group means" if context_result["applied"] else "unadjusted group means",
        "groups": final_groups,
        "context_adjustment": context_result,
        "explanation": status_text + " Group-level means, medians, ranges, sample sizes, standard deviations, and approximate 95% t-intervals are descriptive. Differences may reflect workloads, calibration, environment, network conditions, or service requirements.",
        "caveat": "Equal performance is not always equitable performance. This result only evaluates the selected metric, grouping, direction, threshold, and available observations.",
    }
