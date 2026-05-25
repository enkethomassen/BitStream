/**
 * routes/wallet.ts
 * Wallet analysis API: full transaction history, AI insights, recurring detection.
 * Also handles transaction tagging (user-applied labels).
 */

import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import { logger } from "../logger";
import { analyzeWallet } from "../agents/walletAnalyzerAgent";
import { upsertTag, getTagsByWallet, deleteTag, buildTagContext } from "../services/tagDb";

const router = Router();

// ─── POST /api/wallet/analyze ─────────────────────────────────────────────────

router.post("/analyze", async (req: Request, res: Response) => {
  const { address, addressType, range = "90d" } = req.body as {
    address?: string;
    addressType?: "evm" | "bitcoin";
    range?: "30d" | "90d" | "180d";
  };

  if (!address) {
    return res.status(400).json({ error: "address is required" });
  }

  // Auto-detect type if not provided
  let type = addressType;
  if (!type) {
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) type = "evm";
    else if (/^(1|3)[a-zA-HJ-NP-Z0-9]{25,34}$/.test(address) || /^bc1[a-zA-HJ-NP-Z0-9]{6,87}$/.test(address)) type = "bitcoin";
    else return res.status(400).json({ error: "Cannot detect address type. Provide addressType: 'evm' | 'bitcoin'" });
  }

  if (type === "evm" && !ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid EVM address" });
  }

  if (!["30d", "90d", "180d"].includes(range)) {
    return res.status(400).json({ error: "range must be 30d, 90d, or 180d" });
  }

  try {
    logger.info("Wallet analysis started", { address, type, range });
    const tagContext = buildTagContext(address);
    const analysis = await analyzeWallet(address, type, range, tagContext);
    logger.info("Wallet analysis complete", { address, txCount: analysis.transactions.length });
    res.json(analysis);
  } catch (err: any) {
    logger.error("Wallet analysis failed", { address, error: err.message });
    res.status(500).json({ error: err.message || "Analysis failed" });
  }
});

// ─── POST /api/wallet/tag ─────────────────────────────────────────────────────

router.post("/tag", (req: Request, res: Response) => {
  const { txHash, walletAddress, tag, category } = req.body as {
    txHash?: string;
    walletAddress?: string;
    tag?: string;
    category?: string;
  };

  if (!txHash || !walletAddress || !tag) {
    return res.status(400).json({ error: "txHash, walletAddress, and tag are required" });
  }

  try {
    const result = upsertTag(txHash, walletAddress, tag, category ?? "unknown");
    res.json({ success: true, tag: result });
  } catch (err: any) {
    logger.error("Tag upsert failed", { txHash, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/wallet/tags ─────────────────────────────────────────────────────

router.get("/tags", (req: Request, res: Response) => {
  const { address } = req.query as { address?: string };
  if (!address) return res.status(400).json({ error: "address query param required" });

  try {
    const tags = getTagsByWallet(address);
    res.json({ tags });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/wallet/tag/:txHash ──────────────────────────────────────────

router.delete("/tag/:txHash", (req: Request, res: Response) => {
  const { txHash } = req.params;
  const { walletAddress } = req.body as { walletAddress?: string };

  if (!walletAddress) return res.status(400).json({ error: "walletAddress required in body" });

  const deleted = deleteTag(txHash, walletAddress);
  if (!deleted) return res.status(404).json({ error: "Tag not found" });
  res.json({ success: true });
});

export default router;
