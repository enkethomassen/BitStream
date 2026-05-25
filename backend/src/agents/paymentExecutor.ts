/**
 * paymentExecutor.ts
 * Routes payment execution to either:
 *   A) Smart contract (on-chain wallet transfer)
 *   B) x402 HTTP payment layer
 *
 * Architecture Layer: AUTOMATION LAYER
 */

import { ethers } from "ethers";
import { logger } from "../logger";
import { executePaymentOnChain, OnChainPayment } from "../services/vaultService";
import { payWithX402, simulateX402Payment, X402Result } from "../x402/client";

export interface ExecutionResult {
  success: boolean;
  type: "wallet" | "x402";
  txHash?: string;
  x402Result?: X402Result;
  error?: string;
  userAddress: string;
  paymentId: number;
  amount: string;
  timestamp: number;
}

// In-memory execution log (in production: persist to DB)
const executionLog: ExecutionResult[] = [];

export function getExecutionLog(): ExecutionResult[] {
  return [...executionLog].reverse(); // newest first
}

export function getExecutionStats() {
  const total = executionLog.length;
  const successful = executionLog.filter((e) => e.success).length;
  const failed = executionLog.filter((e) => !e.success).length;
  const walletPayments = executionLog.filter((e) => e.type === "wallet").length;
  const x402Payments = executionLog.filter((e) => e.type === "x402").length;
  const totalMUSD = executionLog
    .filter((e) => e.success)
    .reduce((sum, e) => sum + parseFloat(ethers.formatEther(e.amount || "0")), 0);

  return { total, successful, failed, walletPayments, x402Payments, totalMUSD };
}

/**
 * Execute a single payment.
 * Dispatches to on-chain or x402 based on payment.isX402 flag.
 */
export async function executePayment(
  userAddress: string,
  paymentId: number,
  payment: OnChainPayment
): Promise<ExecutionResult> {
  const amountFormatted = ethers.formatEther(payment.amount);
  const isDemoMode = !process.env.VAULT_CONTRACT_ADDRESS;

  logger.info("Executing payment", {
    user: userAddress,
    paymentId,
    amount: `${amountFormatted} MUSD`,
    type: payment.isX402 ? "x402" : "wallet",
    recipient: payment.isX402 ? payment.endpoint : payment.recipient,
    demoMode: isDemoMode,
  });

  let result: ExecutionResult;

  if (payment.isX402) {
    // ── PATH B: x402 Payment Layer ──────────────────────────────────────────
    const endpoint = payment.endpoint;

    if (!endpoint) {
      result = {
        success: false,
        type: "x402",
        error: "x402 payment missing endpoint URL",
        userAddress,
        paymentId,
        amount: payment.amount.toString(),
        timestamp: Date.now(),
      };
    } else {
      const walletAddress = process.env.EXECUTOR_WALLET_ADDRESS || userAddress;
      const spendingCaps: Record<string, number> = {};

      // Load per-endpoint spending caps from env
      const capsEnv = process.env.X402_SPENDING_CAPS;
      if (capsEnv) {
        try {
          Object.assign(spendingCaps, JSON.parse(capsEnv));
        } catch {
          logger.warn("Failed to parse X402_SPENDING_CAPS env");
        }
      }

      let x402Res: X402Result;
      if (isDemoMode) {
        x402Res = await simulateX402Payment(endpoint, walletAddress, amountFormatted);
      } else {
        x402Res = await payWithX402(endpoint, {
          walletAddress,
          privateKey: process.env.EXECUTOR_PRIVATE_KEY,
          maxRetries: 3,
          spendingCapPerEndpoint: spendingCaps,
        });
      }

      result = {
        success: x402Res.success,
        type: "x402",
        txHash: x402Res.txHash,
        x402Result: x402Res,
        error: x402Res.error,
        userAddress,
        paymentId,
        amount: payment.amount.toString(),
        timestamp: Date.now(),
      };
    }
  } else {
    // ── PATH A: On-Chain Wallet Transfer ────────────────────────────────────
    const { txHash, success } = await executePaymentOnChain(userAddress, paymentId);

    result = {
      success,
      type: "wallet",
      txHash,
      userAddress,
      paymentId,
      amount: payment.amount.toString(),
      timestamp: Date.now(),
      error: success ? undefined : "On-chain execution failed",
    };
  }

  // Log the result
  executionLog.push(result);
  if (executionLog.length > 500) executionLog.shift(); // Keep last 500

  if (result.success) {
    logger.info(`✅ Payment executed [${result.type.toUpperCase()}]`, {
      user: userAddress,
      paymentId,
      amount: `${amountFormatted} MUSD`,
      txHash: result.txHash,
    });
  } else {
    logger.error(`❌ Payment failed [${result.type.toUpperCase()}]`, {
      user: userAddress,
      paymentId,
      error: result.error,
    });
  }

  return result;
}

/**
 * x402 fallback: if primary x402 endpoint fails, attempt fallback wallet payment.
 */
export async function executeWithFallback(
  userAddress: string,
  paymentId: number,
  payment: OnChainPayment,
  fallbackRecipient?: string
): Promise<ExecutionResult> {
  const result = await executePayment(userAddress, paymentId, payment);

  if (!result.success && payment.isX402 && fallbackRecipient) {
    logger.warn("x402 failed — attempting wallet fallback", { userAddress, paymentId });
    const fallbackPayment: OnChainPayment = {
      ...payment,
      isX402: false,
      recipient: fallbackRecipient,
    };
    return executePayment(userAddress, paymentId, fallbackPayment);
  }

  return result;
}
