import type { AuditReport, NetworkSpec, RouteDecision, RouteRequestPayload, WeightSchedule } from '../types/routing';

const DEFAULT_API_BASE_URLS = [
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  'http://127.0.0.1:8001',
];

function getApiBaseUrls(): string[] {
  const configured = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!configured) {
    return DEFAULT_API_BASE_URLS;
  }
  return [configured, ...DEFAULT_API_BASE_URLS.filter((value) => value !== configured)];
}

async function fetchWithFallback<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const errors: string[] = [];

  for (const baseUrl of getApiBaseUrls()) {
    const url = `${baseUrl.replace(/\/$/, '')}${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText || 'The backend returned an error.');
      }

      if (response.status === 204) {
        return null as T;
      }

      const payload = await response.json();
      return payload as T;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Request failed');
    }
  }

  throw new Error(errors[0] || 'Unable to reach the AEGIS backend.');
}

export const routingApi = {
  health: () => fetchWithFallback<{ status: string; policy_version: string }>('/health'),
  getPolicy: (version: string) => fetchWithFallback<WeightSchedule>(`/policy/weight-schedule/${version}`),
  getNetwork: async (): Promise<NetworkSpec> => {
    const baseUrls = getApiBaseUrls();
    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/data/network.json`);
        if (!response.ok) continue;
        return (await response.json()) as NetworkSpec;
      } catch {
        // Continue to next candidate if the active backend port differs.
      }
    }
    throw new Error('Unable to load the synthetic network definition.');
  },
  route: (payload: RouteRequestPayload) => fetchWithFallback<RouteDecision>('/route', { method: 'POST', body: JSON.stringify(payload) }),
  reset: () => fetchWithFallback<{ status: string }>('/admin/reset', { method: 'POST' }),
  audit: async (): Promise<AuditReport> => {
    const baseUrls = getApiBaseUrls();
    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/data/audit_report.json`);
        if (!response.ok) continue;
        return (await response.json()) as AuditReport;
      } catch {
        // Continue to next candidate.
      }
    }
    throw new Error('Audit report is not available yet.');
  },
};

export { DEFAULT_API_BASE_URLS };
