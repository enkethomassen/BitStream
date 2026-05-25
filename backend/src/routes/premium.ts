/**
 * routes/premium.ts
 * x402-gated premium endpoints used by the demo payment layer.
 */

import { Router, Request, Response } from "express";

const router = Router();

function paymentInfo(req: Request) {
  return (req as any).x402Payment ?? null;
}

router.get("/forecast", (req: Request, res: Response) => {
  res.json({
    paid: true,
    payment: paymentInfo(req),
    forecast: {
      next30DaysOutflowMUSD: 2450,
      projectedCollateralRatio: 218,
      riskLevel: "low",
      recommendations: [
        "MUSD buffer covers upcoming recurring payments.",
        "No collateral top-up needed for the next 30 days.",
      ],
    },
  });
});

router.get("/insights", (req: Request, res: Response) => {
  res.json({
    paid: true,
    payment: paymentInfo(req),
    insights: [
      "Two recurring subscriptions are due in the next 7 days.",
      "Infrastructure payments are the largest recurring category.",
      "Current MUSD reserve is sufficient for scheduled outflows.",
    ],
  });
});

router.get("/analytics", (req: Request, res: Response) => {
  res.json({
    paid: true,
    payment: paymentInfo(req),
    analytics: {
      x402SuccessRate: 1,
      recurringPaymentCoverageDays: 41,
      idleMUSDEstimate: 1200,
    },
  });
});

router.post("/optimize", (req: Request, res: Response) => {
  res.json({
    paid: true,
    payment: paymentInfo(req),
    plan: {
      action: "keep_schedule",
      reason: "Current collateral ratio and MUSD balance support existing payment cadence.",
    },
  });
});

export default router;
