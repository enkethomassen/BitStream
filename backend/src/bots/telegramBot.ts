/**
 * telegramBot.ts
 * Telegram bot for Bitstream — wallet analysis, vault status, payment alerts.
 *
 * Commands:
 *   /start        — welcome + help
 *   /analyze <addr> [30d|90d|180d]  — run wallet analysis
 *   /vault <addr>  — show vault stats
 *   /help          — list commands
 */

import { Telegraf, Context } from "telegraf";
import { logger } from "../logger";
import { analyzeWallet } from "../agents/walletAnalyzerAgent";
import { getVaultInfo } from "../services/vaultService";
import { ethers } from "ethers";

let bot: Telegraf | null = null;

function detectType(addr: string): "evm" | "bitcoin" | null {
  const a = addr.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(a)) return "evm";
  if (/^(1|3)[a-zA-HJ-NP-Z0-9]{25,34}$/.test(a) || /^bc1[a-zA-HJ-NP-Z0-9]{6,87}$/.test(a)) return "bitcoin";
  return null;
}

function shortAddr(a: string) {
  if (!a || a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function handleAnalyze(ctx: Context, args: string[]) {
  const address = args[0];
  const range = (args[1] as "30d" | "90d" | "180d") || "90d";

  if (!address) {
    return ctx.reply("Usage: /analyze <address> [30d|90d|180d]\n\nExample:\n/analyze 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 90d");
  }

  const type = detectType(address);
  if (!type) {
    return ctx.reply("❌ Unrecognized address. Provide an EVM (0x…) or Bitcoin address.");
  }

  if (!["30d", "90d", "180d"].includes(range)) {
    return ctx.reply("❌ Range must be 30d, 90d, or 180d.");
  }

  await ctx.reply(`🔍 Analyzing ${shortAddr(address)} over ${range}…`);

  try {
    const analysis = await analyzeWallet(address, type, range);

    const lines = [
      `📊 *Wallet Analysis* — \`${shortAddr(address)}\``,
      ``,
      `💸 *Monthly Burn:* ${fmtUSD(analysis.monthlyBurn)}`,
      `🔁 *Recurring Patterns:* ${analysis.recurringPayments.length}`,
      `⏱ *Runway:* ${analysis.runway}`,
      `🛡 *Reserve Score:* ${analysis.reserveScore}/100`,
      ``,
      `*AI Insights:*`,
      ...analysis.aiInsights.map(i => `• ${i}`),
    ];

    if (analysis.recurringPayments.length > 0) {
      lines.push(``, `*Top Recurring:*`);
      for (const r of analysis.recurringPayments.slice(0, 3)) {
        lines.push(`• ${r.toLabel ?? shortAddr(r.toAddress)} — ${fmtUSD(r.amountUSD)}/${r.frequency.replace("ly", "")} (${Math.round(r.confidence * 100)}% confidence)`);
      }
    }

    lines.push(``, `_Want to automate this? Visit bitstream.app_`);

    await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
  } catch (err: any) {
    logger.error("Telegram /analyze failed", { address, error: err.message });
    await ctx.reply(`❌ Analysis failed: ${err.message}`);
  }
}

async function handleVault(ctx: Context, args: string[]) {
  const address = args[0];

  if (!address || !ethers.isAddress(address)) {
    return ctx.reply("Usage: /vault <evm-address>\n\nExample:\n/vault 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  }

  try {
    const info = await getVaultInfo(address);
    const ratio = Number(info.collateralRatio);
    const ratioDisplay = ratio === Number("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff".slice(0, 64)) ? "∞" : `${ratio}%`;
    const health = ratio < 150 ? "🔴 DANGER" : ratio < 175 ? "🟡 WARNING" : "🟢 HEALTHY";

    const lines = [
      `🏦 *Vault Status* — \`${shortAddr(address)}\``,
      ``,
      `₿ *BTC Collateral:* ${(Number(info.collateral) / 1e18).toFixed(6)} BTC`,
      `💵 *MUSD Balance:* ${(Number(info.musdBalance) / 1e18).toFixed(2)} MUSD`,
      `📐 *Collateral Ratio:* ${ratioDisplay}`,
      `❤️ *Health:* ${health}`,
    ];

    await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
  } catch (err: any) {
    logger.error("Telegram /vault failed", { address, error: err.message });
    await ctx.reply(`❌ Vault lookup failed: ${err.message}`);
  }
}

export function startTelegramBot(): void {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn("TELEGRAM_BOT_TOKEN not set — Telegram bot disabled");
    return;
  }

  bot = new Telegraf(token);

  bot.start((ctx) => {
    ctx.reply(
      `👋 Welcome to *Bitstream* — Bitcoin-backed automated cashflow on Mezo.\n\n` +
      `*Commands:*\n` +
      `/analyze <address> [30d|90d|180d] — Analyze any wallet\n` +
      `/vault <address> — Check vault status\n` +
      `/help — Show this message\n\n` +
      `_No wallet connection required to analyze._`,
      { parse_mode: "Markdown" }
    );
  });

  bot.help((ctx) => {
    ctx.reply(
      `*Bitstream Bot Commands:*\n\n` +
      `/analyze <address> [30d|90d|180d]\n  Analyze EVM or Bitcoin wallet\n\n` +
      `/vault <address>\n  Check Mezo vault collateral + MUSD balance\n\n` +
      `/help — This message`,
      { parse_mode: "Markdown" }
    );
  });

  bot.command("analyze", async (ctx) => {
    const args = ctx.message.text.split(/\s+/).slice(1);
    await handleAnalyze(ctx, args);
  });

  bot.command("vault", async (ctx) => {
    const args = ctx.message.text.split(/\s+/).slice(1);
    await handleVault(ctx, args);
  });

  bot.catch((err: any) => {
    logger.error("Telegram bot error", { error: err.message });
  });

  bot.launch().then(() => {
    logger.info("Telegram bot started");
  }).catch((err) => {
    logger.error("Telegram bot failed to start", { error: err.message });
  });

  // Graceful shutdown
  process.once("SIGINT", () => bot?.stop("SIGINT"));
  process.once("SIGTERM", () => bot?.stop("SIGTERM"));
}

export function getTelegramBot(): Telegraf | null {
  return bot;
}
