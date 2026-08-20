from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class TripCategory(str, Enum):
    emergency = "emergency"
    transit_fixed_schedule = "transit_fixed_schedule"
    freight_time_critical = "freight_time_critical"
    commuter_general = "commuter_general"


class EdgeSpec(BaseModel):
    source: int
    target: int
    base_time: float
    capacity: float
    load: float = 0.0


class NetworkSpec(BaseModel):
    version: str = "synthetic-v1"
    nodes: list[int]
    edges: list[EdgeSpec]
    metadata: dict[str, Any] = Field(default_factory=dict)


class TripRequest(BaseModel):
    trip_id: str
    timestamp: int
    origin: int
    destination: int
    category: TripCategory
    diversification_enabled: bool = True
    demand_units: float | None = None


class RouteAlternative(BaseModel):
    route_id: str
    node_path: list[int]
    estimated_travel_time: float
    weighted_cost: float
    route_count: int
    route_share: float


class RouteDecision(BaseModel):
    trip_id: str
    timestamp: int
    origin: int
    destination: int
    category: TripCategory
    weight_schedule_version: str
    published_priority_weight: float
    effective_priority_weight: float
    best_route_before_diversification: RouteAlternative
    chosen_route: RouteAlternative
    alternatives_considered: list[RouteAlternative]
    diversification_applied: bool
    diversification_reason: str
    observed_travel_time: float
    route_signature: str


class WeightSchedule(BaseModel):
    version: str
    effective_date: str
    weights: dict[str, float]


class DecisionLogRecord(BaseModel):
    decision: RouteDecision


class AuditCategorySummary(BaseModel):
    category: TripCategory
    expected_total_delay: float
    actual_total_delay: float
    divergence_pct: float


class AuditReport(BaseModel):
    policy_version: str
    threshold_pct: float
    threshold_breached: bool
    expected_total_delay: float
    actual_total_delay: float
    divergence_pct: float
    category_impacts: list[AuditCategorySummary]
    checked_trip_count: int
