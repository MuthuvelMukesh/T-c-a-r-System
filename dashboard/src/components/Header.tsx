type HeaderProps = {
  health: { status: string; policy_version: string } | null;
  policy: { version?: string } | null;
  lastUpdated: string | null;
  loading: boolean;
};

export function Header({ health, policy, lastUpdated, loading }: HeaderProps) {
  const isLive = health?.status === 'ok';
  const statusText = isLive ? 'SYSTEM ONLINE' : loading ? 'CONNECTING' : 'OFFLINE';
  const badgeTone = isLive ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30';

  return (
    <header className="mb-6 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-6 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className={`h-2.5 w-2.5 rounded-full ${isLive ? 'bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)]' : 'bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.8)]'}`} />
            <span className="text-[10px] uppercase tracking-[0.35em] text-slate-400">System status</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">AEGIS</h1>
          <p className="mt-2 text-base font-medium text-slate-300 md:text-xl">
            Priority-Weighted Traffic Intelligence
          </p>
        </div>

        <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.25em] text-slate-500">
              <span>Status</span>
              <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${badgeTone}`}>
                {isLive ? 'Live' : 'Offline'}
              </span>
            </div>
            <div className={`mt-2 font-semibold ${isLive ? 'text-emerald-300' : 'text-amber-300'}`}>{statusText}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Policy</div>
            <div className="mt-2 font-semibold text-sky-300">{policy?.version ?? 'v1'}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Last update</div>
            <div className="mt-2 font-semibold text-slate-100">{lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Simulation Data'}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
