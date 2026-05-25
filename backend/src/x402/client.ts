/**
 * x402/client.ts
 * HTTP 402 payment client for the MUSD Paycheck Vault.
 *
 * Architecture Layer: PAYMENT LAYER (x402)
 * This is the ONLY layer that interacts with x402 endpoints.
 *
 * Flow:
 *   1. Send HTTP request to endpoint
 *   2. If 402 → parse payment requirements
 *   3. Construct & sign MUSD payment
 *   4. Retry with payment proof header
 *   5. Return result
 */

import { logger } from "../logger";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface X402PaymentRequest {
  accepts: Array<{
    scheme: string;
    network: string;
    maxAmountRequired: string;
    resource: string;
    description: string;
    mimeType: string;
    payTo: string;
    maxTimeoutSeconds: number;
    asset: string;
    extra?: Record<string, string>;
  }>;
  error?: string;
}

function isX402PaymentRequest(obj: unknown): obj is X402PaymentRequest {
  if (typeof obj !== "object" || obj === null) return false;
  const candidate = obj as Record<string, unknown>;
  if (!Array.isArray(candidate.accepts)) return false;
  return candidate.accepts.every(
    (item: unknown) =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).maxAmountRequired === "string"
  );
}

export interface X402ClientConfig {
  walletAddress: string;
  privateKey?: string; // optional — for real signing
  maxRetries?: number;
  spendingCapPerEndpoint?: Record<string, number>; // USD cap per endpoint
}

export interface X402Result {
  success: boolean;
  statusCode?: number;
  data?: unknown;
  paidAmount?: string;
  endpoint: string;
  txHash?: string;
  error?: string;
  timestamp: number;
}

// ─── Spending Cap Tracker ───────────────────────────────────────────────────

const spentPerEndpoint: Record<string, number> = {};

function checkSpendingCap(endpoint: string, amount: number, cap?: number): boolean {
  if (!cap) return true;
  const spent = spentPerEndpoint[endpoint] || 0;
  if (spent + amount > cap) {
    logger.warn(`Spending cap exceeded for endpoint`, { endpoint, spent, amount, cap });
    return false;
  }
  return true;
}

function recordSpend(endpoint: string, amount: number) {
  spentPerEndpoint[endpoint] = (spentPerEndpoint[endpoint] || 0) + amount;
}

export function getSpendingStats(): Record<string, number> {
  return { ...spentPerEndpoint };
}

// ─── Mock Payment Signing ───────────────────────────────────────────────────
// In production: use x402-fetch or @coinbase/x402 with a real wallet signer.

function buildMockPaymentHeader(
  paymentRequest: X402PaymentRequest,
  walletAddress: string
): string {
  // Real implementation would:
  // 1. Select best payment option from accepts[]
  // 2. Construct EIP-712 typed payment authorization
  // 3. Sign with wallet private key
  // 4. Return base64-encoded payment proof

  const mockProof = {
    scheme: "exact",
    network: "mezo",
    payload: {
      from: walletAddress,
      to: paymentRequest.accepts[0]?.payTo || "",
      value: paymentRequest.accepts[0]?.maxAmountRequired || "0",
      asset: "MUSD",
      nonce: Date.now(),
      signature: `0xmock_sig_${Date.now()}`,
    },
  };

  return `X402 ${Buffer.from(JSON.stringify(mockProof)).toString("base64")}`;
}

// ─── Core x402 Client ──────────────────────────────────────────────────────

