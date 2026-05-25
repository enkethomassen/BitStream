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
import walletRouter from "./routes/wallet";
import { startTelegramBot } from "./bots/telegramBot";
import { startWhatsappBot, whatsappRouter } from "./bots/whatsappBot";
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
  app.use("/api/wallet", walletRouter);
  app.use("/api/whatsapp", whatsappRouter);

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
        "POST /api/wallet/analyze",
        "POST /api/wallet/tag",
        "GET  /api/wallet/tags",
        "DELETE /api/wallet/tag/:txHash",
        "POST /api/treasury/analyze",
        "GET  /api/treasury/evm/:address/balance",
        "GET  /api/treasury/evm/:address/txlist",
        "GET  /api/treasury/btc/:address",
        "GET  /api/whatsapp/webhook",
        "POST /api/whatsapp/webhook",
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

  // Start Telegram bot (no-op if TELEGRAM_BOT_TOKEN not set)
  startTelegramBot();

  // WhatsApp webhook is a noop until WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID are set
  startWhatsappBot();
}

bootstrap().catch((err) => {
  logger.error("Fatal startup error", err);
  process.exit(1);
});
