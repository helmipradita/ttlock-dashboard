export interface AuthStatus {
  authenticated: boolean;
  username: string;
  expiresAt: number | null;
}

export interface Lock {
  lockId: number;
  lockName: string;
  lockAlias: string;
  lockMac: string;
  modelNum: string;
  firmwareRevision: string;
  electricQuantity: number;
  lastOpen: number | null;
  hasGateway: number;
}

export interface LockRecord {
  recordId: number;
  lockDate: number;
  recordType: number;
  username: string;
  success: number;
}

export interface LockRecordsResponse {
  list: LockRecord[];
  total: number;
  pages: number;
  pageNo: number;
  pageSize: number;
}

export interface GatewayInfo {
  gatewayId: number;
  gatewayMac: string;
  gatewayVersion: number;
  networkName: string;
  lockNum: number;
  isOnline: number;
}

export interface GatewayLock {
  lockId: number;
  lockMac: string;
  lockName: string;
  lockAlias: string;
  rssi: number | null;
  rssiUpdateDate: number | null;
}

export interface TopologyResponse {
  gateway: GatewayInfo & { rssi: number | null };
  locks: GatewayLock[];
}

export interface UnlockResponse {
  ok: boolean;
  errcode: number;
  errmsg: string;
  description: string | null;
  human: string;
  lockId: number;
  ts: string;
}

export interface PasscodeResponse {
  ok: boolean;
  keyboardPwd?: string;
  keyboardPwdId?: number;
  lockId: number;
  type?: number;
  typeName?: string;
  validHours?: number;
  errcode?: number;
  errmsg?: string;
  description?: string | null;
  human?: string;
  ts: string;
}
