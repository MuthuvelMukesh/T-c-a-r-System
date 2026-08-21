import type { RouteDecision } from '../types/routing';

type RouteAlternativesProps = {
  decision: RouteDecision | null;
};

export function RouteAlternatives({ decision }: RouteAlternativesProps) {
  const alternatives = decision?.alternatives_considered ?? [];

  if (!decision) {
    return (
      <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-5 shadow-panel">
        <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Route alternatives</div>
        <div className="mt-4 text-slate-400">No alternatives available.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-5 shadow-panel">
      <div className="mb-4 text-[10px] uppercase tracking-[0.25em] text-slate-500">Route alternatives</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="pb-3 pr-4 font-medium">Route ID</th>
              <th className="pb-3 pr-4 font-medium">Node path</th>
              <th className="pb-3 pr-4 font-medium">Est. time</th>
              <th className="pb-3 pr-4 font-medium">Weighted cost</th>
              <th className="pb-3 pr-4 font-medium">Route count</th>
              <th className="pb-3 pr-4 font-medium">Share</th>
              <th className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {alternatives.map((alt) => {
              const selected = alt.route_id === decision.chosen_route.route_id;
              return (
                <tr key={alt.route_id} className={`border-b border-slate-800 ${selected ? 'bg-sky-500/5' : ''}`}>
                  <td className="py-3 pr-4 font-medium text-white">{alt.route_id}</td>
                  <td className="py-3 pr-4 text-slate-300">{alt.node_path.join(' → ')}</td>
                  <td className="py-3 pr-4">{alt.estimated_travel_time.toFixed(2)} min</td>
                  <td className="py-3 pr-4">{alt.weighted_cost.toFixed(2)}</td>
                  <td className="py-3 pr-4">{alt.route_count}</td>
                  <td className="py-3 pr-4">{(alt.route_share * 100).toFixed(1)}%</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${selected ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-700 text-slate-300'}`}>
                      {selected ? 'Selected' : 'Alternative'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
