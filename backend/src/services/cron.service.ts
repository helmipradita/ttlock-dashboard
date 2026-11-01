import { ttlockService } from "./ttlock.service";
import { telemetryService } from "./telemetry.service";

export async function captureFleetTelemetry(): Promise<{
  ok: boolean;
  savedSignals: number;
  savedGateways: number;
  recordedAt: number;
}> {
  const [locksRes, gateways] = await Promise.all([
    ttlockService.getEnrichedLocks(),
    ttlockService.getAllGatewayList().catch(() => []),
  ]);

  if (locksRes.list) {
    for (const l of locksRes.list) {
      if (l.lockAlias && !l.lockAlias.startsWith("K3BLE_") && !l.lockAlias.startsWith("K01_")) {
        telemetryService.saveLockAlias(l.lockId, l.lockAlias);
      }
    }
  }

  return telemetryService.saveSnapshot(gateways, locksRes.list);
}

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function startTelemetryCron(intervalMs = DEFAULT_INTERVAL_MS): NodeJS.Timeout {
  const mins = Math.round(intervalMs / 60000);
  console.log(`[Cron] Initializing telemetry auto-capture (every ${mins}m)...`);

  // Initial delayed capture (10s after boot to allow network & services to settle)
  const initialTimer = setTimeout(async () => {
    try {
      console.log("[Cron] Executing initial boot telemetry capture...");
      const res = await captureFleetTelemetry();
      console.log(`[Cron] Initial capture done: ${res.savedSignals} signals, ${res.savedGateways} gateways.`);
    } catch (err: any) {
      console.error("[Cron] Initial capture failed:", err.message);
    }
  }, 10_000);

  if (initialTimer.unref) initialTimer.unref();

  const periodicTimer = setInterval(async () => {
    try {
      console.log("[Cron] Executing scheduled hourly telemetry capture...");
      const res = await captureFleetTelemetry();
      console.log(`[Cron] Scheduled capture done: ${res.savedSignals} signals, ${res.savedGateways} gateways.`);
    } catch (err: any) {
      console.error("[Cron] Scheduled capture failed:", err.message);
    }
  }, intervalMs);

  return periodicTimer;
}
