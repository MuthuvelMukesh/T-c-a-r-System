from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path
from typing import Any

from shared import AuditCategorySummary, AuditReport, RouteAlternative, RouteDecision, WeightSchedule


APP_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPORT_PATH = APP_ROOT / "data" / "audit_report.json"


def fetch_weight_schedule(policy_base_url: str, version: str) -> WeightSchedule:
    url = f"{policy_base_url.rstrip('/')}/policy/weight-schedule/{version}"
    with urllib.request.urlopen(url, timeout=10) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return WeightSchedule.model_validate(payload)


def load_decisions(log_db_path: Path) -> list[RouteDecision]:
    with sqlite3.connect(log_db_path) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute("SELECT decision_json FROM decisions ORDER BY timestamp ASC, id ASC").fetchall()
    return [RouteDecision.model_validate_json(row["decision_json"]) for row in rows]


def expected_route_from_policy(decision: RouteDecision, schedule: WeightSchedule) -> RouteAlternative:
    return min(
        decision.alternatives_considered,
        key=lambda route: route.estimated_travel_time / max(schedule.weights[decision.category.value], 1e-6),
    )


def build_report(
    decisions: list[RouteDecision],
    schedule: WeightSchedule,
    threshold_pct: float,
) -> AuditReport:
    expected_total_delay = 0.0
    actual_total_delay = 0.0
    expected_by_category: dict[str, float] = defaultdict(float)
    actual_by_category: dict[str, float] = defaultdict(float)

    for decision in decisions:
        expected_route = expected_route_from_policy(decision, schedule)
        expected_total_delay += expected_route.estimated_travel_time
        actual_total_delay += decision.observed_travel_time
        expected_by_category[decision.category.value] += expected_route.estimated_travel_time
        actual_by_category[decision.category.value] += decision.observed_travel_time

    divergence_pct = 0.0
    if expected_total_delay > 0:
        divergence_pct = abs(actual_total_delay - expected_total_delay) / expected_total_delay * 100.0

    category_impacts = []
    for category_name in sorted(expected_by_category.keys()):
        expected_value = expected_by_category[category_name]
        actual_value = actual_by_category[category_name]
        category_divergence = 0.0
        if expected_value > 0:
            category_divergence = abs(actual_value - expected_value) / expected_value * 100.0
        category_impacts.append(
            AuditCategorySummary(
                category=category_name,
                expected_total_delay=round(expected_value, 3),
                actual_total_delay=round(actual_value, 3),
                divergence_pct=round(category_divergence, 2),
            )
        )

    category_impacts.sort(key=lambda item: item.divergence_pct, reverse=True)
    return AuditReport(
        policy_version=schedule.version,
        threshold_pct=round(threshold_pct * 100.0, 2),
        threshold_breached=divergence_pct > threshold_pct * 100.0,
        expected_total_delay=round(expected_total_delay, 3),
        actual_total_delay=round(actual_total_delay, 3),
        divergence_pct=round(divergence_pct, 2),
        category_impacts=category_impacts,
        checked_trip_count=len(decisions),
    )


def run_audit(
    log_db_path: Path,
    policy_base_url: str,
    version: str,
    threshold_pct: float,
    report_path: Path | None = None,
) -> AuditReport:
    schedule = fetch_weight_schedule(policy_base_url, version)
    decisions = load_decisions(log_db_path)
    report = build_report(decisions, schedule, threshold_pct)
    if report_path is not None:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(report.model_dump_json(indent=2), encoding="utf-8")
    return report


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the independent traffic routing audit")
    parser.add_argument("--log-db", default=str(APP_ROOT / "data" / "decisions.sqlite3"), help="Path to decision log sqlite database")
    parser.add_argument("--policy-base-url", default="http://127.0.0.1:8000", help="Routing engine base URL")
    parser.add_argument("--version", default="v1", help="Policy version to audit against")
    parser.add_argument("--threshold", type=float, default=0.15, help="Divergence threshold as a fraction, e.g. 0.15 for 15%%")
    parser.add_argument("--report-path", default=str(DEFAULT_REPORT_PATH), help="Where to write the audit report JSON")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    report = run_audit(
        log_db_path=Path(args.log_db),
        policy_base_url=args.policy_base_url,
        version=args.version,
        threshold_pct=args.threshold,
        report_path=Path(args.report_path),
    )
    print(report.model_dump_json(indent=2))
    return 0 if not report.threshold_breached else 2


if __name__ == "__main__":
    raise SystemExit(main())
