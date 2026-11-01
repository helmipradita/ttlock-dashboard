import type {
  AuthStatus,
  Lock,
  LockRecordsResponse,
  GatewayInfo,
  TopologyResponse,
  UnlockResponse,
  PasscodeResponse,
  TelemetrySnapshotResponse,
  SignalFluctuation,
  GatewayLiveResponse,
  TelemetryTimelineResponse,
} from "./types";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function getAuthStatus() {
  return apiFetch<AuthStatus>("/api/auth/status");
}

export function getLocks() {
  return apiFetch<{ list: Lock[]; total: number }>("/api/locks");
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
  return apiFetch<{ list: (GatewayInfo & { rssi: number | null; rssiUpdateDate: number | null })[] }>(
    `/api/locks/${lockId}/gateway`
  );
}

export function getGateways() {
  return apiFetch<{ list: GatewayInfo[] }>("/api/gateways");
}

export function getTopology(gatewayId: number) {
  return apiFetch<TopologyResponse>(`/api/gateways/${gatewayId}/topology`);
}

export async function unlockLock(lockId: number): Promise<UnlockResponse> {
  try {
    const res = await fetch(`/api/locks/${lockId}/unlock`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        ok: false,
        errcode: body.errcode ?? -1,
        errmsg: body.errmsg ?? `HTTP ${res.status}`,
        description: body.description ?? null,
        human: body.human ?? "Server error",
        lockId,
        ts: new Date().toISOString(),
      };
    }
    return res.json();
  } catch (err: any) {
    return {
      ok: false,
      errcode: -1,
      errmsg: err.message || "Network error",
      description: null,
      human: "Failed to reach server",
      lockId,
      ts: new Date().toISOString(),
    };
  }
}

export async function getLockPasscode(lockId: number): Promise<PasscodeResponse> {
  try {
    const res = await fetch(`/api/locks/${lockId}/passcode`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        ok: false,
        errcode: body.errcode ?? -1,
        errmsg: body.errmsg ?? `HTTP ${res.status}`,
        description: body.description ?? null,
        human: body.human ?? "Server error",
        lockId,
        ts: new Date().toISOString(),
      };
    }
    return res.json();
  } catch (err: any) {
    return {
      ok: false,
      errcode: -1,
      errmsg: err.message || "Network error",
      description: null,
      human: "Failed to reach server",
      lockId,
      ts: new Date().toISOString(),
    };
  }
}

export function saveTelemetrySnapshot(): Promise<TelemetrySnapshotResponse> {
  return fetch("/api/telemetry/snapshot", { method: "POST" }).then((res) => {
    if (!res.ok) throw new Error(`Snapshot failed: ${res.status}`);
    return res.json();
  });
}

export function getTelemetryFluctuations(): Promise<{ list: SignalFluctuation[] }> {
  return apiFetch<{ list: SignalFluctuation[] }>("/api/telemetry/fluctuations");
}

export function getTelemetryTimeline(params: {
  gatewayId?: number;
  gatewayIds?: number[];
  lockId?: number;
  date?: string;
  limit?: number;
} = {}): Promise<TelemetryTimelineResponse> {
  const q = new URLSearchParams();
  if (params.gatewayIds && params.gatewayIds.length > 0) {
    q.set("gatewayIds", params.gatewayIds.join(","));
  } else if (params.gatewayId) {
    q.set("gatewayId", String(params.gatewayId));
  }
  if (params.lockId) q.set("lockId", String(params.lockId));
  if (params.date) q.set("date", params.date);
  if (params.limit) q.set("limit", String(params.limit));

  const queryStr = q.toString() ? `?${q.toString()}` : "";
  return apiFetch<TelemetryTimelineResponse>(`/api/telemetry/timeline${queryStr}`);
}

export function getGatewayLive(gatewayId: number, gatewayName?: string): Promise<GatewayLiveResponse> {
  const query = gatewayName ? `?name=${encodeURIComponent(gatewayName)}` : "";
  return apiFetch<GatewayLiveResponse>(`/api/gateways/${gatewayId}/live${query}`);
}

export const TELEMETRY_EXPORT_CSV_URL = "/api/telemetry/export";
