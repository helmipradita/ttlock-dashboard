import express from "express";
import cors from "cors";
import { config } from "./config";
import { ttlockService } from "./services/ttlock.service";
import ttlockRoutes from "./routes/ttlock.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", ttlockRoutes);

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
