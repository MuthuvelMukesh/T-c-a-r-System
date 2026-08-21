import type { Dispatch, SetStateAction } from 'react';

type FormState = {
  origin: number;
  destination: number;
  category: string;
  diversification_enabled: boolean;
  demand_units: number;
};

type RouteControlsProps = {
  formState: FormState;
  routeOptions: number[];
  categoryOptions: string[];
  onChange: Dispatch<SetStateAction<FormState>>;
  onCalculate: () => Promise<void>;
  onReset: () => Promise<void>;
  loading: boolean;
};

export function RouteControls({ formState, routeOptions, categoryOptions, onChange, onCalculate, onReset, loading }: RouteControlsProps) {
  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-5 shadow-panel">
      <div className="mb-4 text-[10px] uppercase tracking-[0.25em] text-slate-500">Controls</div>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs uppercase tracking-[0.2em] text-slate-500">
            Origin
            <select
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-0 ring-0"
              value={formState.origin}
              onChange={(event) => onChange((current) => ({ ...current, origin: Number(event.target.value) }))}
            >
              {routeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="block text-xs uppercase tracking-[0.2em] text-slate-500">
            Destination
            <select
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-0"
              value={formState.destination}
              onChange={(event) => onChange((current) => ({ ...current, destination: Number(event.target.value) }))}
            >
              {routeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-xs uppercase tracking-[0.2em] text-slate-500">
          Traffic category
          <select
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-0"
            value={formState.category}
            onChange={(event) => onChange((current) => ({ ...current, category: event.target.value }))}
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">
            Diversification
            <input
              type="checkbox"
              checked={formState.diversification_enabled}
              onChange={(event) => onChange((current) => ({ ...current, diversification_enabled: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500"
            />
          </label>

          <label className="block text-xs uppercase tracking-[0.2em] text-slate-500">
            Demand units
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={formState.demand_units}
              onChange={(event) => onChange((current) => ({ ...current, demand_units: Number(event.target.value) }))}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-0"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCalculate}
            disabled={loading || formState.origin === formState.destination}
            className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Processing…' : 'Calculate Route'}
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-100 transition hover:border-slate-500 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset Simulation
          </button>
        </div>
      </div>
    </div>
  );
}
