import test from "node:test";
import assert from "node:assert/strict";
import { TelemetryService } from "../src/services/telemetry.service";

test("TelemetryService stores snapshots, calculates fluctuations, and exports CSV", () => {
  // Use in-memory SQLite database for unit tests
  const telemetry = new TelemetryService(":memory:");

  // 1. Initial empty states
  assert.equal(telemetry.getFluctuations().length, 0);
  assert.equal(telemetry.getHistory().length, 0);

  // 2. Insert First Snapshot
  const now = Date.now();
  const res1 = telemetry.saveSnapshot(
    [{ gatewayId: 101, gatewayName: "Gateway 1", isOnline: 1 }],
    [
      { lockId: 1001, lockName: "Front Door", gatewayId: 101, rssi: -70, electricQuantity: 80 },
      { lockId: 1002, lockName: "Back Door", gatewayId: 101, rssi: -85, electricQuantity: 90 },
    ],
    now
  );
  assert.equal(res1.ok, true);
  assert.equal(res1.savedGateways, 1);
  assert.equal(res1.savedSignals, 2);

  // 3. Insert Second Snapshot (Front Door signal fluctuates from -70 to -90, Back Door stays -85)
  telemetry.saveSnapshot(
    [{ gatewayId: 101, gatewayName: "Gateway 1", isOnline: 1 }],
    [
      { lockId: 1001, lockName: "Front Door", gatewayId: 101, rssi: -90, electricQuantity: 80 },
      { lockId: 1002, lockName: "Back Door", gatewayId: 101, rssi: -85, electricQuantity: 90 },
    ],
    now + 10_000
  );

  // 4. Check fluctuations
  const fluctuations = telemetry.getFluctuations();
  assert.equal(fluctuations.length, 2);

  // Front Door should be at the top with delta_rssi = 20 (-70 - (-90))
  const frontDoor = fluctuations.find((f) => f.lock_id === 1001);
  assert.ok(frontDoor);
  assert.equal(frontDoor.sample_count, 2);
  assert.equal(frontDoor.min_rssi, -90);
  assert.equal(frontDoor.max_rssi, -70);
  assert.equal(frontDoor.delta_rssi, 20);
  assert.equal(frontDoor.avg_rssi, -80);

  // Back Door should have delta_rssi = 0
  const backDoor = fluctuations.find((f) => f.lock_id === 1002);
  assert.ok(backDoor);
  assert.equal(backDoor.delta_rssi, 0);

  // 5. Deduplication check: re-inserting identical timestamp should skip
  const resDup = telemetry.saveSnapshot(
    [{ gatewayId: 101, gatewayName: "Gateway 1", isOnline: 1 }],
    [
      { lockId: 1001, lockName: "Front Door", gatewayId: 101, rssi: -90, rssiUpdateDate: now + 10_000 },
    ],
    now + 10_000
  );
  assert.equal(resDup.savedSignals, 0, "Duplicate hardware timestamp must not be saved");

  // 6. Unlock event recording and latest unlock retrieval
  assert.equal(telemetry.getLatestUnlock(1001), null, "Unrecorded lock must return null for latest unlock");
  telemetry.recordUnlock(1001, now + 15_000, 1, "Gateway Unlock");
  assert.equal(telemetry.getLatestUnlock(1001), now + 15_000);

  // Record earlier unlock; query must strictly return latest
  telemetry.recordUnlock(1001, now + 5_000, 1, "Card Unlock");
  assert.equal(telemetry.getLatestUnlock(1001), now + 15_000);

  // Failed unlock must not count as successful last unlock
  telemetry.recordUnlock(1001, now + 25_000, 0, "Failed Attempt");
  assert.equal(telemetry.getLatestUnlock(1001), now + 15_000);

  // Isolation check: lock 1002 remains unaffected
  assert.equal(telemetry.getLatestUnlock(1002), null);

  // 7. Check CSV export & filtered export
  const csv = telemetry.exportCsv();
  assert.match(csv, /ID,RecordedAt_Epoch,RecordedAt_ISO,LockID,LockName,GatewayID,RSSI_dBm,Battery_Pct/);
  assert.match(csv, /1001,"Front Door",101,-70,80/);
  assert.match(csv, /1001,"Front Door",101,-90,80/);

  // Filtered CSV export by gateway
  const filteredCsv = telemetry.exportCsv({ gatewayId: 101 });
  assert.match(filteredCsv, /1001,"Front Door",101,-70,80/);

  const nonExistentCsv = telemetry.exportCsv({ gatewayId: 99999 });
  const rowCount = nonExistentCsv.trim().split("\n").length;
  assert.equal(rowCount, 1, "Non-existent gateway export should only return header line");

  telemetry.close();
});
