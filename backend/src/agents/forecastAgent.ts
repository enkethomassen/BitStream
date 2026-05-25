/**
 * forecastAgent.ts
 * GPT-4o powered cashflow forecaster for connected vaults.
 * Analyzes payment history + vault state → projects next 30 days.
 */

import OpenAI from "openai";
import { logger } from "../logger";

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

export interface VaultSnapshot {
  address: string;
  btcCollateral: number;       // BTC
  btcValueUSD: number;
  collateralRatio: number;     // %
  musdBalance: number;
  scheduledPayments: Array<{
    id: number;
    recipient: string;
    amountMUSD: number;
    intervalSeconds: number;
    nextExecution: string;
    isX402: boolean;
  }>;
}

export interface PaymentHistoryEntry {
  timestamp: number;
  amountMUSD: number;
  type: "wallet" | "x402";
  status: "success" | "failed";
}

export interface Forecast {
  next30DaysOutflow: number;
  projectedRatio30Days: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendations: string[];
  alerts: string[];
  generatedAt: number;
  model: string;
}

export async function forecastCashflow(
  vault: VaultSnapshot,
  history: PaymentHistoryEntry[]
): Promise<Forecast> {
  const fallback = buildHeuristicForecast(vault, history);

  const client = getOpenAIClient();
  if (!client) {
    return fallback;
  }

  const prompt = `You are a DeFi treasury manager AI. Analyze this vault's payment history and forecast upcoming needs.

Vault state:
- BTC collateral: ${vault.btcCollateral} BTC ($${vault.btcValueUSD.toFixed(2)})
- Collateral ratio: ${vault.collateralRatio}%
- MUSD balance: ${vault.musdBalance} MUSD
- Scheduled payments: ${JSON.stringify(vault.scheduledPayments, null, 2)}
- Payment history (last 90 days, ${history.length} entries): ${JSON.stringify(history.slice(0, 50), null, 2)}

Return ONLY JSON, no markdown:
{
  "next30DaysOutflow": 450.00,
  "projectedRatio30Days": 187,
  "riskLevel": "low",
  "recommendations": [
    "You have idle MUSD. Consider deploying to increase buffer.",
    "Subscription due in 3 days. Ensure MUSD balance is sufficient."
  ],
  "alerts": []
}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content!) as Omit<Forecast, "generatedAt" | "model">;
    return { ...result, generatedAt: Date.now(), model: "gpt-4o" };
  } catch (err: any) {
    logger.error("ForecastAgent GPT-4o failed, using heuristic", { error: err.message });
    return fallback;
  }
}

function buildHeuristicForecast(vault: VaultSnapshot, history: PaymentHistoryEntry[]): Forecast {
  // Sum scheduled payments over next 30 days
  const now = Date.now() / 1000;
  const thirtyDays = 30 * 86400;
  let next30DaysOutflow = 0;

  for (const p of vault.scheduledPayments) {
    const executions = Math.floor(thirtyDays / p.intervalSeconds);
    next30DaysOutflow += executions * p.amountMUSD;
  }

  // Project collateral ratio after outflow
  const projectedMUSD = Math.max(0, vault.musdBalance - next30DaysOutflow);
  const projectedRatio =
    projectedMUSD > 0
      ? Math.round((vault.btcValueUSD / projectedMUSD) * 100)
      : 9999;

  const riskLevel: Forecast["riskLevel"] =
    projectedRatio < 150 ? "critical"
    : projectedRatio < 175 ? "high"
    : projectedRatio < 200 ? "medium"
    : "low";

  const recommendations: string[] = [];
  const alerts: string[] = [];

  if (next30DaysOutflow > vault.musdBalance) {
    alerts.push(`Insufficient MUSD: ${next30DaysOutflow.toFixed(2)} MUSD needed, ${vault.musdBalance.toFixed(2)} available.`);
  }
  if (vault.collateralRatio < 175) {
    alerts.push(`Collateral ratio ${vault.collateralRatio}% is approaching the 150% minimum threshold.`);
  }
  if (vault.musdBalance > next30DaysOutflow * 2) {
    recommendations.push("MUSD buffer is healthy. No action needed for the next 30 days.");
  } else {
    recommendations.push("Consider minting additional MUSD or reducing scheduled outflows.");
  }
  if (history.filter(h => h.status === "failed").length > 2) {
    recommendations.push("Multiple failed payments detected. Review x402 endpoint availability.");
  }

  return {
    next30DaysOutflow,
    projectedRatio30Days: projectedRatio,
    riskLevel,
    recommendations,
    alerts,
    generatedAt: Date.now(),
    model: "heuristic",
  };
}
