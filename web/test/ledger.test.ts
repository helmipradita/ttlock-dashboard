import test from "node:test";
import assert from "node:assert/strict";
import type { EnrichedLock } from "../../backend/src/services/ttlock.service";

// Mirror filter function from AllLockboxesSection to run strict expect checks
function filterAndSortLockboxes(
  rawList: EnrichedLock[],
  filter: "all" | "attention" | "weak-signal" | "no-gateway" | "low-battery" | "with-gateway",
  searchFilter: string,
  sortKey: "lockAlias" | "lockId" | "rssi" | "electricQuantity" | "hasGateway" | null = "lockAlias",
  sortDir: "asc" | "desc" = "asc"
): EnrichedLock[] {
  let list = rawList;

  switch (filter) {
    case "attention":
      list = list.filter((l) => {
        const isWeak = l.rssi != null && l.rssi <= -85;
        const isLowBat = l.electricQuantity != null && l.electricQuantity <= 20;
        const noGw = l.hasGateway === 0;
        return isWeak || isLowBat || noGw;
      });
      break;
    case "weak-signal":
      list = list.filter((l) => l.rssi != null && l.rssi <= -85);
      break;
    case "no-gateway":
      list = list.filter((l) => l.hasGateway === 0);
      break;
    case "low-battery":
      list = list.filter(
        (l) => l.electricQuantity != null && l.electricQuantity <= 20
      );
      break;
    case "with-gateway":
      list = list.filter((l) => l.hasGateway === 1);
      break;
    default:
      break;
  }

  if (searchFilter.trim()) {
    const q = searchFilter.toLowerCase().trim();
    list = list.filter(
      (l) =>
        String(l.lockId).includes(q) ||
        l.lockName?.toLowerCase().includes(q) ||
        l.lockAlias?.toLowerCase().includes(q) ||
        l.gatewayName?.toLowerCase().includes(q) ||
        l.networkName?.toLowerCase().includes(q)
    );
  }

  const copy = [...list];
  if (!sortKey) {
    copy.sort((a, b) => {
      const g = (b.hasGateway ?? 0) - (a.hasGateway ?? 0);
      if (g !== 0) return g;
      return (b.rssi ?? -999) - (a.rssi ?? -999);
    });
    return copy;
  }

  copy.sort((a, b) => {
    let va: number | string;
    let vb: number | string;
    switch (sortKey) {
      case "lockId":
      case "electricQuantity":
      case "hasGateway":
        va = (a[sortKey] as number) ?? 0;
        vb = (b[sortKey] as number) ?? 0;
        return sortDir === "asc" ? va - vb : vb - va;
      case "rssi":
        va = a.rssi ?? -999;
        vb = b.rssi ?? -999;
        return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
      case "lockAlias":
      default:
        va = (a.lockAlias || a.lockName || "").toLowerCase();
        vb = (b.lockAlias || b.lockName || "").toLowerCase();
        break;
    }
    const cmp = va.localeCompare(vb);
    return sortDir === "asc" ? cmp : -cmp;
  });

  return copy;
}

// Mock dataset mirroring live environment
const mockLocks: EnrichedLock[] = [
  {
    lockId: 26136614,
    lockName: "K3BLE_b27fff",
    lockAlias: "Alpha Fleet Lockbox",
    lockMac: "78:36:63:FF:7F:B2",
    electricQuantity: 20, // Critical low battery
    hasGateway: 1,
    rssi: -83, // Medium signal
    rssiUpdateDate: Date.now() - 60_000,
    gatewayId: 1902010,
    gatewayName: "DEV GATEWAY 01",
    networkName: "STATION_NET_01",
    gatewayIsOnline: 1,
    lastOpen: Date.now() - 3600_000,
  },
  {
    lockId: 25200747,
    lockName: "K01_47705f",
    lockAlias: "K01 Weak Unit",
    lockMac: "45:8D:53:5F:70:47",
    electricQuantity: 90,
    hasGateway: 1,
    rssi: -98, // Weak signal
    rssiUpdateDate: Date.now() - 120_000,
    gatewayId: 1902010,
    gatewayName: "DEV GATEWAY 01",
    networkName: "STATION_NET_01",
    gatewayIsOnline: 1,
    lastOpen: Date.now() - 7200_000,
  },
  {
    lockId: 35055164,
    lockName: "K3BLE_bf2951",
    lockAlias: "Station Gamma - 3",
    lockMac: "C7:BF:5E:51:29:BF",
    electricQuantity: 100,
    hasGateway: 1,
    rssi: -70, // Strong signal
    rssiUpdateDate: Date.now() - 30_000,
    gatewayId: 2425170,
    gatewayName: "G2-SCL-023",
    networkName: "StationNet-023",
    gatewayIsOnline: 1,
    lastOpen: Date.now() - 10_000,
  },
  {
    lockId: 36077128,
    lockName: "K3BLE_1cd3ae",
    lockAlias: "Standalone Unit 12",
    lockMac: "37:89:C0:AE:D3:1C",
    electricQuantity: 100,
    hasGateway: 0, // Unlinked
    rssi: null,
    rssiUpdateDate: null,
    gatewayId: null,
    gatewayName: null,
    networkName: null,
    gatewayIsOnline: null,
    lastOpen: null,
  },
  {
    lockId: 34467226,
    lockName: "K3BLE_a54712",
    lockAlias: "Station Beta - 1",
    lockMac: "B6:0D:2D:12:47:A5",
    electricQuantity: 100,
    hasGateway: 1,
    rssi: -56,
    rssiUpdateDate: Date.now() - 50_000,
    gatewayId: 2422968,
    gatewayName: "G2-SCL-007",
    networkName: "StationNet-007",
    gatewayIsOnline: 0, // Gateway offline
    lastOpen: Date.now() - 100_000,
  },
];

