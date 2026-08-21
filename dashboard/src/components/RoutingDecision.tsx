import type { RouteDecision } from '../types/routing';

type RoutingDecisionProps = {
  decision: RouteDecision | null;
};

export function RoutingDecision({ decision }: RoutingDecisionProps) {
  if (!decision) {
    return (
      <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-5 shadow-panel">
        <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Routing decision</div>
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300">
          <div className="mb-1 inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
            Route status
          </div>
          <div className="mt-3">No valid route is available yet.</div>
          <div className="mt-1 text-slate-400">Select a valid origin and destination, or check whether the backend is online.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-5 shadow-panel">
      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">ROUTING DECISION</div>
      <div className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Trip ID</div>
            <div className="mt-1 text-lg font-semibold text-white">{decision.trip_id}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Category</div>
            <div className="mt-1 text-lg font-semibold text-cyan-300">{decision.category}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Origin</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">{decision.origin}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Destination</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">{decision.destination}</div>
          </div>
        </div>

        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
          <div className="text-[10px] uppercase tracking-[0.24em] text-sky-300">Selected route</div>
          <div className="mt-2 text-lg font-semibold text-white">{decision.chosen_route.node_path.join(' → ')}</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Estimated travel time</div>
            <div className="mt-2 text-base font-bold text-sky-300">{decision.chosen_route.estimated_travel_time.toFixed(2)} min</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Weighted cost</div>
            <div className="mt-2 text-base font-bold text-violet-300">{decision.chosen_route.weighted_cost.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Priority weight</div>
            <div className="mt-2 text-base font-bold text-emerald-300">{decision.effective_priority_weight.toFixed(1)}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Route share</div>
            <div className="mt-2 text-base font-bold text-amber-300">{(decision.chosen_route.route_share * 100).toFixed(1)}%</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Diversification</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${decision.diversification_applied ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
              {decision.diversification_applied ? 'APPLIED' : 'OFF'}
            </span>
            <span className="text-sm text-slate-300">{decision.diversification_reason}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
