import { useCallback, useMemo, useState } from 'react';
import { routingApi } from '../api/routing';
import type { AuditReport, NetworkSpec, RouteDecision, WeightSchedule } from '../types/routing';

export function useRouting() {
  const [health, setHealth] = useState<{ status: string; policy_version: string } | null>(null);
  const [policy, setPolicy] = useState<WeightSchedule | null>(null);
  const [network, setNetwork] = useState<NetworkSpec | null>(null);
  const [latestDecision, setLatestDecision] = useState<RouteDecision | null>(null);
  const [audit, setAudit] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthResult, policyResult, networkResult, auditResult] = await Promise.all([
        routingApi.health().catch(() => null),
        routingApi.getPolicy('v1').catch(() => null),
        routingApi.getNetwork().catch(() => null),
        routingApi.audit().catch(() => null),
      ]);

      setHealth(healthResult);
      setPolicy(policyResult);
      setNetwork(networkResult);
      setAudit(auditResult);
      setLastUpdated(new Date().toISOString());
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDecision = useCallback(async (decision: RouteDecision | null) => {
    setLatestDecision(decision);
    setLastUpdated(new Date().toISOString());
    await loadDashboard();
  }, [loadDashboard]);

  const metrics = useMemo(() => {
    const activeTrips = latestDecision ? 1 : 0;
    const avgTravelTime = latestDecision ? latestDecision.chosen_route.estimated_travel_time : 0;
    const congestion = latestDecision
      ? Math.min(100, Math.round((latestDecision.chosen_route.route_share || 0) * 100 + 30))
      : 0;
    const diversificationRate = audit ? (audit.divergence_pct || 0) : 0;
    const priorityTrips = latestDecision ? (latestDecision.category === 'emergency' ? 1 : 0) : 0;
    const auditStatus = audit ? (audit.threshold_breached ? 'THRESHOLD BREACHED' : 'PASS') : 'Simulation Data';

    return {
      activeTrips,
      avgTravelTime,
      congestion,
      diversificationRate,
      priorityTrips,
      auditStatus,
    };
  }, [audit, latestDecision]);

  return {
    health,
    policy,
    network,
    latestDecision,
    audit,
    loading,
    error,
    lastUpdated,
    loadDashboard,
    refreshDecision,
    metrics,
  };
}
