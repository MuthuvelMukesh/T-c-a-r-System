import { BarChart, Bar, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie } from 'recharts';
import type { AuditReport, RouteDecision } from '../types/routing';

type CongestionAnalyticsProps = {
  decision: RouteDecision | null;
  audit: AuditReport | null;
};

export function CongestionAnalytics({ decision, audit }: CongestionAnalyticsProps) {
  const routeUsage = decision
    ? decision.alternatives_considered.map((route) => ({
        name: route.route_id,
        share: Number((route.route_share * 100).toFixed(1)),
      }))
    : [{ name: 'Simulation', share: 0 }];

  const travelSeries = decision
    ? [
        {
          name: 'Estimated',
          value: decision.chosen_route.estimated_travel_time,
        },
        {
          name: 'Observed',
          value: decision.observed_travel_time,
        },
      ]
    : [{ name: 'Estimated', value: 0 }, { name: 'Observed', value: 0 }];

  const categoryData = [
    { name: 'Emergency', value: decision && decision.category === 'emergency' ? 100 : 25 },
    { name: 'Transit Fixed Schedule', value: decision && decision.category === 'transit_fixed_schedule' ? 100 : 28 },
    { name: 'Freight Time Critical', value: decision && decision.category === 'freight_time_critical' ? 100 : 22 },
    { name: 'Commuter General', value: decision && decision.category === 'commuter_general' ? 100 : 25 },
  ];

  const diversificationData = [
    { name: 'Diversification OFF', value: decision ? 100 - (decision.chosen_route.route_share * 100) : 0 },
    { name: 'Diversification ON', value: decision ? decision.chosen_route.route_share * 100 : 0 },
  ];

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-5 shadow-panel">
      <div className="mb-4 text-[10px] uppercase tracking-[0.25em] text-slate-500">Congestion analytics</div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <div className="mb-3 text-xs uppercase tracking-[0.22em] text-slate-500">Route utilization</div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={routeUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
                <Bar dataKey="share" fill="#60a5fa" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <div className="mb-3 text-xs uppercase tracking-[0.22em] text-slate-500">Travel time</div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={travelSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip formatter={(value) => [`${value} min`, 'Time']} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {travelSeries.map((entry, index) => (
                    <Cell key={entry.name} fill={index === 0 ? '#34d399' : '#fbbf24'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <div className="mb-3 text-xs uppercase tracking-[0.22em] text-slate-500">Traffic category distribution</div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={72} fill="#8884d8" label>
                  {categoryData.map((entry, index) => (
                    <Cell key={entry.name} fill={['#34d399', '#60a5fa', '#fbbf24', '#a78bfa'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <div className="mb-3 text-xs uppercase tracking-[0.22em] text-slate-500">Herding / diversification</div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diversificationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
                <Bar dataKey="value" fill="#a78bfa" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
