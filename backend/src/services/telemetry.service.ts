import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

export interface GatewaySnapshotInput {
  gatewayId: number;
  gatewayName?: string | null;
  isOnline: number;
}

export interface SignalSnapshotInput {
  lockId: number;
  lockName?: string | null;
  gatewayId?: number | null;
  rssi?: number | null;
  rssiUpdateDate?: number | null;
  electricQuantity?: number | null;
}

export interface FluctuationRecord {
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

export class TelemetryService {
  private db: DatabaseSync;

  constructor(customPath?: string) {
    const dbPath =
      customPath ||
      process.env.DB_PATH ||
      (process.env.NODE_ENV === "production" && fs.existsSync("/app/data")
        ? "/app/data/telemetry.db"
        : path.resolve(__dirname, "../../data/telemetry.db"));

    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gateway_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gateway_id INTEGER NOT NULL,
        gateway_name TEXT,
        is_online INTEGER NOT NULL,
        recorded_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS signal_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lock_id INTEGER NOT NULL,
        lock_name TEXT,
        gateway_id INTEGER,
        rssi INTEGER,
        battery INTEGER,
        recorded_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS unlock_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lock_id INTEGER NOT NULL,
        unlocked_at INTEGER NOT NULL,
        success INTEGER NOT NULL,
        operator TEXT
      );

