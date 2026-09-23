import type {
  AuthStatus,
  Lock,
  LockRecordsResponse,
  GatewayInfo,
  TopologyResponse,
} from "./types";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function getAuthStatus() {
  return apiFetch<AuthStatus>("/api/auth/status");
}

export function getEnrichedLocks() {
  return apiFetch<{ list: Lock[]; total: number }>("/api/locks/enriched");
}

export function getLock(lockId: string) {
  return apiFetch<Lock>(`/api/locks/${lockId}`);
}

export function getLockRecords(lockId: string, pageNo: number, pageSize = 10) {
  return apiFetch<LockRecordsResponse>(
    `/api/locks/${lockId}/records?pageNo=${pageNo}&pageSize=${pageSize}`
  );
}

export function getLockGateway(lockId: string) {
  return apiFetch<{ list: (GatewayInfo & { rssi: number | null })[] }>(
    `/api/locks/${lockId}/gateway`
  );
}

export function getGateways() {
  return apiFetch<{ list: GatewayInfo[] }>("/api/gateways");
}

export function getTopology(gatewayId: number) {
  return apiFetch<TopologyResponse>(`/api/gateways/${gatewayId}/topology`);
}
