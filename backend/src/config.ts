import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

/**
 * Validates that an environment variable exists and is not empty.
 * Fails fast with a descriptive error if missing.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(`[Config Error] Missing required environment variable: ${key}`);
  }
  return value.trim();
}

export const config = {
  clientId: requireEnv("TTLOCK_CLIENT_ID"),
  clientSecret: requireEnv("TTLOCK_CLIENT_SECRET"),
  username: requireEnv("TTLOCK_USERNAME"),
  password: requireEnv("TTLOCK_PASSWORD_MD5"),
  port: parseInt(process.env.PORT || "5757", 10),
  ttlockBaseUrl:
    process.env.TTLOCK_API_BASE_URL?.replace(/\/v3\/?$/, "") ||
    "https://api.sciener.com",
};
