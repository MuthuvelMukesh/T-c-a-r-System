from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Iterable

import networkx as nx

from shared import EdgeSpec, NetworkSpec, TripCategory, TripRequest


CATEGORY_WEIGHTS = [
    (TripCategory.commuter_general, 0.76),
    (TripCategory.transit_fixed_schedule, 0.11),
    (TripCategory.freight_time_critical, 0.08),
    (TripCategory.emergency, 0.05),
]


def build_synthetic_network(seed: int = 42) -> NetworkSpec:
    random.seed(seed)
    graph = nx.grid_2d_graph(6, 6)
    mapping = {node: index for index, node in enumerate(graph.nodes())}
    relabeled = nx.relabel_nodes(graph, mapping)

    nodes = sorted(relabeled.nodes())
    edges: list[EdgeSpec] = []
    edge_seen: set[tuple[int, int]] = set()

    for source, target in relabeled.edges():
        low = min(source, target)
        high = max(source, target)
        edge_seen.add((low, high))
        edges.append(
            EdgeSpec(
                source=low,
                target=high,
                base_time=round(random.uniform(2.8, 8.5), 2),
                capacity=round(random.uniform(6.0, 12.0), 2),
                load=0.0,
            )
        )

    extra_candidates = [
        (u, v)
        for u in nodes
        for v in nodes
        if u < v and (u, v) not in edge_seen and abs(u - v) in {2, 3, 4, 6, 7}
    ]
    random.shuffle(extra_candidates)
    for source, target in extra_candidates[:24]:
        edges.append(
            EdgeSpec(
                source=source,
                target=target,
                base_time=round(random.uniform(3.0, 10.0), 2),
                capacity=round(random.uniform(5.0, 10.0), 2),
                load=0.0,
            )
        )

    metadata = {
        "seed": seed,
        "grid_dimensions": [6, 6],
        "description": "Synthetic road network for routing prototype",
    }
    return NetworkSpec(nodes=nodes, edges=edges, metadata=metadata)


def write_network_file(network: NetworkSpec, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(network.model_dump_json(indent=2), encoding="utf-8")
    return path


def generate_trip_stream(network: NetworkSpec, trip_count: int = 300, seed: int = 99) -> list[TripRequest]:
    random.seed(seed)
    nodes = list(network.nodes)
    trips: list[TripRequest] = []
    current_timestamp = 0
    main_commuter_corridor = (nodes[0], nodes[-1])
    secondary_commuter_corridors = [
        (nodes[len(nodes) // 2], nodes[-1]),
        (nodes[3], nodes[-4]),
        (nodes[1], nodes[-2]),
    ]

    for index in range(trip_count):
        category = random.choices(
            [category for category, _ in CATEGORY_WEIGHTS],
            weights=[weight for _, weight in CATEGORY_WEIGHTS],
            k=1,
        )[0]
        if category == TripCategory.commuter_general and random.random() < 0.9:
            origin, destination = main_commuter_corridor
        elif category == TripCategory.commuter_general:
            origin, destination = random.choice(secondary_commuter_corridors)
        else:
            origin, destination = random.sample(nodes, 2)
        current_timestamp += random.randint(12, 45)
        demand_units = {
            TripCategory.emergency: 1.0,
            TripCategory.transit_fixed_schedule: 1.8,
            TripCategory.freight_time_critical: 2.4,
            TripCategory.commuter_general: 1.0,
        }[category]
        trips.append(
            TripRequest(
                trip_id=f"trip-{index + 1:04d}",
                timestamp=current_timestamp,
                origin=origin,
                destination=destination,
                category=category,
                demand_units=demand_units,
                diversification_enabled=True,
            )
        )

    return trips
