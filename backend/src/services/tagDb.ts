/**
 * tagDb.ts
 * SQLite-backed transaction tag storage via better-sqlite3.
 * Lightweight, zero-config, no external service needed.
 */

import Database from "better-sqlite3";
import { join } from "path";
import { mkdirSync } from "fs";
import { logger } from "../logger";

const DB_DIR = process.env.DATA_DIR ?? join(process.cwd(), "data");
mkdirSync(DB_DIR, { recursive: true });

const db = new Database(join(DB_DIR, "bitstream.db"));

// Enable WAL for concurrent reads
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS transaction_tags (
    id          TEXT PRIMARY KEY,
    tx_hash     TEXT NOT NULL,
    wallet_addr TEXT NOT NULL,
    user_tag    TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'unknown',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_tags_wallet ON transaction_tags(wallet_addr);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_tx_wallet ON transaction_tags(tx_hash, wallet_addr);

  CREATE TABLE IF NOT EXISTS wallet_analyses (
    id            TEXT PRIMARY KEY,
    wallet_addr   TEXT NOT NULL,
    chain         TEXT NOT NULL,
    range_days    INTEGER NOT NULL,
    monthly_burn  REAL NOT NULL DEFAULT 0,
    reserve_score INTEGER NOT NULL DEFAULT 0,
    runway        TEXT,
    summary_json  TEXT NOT NULL,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_analyses_wallet ON wallet_analyses(wallet_addr, created_at DESC);

  CREATE TABLE IF NOT EXISTS agent_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source      TEXT NOT NULL,
    level       TEXT NOT NULL DEFAULT 'info',
    event       TEXT NOT NULL,
    payload     TEXT,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_logs_source ON agent_logs(source, created_at DESC);
`);

export interface TransactionTag {
  id: string;
  txHash: string;
  walletAddress: string;
  userTag: string;
  category: string;
  createdAt: number;
}

const stmtUpsert = db.prepare(`
  INSERT INTO transaction_tags (id, tx_hash, wallet_addr, user_tag, category, created_at)
  VALUES (@id, @txHash, @walletAddr, @userTag, @category, unixepoch())
  ON CONFLICT(tx_hash, wallet_addr) DO UPDATE SET
    user_tag   = excluded.user_tag,
    category   = excluded.category,
    created_at = unixepoch()
`);

const stmtGetByWallet = db.prepare(`
  SELECT id, tx_hash, wallet_addr, user_tag, category, created_at
  FROM transaction_tags
  WHERE wallet_addr = ?
  ORDER BY created_at DESC
`);

const stmtDelete = db.prepare(`
  DELETE FROM transaction_tags WHERE tx_hash = ? AND wallet_addr = ?
`);

export function upsertTag(
  txHash: string,
  walletAddress: string,
  userTag: string,
  category = "unknown"
): TransactionTag {
  const id = `${walletAddress.toLowerCase()}_${txHash}`;
  stmtUpsert.run({ id, txHash, walletAddr: walletAddress.toLowerCase(), userTag, category });
  logger.debug("Tag upserted", { txHash, walletAddress, userTag });
  return { id, txHash, walletAddress, userTag, category, createdAt: Math.floor(Date.now() / 1000) };
}

export function getTagsByWallet(walletAddress: string): TransactionTag[] {
  const rows = stmtGetByWallet.all(walletAddress.toLowerCase()) as any[];
  return rows.map((r) => ({
    id: r.id,
    txHash: r.tx_hash,
    walletAddress: r.wallet_addr,
    userTag: r.user_tag,
    category: r.category,
    createdAt: r.created_at,
  }));
}

export function deleteTag(txHash: string, walletAddress: string): boolean {
  const result = stmtDelete.run(txHash, walletAddress.toLowerCase());
  return result.changes > 0;
}

/** Build a context string for GPT-4o from existing user tags */
export function buildTagContext(walletAddress: string): string {
  const tags = getTagsByWallet(walletAddress);
  if (tags.length === 0) return "";
  return tags.map((t) => `TX ${t.txHash}: user labeled "${t.userTag}" (${t.category})`).join("\n");
}

// ─── wallet_analyses ─────────────────────────────────────────────────────────
const stmtInsertAnalysis = db.prepare(`
  INSERT INTO wallet_analyses
    (id, wallet_addr, chain, range_days, monthly_burn, reserve_score, runway, summary_json, created_at)
  VALUES
    (@id, @walletAddr, @chain, @rangeDays, @monthlyBurn, @reserveScore, @runway, @summaryJson, unixepoch())
`);

const stmtGetLatestAnalysis = db.prepare(`
  SELECT id, wallet_addr, chain, range_days, monthly_burn, reserve_score, runway, summary_json, created_at
  FROM wallet_analyses
  WHERE wallet_addr = ? AND chain = ?
  ORDER BY created_at DESC
  LIMIT 1
`);

export interface SavedWalletAnalysis {
  id: string;
  walletAddress: string;
  chain: "evm" | "bitcoin";
  rangeDays: number;
  monthlyBurn: number;
  reserveScore: number;
  runway: string | null;
  summary: unknown;
  createdAt: number;
}

export function saveWalletAnalysis(
  walletAddress: string,
  chain: "evm" | "bitcoin",
  rangeDays: number,
  summary: { monthlyBurn?: number; reserveScore?: number; runway?: string | null; [k: string]: unknown }
): SavedWalletAnalysis {
  const id = `${walletAddress.toLowerCase()}_${Date.now()}`;
  stmtInsertAnalysis.run({
    id,
    walletAddr: walletAddress.toLowerCase(),
    chain,
    rangeDays,
    monthlyBurn: summary.monthlyBurn ?? 0,
    reserveScore: summary.reserveScore ?? 0,
    runway: summary.runway ?? null,
    summaryJson: JSON.stringify(summary),
  });
  return {
    id,
    walletAddress: walletAddress.toLowerCase(),
    chain,
    rangeDays,
    monthlyBurn: summary.monthlyBurn ?? 0,
    reserveScore: summary.reserveScore ?? 0,
    runway: summary.runway ?? null,
    summary,
    createdAt: Math.floor(Date.now() / 1000),
  };
}

export function getLatestWalletAnalysis(
  walletAddress: string,
  chain: "evm" | "bitcoin"
): SavedWalletAnalysis | null {
  const row = stmtGetLatestAnalysis.get(walletAddress.toLowerCase(), chain) as any;
  if (!row) return null;
  return {
    id: row.id,
    walletAddress: row.wallet_addr,
    chain: row.chain,
    rangeDays: row.range_days,
    monthlyBurn: row.monthly_burn,
    reserveScore: row.reserve_score,
    runway: row.runway,
    summary: JSON.parse(row.summary_json),
    createdAt: row.created_at,
  };
}

// ─── agent_logs ──────────────────────────────────────────────────────────────
const stmtInsertLog = db.prepare(`
  INSERT INTO agent_logs (source, level, event, payload, created_at)
  VALUES (@source, @level, @event, @payload, unixepoch())
`);

const stmtRecentLogs = db.prepare(`
  SELECT id, source, level, event, payload, created_at
  FROM agent_logs
  WHERE source = ?
  ORDER BY created_at DESC
  LIMIT ?
`);

export interface AgentLogEntry {
  id: number;
  source: string;
  level: "info" | "warn" | "error" | "debug";
  event: string;
  payload: unknown;
  createdAt: number;
}

export function recordAgentLog(
  source: string,
  event: string,
  payload?: unknown,
  level: "info" | "warn" | "error" | "debug" = "info"
): void {
  stmtInsertLog.run({
    source,
    level,
    event,
    payload: payload ? JSON.stringify(payload) : null,
  });
}

export function getRecentAgentLogs(source: string, limit = 100): AgentLogEntry[] {
  const rows = stmtRecentLogs.all(source, limit) as any[];
  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    level: r.level,
    event: r.event,
    payload: r.payload ? JSON.parse(r.payload) : null,
    createdAt: r.created_at,
  }));
}
