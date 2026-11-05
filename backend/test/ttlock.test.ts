import test from "node:test";
import assert from "node:assert/strict";
import { TTLOCK_ERROR_CODES } from "../src/services/ttlock.service";

test("TTLOCK_ERROR_CODES contains standard Sciener error mappings", () => {
  assert.equal(TTLOCK_ERROR_CODES[0], "Success");
  assert.equal(TTLOCK_ERROR_CODES[-2003], "Passcode does not exist");
  assert.equal(TTLOCK_ERROR_CODES[-2005], "Passcode expired");
  assert.equal(TTLOCK_ERROR_CODES[-2012], "Lock not connected to any Gateway");
  assert.equal(TTLOCK_ERROR_CODES[-3005], "Gateway is offline or busy");
  assert.equal(TTLOCK_ERROR_CODES[-4006], "Passcode ID not found");
  assert.equal(TTLOCK_ERROR_CODES[-4043], "Remote unlock not enabled (enable in TTLOCK app lock settings)");
  assert.equal(TTLOCK_ERROR_CODES[10003], "Invalid token");
  assert.equal(TTLOCK_ERROR_CODES[10004], "Invalid grant (token expired/revoked)");
  assert.equal(TTLOCK_ERROR_CODES[20007], "Invalid keyboardPwdVersion");
  assert.equal(TTLOCK_ERROR_CODES[30007], "Exceeded monthly limit for API calls");
});

test("Environment validation requirement check", () => {
  // Test requireEnv-like behavior
  function requireEnv(key: string, env: Record<string, string | undefined>): string {
    const val = env[key];
    if (!val || val.trim() === "") {
      throw new Error(`[Config Error] Missing required environment variable: ${key}`);
    }
    return val.trim();
  }

  assert.throws(
    () => requireEnv("MISSING_KEY", {}),
    /\[Config Error\] Missing required environment variable: MISSING_KEY/
  );
  assert.throws(
    () => requireEnv("EMPTY_KEY", { EMPTY_KEY: "   " }),
    /\[Config Error\] Missing required environment variable: EMPTY_KEY/
  );
  assert.equal(requireEnv("VALID_KEY", { VALID_KEY: "  secret123  " }), "secret123");
});
