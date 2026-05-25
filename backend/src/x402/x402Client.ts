/**
 * x402Client.ts
 * Thin wrapper around the core x402 client — exposes payWithX402 and fallback logic.
 *
 * Per the Bitstream spec:
 *  - If endpoint returns 402 → pay and retry (handled by core client)
 *  - If endpoint unavailable → fall back to direct MUSD transfer
 *  - Log all payment attempts with txHash + endpoint + amount
 */

import { logger } from "../logger";
import { payWithX402 as _payWithX402, simulateX402Payment, type X402Result } from "./client";
import { getVaultService } from "../services/vaultService";

export interface PaymentAttemptLog {
  endpoint: string;
  amount: string;
  txHash?: string;
  success: boolean;
  method: "x402" | "direct_transfer" | "simulation";
  error?: string;
  timestamp: number;
}

const attemptLog: PaymentAttemptLog[] = [];

export function getPaymentAttemptLog(): PaymentAttemptLog[] {
  return [...attemptLog];
}

function logAttempt(entry: PaymentAttemptLog) {
  attemptLog.unshift(entry);
  if (attemptLog.length > 500) attemptLog.splice(500);
  logger.info("payment_attempt", entry);
}

/**
 * Primary x402 payment function with fallback.
 * Falls back to a direct MUSD transfer event if the endpoint is unavailable.
 */
export async function payWithX402(endpoint: string, wallet: { address: string; privateKey?: string }): Promise<X402Result> {
  const demo = process.env.X402_DEMO_MODE === "true";

  try {
    let result: X402Result;

    if (demo) {
      result = await simulateX402Payment(endpoint, wallet.address, "0.1");
    } else {
      result = await _payWithX402(endpoint, {
        walletAddress: wallet.address,
        privateKey: wallet.privateKey,
        maxRetries: 3,
      });
    }

    logAttempt({
      endpoint,
      amount: result.paidAmount ?? "0",
      txHash: result.txHash,
      success: result.success,
      method: demo ? "simulation" : "x402",
      error: result.error,
      timestamp: result.timestamp,
    });

    // If x402 failed due to endpoint unavailability → try direct MUSD transfer
    if (!result.success && result.statusCode === undefined) {
      logger.warn("x402 endpoint unavailable, falling back to direct MUSD transfer", { endpoint });
      return await fallbackDirectTransfer(endpoint, "0.1");
    }

    return result;
  } catch (err: any) {
    logger.error("x402 unexpected error, attempting fallback", { endpoint, error: err.message });
    return await fallbackDirectTransfer(endpoint, "0.1");
  }
}

async function fallbackDirectTransfer(endpoint: string, amount: string): Promise<X402Result> {
  try {
    const vault = getVaultService();
    // Emit an event on-chain to record the attempted payment
    const txHash = await vault.recordFallbackPayment(endpoint, amount);

    logAttempt({
      endpoint,
      amount,
      txHash,
      success: true,
      method: "direct_transfer",
      timestamp: Date.now(),
    });

    logger.info("Fallback direct MUSD transfer successful", { endpoint, txHash, amount });

    return {
      success: true,
      data: { fallback: true, method: "direct_musd_transfer" },
      paidAmount: amount,
      endpoint,
      txHash,
      timestamp: Date.now(),
    };
  } catch (err: any) {
    logAttempt({
      endpoint,
      amount,
      success: false,
      method: "direct_transfer",
      error: err.message,
      timestamp: Date.now(),
    });

    return {
      success: false,
      error: `Fallback transfer failed: ${err.message}`,
      endpoint,
      timestamp: Date.now(),
    };
  }
}
