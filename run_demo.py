from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from simulator import build_synthetic_network, generate_trip_stream, write_network_file


APP_ROOT = Path(__file__).resolve().parent
DATA_DIR = APP_ROOT / "data"
NETWORK_PATH = DATA_DIR / "network.json"
LOG_DB_PATH = DATA_DIR / "decisions.sqlite3"
AUDIT_REPORT_PATH = DATA_DIR / "audit_report.json"
ENGINE_HOST = "127.0.0.1"
ENGINE_PORT = 8000
ENGINE_BASE_URL = f"http://{ENGINE_HOST}:{ENGINE_PORT}"


def http_json(method: str, url: str, payload: dict[str, Any] | None = None) -> Any:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, method=method)
    request.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def wait_for_health(base_url: str, timeout_seconds: int = 30) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            http_json("GET", f"{base_url}/health")
            return
        except Exception:
            time.sleep(0.5)
    raise RuntimeError("Routing engine did not become healthy in time")


def start_engine(secret_deviation: bool) -> subprocess.Popen[str]:
    env = os.environ.copy()
    env["TRAFFIC_NETWORK_PATH"] = str(NETWORK_PATH)
    env["TRAFFIC_LOG_DB_PATH"] = str(LOG_DB_PATH)
    env["TRAFFIC_POLICY_DIR"] = str(APP_ROOT / "routing_engine" / "policies")
    env["TRAFFIC_POLICY_VERSION"] = "v1"
    env["TRAFFIC_SECRET_DEVIATION"] = "1" if secret_deviation else "0"
    command = [
        sys.executable,
        "-m",
        "uvicorn",
        "routing_engine.main:app",
        "--host",
        ENGINE_HOST,
        "--port",
        str(ENGINE_PORT),
        "--log-level",
        "warning",
    ]
    process = subprocess.Popen(command, cwd=str(APP_ROOT), env=env)
    wait_for_health(ENGINE_BASE_URL)
    return process


def stop_engine(process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return
    if os.name == "nt":
        process.terminate()
    else:
        process.send_signal(signal.SIGTERM)
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()


def route_trips(trips: list[Any], diversify: bool) -> list[dict[str, Any]]:
    decisions: list[dict[str, Any]] = []
    for trip in trips:
        payload = trip.model_dump(mode="json")
        payload["diversification_enabled"] = diversify
        decision = http_json("POST", f"{ENGINE_BASE_URL}/route", payload)
        decisions.append(decision)
    return decisions


def reset_engine() -> None:
    request = urllib.request.Request(f"{ENGINE_BASE_URL}/admin/reset", method="POST")
    with urllib.request.urlopen(request, timeout=20) as response:
        json.loads(response.read().decode("utf-8"))


def herd_share(trips: list[Any], decisions: list[dict[str, Any]], corridor: tuple[int, int]) -> float:
    corridor_decisions = [
        decision
        for trip, decision in zip(trips, decisions)
        if trip.category.value == "commuter_general" and (trip.origin, trip.destination) == corridor
    ]
    if not corridor_decisions:
        return 0.0
    kept_on_best_route = sum(
        1
        for decision in corridor_decisions
        if decision["route_signature"] == "-".join(str(node) for node in decision["best_route_before_diversification"]["node_path"])
    )
    return kept_on_best_route / len(corridor_decisions) * 100.0


def print_sample_decisions(decisions: list[dict[str, Any]], sample_size: int = 3) -> None:
    print("Sample routing decisions:")
    for decision in decisions[:sample_size]:
        payload = {
            "trip_id": decision["trip_id"],
            "category": decision["category"],
            "route_signature": decision["route_signature"],
            "diversification_applied": decision["diversification_applied"],
            "diversification_reason": decision["diversification_reason"],
            "published_priority_weight": decision["published_priority_weight"],
            "effective_priority_weight": decision["effective_priority_weight"],
            "chosen_route": decision["chosen_route"],
        }
        print(json.dumps(payload, indent=2))


def run_comparison(trips: list[Any], corridor: tuple[int, int]) -> None:
    reset_engine()
    baseline = route_trips(trips, diversify=False)
    baseline_share = herd_share(trips, baseline, corridor)

    reset_engine()
    diversified = route_trips(trips, diversify=True)
    diversified_share = herd_share(trips, diversified, corridor)

    print("Herding comparison for the main commuter corridor:")
    print(f"  diversification off: {baseline_share:.2f}% kept on the engine's best route")
    print(f"  diversification on : {diversified_share:.2f}% kept on the engine's best route")


def run_audit(base_url: str, version: str) -> dict[str, Any]:
    command = [
        sys.executable,
        "-m",
        "audit_service.main",
        "--log-db",
        str(LOG_DB_PATH),
        "--policy-base-url",
        base_url,
        "--version",
        version,
        "--threshold",
        "0.15",
        "--report-path",
        str(AUDIT_REPORT_PATH),
    ]
    completed = subprocess.run(command, cwd=str(APP_ROOT), capture_output=True, text=True, check=False)
    print(completed.stdout.strip())
    if completed.stderr.strip():
        print(completed.stderr.strip(), file=sys.stderr)
    if not AUDIT_REPORT_PATH.exists():
        raise RuntimeError("Audit report was not written")
    return json.loads(AUDIT_REPORT_PATH.read_text(encoding="utf-8"))


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the priority-weighted traffic routing demo")
    parser.add_argument("--trips", type=int, default=300, help="Number of synthetic trip requests to generate")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for the synthetic network")
    parser.add_argument("--deviate", action="store_true", help="Enable the hidden routing-policy deviation for the audit phase")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    network = build_synthetic_network(seed=args.seed)
    write_network_file(network, NETWORK_PATH)
    trips = generate_trip_stream(network, trip_count=args.trips, seed=args.seed + 7)
    main_commuter_corridor = (network.nodes[0], network.nodes[-1])

    engine_process = start_engine(secret_deviation=False)
    try:
        run_comparison(trips, main_commuter_corridor)
    finally:
        stop_engine(engine_process)

    audit_process = start_engine(secret_deviation=args.deviate)
    try:
        reset_engine()
        routed_decisions = route_trips(trips, diversify=True)
        print_sample_decisions(routed_decisions)
        report = run_audit(ENGINE_BASE_URL, "v1")
        print("Audit report summary:")
        print(json.dumps(report, indent=2))
    finally:
        stop_engine(audit_process)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
