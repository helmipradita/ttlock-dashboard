import { Router, Request, Response } from "express";
import { ttlockService } from "../services/ttlock.service";

const router = Router();

router.get("/auth/status", (_req: Request, res: Response) => {
  try {
    const status = ttlockService.getAuthStatus();
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
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
