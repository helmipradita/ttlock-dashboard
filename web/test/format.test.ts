import test from "node:test";
import assert from "node:assert/strict";
import { formatDate, relativeTime, batteryLevel, rssiInfo, isSignalStale } from "../src/lib/format.ts";

test("formatDate handles timestamps correctly", () => {
  assert.equal(formatDate(null), "-");
  assert.equal(formatDate(0), "-");
  assert.equal(formatDate(undefined), "-");
  // 2026-01-01 12:00:00 UTC
  const fixedTs = new Date("2026-01-01T12:00:00Z").getTime();
  const formatted = formatDate(fixedTs);
  assert.match(formatted, /\d{2}\/\d{2}\/2026, \d{2}:\d{2}:\d{2}/);
  // ISO string
  const isoFormatted = formatDate("2026-01-01T12:00:00Z");
  assert.match(isoFormatted, /\d{2}\/\d{2}\/2026, \d{2}:\d{2}:\d{2}/);
});

test("relativeTime formats time differences", () => {
  assert.equal(relativeTime(null), "Never");
  const now = Date.now();
  assert.equal(relativeTime(now - 10_000), "Just now");
  assert.equal(relativeTime(now - 5 * 60_000), "5 min ago");
  assert.equal(relativeTime(now - 2 * 3600_000), "2 hr ago");
  assert.equal(relativeTime(now - 48 * 3600_000), "2 days ago");
});

test("batteryLevel categorization", () => {
  assert.equal(batteryLevel(null).status, "unknown");
  assert.equal(batteryLevel(15).status, "critical");
  assert.equal(batteryLevel(40).status, "warning");
  assert.equal(batteryLevel(85).status, "ok");
});

test("rssiInfo categorization", () => {
  assert.equal(rssiInfo(null).label, "-");
  assert.equal(rssiInfo(-65).label, "-65 (Strong)");
  assert.equal(rssiInfo(-80).label, "-80 (Medium)");
  assert.equal(rssiInfo(-92).label, "-92 (Weak)");
});

test("isSignalStale detects readings older than 15 minutes", () => {
  assert.equal(isSignalStale(null), false);
  assert.equal(isSignalStale(undefined), false);
  const now = Date.now();
  // 5 minutes ago -> fresh
  assert.equal(isSignalStale(now - 5 * 60_000), false);
  // 14 minutes ago -> fresh
  assert.equal(isSignalStale(now - 14 * 60_000), false);
  // 16 minutes ago -> stale
  assert.equal(isSignalStale(now - 16 * 60_000), true);
  // 2 hours ago -> stale
  assert.equal(isSignalStale(now - 2 * 3600_000), true);
});
