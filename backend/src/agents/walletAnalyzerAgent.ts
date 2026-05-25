/**
 * walletAnalyzerAgent.ts
 * GPT-4o powered wallet analysis: fetches on-chain data, filters noise,
 * detects recurring payments, categorizes spend, generates insights.
 */

import OpenAI from "openai";
import { logger } from "../logger";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransactionCategory =
  | "payment"
  | "subscription"
  | "yield"
  | "swap"
  | "gas"
  | "transfer"
  | "stablecoin"
  | "nft"
  | "unknown";

export interface Transaction {
  hash: string;
  timestamp: number;
  from: string;
  to: string;
  amount: number;
  amountUSD: number;
  token: string;
  category: TransactionCategory;
  isFiltered: boolean;
  filterReason?: string;
  userTag?: string;
  predictedTag?: string;
  confidence?: number;
}

export interface RecurringPayment {
  toAddress: string;
  toLabel?: string;
  amount: number;
  amountUSD: number;
  token: string;
  frequency: "daily" | "weekly" | "monthly" | "irregular";
  confidence: number;
  nextExpected?: string;
  occurrences: number;
  totalSpent: number;
}

export interface CategoryBreakdown {
  category: string;
  amountUSD: number;
  percentage: number;
}

export interface WalletAnalysis {
  address: string;
  addressType: "evm" | "bitcoin";
  range: string;
  totalOutflow: number;
  totalInflow: number;
  monthlyBurn: number;
  runway: string;
  reserveScore: number;
  transactions: Transaction[];
  recurringPayments: RecurringPayment[];
  spendByCategory: CategoryBreakdown[];
  aiInsights: string[];
  topRecipients: { address: string; label?: string; totalUSD: number; count: number }[];
}

// ─── DEX router addresses to filter ──────────────────────────────────────────

const DEX_ROUTERS = new Set([
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", // Uniswap V2
  "0xe592427a0aece92de3edee1f18e0157c05861564", // Uniswap V3
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45", // Uniswap V3 Router2
  "0x1111111254fb6c44bac0bed2854e76f90643097d", // 1inch V4
  "0x1111111254eeb25477b68fb85ed929f73a960582", // 1inch V5
  "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f", // SushiSwap
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff", // 0x Exchange Proxy
  "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad", // Uniswap Universal Router
  "0xa0c68c638235ee32657e8f720a23cec1bfc77c77", // Polygon Bridge
  "0x8731d54e9d02c286767d56ac03e8037c07e01e98", // Stargate
]);

const WETH_WBTC = new Set([
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC
]);

const ERC20_APPROVAL_SIG = "0x095ea7b3";
const ADD_LIQUIDITY_SIGS = new Set(["0xe8e33700", "0xf305d719", "0x4515cef3"]);
const REMOVE_LIQUIDITY_SIGS = new Set(["0xbaa2abde", "0x02751cec", "0x2195995c"]);

// ─── Smart filter ─────────────────────────────────────────────────────────────

function applyFilter(tx: Transaction): Transaction {
  // Self-transfer
  if (tx.from.toLowerCase() === tx.to.toLowerCase()) {
    return { ...tx, isFiltered: true, filterReason: "self_transfer" };
  }
  // Dust
  if (tx.amountUSD < 0.5) {
    return { ...tx, isFiltered: true, filterReason: "dust" };
  }
  // DEX router
  if (DEX_ROUTERS.has(tx.to.toLowerCase())) {
    return { ...tx, isFiltered: true, filterReason: "dex_swap", category: "swap" };
  }
  // WETH/WBTC wrap/unwrap
  if (WETH_WBTC.has(tx.to.toLowerCase())) {
    return { ...tx, isFiltered: true, filterReason: "wrap_unwrap" };
  }
  // Gas-only (very small ETH, no token)
  if (tx.token === "ETH" && tx.amount < 0.001 && tx.amountUSD < 2) {
    return { ...tx, isFiltered: true, filterReason: "gas_fee", category: "gas" };
  }
  return tx;
}

// ─── EVM data fetch via Alchemy ───────────────────────────────────────────────

