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

class TTLockService {
  private tokenData: TokenData | null = null;

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
}

export const ttlockService = new TTLockService();
