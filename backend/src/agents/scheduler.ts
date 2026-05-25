/**
 * scheduler.ts
 * Cron-based payment scheduler — runs every minute.
 * Fetches all registered users, checks due payments, and triggers execution.
 *
 * Architecture Layer: AUTOMATION LAYER (Backend Agent)
 */

import cron from "node-cron";
import { logger } from "../logger";
import {
  getUserPayments,
  getVaultInfo,
  seedMockUser,
  getAllMockUsers,
  updateMockPaymentLastExecuted,
} from "../services/vaultService";
import { executePayment } from "./paymentExecutor";

// Track registered users (in production: load from DB)
const registeredUsers = new Set<string>();

export function registerUser(address: string) {
  registeredUsers.add(address.toLowerCase());
  // Seed mock data in demo mode
  if (!process.env.VAULT_CONTRACT_ADDRESS) {
    seedMockUser(address);
  }
  logger.info("User registered with scheduler", { address });
}

export function getRegisteredUsers(): string[] {
  return Array.from(registeredUsers);
}

// Scheduler state
let schedulerRunning = false;
let lastRun: Date | null = null;
let totalChecked = 0;
let totalExecuted = 0;

export function getSchedulerStatus() {
  return {
    running: schedulerRunning,
    lastRun: lastRun?.toISOString() || null,
    registeredUsers: registeredUsers.size,
    totalChecked,
    totalExecuted,
  };
}

/**
 * Core scheduler logic — checks all users' payments and executes due ones.
 */
async function runSchedulerCycle() {
  if (schedulerRunning) {
    logger.debug("Scheduler cycle already running — skipping");
    return;
  }

  schedulerRunning = true;
  lastRun = new Date();

  const users = Array.from(registeredUsers);

  if (users.length === 0) {
    // In demo mode, load mock users
    const mockUsers = getAllMockUsers();
    mockUsers.forEach((u) => registeredUsers.add(u));
  }

  const allUsers = Array.from(registeredUsers);
  if (allUsers.length === 0) {
    schedulerRunning = false;
    return;
  }

  logger.info(`Scheduler cycle started`, { users: allUsers.length });

  for (const userAddress of allUsers) {
    try {
      const [payments, vaultInfo] = await Promise.all([
        getUserPayments(userAddress),
        getVaultInfo(userAddress),
      ]);

      totalChecked += payments.length;

      for (let i = 0; i < payments.length; i++) {
        const payment = payments[i];

        if (!payment.isActive) continue;

        // Check if due
        const now = Math.floor(Date.now() / 1000);
        const lastExec = Number(payment.lastExecuted);
        const interval = Number(payment.interval);
        const isDue = lastExec === 0 || now >= lastExec + interval;

        if (!isDue) {
          const nextRun = new Date((lastExec + interval) * 1000);
          logger.debug("Payment not due", {
            user: userAddress,
            paymentId: i,
            nextRun: nextRun.toISOString(),
          });
          continue;
        }

        // Check MUSD balance covers this payment
        if (vaultInfo.musdBalance < payment.amount) {
          logger.warn("Insufficient MUSD — skipping payment", {
            user: userAddress,
            paymentId: i,
            balance: vaultInfo.musdBalance.toString(),
            required: payment.amount.toString(),
          });
          continue;
        }

        // Execute
        logger.info("Payment due — executing", {
          user: userAddress,
          paymentId: i,
          isX402: payment.isX402,
          endpoint: payment.isX402 ? payment.endpoint : payment.recipient,
        });

        const result = await executePayment(userAddress, i, payment);
        if (result.success) {
          totalExecuted++;
          // Persist lastExecuted update in mock state
          updateMockPaymentLastExecuted(userAddress, i, Math.floor(Date.now() / 1000));
        }
      }
    } catch (err: any) {
      logger.error("Scheduler error for user", { userAddress, error: err.message });
    }
  }

  logger.info(`Scheduler cycle complete`, {
    users: allUsers.length,
    checked: totalChecked,
    executed: totalExecuted,
  });

  schedulerRunning = false;
}

/**
 * Start the scheduler. Runs every minute by default.
 * In demo mode can be triggered via API for instant demo.
 */
export function startScheduler(intervalCron = "* * * * *") {
  logger.info("Starting payment scheduler", { cron: intervalCron });

  // Seed demo users immediately (requires DEMO_USER_ADDRESS env var in demo mode)
  if (!process.env.VAULT_CONTRACT_ADDRESS) {
    const demoUser = process.env.DEMO_USER_ADDRESS;
    if (demoUser) {
      registerUser(demoUser);
      logger.info("Demo mode: seeded user", { address: demoUser });
    } else {
      logger.warn("Demo mode active but DEMO_USER_ADDRESS is not set — no users seeded. Register via POST /api/users/register");
    }
  }

  cron.schedule(intervalCron, async () => {
    try {
      await runSchedulerCycle();
    } catch (err: any) {
      logger.error("Unhandled scheduler error", { error: err.message });
      schedulerRunning = false;
    }
  });

  logger.info("Scheduler started ✅");
}

/** Manual trigger for demos */
export async function triggerNow() {
  return runSchedulerCycle();
}