export async function payWithX402(
  url: string,
  config: X402ClientConfig,
  requestOptions: RequestInit = {}
): Promise<X402Result> {
  const { walletAddress, maxRetries = 3, spendingCapPerEndpoint } = config;
  const cap = spendingCapPerEndpoint?.[url];

  logger.info("x402: Initiating request", { url, wallet: walletAddress });

  // Step 1: Initial request
  let response: Response;
  try {
    response = await fetch(url, {
      ...requestOptions,
      headers: {
        "Content-Type": "application/json",
        ...(requestOptions.headers || {}),
      },
    });
  } catch (err: any) {
    logger.error("x402: Network error on initial request", { url, error: err.message });
    return { success: false, error: err.message, endpoint: url, timestamp: Date.now() };
  }

  // Step 2: Handle 402 Payment Required
  if (response.status === 402) {
    logger.info("x402: Received 402 Payment Required", { url });

    let paymentRequest: X402PaymentRequest;
    try {
      const parsed: unknown = await response.json();
      if (!isX402PaymentRequest(parsed)) {
        return {
          success: false,
          error: "Invalid payment request format in 402 response",
          endpoint: url,
          timestamp: Date.now(),
        };
      }
      paymentRequest = parsed;
    } catch {
      return {
        success: false,
        error: "Failed to parse payment request from 402 response",
        endpoint: url,
        timestamp: Date.now(),
      };
    }

    logger.info("x402: Payment request parsed", {
      url,
      options: paymentRequest.accepts?.length,
      amount: paymentRequest.accepts?.[0]?.maxAmountRequired,
    });

    // Check spending cap
    const amountFloat = parseFloat(paymentRequest.accepts?.[0]?.maxAmountRequired || "0");
    if (!checkSpendingCap(url, amountFloat, cap)) {
      return {
        success: false,
        error: `Spending cap exceeded for ${url}`,
        endpoint: url,
        timestamp: Date.now(),
      };
    }

    // Step 3: Build payment header
    const paymentHeader = buildMockPaymentHeader(paymentRequest, walletAddress);

    // Step 4: Retry with payment proof
    let retries = 0;
    while (retries < maxRetries) {
      logger.info(`x402: Sending payment proof (attempt ${retries + 1}/${maxRetries})`, { url });

      try {
        const paidResponse = await fetch(url, {
          ...requestOptions,
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT": paymentHeader,
            "X-Payment-Response": "true",
            ...(requestOptions.headers || {}),
          },
        });

        if (paidResponse.ok) {
          recordSpend(url, amountFloat);
          const data = await paidResponse.json().catch(() => null);

          logger.info("x402: Payment successful", {
            url,
            statusCode: paidResponse.status,
            paidAmount: paymentRequest.accepts?.[0]?.maxAmountRequired,
          });

          return {
            success: true,
            statusCode: paidResponse.status,
            data,
            paidAmount: paymentRequest.accepts?.[0]?.maxAmountRequired,
            endpoint: url,
            txHash: `0xmusd_x402_${Date.now()}`,
            timestamp: Date.now(),
          };
        }

        if (paidResponse.status === 402) {
          logger.warn("x402: Still receiving 402 after payment, retrying...", { url });
          retries++;
          continue;
        }

        logger.error("x402: Unexpected response after payment", {
          url,
          status: paidResponse.status,
        });
        return {
          success: false,
          statusCode: paidResponse.status,
          error: `Unexpected response: ${paidResponse.status}`,
          endpoint: url,
          timestamp: Date.now(),
        };
      } catch (err: any) {
        logger.error("x402: Error during payment retry", { url, retries, error: err.message });
        retries++;
      }
    }

    return {
      success: false,
      error: `Max retries (${maxRetries}) exceeded`,
      endpoint: url,
      timestamp: Date.now(),
    };
  }

  // Step 2b: Direct success (no payment needed)
  if (response.ok) {
    const data = await response.json().catch(() => null);
    return {
      success: true,
      statusCode: response.status,
      data,
      endpoint: url,
      timestamp: Date.now(),
    };
  }

  return {
    success: false,
    statusCode: response.status,
    error: `HTTP ${response.status}`,
    endpoint: url,
    timestamp: Date.now(),
  };
}

// ─── Mock x402 Simulation (Demo Mode) ────────────────────────────────────

/**
 * Simulates an x402 payment for demo/testing when no real endpoint is available.
 * Returns realistic mock results with proper logging.
 */
export async function simulateX402Payment(
  url: string,
  walletAddress: string,
  amount: string
): Promise<X402Result> {
  logger.info("x402 [DEMO]: Simulating payment flow", { url, walletAddress, amount });

  // Simulate network delay
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

  // Simulate 402 response
  logger.info("x402 [DEMO]: Received 402 Payment Required", { url });

  await new Promise((r) => setTimeout(r, 200));

  // Simulate payment construction & signing
  logger.info("x402 [DEMO]: Constructing MUSD payment", { amount, asset: "MUSD" });
  await new Promise((r) => setTimeout(r, 150));

  // Simulate retry with payment
  logger.info("x402 [DEMO]: Retrying with payment proof", { url });
  await new Promise((r) => setTimeout(r, 300));

  const success = Math.random() > 0.1; // 90% success rate
  const txHash = `0xmusd_x402_demo_${Date.now().toString(16)}`;

  if (success) {
    recordSpend(url, parseFloat(amount));
    logger.info("x402 [DEMO]: Payment accepted ✅", { url, txHash, amount });
    return {
      success: true,
      statusCode: 200,
      data: { message: "Payment accepted", service: new URL(url).hostname },
      paidAmount: amount,
      endpoint: url,
      txHash,
      timestamp: Date.now(),
    };
  } else {
    logger.error("x402 [DEMO]: Payment failed ❌", { url });
    return {
      success: false,
      error: "Payment rejected by endpoint (simulated)",
      endpoint: url,
      timestamp: Date.now(),
    };
  }
}
