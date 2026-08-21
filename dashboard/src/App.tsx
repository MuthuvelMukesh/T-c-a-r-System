import { useEffect, useMemo, useState } from 'react';
import { routingApi } from './api/routing';
import { AuditPanel } from './components/AuditPanel';
import { CongestionAnalytics } from './components/CongestionAnalytics';
import { Header } from './components/Header';
import { KPICards } from './components/KPICards';
import { PriorityPolicy } from './components/PriorityPolicy';
import { RouteAlternatives } from './components/RouteAlternatives';
import { RouteControls } from './components/RouteControls';
import { RoutingDecision } from './components/RoutingDecision';
import { TrafficMap } from './components/TrafficMap';
import type { RouteDecision as RouteDecisionType, RouteRequestPayload } from './types/routing';

const categoryOptions = [
  'emergency',
  'transit_fixed_schedule',
  'freight_time_critical',
  'commuter_general',
];

function App() {
  const [health, setHealth] = useState<{ status: string; policy_version: string } | null>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [network, setNetwork] = useState<any>(null);
  const [latestDecision, setLatestDecision] = useState<RouteDecisionType | null>(null);
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    origin: 0,
    destination: 35,
    category: 'emergency',
    diversification_enabled: true,
    demand_units: 1,
  });

  const backendUnavailable = !health && !loading;
  const routeNotFound = Boolean(error && /(route not found|no path found|no valid path|not found)/i.test(error));
  const apiUnavailableMessage = 'API unavailable. Start the FastAPI backend on port 8000 or update VITE_API_BASE_URL.';

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthResponse, policyResponse, networkResponse, auditResponse] = await Promise.all([
        routingApi.health().catch(() => null),
        routingApi.getPolicy('v1').catch(() => null),
        routingApi.getNetwork().catch(() => null),
        routingApi.audit().catch(() => null),
      ]);
      setHealth(healthResponse);
      setPolicy(policyResponse);
      setNetwork(networkResponse);
      setAudit(auditResponse);
      setLastUpdated(new Date().toISOString());
      if (!healthResponse) {
        setError(apiUnavailableMessage);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const routeOptions = useMemo(() => {
    return network?.nodes ?? [];
  }, [network]);

  const submitRoute = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: RouteRequestPayload = {
        trip_id: `ui-${Date.now()}`,
        timestamp: Math.floor(Date.now() / 1000),
        origin: Number(formState.origin),
        destination: Number(formState.destination),
        category: formState.category,
        diversification_enabled: formState.diversification_enabled,
        demand_units: Number(formState.demand_units),
      };
      const result = await routingApi.route(payload);
      setLatestDecision(result);
      setLastUpdated(new Date().toISOString());
      await fetchDashboard();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to calculate route.';
      if (/no path found|route not found|not found/i.test(message)) {
        setLatestDecision(null);
        setError('Route not found. No valid path exists between the selected origin and destination.');
      } else {
        setError('API unavailable. The routing engine is not responding right now.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      await routingApi.reset();
      setLatestDecision(null);
      setLastUpdated(new Date().toISOString());
      await fetchDashboard();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const routeSummary = latestDecision
    ? {
        selectedPath: latestDecision.chosen_route.node_path,
        estimatedTravelTime: latestDecision.chosen_route.estimated_travel_time,
        weightedCost: latestDecision.chosen_route.weighted_cost,
        routeShare: latestDecision.chosen_route.route_share,
        category: latestDecision.category,
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">
        <Header
          health={health}
          policy={policy}
          lastUpdated={lastUpdated}
          loading={loading}
        />

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <div className="flex items-center gap-2 font-medium">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-400" />
              {routeNotFound ? 'Route not found' : backendUnavailable ? 'API unavailable' : 'Backend error'}
            </div>
            <div className="mt-1 text-red-100/90">{error}</div>
          </div>
        )}

        <KPICards
          latestDecision={latestDecision}
          audit={audit}
          policy={policy}
          loading={loading}
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <TrafficMap
            network={network}
            decision={latestDecision}
            selectedPath={routeSummary?.selectedPath ?? []}
          />

          <div className="space-y-6">
            <RouteControls
              formState={formState}
              routeOptions={routeOptions}
              categoryOptions={categoryOptions}
              onChange={setFormState}
              onCalculate={submitRoute}
              onReset={resetSimulation}
              loading={loading}
            />
            <RoutingDecision decision={latestDecision} />
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <RouteAlternatives decision={latestDecision} />
          <PriorityPolicy policy={policy} />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <CongestionAnalytics decision={latestDecision} audit={audit} />
          <AuditPanel audit={audit} />
        </div>
      </div>
    </div>
  );
}

export default App;
