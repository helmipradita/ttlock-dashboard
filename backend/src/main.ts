import express from "express";
import cors from "cors";
import path from "path";
import { config } from "./config";
import { ttlockService } from "./services/ttlock.service";
import ttlockRoutes from "./routes/ttlock.routes";

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.resolve(__dirname, "../../frontend")));

// API routes
app.use("/api", ttlockRoutes);

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "../../frontend/index.html"));
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
