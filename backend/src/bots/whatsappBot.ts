/**
 * whatsappBot.ts
 * Meta Cloud API webhook for WhatsApp — mirrors Telegram bot commands.
 *
 * Commands (free-text, case-insensitive):
 *   balance <evm-address>           → vault status
 *   analyse <address> [30d|90d|180d] → wallet analysis (EVM or BTC)
 *   help                             → command list
 *
 * Env:
 *   WHATSAPP_TOKEN            (Meta Cloud API token)
 *   WHATSAPP_PHONE_NUMBER_ID  (sender phone-number ID)
 *   WHATSAPP_VERIFY_TOKEN     (any string — used during webhook verification)
 */

import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import { logger } from "../logger";
import { analyzeWallet } from "../agents/walletAnalyzerAgent";
import { getVaultInfo } from "../services/vaultService";

const GRAPH_API = "https://graph.facebook.com/v20.0";

function isConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

function detectType(addr: string): "evm" | "bitcoin" | null {
  const a = addr.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(a)) return "evm";
  if (/^(1|3)[a-zA-HJ-NP-Z0-9]{25,34}$/.test(a) || /^bc1[a-zA-HJ-NP-Z0-9]{6,87}$/.test(a)) return "bitcoin";
  return null;
}

function shortAddr(a: string): string {
  if (!a || a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function fmtUSD(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function sendWhatsappText(to: string, body: string): Promise<void> {
  if (!isConfigured()) return;
  const url = `${GRAPH_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body: body.slice(0, 4096) },
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "<unreadable>");
      logger.warn("WhatsApp send failed", { status: res.status, body: errBody });
    }
  } catch (err: any) {
    logger.error("WhatsApp send error", { error: err.message });
  }
}

async function handleAnalyse(to: string, parts: string[]): Promise<void> {
  const address = parts[0];
  const range = (parts[1] as "30d" | "90d" | "180d") || "90d";

  if (!address) {
    await sendWhatsappText(to, "Usage: analyse <address> [30d|90d|180d]");
    return;
  }
  const type = detectType(address);
  if (!type) {
    await sendWhatsappText(to, "❌ Unrecognized address. Send an EVM (0x…) or Bitcoin address.");
    return;
  }
  if (!["30d", "90d", "180d"].includes(range)) {
    await sendWhatsappText(to, "❌ Range must be 30d, 90d, or 180d.");
    return;
  }

  await sendWhatsappText(to, `🔍 Analyzing ${shortAddr(address)} over ${range}…`);

  try {
    const a = await analyzeWallet(address, type, range);
    const lines: string[] = [
      `📊 Wallet Analysis — ${shortAddr(address)}`,
      ``,
      `Monthly Burn: ${fmtUSD(a.monthlyBurn)}`,
      `Recurring Patterns: ${a.recurringPayments.length}`,
      `Runway: ${a.runway}`,
      `Reserve Score: ${a.reserveScore}/100`,
      ``,
      `AI Insights:`,
      ...a.aiInsights.map((i) => `• ${i}`),
    ];
    if (a.recurringPayments.length > 0) {
      lines.push(``, `Top Recurring:`);
      for (const r of a.recurringPayments.slice(0, 3)) {
        lines.push(`• ${r.toLabel ?? shortAddr(r.toAddress)} — ${fmtUSD(r.amountUSD)}/${r.frequency.replace("ly", "")} (${Math.round(r.confidence * 100)}%)`);
      }
    }
    lines.push(``, `Automate this at bitstream.app`);
    await sendWhatsappText(to, lines.join("\n"));
  } catch (err: any) {
    logger.error("WhatsApp analyse failed", { address, error: err.message });
    await sendWhatsappText(to, `❌ Analysis failed: ${err.message}`);
  }
}

async function handleBalance(to: string, parts: string[]): Promise<void> {
  const address = parts[0];
  if (!address || !ethers.isAddress(address)) {
    await sendWhatsappText(to, "Usage: balance <evm-address>");
    return;
  }
  try {
    const info = await getVaultInfo(address);
    const ratio = Number(info.collateralRatio);
    const ratioDisplay = !Number.isFinite(ratio) || ratio > 1e6 ? "∞" : `${ratio}%`;
    const health = ratio < 150 ? "🔴 DANGER" : ratio < 175 ? "🟡 WARNING" : "🟢 HEALTHY";
    await sendWhatsappText(to, [
      `🏦 Vault Status — ${shortAddr(address)}`,
      ``,
      `BTC Collateral: ${(Number(info.collateral) / 1e18).toFixed(6)} BTC`,
      `MUSD Balance: ${(Number(info.musdBalance) / 1e18).toFixed(2)} MUSD`,
      `Collateral Ratio: ${ratioDisplay}`,
      `Health: ${health}`,
    ].join("\n"));
  } catch (err: any) {
    logger.error("WhatsApp balance failed", { address, error: err.message });
    await sendWhatsappText(to, `❌ Vault lookup failed: ${err.message}`);
  }
}

function helpText(): string {
  return [
    "Bitstream — WhatsApp Bot",
    "",
    "balance <evm-address>",
    "  Check Mezo vault collateral + MUSD balance",
    "",
    "analyse <address> [30d|90d|180d]",
    "  Analyze EVM or Bitcoin wallet (default 90d)",
    "",
    "help",
    "  Show this message",
  ].join("\n");
}

async function dispatch(from: string, rawText: string): Promise<void> {
  const text = rawText.trim();
  if (!text) return;

  const [cmd, ...args] = text.split(/\s+/);
  const command = cmd.toLowerCase();

  if (command === "balance")  return handleBalance(from, args);
  if (command === "analyse" || command === "analyze") return handleAnalyse(from, args);
  if (command === "help" || command === "start") {
    await sendWhatsappText(from, helpText());
    return;
  }

  await sendWhatsappText(from, `Unknown command. Send "help" for the command list.`);
}

export const whatsappRouter = Router();

// Webhook verification (GET) — Meta calls this once when you set the webhook URL.
whatsappRouter.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info("WhatsApp webhook verified");
    return res.status(200).send(String(challenge ?? ""));
  }
  return res.sendStatus(403);
});

// Incoming messages
whatsappRouter.post("/webhook", async (req: Request, res: Response) => {
  // Acknowledge immediately; process async to avoid Meta retries.
  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];
    if (!message || message.type !== "text") return;

    const from: string = message.from;
    const body: string = message.text?.body ?? "";
    logger.info("WhatsApp inbound", { from: shortAddr(from), preview: body.slice(0, 60) });

    if (!isConfigured()) {
      logger.warn("WhatsApp inbound received but bot not configured — message dropped");
      return;
    }

    await dispatch(from, body);
  } catch (err: any) {
    logger.error("WhatsApp webhook handler error", { error: err.message });
  }
});

export function startWhatsappBot(): void {
  if (isConfigured()) {
    logger.info("WhatsApp bot configured (webhook ready at /api/whatsapp/webhook)");
  } else {
    logger.warn("WhatsApp env vars not set — webhook returns 200 but messages are not sent");
  }
}