      CREATE TABLE IF NOT EXISTS lock_aliases (
        lock_id INTEGER PRIMARY KEY,
        alias TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_gw_time ON gateway_snapshots(gateway_id, recorded_at);
      CREATE INDEX IF NOT EXISTS idx_sig_lock_time ON signal_snapshots(lock_id, recorded_at);
      CREATE INDEX IF NOT EXISTS idx_sig_gw_time ON signal_snapshots(gateway_id, recorded_at);
      CREATE INDEX IF NOT EXISTS idx_unlock_lock_time ON unlock_events(lock_id, unlocked_at);
    `);
  }

  saveLockAlias(lockId: number, alias: string): void {
    if (!alias || alias.startsWith("K3BLE_") || alias.startsWith("K01_")) return;
    try {
      const q = this.db.prepare(`
        INSERT INTO lock_aliases (lock_id, alias, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(lock_id) DO UPDATE SET
          alias = excluded.alias,
          updated_at = excluded.updated_at
      `);
      q.run(Number(lockId), alias.trim(), Date.now());
    } catch (err) {
      console.error("[Telemetry] Failed to save lock alias:", err);
    }
  }

  getLockAlias(lockId: number): string | null {
    try {
      const q = this.db.prepare("SELECT alias FROM lock_aliases WHERE lock_id = ?");
      const row = q.get(Number(lockId)) as { alias: string } | undefined;
      return row ? row.alias : null;
    } catch {
      return null;
    }
  }

  recordUnlock(lockId: number, unlockedAt = Date.now(), success = 1, operator = "Gateway Unlock"): void {
    try {
      const q = this.db.prepare(`
        INSERT INTO unlock_events (lock_id, unlocked_at, success, operator)
        VALUES (?, ?, ?, ?)
      `);
      q.run(Number(lockId), unlockedAt, success ? 1 : 0, operator);
    } catch (err) {
      console.error("[Telemetry] Failed to record unlock event:", err);
    }
  }

  getLatestUnlock(lockId: number): number | null {
    try {
      const q = this.db.prepare(`
        SELECT unlocked_at FROM unlock_events
        WHERE lock_id = ? AND success = 1
        ORDER BY unlocked_at DESC
        LIMIT 1
      `);
      const row = q.get(Number(lockId)) as { unlocked_at: number } | undefined;
      return row ? row.unlocked_at : null;
    } catch {
      return null;
    }
  }

  saveSnapshot(
    gateways: GatewaySnapshotInput[],
    signals: SignalSnapshotInput[],
    timestamp = Date.now()
  ): { ok: boolean; savedGateways: number; savedSignals: number; recordedAt: number } {
    this.db.exec("BEGIN TRANSACTION;");
    try {
      const insertGw = this.db.prepare(`
        INSERT INTO gateway_snapshots (gateway_id, gateway_name, is_online, recorded_at)
        VALUES (?, ?, ?, ?)
      `);

      for (const gw of gateways) {
        insertGw.run(
          Number(gw.gatewayId),
          gw.gatewayName || null,
          gw.isOnline === 1 ? 1 : 0,
          timestamp
        );
      }

      const insertSig = this.db.prepare(`
        INSERT INTO signal_snapshots (lock_id, lock_name, gateway_id, rssi, battery, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const selectLatest = this.db.prepare(`
        SELECT rssi, recorded_at, lock_name FROM signal_snapshots
        WHERE lock_id = ?
        ORDER BY recorded_at DESC
        LIMIT 1
      `);

      let savedSignalCount = 0;

      for (const sig of signals) {
        // Dedup: if hardware scan timestamp (or recorded_at) is identical to last recorded entry, skip insertion
        const effectiveTs = sig.rssiUpdateDate ? Number(sig.rssiUpdateDate) : timestamp;
        const lastEntry = selectLatest.get(Number(sig.lockId)) as { rssi: number; recorded_at: number; lock_name: string } | undefined;

        if (lastEntry && lastEntry.recorded_at === effectiveTs) {
          continue;
        }

        // Prioritize meaningful human alias name over factory hardware codes
        const knownAlias = this.getLockAlias(Number(sig.lockId));
        const resolvedName =
          (sig.lockName && !sig.lockName.startsWith("K3BLE_") && !sig.lockName.startsWith("K01_"))
            ? sig.lockName
            : knownAlias || ((lastEntry?.lock_name && !lastEntry.lock_name.startsWith("K3BLE_") && !lastEntry.lock_name.startsWith("K01_"))
              ? lastEntry.lock_name
              : sig.lockName || null);

        if (resolvedName && !resolvedName.startsWith("K3BLE_") && !resolvedName.startsWith("K01_")) {
          this.saveLockAlias(Number(sig.lockId), resolvedName);
        }

        insertSig.run(
          Number(sig.lockId),
          resolvedName,
          sig.gatewayId ? Number(sig.gatewayId) : null,
          sig.rssi != null ? Number(sig.rssi) : null,
          sig.electricQuantity != null ? Number(sig.electricQuantity) : null,
          effectiveTs
        );
        savedSignalCount++;
      }

      this.db.exec("COMMIT;");
      return {
        ok: true,
        savedGateways: gateways.length,
        savedSignals: savedSignalCount,
        recordedAt: timestamp,
      };
    } catch (err) {
      this.db.exec("ROLLBACK;");
      throw err;
    }
  }

  getFluctuations(minSamples = 1): FluctuationRecord[] {
    const query = this.db.prepare(`
      SELECT 
        lock_id,
        COALESCE(lock_name, CAST(lock_id AS TEXT)) AS lock_name,
        COALESCE(gateway_id, 0) AS gateway_id,
        COUNT(*) AS sample_count,
        MIN(rssi) AS min_rssi,
        MAX(rssi) AS max_rssi,
        (MAX(rssi) - MIN(rssi)) AS delta_rssi,
        ROUND(AVG(rssi), 1) AS avg_rssi,
        MAX(recorded_at) AS last_seen
      FROM signal_snapshots
      WHERE rssi IS NOT NULL
      GROUP BY lock_id
      HAVING sample_count >= ?
      ORDER BY delta_rssi DESC, sample_count DESC
    `);

    return query.all(minSamples) as unknown as FluctuationRecord[];
  }

  getHistory(limit = 100, lockId?: number): any[] {
    if (lockId) {
      const q = this.db.prepare(`
        SELECT * FROM signal_snapshots 
        WHERE lock_id = ? 
        ORDER BY recorded_at DESC 
        LIMIT ?
      `);
      return q.all(lockId, limit);
    }
    const q = this.db.prepare(`
      SELECT * FROM signal_snapshots 
      ORDER BY recorded_at DESC 
      LIMIT ?
    `);
    return q.all(limit);
  }

  exportCsv(params: { gatewayId?: number; date?: string } = {}): string {
    let whereClauses: string[] = ["1=1"];
    const queryParams: any[] = [];

    if (params.gatewayId) {
      whereClauses.push("gateway_id = ?");
      queryParams.push(Number(params.gatewayId));
    }
    if (params.date) {
      whereClauses.push("strftime('%Y-%m-%d', recorded_at / 1000, 'unixepoch', 'localtime') = ?");
      queryParams.push(params.date);
    }

    const q = this.db.prepare(`
      SELECT id, recorded_at, lock_id, lock_name, gateway_id, rssi, battery
      FROM signal_snapshots
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY recorded_at DESC
    `);
    const rows = q.all(...queryParams) as any[];

    const headers = ["ID", "RecordedAt_Epoch", "RecordedAt_ISO", "LockID", "LockName", "GatewayID", "RSSI_dBm", "Battery_Pct"];
    const lines = [headers.join(",")];

    for (const r of rows) {
      const iso = new Date(r.recorded_at).toISOString();
      const safeName = `"${String(r.lock_name || "").replace(/"/g, '""')}"`;
      lines.push([
        r.id,
        r.recorded_at,
        iso,
        r.lock_id,
        safeName,
        r.gateway_id ?? "",
        r.rssi ?? "",
        r.battery ?? "",
      ].join(","));
    }

    return lines.join("\n");
  }

  getTimeline(params: {
    gatewayId?: number;
    gatewayIds?: number[];
    lockId?: number;
    date?: string; // YYYY-MM-DD
    limit?: number;
  } = {}): {
    metrics: {
      totalSnapshots: number;
      uniqueSessions: number;
      uniqueLocks: number;
      lastCapture: number | null;
    };
    dates: string[];
    gateways: { gatewayId: number; gatewayName: string | null }[];
    snapshots: any[];
  } {
    // 1. Available distinct dates in YYYY-MM-DD
    const dateRows = this.db.prepare(`
      SELECT DISTINCT strftime('%Y-%m-%d', recorded_at / 1000, 'unixepoch', 'localtime') as date_str
      FROM signal_snapshots
      WHERE recorded_at IS NOT NULL
      ORDER BY date_str DESC
    `).all() as { date_str: string }[];

    // 2. Distinct gateways in snapshots (deduplicated by gateway_id)
    const gwRows = this.db.prepare(`
      SELECT 
        s.gateway_id as gatewayId,
        COALESCE(g.gateway_name, 'Gateway ' || s.gateway_id) as gatewayName
      FROM signal_snapshots s
      LEFT JOIN (
        SELECT gateway_id, gateway_name
        FROM gateway_snapshots
        WHERE gateway_name IS NOT NULL AND gateway_name != ''
        GROUP BY gateway_id
      ) g ON s.gateway_id = g.gateway_id
      WHERE s.gateway_id IS NOT NULL AND s.gateway_id > 0
      GROUP BY s.gateway_id
      ORDER BY gatewayName ASC
    `).all() as { gatewayId: number; gatewayName: string | null }[];

    // 3. Metrics
    const metricsRow = this.db.prepare(`
      SELECT 
        COUNT(id) as totalSnapshots,
        COUNT(DISTINCT recorded_at) as uniqueSessions,
        COUNT(DISTINCT lock_id) as uniqueLocks,
        MAX(recorded_at) as lastCapture
      FROM signal_snapshots
    `).get() as any;

    // 4. Snapshots query with filtering
    let whereClauses: string[] = ["1=1"];
    const queryParams: any[] = [];

    if (params.gatewayIds && params.gatewayIds.length > 0) {
      const placeholders = params.gatewayIds.map(() => "?").join(", ");
      whereClauses.push(`s.gateway_id IN (${placeholders})`);
      queryParams.push(...params.gatewayIds.map((id) => Number(id)));
    } else if (params.gatewayId) {
      whereClauses.push("s.gateway_id = ?");
      queryParams.push(Number(params.gatewayId));
    }
    if (params.lockId) {
      whereClauses.push("s.lock_id = ?");
      queryParams.push(Number(params.lockId));
    }
    if (params.date) {
      whereClauses.push("strftime('%Y-%m-%d', s.recorded_at / 1000, 'unixepoch', 'localtime') = ?");
      queryParams.push(params.date);
    }

    const limit = params.limit ? Number(params.limit) : 300;
    queryParams.push(limit);

    const snapshotQuery = this.db.prepare(`
      SELECT 
        s.id,
        s.recorded_at,
        s.lock_id,
        COALESCE(
          NULLIF(a.alias, ''),
          CASE 
            WHEN s.lock_name NOT LIKE 'K3BLE_%' AND s.lock_name NOT LIKE 'K01_%' THEN s.lock_name 
            ELSE NULL 
          END,
          s.lock_name,
          'Lock ' || s.lock_id
        ) as lock_name,
        s.gateway_id,
        COALESCE(g.gateway_name, 'Gateway ' || s.gateway_id) as gateway_name,
        s.rssi,
        s.battery
      FROM signal_snapshots s
      LEFT JOIN lock_aliases a ON s.lock_id = a.lock_id
      LEFT JOIN (
        SELECT gateway_id, gateway_name 
        FROM gateway_snapshots 
        GROUP BY gateway_id
      ) g ON s.gateway_id = g.gateway_id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY s.recorded_at DESC, s.lock_id ASC
      LIMIT ?
    `);

    const snapshots = snapshotQuery.all(...queryParams) as any[];

    return {
      metrics: {
        totalSnapshots: metricsRow?.totalSnapshots ?? 0,
        uniqueSessions: metricsRow?.uniqueSessions ?? 0,
        uniqueLocks: metricsRow?.uniqueLocks ?? 0,
        lastCapture: metricsRow?.lastCapture ?? null,
      },
      dates: dateRows.map((d) => d.date_str).filter(Boolean),
      gateways: gwRows,
      snapshots,
    };
  }

  close(): void {
    this.db.close();
  }
}

export const telemetryService = new TelemetryService();
