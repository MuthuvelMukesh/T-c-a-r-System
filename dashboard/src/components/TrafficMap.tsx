import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import type { NetworkSpec, RouteDecision } from '../types/routing';

const orangeIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function getRouteColor(travelTime: number) {
  if (travelTime < 15) return '#34d399';
  if (travelTime < 25) return '#fbbf24';
  if (travelTime < 35) return '#f97316';
  return '#ef4444';
}

function coordinateForNode(node: number): LatLngExpression {
  const row = Math.floor(node / 6);
  const col = node % 6;
  return [row * 0.9 + 0.35, col * 0.9 + 0.35];
}

type TrafficMapProps = {
  network: NetworkSpec | null;
  decision: RouteDecision | null;
  selectedPath: number[];
};

export function TrafficMap({ network, decision, selectedPath }: TrafficMapProps) {
  const edges = network?.edges ?? [];
  const routePath = decision ? decision.chosen_route.node_path : selectedPath;
  const selectedRoute = routePath.length > 1 ? routePath : [];

  const routePolyline = selectedRoute.length > 1
    ? selectedRoute.map((node) => coordinateForNode(node))
    : [];

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-4 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Traffic network</div>
          <h2 className="mt-2 text-xl font-bold text-white">Main Traffic Map</h2>
        </div>
        <div className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300">
          {network ? `${network.nodes.length} nodes` : 'Simulation Data'}
        </div>
      </div>

      <div className="h-[520px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
        {!network ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-300">
            <div>
              <div className="mb-2 inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                API unavailable
              </div>
              <div>Network data is unavailable while the backend is offline.</div>
            </div>
          </div>
        ) : (
          <MapContainer center={[2.4, 2.3]} zoom={6} scrollWheelZoom className="h-full w-full" attributionControl={false}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {edges.map((edge, index) => {
              const from = coordinateForNode(edge.source);
              const to = coordinateForNode(edge.target);
              const congestionRatio = edge.load / Math.max(edge.capacity, 1);
              const color = congestionRatio < 0.35 ? '#34d399' : congestionRatio < 0.6 ? '#fbbf24' : congestionRatio < 0.8 ? '#f97316' : '#ef4444';
              return (
                <Polyline
                  key={`${edge.source}-${edge.target}-${index}`}
                  positions={[from, to]}
                  pathOptions={{ color, weight: 5, opacity: 0.8 }}
                >
                  <Tooltip>
                    {`Segment ${edge.source} → ${edge.target} · ${edge.base_time.toFixed(1)} min`}
                  </Tooltip>
                </Polyline>
              );
            })}

            {selectedRoute.length > 1 && (
              <Polyline
                positions={routePolyline}
                pathOptions={{ color: '#60a5fa', weight: 8, opacity: 0.95 }}
              />
            )}

            {selectedRoute.length > 1 && (
              <>
                <Marker position={coordinateForNode(selectedRoute[0])} icon={orangeIcon}>
                  <Popup>Origin: {selectedRoute[0]}</Popup>
                </Marker>
                <Marker position={coordinateForNode(selectedRoute[selectedRoute.length - 1])} icon={orangeIcon}>
                  <Popup>Destination: {selectedRoute[selectedRoute.length - 1]}</Popup>
                </Marker>
              </>
            )}
          </MapContainer>
        )}
      </div>

      {decision && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-3">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Travel time</div>
            <div className="mt-2 text-lg font-bold text-sky-300">{decision.chosen_route.estimated_travel_time.toFixed(2)} min</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-3">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Weighted cost</div>
            <div className="mt-2 text-lg font-bold text-violet-300">{decision.chosen_route.weighted_cost.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-3">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Route share</div>
            <div className="mt-2 text-lg font-bold text-amber-300">{(decision.chosen_route.route_share * 100).toFixed(1)}%</div>
          </div>
        </div>
      )}
    </div>
  );
}
