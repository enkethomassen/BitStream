/**
 * x402Middleware.ts
 * Express middleware that gate-keeps endpoints behind x402 MUSD payments.
 *
 * Usage:
 *   app.use("/api/premium", x402PaymentMiddleware);
 */

import type { Request, Response, NextFunction } from "express";
import { logger } from "../logger";

export interface PaidEndpointConfig {
  token: string;   // e.g. "MUSD"
  amount: string;  // e.g. "0.1"
  description: string;
}

export interface X402MiddlewareOptions {
  [route: string]: PaidEndpointConfig;
}

/**
 * Build x402 payment requirement response.
 */
function buildPaymentRequired(config: PaidEndpointConfig, resource: string) {
  return {
    accepts: [
      {
        scheme: "exact",
        network: process.env.MEZO_NETWORK ?? "testnet",
        maxAmountRequired: config.amount,
        resource,
        description: config.description,
        mimeType: "application/json",
        payTo: process.env.VAULT_CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000",
        maxTimeoutSeconds: 60,
        asset: config.token,
        extra: {
          name: config.token,
          version: "1",
        },
      },
    ],
  };
}

/**
 * Validate a payment header (production: verify EIP-712 sig; MVP: non-empty check).
 */
function validatePaymentHeader(header: string | undefined, amount: string): boolean {
  if (!header) return false;
  if (process.env.X402_SKIP_VALIDATION === "true") return true;

  // MVP: decode base64 and check basic structure
  try {
    const raw = header.startsWith("X402 ") ? header.slice(5) : header;
    const decoded = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    return (
      typeof decoded === "object" &&
      decoded !== null &&
      typeof decoded.payload?.value === "string"
    );
  } catch {
    return false;
  }
}

/**
 * Factory: creates per-route x402 middleware from a config map.
 *
 * @example
 *   const middleware = createX402Middleware({
 *     "GET /api/premium/forecast": { token: "MUSD", amount: "0.1", description: "AI cashflow forecast" }
 *   });
 *   app.use(middleware);
 */
export function createX402Middleware(routes: X402MiddlewareOptions) {
  return function x402Middleware(req: Request, res: Response, next: NextFunction) {
    const routeKey = `${req.method} ${req.path}`;
    const config = routes[routeKey];

    if (!config) {
      return next(); // not a paid route
    }

    const paymentHeader = req.headers["x-payment"] as string | undefined;

    if (!validatePaymentHeader(paymentHeader, config.amount)) {
      logger.info("x402: Payment required", { route: routeKey, amount: config.amount, token: config.token });

      return res.status(402).json(
        buildPaymentRequired(config, `${req.protocol}://${req.get("host")}${req.originalUrl}`)
      );
    }

    // Payment validated — attach payment info to request for downstream handlers
    (req as any).x402Payment = {
      token: config.token,
      amount: config.amount,
      header: paymentHeader,
      validatedAt: Date.now(),
    };

    logger.info("x402: Payment accepted, proceeding", { route: routeKey });
    return next();
  };
}

/**
 * Pre-configured Bitstream paid endpoints middleware.
 *
 * Mount on the Express app:
 *   app.use(bitstreamX402Middleware);
 */
export const bitstreamX402Middleware = createX402Middleware({
  "GET /api/premium/forecast": {
    token: "MUSD",
    amount: "0.1",
    description: "AI cashflow forecast endpoint — predicts MUSD inflows/outflows over 30 days",
  },
  "GET /api/premium/analytics": {
    token: "MUSD",
    amount: "0.05",
    description: "Advanced vault analytics and optimisation insights",
  },
  "POST /api/premium/optimize": {
    token: "MUSD",
    amount: "0.25",
    description: "AI payment schedule optimisation — minimises collateral liquidation risk",
  },
});
