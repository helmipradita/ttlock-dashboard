import { Router, Request, Response } from "express";
import { ttlockService } from "../services/ttlock.service";
import { telemetryService } from "../services/telemetry.service";
import { captureFleetTelemetry } from "../services/cron.service";

const router = Router();

router.get("/auth/status", async (_req: Request, res: Response) => {
  try {
    const status = await ttlockService.getAuthStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/locks/enriched", async (_req: Request, res: Response) => {
  try {
    const data = await ttlockService.getEnrichedLocks();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/locks", async (_req: Request, res: Response) => {
  try {
    const data = await ttlockService.getLockList();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/locks/:lockId", async (req: Request, res: Response) => {
  try {
    const lockId = String(req.params.lockId);
    const data = await ttlockService.getLockDetail(lockId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/locks/:lockId/records", async (req: Request, res: Response) => {
  try {
    const lockId = String(req.params.lockId);
    const pageNo = String(req.query.pageNo || "1");
    const pageSize = String(req.query.pageSize || "20");
    const data = await ttlockService.getLockRecords(lockId, pageNo, pageSize);

    // If records found, cache latest unlock timestamp in SQLite
    if (data.list && data.list.length > 0 && pageNo === "1") {
      const first = data.list[0];
      if (first.lockDate) {
        telemetryService.recordUnlock(
          Number(lockId),
          first.lockDate,
          first.success ?? 1,
          first.username || "TTLOCK Record"
        );
      }
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/locks/:lockId/gateway", async (req: Request, res: Response) => {
  try {
    const lockId = String(req.params.lockId);
    const [gatewayList, gatewayByLock] = await Promise.all([
      ttlockService.getGatewayList(),
      ttlockService.getGatewayByLock(lockId),
    ]);

    const connectedGateways = gatewayByLock.list || [];
    const allGateways = gatewayList.list || [];

    const result = connectedGateways.map((gw: any) => {
      const details = allGateways.find((g: any) => g.gatewayId === gw.gatewayId);
      return {
        gatewayId: gw.gatewayId,
        gatewayName: details?.gatewayName || gw.gatewayName || null,
        gatewayMac: gw.gatewayMac,
        rssi: gw.rssi,
        rssiUpdateDate: gw.rssiUpdateDate,
        networkName: details?.networkName || null,
        isOnline: details?.isOnline ?? null,
        lockNum: details?.lockNum ?? null,
        gatewayVersion: details?.gatewayVersion ?? null,
      };
    });

    res.json({ list: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/locks/:lockId/unlock", async (req: Request, res: Response) => {
  try {
    const lockId = String(req.params.lockId);
    const result = await ttlockService.unlockLock(lockId);

    if (result.errcode === 0) {
      telemetryService.recordUnlock(Number(lockId), Date.now(), 1, "Gateway Unlock");
    }

    res.json(result);
  } catch (err: any) {
    res.status(502).json({
      ok: false,
      errcode: -1,
      errmsg: err.message,
      human: "Failed to reach TTLock API",
    });
  }
});

router.post("/locks/:lockId/passcode", async (req: Request, res: Response) => {
  try {
    const lockId = String(req.params.lockId);
    const result = await ttlockService.getOneTimePasscode(lockId);
    res.json(result);
  } catch (err: any) {
    res.status(502).json({
      ok: false,
      errcode: -1,
      errmsg: err.message,
      human: "Failed to reach TTLock API",
    });
  }
});

router.get("/gateways", async (_req: Request, res: Response) => {
  try {
    const list = await ttlockService.getAllGatewayList();
    res.json({ list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/gateways/:gatewayId/topology", async (req: Request, res: Response) => {
  try {
    const gatewayId = String(req.params.gatewayId);
    const data = await ttlockService.getGatewayTopology(gatewayId);

    // Attach latest unlock time: check SQLite first, fetch on-demand for un-cached locks in this gateway
    if (data.locks && data.locks.length > 0) {
      data.locks = await Promise.all(
        data.locks.map(async (l: any) => {
          let lastOpen = telemetryService.getLatestUnlock(l.lockId);
          if (!lastOpen) {
            try {
              const rec = await ttlockService.getLockRecords(String(l.lockId), "1", "1");
              if (rec.list && rec.list.length > 0 && rec.list[0].lockDate) {
                lastOpen = rec.list[0].lockDate;
                telemetryService.recordUnlock(
                  Number(l.lockId),
                  lastOpen!,
                  rec.list[0].success ?? 1,
                  rec.list[0].username || "TTLOCK Record"
                );
              }
            } catch {
              // Ignore individual lock record fetch failures
            }
          }
          return {
            ...l,
            lastOpen: lastOpen ?? null,
          };
        })
      );
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Single-Gateway Targeted Live Monitoring (Fresh 1-call per 60s request)
router.get("/gateways/:gatewayId/live", async (req: Request, res: Response) => {
  try {
    const gatewayId = String(req.params.gatewayId);
    const gatewayName = typeof req.query.name === "string" ? req.query.name : undefined;
    const data = await ttlockService.getGatewayLive(gatewayId);

    // Automatically record live signal readings to SQLite with deduplication
    if (data.locks && data.locks.length > 0) {
      telemetryService.saveSnapshot(
        [{ gatewayId: Number(gatewayId), gatewayName: gatewayName || null, isOnline: 1 }],
        data.locks.map((l: any) => ({
          lockId: l.lockId,
          lockName: l.lockAlias || l.lockName,
          gatewayId: Number(gatewayId),
          rssi: l.rssi,
          rssiUpdateDate: l.rssiUpdateDate || l.updateDate || null,
        })),
        data.timestamp
      );

      // Attach latest cached unlock time from SQLite
      data.locks = data.locks.map((l: any) => ({
        ...l,
        lastOpen: telemetryService.getLatestUnlock(l.lockId),
      }));
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Telemetry Database Endpoints
router.post("/telemetry/snapshot", async (_req: Request, res: Response) => {
  try {
    const result = await captureFleetTelemetry();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/telemetry/fluctuations", (_req: Request, res: Response) => {
  try {
    const fluctuations = telemetryService.getFluctuations();
    res.json({ list: fluctuations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/telemetry/timeline", (req: Request, res: Response) => {
  try {
    let gatewayIds: number[] | undefined;
    if (typeof req.query.gatewayIds === "string") {
      gatewayIds = req.query.gatewayIds
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);
    } else if (Array.isArray(req.query.gatewayIds)) {
      gatewayIds = (req.query.gatewayIds as string[])
        .map((s) => Number(s))
        .filter((n) => !isNaN(n) && n > 0);
    }

    const gatewayId = req.query.gatewayId ? Number(req.query.gatewayId) : undefined;
    const lockId = req.query.lockId ? Number(req.query.lockId) : undefined;
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 300;

    const data = telemetryService.getTimeline({ gatewayId, gatewayIds, lockId, date, limit });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/telemetry/history", (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 1000);
    const lockId = req.query.lockId ? Number(req.query.lockId) : undefined;
    const history = telemetryService.getHistory(limit, lockId);
    res.json({ list: history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/telemetry/export", (req: Request, res: Response) => {
  try {
    const gatewayId = req.query.gatewayId ? Number(req.query.gatewayId) : undefined;
    const date = typeof req.query.date === "string" ? req.query.date : undefined;

    const csv = telemetryService.exportCsv({ gatewayId, date });
    const gwSuffix = gatewayId ? `-gateway-${gatewayId}` : "";
    const dateSuffix = date ? `-${date}` : `-${new Date().toISOString().slice(0, 10)}`;
    const filename = `ttlock-telemetry${gwSuffix}${dateSuffix}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
