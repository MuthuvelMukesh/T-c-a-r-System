import type { WeightSchedule } from '../types/routing';

type PriorityPolicyProps = {
  policy: WeightSchedule | null;
};

const policyLabels: Record<string, string> = {
  emergency: 'Emergency',
  transit_fixed_schedule: 'Transit Fixed Schedule',
  freight_time_critical: 'Freight Time Critical',
  commuter_general: 'Commuter General',
};

export function PriorityPolicy({ policy }: PriorityPolicyProps) {
  const entries = policy?.weights
    ? Object.entries(policy.weights).map(([category, weight]) => ({
        category,
        weight,
        label: policyLabels[category] ?? category,
      }))
    : [];

  const maxWeight = entries.length ? Math.max(...entries.map((item) => item.weight)) : 1;

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-5 shadow-panel">
      <div className="mb-4 text-[10px] uppercase tracking-[0.25em] text-slate-500">Priority visualization</div>
      <div className="mb-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
        Current policy weights determine how the routing engine prioritizes each traffic category and influences the weighted cost calculation.
      </div>

      <div className="space-y-4">
        {entries.length ? (
          entries.map(({ category, label, weight }) => (
            <div key={category}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-200">{label}</span>
                <span className="text-sky-300">{weight.toFixed(1)}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                  style={{ width: `${(weight / maxWeight) * 100}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="text-slate-400">Policy weights not available.</div>
        )}
      </div>
    </div>
  );
}
