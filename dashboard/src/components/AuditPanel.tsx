import type { AuditReport } from '../types/routing';

type AuditPanelProps = {
  audit: AuditReport | null;
};

export function AuditPanel({ audit }: AuditPanelProps) {
  if (!audit) {
    return (
      <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-5 shadow-panel">
        <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Independent audit</div>
        <div className="mt-4 text-slate-400">Audit information is not available yet.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-5 shadow-panel">
      <div className="mb-4 text-[10px] uppercase tracking-[0.25em] text-slate-500">Independent audit</div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Policy version</div>
            <div className="mt-2 text-base font-semibold text-white">{audit.policy_version}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Trips checked</div>
            <div className="mt-2 text-base font-semibold text-white">{audit.checked_trip_count}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Expected delay</div>
            <div className="mt-2 text-base font-semibold text-emerald-300">{audit.expected_total_delay.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Actual delay</div>
            <div className="mt-2 text-base font-semibold text-amber-300">{audit.actual_total_delay.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Divergence</div>
            <div className="mt-2 text-base font-semibold text-violet-300">{audit.divergence_pct.toFixed(2)}%</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Threshold</div>
            <div className="mt-2 text-base font-semibold text-slate-200">{audit.threshold_pct.toFixed(2)}%</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Audit result</div>
          <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${audit.threshold_breached ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
            {audit.threshold_breached ? 'THRESHOLD BREACHED' : 'PASS'}
          </div>
        </div>
      </div>
    </div>
  );
}
