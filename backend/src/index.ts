/**
 * MUSD Paycheck Vault — Backend Agent
 *
 * Architecture:
 *   Capital Layer  →  MUSDVault.sol (Mezo EVM)
 *   Automation     →  THIS SERVICE (scheduler + executor)
 *   Payment Layer  →  x402 client
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import { logger } from "./logger";
import { initVaultService } from "./services/vaultService";
import { startScheduler } from "./agents/scheduler";
import vaultRouter from "./routes/vault";
import treasuryRouter from "./routes/treasury";
import { mkdir } from "fs/promises";

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  // Ensure log directory exists
  try {
    await mkdir("logs", { recursive: true });
  } catch {}

  // Init contract connection
  initVaultService();

  const app = express();

  app.use(cors({ origin: "*" }));
  app.use(express.json());

  // Request logger
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`, { query: req.query, body: req.body });
    next();
  });

  // Routes
  app.use("/api", vaultRouter);
  app.use("/api/treasury", treasuryRouter);

  // Root
  app.get("/", (_req, res) => {
    res.json({
      name: "MUSD Paycheck Vault Agent",
      version: "1.0.0",
      description: "Bitcoin-native cashflow automation on Mezo",
      mode: process.env.VAULT_CONTRACT_ADDRESS ? "live" : "demo",
      endpoints: [
        "GET  /api/health",
        "GET  /api/vault/:address",
        "POST /api/users/register",
        "GET  /api/users",
        "GET  /api/scheduler/status",
        "POST /api/scheduler/trigger",
        "GET  /api/payments/log",
        "GET  /api/payments/stats",
        "POST /api/x402/simulate",
      ],
    });
  });

  app.listen(PORT, () => {
    logger.info(`🚀 MUSD Vault Agent running on http://localhost:${PORT}`);
    logger.info(
      `   Mode: ${process.env.VAULT_CONTRACT_ADDRESS ? "LIVE (Mezo EVM)" : "DEMO (mock)"}`
    );
  });

  // Start scheduler
  startScheduler(process.env.CRON_INTERVAL || "* * * * *");
}

bootstrap().catch((err) => {
  logger.error("Fatal startup error", err);
  process.exit(1);
});