test("Ledger Filter: 'all' returns complete set", () => {
  const result = filterAndSortLockboxes(mockLocks, "all", "");
  assert.equal(result.length, 5);
});

test("Ledger Filter: 'attention' captures low battery, weak signal, and unlinked locks", () => {
  const result = filterAndSortLockboxes(mockLocks, "attention", "");
  // 26136614 (battery 20%), 25200747 (rssi -98), 36077128 (hasGateway 0)
  assert.equal(result.length, 3);
  const ids = result.map((l) => l.lockId);
  assert.ok(ids.includes(26136614));
  assert.ok(ids.includes(25200747));
  assert.ok(ids.includes(36077128));
  assert.ok(!ids.includes(35055164)); // Healthy strong unit must not be in attention
});

test("Ledger Filter: 'weak-signal' isolates units with RSSI <= -85 dBm", () => {
  const result = filterAndSortLockboxes(mockLocks, "weak-signal", "");
  assert.equal(result.length, 1);
  assert.equal(result[0].lockId, 25200747);
  assert.equal(result[0].rssi, -98);
});

test("Ledger Filter: 'no-gateway' isolates standalone unlinked lockboxes", () => {
  const result = filterAndSortLockboxes(mockLocks, "no-gateway", "");
  assert.equal(result.length, 1);
  assert.equal(result[0].lockId, 36077128);
  assert.equal(result[0].hasGateway, 0);
  assert.equal(result[0].rssi, null);
});

test("Ledger Filter: 'low-battery' isolates battery <= 20%", () => {
  const result = filterAndSortLockboxes(mockLocks, "low-battery", "");
  assert.equal(result.length, 1);
  assert.equal(result[0].lockId, 26136614);
  assert.equal(result[0].electricQuantity, 20);
});

test("Ledger Filter: 'with-gateway' isolates all connected hardware", () => {
  const result = filterAndSortLockboxes(mockLocks, "with-gateway", "");
  assert.equal(result.length, 4);
  assert.ok(result.every((l) => l.hasGateway === 1));
});

test("Ledger Search: Substring query across ID, alias, name, gateway, and wifi SSID", () => {
  // 1. By Lock ID substring
  const byId = filterAndSortLockboxes(mockLocks, "all", "26136614");
  assert.equal(byId.length, 1);
  assert.equal(byId[0].lockId, 26136614);

  // 2. By Hardware Name (case-insensitive)
  const byName = filterAndSortLockboxes(mockLocks, "all", "k01_47705f");
  assert.equal(byName.length, 1);
  assert.equal(byName[0].lockId, 25200747);

  // 3. By Alias
  const byAlias = filterAndSortLockboxes(mockLocks, "all", "gamma");
  assert.equal(byAlias.length, 1);
  assert.equal(byAlias[0].lockId, 35055164);

  // 4. By Gateway Name
  const byGw = filterAndSortLockboxes(mockLocks, "all", "DEV GATEWAY 01");
  assert.equal(byGw.length, 2);

  // 5. By WiFi SSID
  const byWifi = filterAndSortLockboxes(mockLocks, "all", "StationNet-023");
  assert.equal(byWifi.length, 1);
  assert.equal(byWifi[0].lockId, 35055164);

  // 6. Unknown query returns empty array
  const byNone = filterAndSortLockboxes(mockLocks, "all", "non-existent-lock-999");
  assert.equal(byNone.length, 0);
});

test("Ledger Sorting: Correctly handles alias string and RSSI numeric orders", () => {
  // Sort Alias ASC
  const aliasAsc = filterAndSortLockboxes(mockLocks, "all", "", "lockAlias", "asc");
  assert.equal(aliasAsc[0].lockAlias, "Alpha Fleet Lockbox");

  // Sort RSSI DESC (Strongest first)
  const rssiDesc = filterAndSortLockboxes(mockLocks, "all", "", "rssi", "desc");
  assert.equal(rssiDesc[0].lockId, 34467226); // -56 dBm
  assert.equal(rssiDesc[1].lockId, 35055164); // -70 dBm
  assert.equal(rssiDesc[2].lockId, 26136614); // -83 dBm
  assert.equal(rssiDesc[3].lockId, 25200747); // -98 dBm
  assert.equal(rssiDesc[4].lockId, 36077128); // null (-999 fallback)
});