async function fetchEVMTransactions(
  address: string,
  rangeDays: number
): Promise<{ transactions: Transaction[]; balanceETH: number }> {
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  const baseUrl = alchemyKey
    ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
    : null;

  // Fallback: use Etherscan proxy if no Alchemy key
  if (!baseUrl) {
    return fetchEVMViaEtherscan(address, rangeDays);
  }

  const cutoff = Math.floor(Date.now() / 1000) - rangeDays * 86400;

  // Fetch asset transfers (outbound)
  const body = {
    id: 1,
    jsonrpc: "2.0",
    method: "alchemy_getAssetTransfers",
    params: [
      {
        fromAddress: address,
        category: ["external", "erc20", "erc721", "erc1155"],
        withMetadata: true,
        excludeZeroValue: true,
        maxCount: "0x64",
        order: "desc",
      },
    ],
  };

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    logger.warn("Alchemy fetch failed, falling back to Etherscan", { status: res.status });
    return fetchEVMViaEtherscan(address, rangeDays);
  }

  const data = (await res.json()) as any;
  const transfers = data?.result?.transfers ?? [];

  // Fetch ETH balance
  const balRes = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: 2,
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
  });
  const balData = (await balRes.json()) as any;
  const balanceETH = parseInt(balData?.result ?? "0x0", 16) / 1e18;

  // Fetch ETH price
  const ethPrice = await getETHPrice();

  const transactions: Transaction[] = transfers
    .filter((t: any) => {
      const ts = t.metadata?.blockTimestamp
        ? Math.floor(new Date(t.metadata.blockTimestamp).getTime() / 1000)
        : 0;
      return ts >= cutoff;
    })
    .map((t: any): Transaction => {
      const ts = t.metadata?.blockTimestamp
        ? Math.floor(new Date(t.metadata.blockTimestamp).getTime() / 1000)
        : 0;
      const amount = parseFloat(t.value ?? "0");
      const token = t.asset ?? "ETH";
      const amountUSD =
        token === "ETH" ? amount * ethPrice : token === "USDC" || token === "USDT" ? amount : amount * ethPrice * 0.1;

      const raw: Transaction = {
        hash: t.hash,
        timestamp: ts,
        from: t.from ?? address,
        to: t.to ?? "",
        amount,
        amountUSD,
        token,
        category: "transfer",
        isFiltered: false,
      };
      return applyFilter(raw);
    });

  return { transactions, balanceETH };
}

