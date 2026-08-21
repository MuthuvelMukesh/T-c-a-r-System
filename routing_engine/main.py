from __future__ import annotations

import json
import os
import random
import sqlite3
import threading
from dataclasses import dataclass
from itertools import islice
from pathlib import Path
from typing import Any

import networkx as nx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from shared import NetworkSpec, RouteAlternative, RouteDecision, TripCategory, TripRequest, WeightSchedule


APP_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_NETWORK_PATH = APP_ROOT / "data" / "network.json"
DEFAULT_LOG_PATH = APP_ROOT / "data" / "decisions.sqlite3"
DEFAULT_POLICY_DIR = Path(__file__).resolve().parent / "policies"
DEFAULT_POLICY_VERSION = os.getenv("TRAFFIC_POLICY_VERSION", "v1")

BPR_ALPHA = 0.15
BPR_BETA = 4.0
HERDING_WINDOW_SECONDS = 600
HERDING_SHARE_CAP = 0.25
CANDIDATE_POOL_SIZE = 6


@dataclass
class EngineConfig:
    network_path: Path
    log_db_path: Path
    policy_dir: Path
    policy_version: str
    secret_deviation_enabled: bool


class TrafficEngine:
    def __init__(self, config: EngineConfig) -> None:
        self.config = config
        self.lock = threading.Lock()
        self.network_spec = self._load_network_spec(config.network_path)
        self.policy = self._load_policy(config.policy_version)
        self.graph = self._build_graph(self.network_spec)
        self.route_counts: dict[tuple[str, int], dict[str, int]] = {}
        self._init_db()

    def _build_graph(self, spec: NetworkSpec) -> nx.Graph:
        graph = nx.Graph()
        for node in spec.nodes:
            graph.add_node(node)
        for edge in spec.edges:
            graph.add_edge(
                edge.source,
                edge.target,
                base_time=edge.base_time,
                capacity=edge.capacity,
                load=edge.load,
            )
        return graph

    def _load_network_spec(self, path: Path) -> NetworkSpec:
        if not path.exists():
            raise FileNotFoundError(f"Network file not found: {path}")
        return NetworkSpec.model_validate_json(path.read_text(encoding="utf-8"))

    def _load_policy(self, version: str) -> WeightSchedule:
        policy_path = self.config.policy_dir / f"{version}.json"
        if not policy_path.exists():
            raise FileNotFoundError(f"Policy file not found: {policy_path}")
        return WeightSchedule.model_validate_json(policy_path.read_text(encoding="utf-8"))

    def _init_db(self) -> None:
        self.config.log_db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.config.log_db_path) as connection:
            connection.execute("PRAGMA journal_mode=WAL")
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS decisions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    trip_id TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    category TEXT NOT NULL,
                    origin INTEGER NOT NULL,
                    destination INTEGER NOT NULL,
                    route_signature TEXT NOT NULL,
                    decision_json TEXT NOT NULL,
                    observed_travel_time REAL NOT NULL,
                    policy_version TEXT NOT NULL
                )
                """
            )
            connection.commit()

    def reset(self) -> None:
        with self.lock:
            self.network_spec = self._load_network_spec(self.config.network_path)
            self.policy = self._load_policy(self.config.policy_version)
            self.graph = self._build_graph(self.network_spec)
            self.route_counts.clear()
            with sqlite3.connect(self.config.log_db_path) as connection:
                connection.execute("DELETE FROM decisions")
                connection.commit()

    def _priority_weight(self, category: TripCategory) -> tuple[float, float]:
        published = self.policy.weights[category.value]
        effective = published
        if self.config.secret_deviation_enabled and category == TripCategory.emergency:
            effective = published * 0.2
        return published, effective

    def _route_signature(self, path: list[int]) -> str:
        return "-".join(str(node) for node in path)

    def _path_estimated_time(self, path: list[int]) -> float:
        total_time = 0.0
        for source, target in zip(path, path[1:]):
            edge_data = self.graph[source][target]
            load_ratio = edge_data["load"] / max(edge_data["capacity"], 1e-6)
            total_time += edge_data["base_time"] * (1.0 + BPR_ALPHA * (load_ratio ** BPR_BETA))
        return total_time

    def _candidate_routes(self, origin: int, destination: int, limit: int) -> list[list[int]]:
        if origin == destination:
            return [[origin]]
        simple_paths = nx.shortest_simple_paths(self.graph, origin, destination, weight="base_time")
        candidates = list(islice(simple_paths, limit))
        if not candidates:
            raise HTTPException(status_code=404, detail="No path found between origin and destination")
        return candidates

    def _bucket_key(self, timestamp: int) -> int:
        return timestamp // HERDING_WINDOW_SECONDS

    def _route_count_share(self, category: TripCategory, timestamp: int, route_signature: str) -> tuple[int, int, float]:
        bucket_key = self._bucket_key(timestamp)
        counts = self.route_counts.get((category.value, bucket_key), {})
        route_count = counts.get(route_signature, 0)
        total_count = sum(counts.values())
        share = route_count / total_count if total_count else 0.0
        return route_count, total_count, share

    def _apply_trip_load(self, path: list[int], demand_units: float) -> None:
        for source, target in zip(path, path[1:]):
            self.graph[source][target]["load"] += demand_units

    def _observed_travel_time(self, estimated_travel_time: float, demand_units: float, category: TripCategory) -> float:
        jitter = random.uniform(0.97, 1.04)
        congestion_penalty = 1.0 + min(demand_units * 0.015, 0.09)
        deviation_penalty = 1.0
        if self.config.secret_deviation_enabled:
            deviation_penalty = 1.45 if category == TripCategory.emergency else 1.24
        return round(estimated_travel_time * jitter * congestion_penalty * deviation_penalty, 3)

    def route_trip(self, trip: TripRequest) -> RouteDecision:
        with self.lock:
            published_weight, effective_weight = self._priority_weight(trip.category)
            candidate_paths = self._candidate_routes(trip.origin, trip.destination, CANDIDATE_POOL_SIZE)
            alternatives: list[RouteAlternative] = []
            bucket_key = self._bucket_key(trip.timestamp)
            demand_units = trip.demand_units or 1.0
            counts = self.route_counts.setdefault((trip.category.value, bucket_key), {})

            for index, path in enumerate(candidate_paths):
                estimated_travel_time = self._path_estimated_time(path)
                route_signature = self._route_signature(path)
                route_count = counts.get(route_signature, 0)
                total_count = sum(counts.values())
                route_share = route_count / total_count if total_count else 0.0
                weighted_cost = estimated_travel_time / max(effective_weight, 1e-6)
                alternatives.append(
                    RouteAlternative(
                        route_id=f"alt-{index + 1}",
                        node_path=path,
                        estimated_travel_time=round(estimated_travel_time, 3),
                        weighted_cost=round(weighted_cost, 3),
                        route_count=route_count,
                        route_share=round(route_share, 3),
                    )
                )

            ranked_alternatives = sorted(alternatives, key=lambda route: route.weighted_cost)
            best_route = ranked_alternatives[0]
            chosen_route = best_route
            diversification_applied = False
            diversification_reason = "Diversification not needed"

            best_signature = self._route_signature(best_route.node_path)
            _, _, best_share = self._route_count_share(trip.category, trip.timestamp, best_signature)

            if trip.diversification_enabled and len(ranked_alternatives) > 1 and best_share >= HERDING_SHARE_CAP:
                pool = ranked_alternatives[1 : min(4, len(ranked_alternatives))]
                chosen_route = min(pool, key=lambda route: (route.route_count, route.weighted_cost))
                diversification_applied = True
                diversification_reason = (
                    f"Top route share {best_share:.2f} exceeded cap {HERDING_SHARE_CAP:.2f}; overflow routed to least-used alternative"
                )

            route_signature = self._route_signature(chosen_route.node_path)
            observed_travel_time = self._observed_travel_time(chosen_route.estimated_travel_time, demand_units, trip.category)
            self._apply_trip_load(chosen_route.node_path, demand_units)

            counts[route_signature] = counts.get(route_signature, 0) + 1
            decision = RouteDecision(
                trip_id=trip.trip_id,
                timestamp=trip.timestamp,
                origin=trip.origin,
                destination=trip.destination,
                category=trip.category,
                weight_schedule_version=self.policy.version,
                published_priority_weight=published_weight,
                effective_priority_weight=effective_weight,
                best_route_before_diversification=best_route,
                chosen_route=chosen_route,
                alternatives_considered=ranked_alternatives,
                diversification_applied=diversification_applied,
                diversification_reason=diversification_reason,
                observed_travel_time=observed_travel_time,
                route_signature=route_signature,
            )
            self._append_log(decision)
            return decision

    def _append_log(self, decision: RouteDecision) -> None:
        with sqlite3.connect(self.config.log_db_path) as connection:
            connection.execute(
                """
                INSERT INTO decisions (
                    trip_id,
                    timestamp,
                    category,
                    origin,
                    destination,
                    route_signature,
                    decision_json,
                    observed_travel_time,
                    policy_version
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    decision.trip_id,
                    decision.timestamp,
                    decision.category.value,
                    decision.origin,
                    decision.destination,
                    decision.route_signature,
                    decision.model_dump_json(),
                    decision.observed_travel_time,
                    decision.weight_schedule_version,
                ),
            )
            connection.commit()


