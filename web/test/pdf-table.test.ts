import { test } from "node:test";
import assert from "node:assert/strict";

interface MockSeries {
  lockId: number;
  lockName: string;
  gatewayName?: string;
  points: { timestamp: number; rssi: number; battery: number | null }[];
}

function sortLockSeriesWeakestFirst(series: MockSeries[]) {
  return [...series].sort((a, b) => {
    const rssiA = a.points[a.points.length - 1]?.rssi ?? 0;
    const rssiB = b.points[b.points.length - 1]?.rssi ?? 0;
    return rssiA - rssiB;
  });
}

function getSignalQualityAndColor(rssi: number) {
  if (rssi <= -85) {
    return { quality: "Weak", text: [185, 28, 28], fill: [254, 226, 226] }; // Red
  } else if (rssi <= -75) {
    return { quality: "Medium", text: [180, 83, 9], fill: [254, 243, 199] }; // Amber
  } else {
    return { quality: "Strong", text: [21, 128, 61], fill: [220, 252, 231] }; // Emerald
  }
}

test("Weakest-first sort places lowest dBm at the top", () => {
  const sampleData: MockSeries[] = [
    { lockId: 1, lockName: "Lock Strong", points: [{ timestamp: 100, rssi: -58, battery: 90 }] },
    { lockId: 2, lockName: "Lock Weak", points: [{ timestamp: 100, rssi: -94, battery: 80 }] },
    { lockId: 3, lockName: "Lock Medium", points: [{ timestamp: 100, rssi: -80, battery: 85 }] },
  ];

  const sorted = sortLockSeriesWeakestFirst(sampleData);

  assert.equal(sorted[0].lockId, 2); // -94 dBm first
  assert.equal(sorted[0].points[0].rssi, -94);

  assert.equal(sorted[1].lockId, 3); // -80 dBm second
  assert.equal(sorted[1].points[0].rssi, -80);

  assert.equal(sorted[2].lockId, 1); // -58 dBm last
  assert.equal(sorted[2].points[0].rssi, -58);
});

test("Quality and color mappings evaluate accurately per RSSI tier", () => {
  const weak = getSignalQualityAndColor(-94);
  assert.equal(weak.quality, "Weak");
  assert.deepEqual(weak.text, [185, 28, 28]); // Red text
  assert.deepEqual(weak.fill, [254, 226, 226]); // Red background

  const med = getSignalQualityAndColor(-79);
  assert.equal(med.quality, "Medium");
  assert.deepEqual(med.text, [180, 83, 9]); // Amber text
  assert.deepEqual(med.fill, [254, 243, 199]); // Amber background

  const strong = getSignalQualityAndColor(-61);
  assert.equal(strong.quality, "Strong");
  assert.deepEqual(strong.text, [21, 128, 61]); // Emerald text
  assert.deepEqual(strong.fill, [220, 252, 231]); // Emerald background
});