async function fetchEVMViaEtherscan(
  address: string,
  rangeDays: number
): Promise<{ transactions: Transaction[]; balanceETH: number }> {
  const key = process.env.ETHERSCAN_API_KEY ?? "";
  const keyParam = key ? `&apikey=${key}` : "";
  const cutoff = Math.floor(Date.now() / 1000) - rangeDays * 86400;

  const [balRes, txRes] = await Promise.all([
    fetch(
      `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest${keyParam}`
    ),
    fetch(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&offset=100&page=1${keyParam}`
    ),
  ]);

  const balData = (await balRes.json()) as any;
  const txData = (await txRes.json()) as any;

  const balanceETH = parseFloat(balData?.result ?? "0") / 1e18;
  const rawTxs = Array.isArray(txData?.result) ? txData.result : [];
  const ethPrice = await getETHPrice();

  const transactions: Transaction[] = rawTxs
    .filter((tx: any) => parseInt(tx.timeStamp) >= cutoff && tx.isError === "0")
    .map((tx: any): Transaction => {
      const amount = parseFloat(tx.value) / 1e18;
      const amountUSD = amount * ethPrice;
      const methodId = tx.input?.slice(0, 10) ?? "";

      let isFiltered = false;
      let filterReason: string | undefined;

      if (methodId === ERC20_APPROVAL_SIG) {
        isFiltered = true;
        filterReason = "approval";
      } else if (ADD_LIQUIDITY_SIGS.has(methodId) || REMOVE_LIQUIDITY_SIGS.has(methodId)) {
        isFiltered = true;
        filterReason = "liquidity_op";
      }

      const raw: Transaction = {
        hash: tx.hash,
        timestamp: parseInt(tx.timeStamp),
        from: tx.from,
        to: tx.to,
        amount,
        amountUSD,
        token: "ETH",
        category: "transfer",
        isFiltered,
        filterReason,
      };
      return isFiltered ? raw : applyFilter(raw);
    });

  return { transactions, balanceETH };
}

// ─── Bitcoin data fetch ───────────────────────────────────────────────────────

async function fetchBTCTransactions(
  address: string,
  rangeDays: number
): Promise<{ transactions: Transaction[]; balanceBTC: number }> {
  const baseUrl = process.env.BITCOIN_API_URL ?? "https://blockstream.info/api";
  const cutoff = Math.floor(Date.now() / 1000) - rangeDays * 86400;

  const res = await fetch(`${baseUrl}/address/${address}/txs`);
  if (!res.ok) throw new Error(`BTC API error: ${res.status}`);
  const txs = (await res.json()) as any[];

  const utxoRes = await fetch(`${baseUrl}/address/${address}/utxo`);
  const utxos = utxoRes.ok ? ((await utxoRes.json()) as any[]) : [];
  const balanceBTC = utxos.reduce((sum: number, u: any) => sum + u.value, 0) / 1e8;

  const btcPrice = await getBTCPrice();

  const transactions: Transaction[] = txs
    .filter((tx: any) => tx.status?.block_time >= cutoff)
    .map((tx: any): Transaction => {
      // Determine if this address is sender
      const isSender = tx.vin?.some((inp: any) => inp.prevout?.scriptpubkey_address === address);
      const outValue = tx.vout
        ?.filter((o: any) => o.scriptpubkey_address !== address)
        .reduce((s: number, o: any) => s + o.value, 0) ?? 0;
      const inValue = tx.vout
        ?.filter((o: any) => o.scriptpubkey_address === address)
        .reduce((s: number, o: any) => s + o.value, 0) ?? 0;

      const amount = isSender ? outValue / 1e8 : inValue / 1e8;
      const amountUSD = amount * btcPrice;
      const toAddr = isSender
        ? tx.vout?.find((o: any) => o.scriptpubkey_address !== address)?.scriptpubkey_address ?? ""
        : address;

      const raw: Transaction = {
        hash: tx.txid,
        timestamp: tx.status?.block_time ?? 0,
        from: isSender ? address : "external",
        to: toAddr,
        amount,
        amountUSD,
        token: "BTC",
        category: "transfer",
        isFiltered: false,
      };
      return applyFilter(raw);
    });

  return { transactions, balanceBTC };
}

// ─── Price helpers ────────────────────────────────────────────────────────────

async function getETHPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    const data = (await res.json()) as any;
    return data?.ethereum?.usd ?? 3000;
  } catch {
    return 3000;
  }
}

async function getBTCPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    );
    const data = (await res.json()) as any;
    return data?.bitcoin?.usd ?? 65000;
  } catch {
    return 65000;
  }
}

// ─── GPT-4o analysis ──────────────────────────────────────────────────────────

interface AIAnalysisResult {
  insights: string[];
  predictedTags: Record<string, string>;
  recurringDetected: RecurringPayment[];
  spendByCategory: CategoryBreakdown[];
  monthlyBurn: number;
  reserveScore: number;
}

async function runAIAnalysis(
  transactions: Transaction[],
  userTagContext: string
): Promise<AIAnalysisResult> {
  if (!process.env.OPENAI_API_KEY) {
    return buildHeuristicAnalysis(transactions);
  }

  const clean = transactions.filter((t) => !t.isFiltered).slice(0, 100);

  const prompt = `You are a financial analyst AI. Analyze these blockchain transactions and return JSON only.

Transactions (filtered, clean):
${JSON.stringify(clean, null, 2)}

${userTagContext ? `User has previously tagged these transactions:\n${userTagContext}\n\nUse these to inform your predictions for similar transactions.` : ""}

Return ONLY this JSON structure, no markdown, no explanation:
{
  "insights": [
    "bullet insight 1",
    "bullet insight 2",
    "bullet insight 3",
    "bullet insight 4"
  ],
  "predictedTags": {
    "txHash1": "Spotify subscription",
    "txHash2": "AWS payment"
  },
  "recurringDetected": [
    {
      "toAddress": "0x...",
      "toLabel": "Spotify",
      "amount": 9.99,
      "amountUSD": 9.99,
      "token": "USDC",
      "frequency": "monthly",
      "confidence": 0.92,
      "occurrences": 6,
      "totalSpent": 59.94
    }
  ],
  "spendByCategory": [
    { "category": "subscriptions", "amountUSD": 120.50, "percentage": 48 },
    { "category": "payments", "amountUSD": 80.00, "percentage": 32 }
  ],
  "monthlyBurn": 83.33,
  "reserveScore": 87
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content!) as AIAnalysisResult;
    return result;
  } catch (err: any) {
    logger.error("GPT-4o analysis failed, using heuristic fallback", { error: err.message });
    return buildHeuristicAnalysis(transactions);
  }
}

function buildHeuristicAnalysis(transactions: Transaction[]): AIAnalysisResult {
  const clean = transactions.filter((t) => !t.isFiltered);
  const totalOut = clean.reduce((s, t) => s + t.amountUSD, 0);
  const monthlyBurn = totalOut / 3;

  // Group by recipient for recurring detection
  const byRecipient: Record<string, Transaction[]> = {};
  for (const tx of clean) {
    if (!byRecipient[tx.to]) byRecipient[tx.to] = [];
    byRecipient[tx.to].push(tx);
  }

  const recurringDetected: RecurringPayment[] = Object.entries(byRecipient)
    .filter(([, txs]) => txs.length >= 2)
    .map(([addr, txs]) => {
      const total = txs.reduce((s, t) => s + t.amountUSD, 0);
      return {
        toAddress: addr,
        amount: txs[0].amount,
        amountUSD: txs[0].amountUSD,
        token: txs[0].token,
        frequency: "monthly" as const,
        confidence: Math.min(0.5 + txs.length * 0.1, 0.95),
        occurrences: txs.length,
        totalSpent: total,
      };
    })
    .slice(0, 5);

  const reserveScore = Math.min(100, Math.max(0, 100 - Math.round(monthlyBurn / 10)));

  return {
    insights: [
      `${clean.length} meaningful transactions detected in the analysis window.`,
      monthlyBurn > 0
        ? `Estimated monthly outflow: $${monthlyBurn.toFixed(2)}.`
        : "No significant outflows detected.",
      recurringDetected.length > 0
        ? `${recurringDetected.length} potential recurring payment pattern(s) found.`
        : "No recurring patterns detected.",
      `Reserve score: ${reserveScore}/100.`,
    ],
    predictedTags: {},
    recurringDetected,
    spendByCategory: [{ category: "transfers", amountUSD: totalOut, percentage: 100 }],
    monthlyBurn,
    reserveScore,
  };
}

// ─── Top recipients ───────────────────────────────────────────────────────────

function computeTopRecipients(transactions: Transaction[]) {
  const map: Record<string, { totalUSD: number; count: number }> = {};
  for (const tx of transactions.filter((t) => !t.isFiltered)) {
    if (!map[tx.to]) map[tx.to] = { totalUSD: 0, count: 0 };
    map[tx.to].totalUSD += tx.amountUSD;
    map[tx.to].count += 1;
  }
  return Object.entries(map)
    .sort((a, b) => b[1].totalUSD - a[1].totalUSD)
    .slice(0, 10)
    .map(([address, stats]) => ({ address, ...stats }));
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function analyzeWallet(
  address: string,
  addressType: "evm" | "bitcoin",
  range: "30d" | "90d" | "180d",
  userTagContext = ""
): Promise<WalletAnalysis> {
  const rangeDays = range === "30d" ? 30 : range === "90d" ? 90 : 180;

  let transactions: Transaction[];
  let balance: number;
  let ticker: string;

  if (addressType === "evm") {
    const result = await fetchEVMTransactions(address, rangeDays);
    transactions = result.transactions;
    balance = result.balanceETH;
    ticker = "ETH";
  } else {
    const result = await fetchBTCTransactions(address, rangeDays);
    transactions = result.transactions;
    balance = result.balanceBTC;
    ticker = "BTC";
  }

  const price = ticker === "ETH" ? await getETHPrice() : await getBTCPrice();
  const balanceUSD = balance * price;

  const aiResult = await runAIAnalysis(transactions, userTagContext);

  // Apply predicted tags back to transactions
  const taggedTxs = transactions.map((tx) => ({
    ...tx,
    predictedTag: aiResult.predictedTags[tx.hash],
  }));

  const clean = taggedTxs.filter((t) => !t.isFiltered);
  const totalOutflow = clean.reduce((s, t) => s + t.amountUSD, 0);
  const totalInflow = 0; // would need inbound tx fetch — placeholder

  const monthlyBurn = aiResult.monthlyBurn || totalOutflow / (rangeDays / 30);
  const runway =
    monthlyBurn > 0 ? `${(balanceUSD / monthlyBurn).toFixed(1)} months` : "∞";

  return {
    address,
    addressType,
    range,
    totalOutflow,
    totalInflow,
    monthlyBurn,
    runway,
    reserveScore: aiResult.reserveScore,
    transactions: taggedTxs,
    recurringPayments: aiResult.recurringDetected,
    spendByCategory: aiResult.spendByCategory,
    aiInsights: aiResult.insights,
    topRecipients: computeTopRecipients(taggedTxs),
  };
}
