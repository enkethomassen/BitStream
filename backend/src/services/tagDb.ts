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
