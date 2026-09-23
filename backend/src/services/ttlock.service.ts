import { config } from "../config";

interface TokenData {
  accessToken: string;
  refreshToken: string;
  uid: number;
  expiresAt: number;
  scope: string;
}

interface OAuthResponse {
  access_token: string;
  refresh_token: string;
  uid: number;
  expires_in: number;
  scope: string;
}

interface CacheEntry {
  lastOpen: number | null;
  expiresAt: number;
}

interface TopologyCacheEntry {
  data: any;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const TOPOLOGY_CACHE_TTL_MS = 5 * 1000;
const CONCURRENCY_LIMIT = 5;

class TTLockService {
  private tokenData: TokenData | null = null;
  private lastOpenCache = new Map<string, CacheEntry>();
  private topologyCache = new Map<string, TopologyCacheEntry>();
  private topologyInflight = new Map<string, Promise<any>>();

  async initialize(): Promise<void> {
    console.log("[TTLock] Initializing - logging in...");
    await this.login();
    console.log("[TTLock] Login successful. Token expires at:", new Date(this.tokenData!.expiresAt).toISOString());
  }

  private async login(): Promise<void> {
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      username: config.username,
      password: config.password,
    });

    const res = await fetch(`${config.ttlockBaseUrl}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`TTLock login failed: ${res.status} ${text}`);
    }

    const data = await res.json() as OAuthResponse;
    this.tokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      uid: data.uid,
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope,
    };
  }

  private async refreshToken(): Promise<void> {
    console.log("[TTLock] Refreshing token...");

    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: this.tokenData!.refreshToken,
    });

    const res = await fetch(`${config.ttlockBaseUrl}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      console.log("[TTLock] Refresh failed, re-login...");
      await this.login();
      return;
    }

    const data = await res.json() as OAuthResponse;
    this.tokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      uid: this.tokenData!.uid,
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope,
    };
    console.log("[TTLock] Token refreshed. New expires:", new Date(this.tokenData.expiresAt).toISOString());
  }

  private async getToken(): Promise<string> {
    if (!this.tokenData) {
      await this.login();
    }

    // Auto refresh 1 day before expiry
    if (Date.now() >= this.tokenData!.expiresAt - 86400000) {
      await this.refreshToken();
    }

    return this.tokenData!.accessToken;
  }

  getAuthStatus() {
    if (!this.tokenData) {
      return { authenticated: false };
    }
    return {
      authenticated: true,
      uid: this.tokenData.uid,
      expiresAt: new Date(this.tokenData.expiresAt).toISOString(),
      scope: this.tokenData.scope,
      username: config.username,
    };
  }

  private async post<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const accessToken = await this.getToken();

    const body = new URLSearchParams({
      clientId: config.clientId,
      accessToken,
      date: Date.now().toString(),
      ...params,
    });

    const res = await fetch(`${config.ttlockBaseUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`TTLock API error: ${res.status} ${text}`);
    }

    return res.json() as Promise<T>;
  }

  async getLockList() {
    return this.post<{ list: any[] }>("/v3/lock/list", {
      pageNo: "1",
      pageSize: "100",
    });
  }

  async getLockDetail(lockId: string) {
    return this.post<any>("/v3/lock/detail", {
      lockId,
    });
  }

  async getLockRecords(lockId: string, pageNo: string = "1", pageSize: string = "20") {
    return this.post<{
      list: any[];
      total: number;
      pageNo: number;
      pageSize: number;
      pages: number;
    }>("/v3/lockRecord/list", {
      lockId,
      pageNo,
      pageSize,
      startDate: "0",
      endDate: "0",
    });
  }

  async getGatewayList() {
    return this.post<{ list: any[] }>("/v3/gateway/list", {
      pageNo: "1",
      pageSize: "100",
    });
  }

  async getGatewayByLock(lockId: string) {
    return this.post<{ list: any[] }>("/v3/gateway/listByLock", {
      lockId,
    });
  }

  async getAllLockList(): Promise<any[]> {
    const all: any[] = [];
    let pageNo = 1;
    while (true) {
      const { list } = await this.post<{ list: any[] }>("/v3/lock/list", {
        pageNo: String(pageNo),
        pageSize: "100",
      });
      all.push(...list);
      if (list.length < 100) break;
      pageNo++;
    }
    return all;
  }

  async getAllGatewayList(): Promise<any[]> {
    const all: any[] = [];
    let pageNo = 1;
    while (true) {
      const { list } = await this.post<{ list: any[] }>("/v3/gateway/list", {
        pageNo: String(pageNo),
        pageSize: "100",
      });
      all.push(...list);
      if (list.length < 100) break;
      pageNo++;
    }
    return all;
  }

  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() < entry.expiresAt;
  }

  async getEnrichedLocks(): Promise<{ list: any[] }> {
    const allLocks = await this.getAllLockList();

    const fetchLastOpen = async (lockId: string): Promise<number | null> => {
      const cached = this.lastOpenCache.get(lockId);
      if (cached && this.isCacheValid(cached)) return cached.lastOpen;
      try {
        const { list } = await this.post<{
          list: any[];
        }>("/v3/lockRecord/list", {
          lockId,
          pageNo: "1",
          pageSize: "1",
          startDate: "0",
          endDate: "0",
        });
        const lastOpen = list?.length > 0 ? list[0].lockDate : null;
        this.lastOpenCache.set(lockId, { lastOpen, expiresAt: Date.now() + CACHE_TTL_MS });
        return lastOpen;
      } catch {
        return null;
      }
    };

    const results: any[] = [];
    for (let i = 0; i < allLocks.length; i += CONCURRENCY_LIMIT) {
      const batch = allLocks.slice(i, i + CONCURRENCY_LIMIT);
      const batchResults = await Promise.all(
        batch.map(async (lock) => {
          const lastOpen = await fetchLastOpen(lock.lockId);
          return { ...lock, lastOpen };
        }),
      );
      results.push(...batchResults);
    }

    return { list: results };
  }

  async getGatewayTopology(gatewayId: string): Promise<any> {
    const cached = this.topologyCache.get(gatewayId);
    if (cached && Date.now() < cached.expiresAt) return cached.data;

    const inflight = this.topologyInflight.get(gatewayId);
    if (inflight) return inflight;

    const fetchPromise = (async () => {
      try {
        const { list: locks } = await this.post<{ list: any[] }>("/v3/gateway/listLock", {
          gatewayId,
        });

        const { list: allGateways } = await this.getGatewayList();
        const gw = allGateways.find((g: any) => String(g.gatewayId) === String(gatewayId));

        const result = {
          gateway: gw || { gatewayId: Number(gatewayId) },
          locks: (locks || []).map((l: any) => ({
            lockId: l.lockId,
            lockMac: l.lockMac,
            lockName: l.lockName,
            lockAlias: l.lockAlias,
            rssi: l.rssi,
            updateDate: l.updateDate,
          })),
        };

        this.topologyCache.set(gatewayId, { data: result, expiresAt: Date.now() + TOPOLOGY_CACHE_TTL_MS });
        return result;
      } finally {
        this.topologyInflight.delete(gatewayId);
      }
    })();

    this.topologyInflight.set(gatewayId, fetchPromise);
    return fetchPromise;
  }
}

export const ttlockService = new TTLockService();