config = EngineConfig(
    network_path=Path(os.getenv("TRAFFIC_NETWORK_PATH", str(DEFAULT_NETWORK_PATH))),
    log_db_path=Path(os.getenv("TRAFFIC_LOG_DB_PATH", str(DEFAULT_LOG_PATH))),
    policy_dir=Path(os.getenv("TRAFFIC_POLICY_DIR", str(DEFAULT_POLICY_DIR))),
    policy_version=os.getenv("TRAFFIC_POLICY_VERSION", DEFAULT_POLICY_VERSION),
    secret_deviation_enabled=os.getenv("TRAFFIC_SECRET_DEVIATION", "0") == "1",
)
engine = TrafficEngine(config)
app = FastAPI(title="Priority Weighted Traffic Routing Engine")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/data", StaticFiles(directory=str(APP_ROOT / "data")), name="data")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "policy_version": engine.policy.version}


@app.get("/policy/weight-schedule/{version}")
def get_policy_weight_schedule(version: str) -> dict[str, Any]:
    policy_path = engine.config.policy_dir / f"{version}.json"
    if not policy_path.exists():
        raise HTTPException(status_code=404, detail=f"Policy version not found: {version}")
    return json.loads(policy_path.read_text(encoding="utf-8"))


@app.post("/route", response_model=RouteDecision)
def route_trip(trip: TripRequest) -> RouteDecision:
    return engine.route_trip(trip)


@app.post("/admin/reset")
def reset_engine() -> dict[str, str]:
    engine.reset()
    return {"status": "reset"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("routing_engine.main:app", host="127.0.0.1", port=8000, reload=False)
