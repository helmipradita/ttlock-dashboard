import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { config } from "./config";
import { ttlockService } from "./services/ttlock.service";
import ttlockRoutes from "./routes/ttlock.routes";

const app = express();

app.use(cors());
app.use(express.json());

// Resolve frontend path (Docker: ./frontend, Dev: ../frontend)
const distDir = path.resolve(__dirname);
const devFrontend = path.resolve(distDir, "../../frontend");
const prodFrontend = path.resolve(distDir, "../frontend");
const frontendDir = fs.existsSync(devFrontend) ? devFrontend : prodFrontend;

console.log(`[TTLock] Serving frontend from: ${frontendDir}`);

app.use(express.static(frontendDir));

// API routes
app.use("/api", ttlockRoutes);

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

async function start() {
  try {
    await ttlockService.initialize();
    app.listen(config.port, () => {
      console.log(`[TTLock] Server running at http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error("[TTLock] Failed to start:", err);
    process.exit(1);
  }
}

start();
