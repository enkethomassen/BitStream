/**
 * vaultMonitor.ts
 * Polls collateral ratio for all registered vaults.
 * Emits alerts if ratio drops below warning or critical thresholds.
 *
 * Architecture Layer: AUTOMATION LAYER (Monitoring Agent)
 *
 * Events emitted (internal EventEmitter):
 *  - "collateral:warning"  → ratio below 175%
 *  - "collateral:critical" → ratio below 150%
 *  - "collateral:healthy"  → ratio recovered
 */

import { EventEmitter } from "events";
import { logger } from "../logger";
import { getVaultInfo } from "../services/vaultService";
import { getRegisteredUsers } from "./scheduler";

export const vaultMonitorEvents = new EventEmitter();

export interface CollateralStatus {
  user: string;
  ratio: number;
  musdBalance: bigint;
  collateral: bigint;
  level: "healthy" | "warning" | "critical";
  checkedAt: number;
}

const THRESHOLDS = {
  warning:  175,
  critical: 150,
} as const;

const lastStatus: Map<string, CollateralStatus> = new Map();

function classify(ratio: number): CollateralStatus["level"] {
  if (ratio < THRESHOLDS.critical) return "critical";
  if (ratio < THRESHOLDS.warning) return "warning";
  return "healthy";
}

async function checkVault(user: string): Promise<CollateralStatus | null> {
  try {
    const info = await getVaultInfo(user);
    const ratio = Number(info.collateralRatio) === Number("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")
      ? 9999
      : Number(info.collateralRatio);

    const level = classify(ratio);
    const status: CollateralStatus = {
      user,
      ratio,
      musdBalance: info.musdBalance,
      collateral: info.collateral,
      level,
      checkedAt: Date.now(),
    };

    const prev = lastStatus.get(user);

    if (level === "critical") {
      logger.error("COLLATERAL CRITICAL", { user, ratio });
      vaultMonitorEvents.emit("collateral:critical", status);
    } else if (level === "warning") {
      logger.warn("Collateral warning", { user, ratio });
      vaultMonitorEvents.emit("collateral:warning", status);
    } else if (prev && prev.level !== "healthy") {
      logger.info("Collateral recovered", { user, ratio });
      vaultMonitorEvents.emit("collateral:healthy", status);
    }

    lastStatus.set(user, status);
    return status;
  } catch (err: any) {
    logger.error("vaultMonitor: error checking vault", { user, error: err.message });
    return null;
  }
}

/**
 * Run a single monitoring sweep across all registered users.
 */
export async function runMonitorSweep(): Promise<CollateralStatus[]> {
  const users = getRegisteredUsers();
  logger.debug("vaultMonitor: sweep", { users: users.length });

  const results = await Promise.allSettled(users.map(checkVault));
  return results
    .filter((r): r is PromiseFulfilledResult<CollateralStatus | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((s): s is CollateralStatus => s !== null);
}

/**
 * Get the last known status for a user.
 */
export function getVaultStatus(user: string): CollateralStatus | undefined {
  return lastStatus.get(user.toLowerCase());
}

/**
 * Get all current statuses.
 */
export function getAllVaultStatuses(): CollateralStatus[] {
  return Array.from(lastStatus.values());
}
