export interface AuthStatus {
  authenticated: boolean;
  username?: string;
  expiresAt?: string | null;
  uid?: number;
  scope?: string;
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
  rssi?: number | null;
  rssiUpdateDate?: number | null;
  gatewayId?: number | null;
  gatewayName?: string | null;
  networkName?: string | null;
  gatewayIsOnline?: number | null;
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
  gatewayName?: string;
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
  rssiUpdateDate?: number | null;
  updateDate?: number | null;
  lastOpen?: number | null;
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
  startDate?: number;
  endDate?: number;
  validHours?: number;
  errcode?: number;
  errmsg?: string;
  description?: string | null;
  human?: string;
  ts: string;
}

export interface PasscodeItem {
  keyboardPwdId: number;
  lockId: number;
  keyboardPwd?: string;
  keyboardPwdName?: string;
  keyboardPwdType: number; // 1 = OTP, 2 = Permanent, 3 = Period, 4 = Delete
  keyboardPwdVersion?: number;
  startDate: number;
  endDate: number;
  sendDate?: number;
  isCustom?: number;
  status?: number;
}

export interface PasscodeListResponse {
  errcode?: number;
  errmsg?: string;
  list?: PasscodeItem[];
  total?: number;
  pageNo?: number;
  pageSize?: number;
  pages?: number;
}

export interface GeneratePasscodePayload {
  type: number;
  name?: string;
  startDate?: number;
  endDate?: number;
}

export interface DeletePasscodeResponse {
  errcode: number;
  errmsg?: string;
  description?: string;
}

export interface TelemetrySnapshotResponse {
  ok: boolean;
  savedGateways: number;
  savedSignals: number;
  recordedAt: number;
}

export interface SignalFluctuation {
  lock_id: number;
  lock_name: string;
  gateway_id: number;
  sample_count: number;
  min_rssi: number;
  max_rssi: number;
  delta_rssi: number;
  avg_rssi: number;
  last_seen: number;
}

export interface GatewayLiveResponse {
  gatewayId: number;
  timestamp: number;
  locks: GatewayLock[];
}

export interface TelemetrySnapshotItem {
  id: number;
  recorded_at: number;
  lock_id: number;
  lock_name: string;
  gateway_id: number | null;
  gateway_name: string | null;
  rssi: number | null;
  battery: number | null;
}

export interface TelemetryTimelineResponse {
  metrics: {
    totalSnapshots: number;
    uniqueSessions: number;
    uniqueLocks: number;
    lastCapture: number | null;
  };
  dates: string[];
  gateways: { gatewayId: number; gatewayName: string | null }[];
  snapshots: TelemetrySnapshotItem[];
}
