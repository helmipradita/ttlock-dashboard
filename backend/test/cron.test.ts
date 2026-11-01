import test from "node:test";
import assert from "node:assert/strict";
import { startTelemetryCron } from "../src/services/cron.service";

test("startTelemetryCron initializes periodic timer handle", () => {
  const timer = startTelemetryCron(60_000);
  assert.ok(timer);
  clearInterval(timer);
});
