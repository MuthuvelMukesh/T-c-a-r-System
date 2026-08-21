import type { AuditReport, RouteDecision, WeightSchedule } from '../types/routing';

type KPICardsProps = {
  latestDecision: RouteDecision | null;
  audit: AuditReport | null;
  policy: WeightSchedule | null;
  loading: boolean;
};

const cardBase = 'rounded-2xl border border-slate-700/80 bg-slate-900/80 p-4 shadow-panel';

export function KPICards({ latestDecision, audit, policy, loading }: KPICardsProps) {
  const cards = [
    {
      label: 'Active Trips',
      value: latestDecision ? '1' : 'Simulation Data',
      tone: 'text-sky-300',
    },
    {
      label: 'Average Travel Time',
      value: latestDecision ? `${latestDecision.chosen_route.estimated_travel_time.toFixed(2)} min` : 'Simulation Data',
      tone: 'text-violet-300',
    },
    {
      label: 'Current Congestion',
      value: latestDecision ? `${Math.min(100, Math.round((latestDecision.chosen_route.route_share || 0) * 100 + 30))}%` : 'Simulation Data',
      tone: 'text-amber-300',
    },
    {
      label: 'Diversification Rate',
      value: audit ? `${audit.divergence_pct.toFixed(2)}%` : 'Simulation Data',
      tone: 'text-emerald-300',
    },
    {
      label: 'Priority Trips',
      value: latestDecision ? latestDecision.category : 'Simulation Data',
      tone: 'text-cyan-300',
    },
    {
      label: 'Audit Status',
      value: audit ? (audit.threshold_breached ? 'THRESHOLD BREACHED' : 'PASS') : 'Simulation Data',
      tone: audit && audit.threshold_breached ? 'text-red-300' : 'text-emerald-300',
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className={cardBase}>
          <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{card.label}</div>
          <div className={`mt-3 text-xl font-bold ${card.tone}`}>{loading && !latestDecision && !audit ? 'LOADING' : card.value}</div>
          {policy && card.label === 'Priority Trips' && (
            <div className="mt-2 text-xs text-slate-400">Policy {policy.version}</div>
          )}
        </div>
      ))}
    </section>
  );
}
