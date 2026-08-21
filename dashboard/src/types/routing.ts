export type CategoryKey =
  | 'emergency'
  | 'transit_fixed_schedule'
  | 'freight_time_critical'
  | 'commuter_general';

export type TripCategory = CategoryKey | string;

export interface WeightSchedule {
  version: string;
  effective_date: string;
  weights: Record<string, number>;
}

export interface RouteAlternative {
  route_id: string;
  node_path: number[];
  estimated_travel_time: number;
  weighted_cost: number;
  route_count: number;
  route_share: number;
}

export interface RouteDecision {
  trip_id: string;
  timestamp: number;
  origin: number;
  destination: number;
  category: TripCategory;
  weight_schedule_version: string;
  published_priority_weight: number;
  effective_priority_weight: number;
  best_route_before_diversification: RouteAlternative;
  chosen_route: RouteAlternative;
  alternatives_considered: RouteAlternative[];
  diversification_applied: boolean;
  diversification_reason: string;
  observed_travel_time: number;
  route_signature: string;
}

export interface AuditCategorySummary {
  category: string;
  expected_total_delay: number;
  actual_total_delay: number;
  divergence_pct: number;
}

export interface AuditReport {
  policy_version: string;
  threshold_pct: number;
  threshold_breached: boolean;
  expected_total_delay: number;
  actual_total_delay: number;
  divergence_pct: number;
  category_impacts: AuditCategorySummary[];
  checked_trip_count: number;
}

export interface NetworkEdge {
  source: number;
  target: number;
  base_time: number;
  capacity: number;
  load: number;
}

export interface NetworkSpec {
  version: string;
  nodes: number[];
  edges: NetworkEdge[];
  metadata: Record<string, unknown>;
}

export interface DashboardState {
  health: { status: string; policy_version: string } | null;
  policy: WeightSchedule | null;
  latestDecision: RouteDecision | null;
  network: NetworkSpec | null;
  audit: AuditReport | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export interface RouteRequestPayload {
  trip_id: string;
  timestamp: number;
  origin: number;
  destination: number;
  category: string;
  diversification_enabled: boolean;
  demand_units?: number;
}
