/**
 * vaultService.ts
 * Connects to MUSDVault smart contract using ethers.js.
 * Provides typed wrappers for all contract interactions.
 *
 * Architecture Layer: AUTOMATION LAYER (Backend Agent)
 */

import { ethers, JsonRpcProvider, Wallet, Contract } from "ethers";
import { logger } from "../logger";

// ABI — only the functions and events we need
const VAULT_ABI = [
  // Views
  "function getUserPayments(address user) view returns (tuple(address recipient, uint256 amount, uint256 interval, uint256 lastExecuted, bool isActive, bool isX402, string endpoint)[])",
  "function getVaultInfo(address user) view returns (uint256 collateral, uint256 musdBalance, uint256 collateralRatio, uint256 paymentCount)",
  "function musdBalance(address) view returns (uint256)",
  "function collateral(address) view returns (uint256)",
  "function isDue(address user, uint256 paymentId) view returns (bool)",
  "function getCollateralRatio(address user) view returns (uint256)",

  // State-changing
  "function executePayment(address user, uint256 paymentId) returns ()",

  // Events
  "event PaymentExecuted(address indexed user, uint256 indexed paymentId, address recipient, uint256 amount, bool isX402)",
  "event PaymentScheduled(address indexed user, uint256 indexed paymentId, address recipient, uint256 amount, uint256 interval, bool isX402, string endpoint)",
  "event PaymentCancelled(address indexed user, uint256 indexed paymentId)",
  "event CollateralUpdated(address indexed user, uint256 newCollateral, uint256 musdBalance)",
];

export interface OnChainPayment {
  recipient: string;
  amount: bigint;
  interval: bigint;
  lastExecuted: bigint;
  isActive: boolean;
  isX402: boolean;
  endpoint: string;
}

export interface OnChainVaultInfo {
  collateral: bigint;
  musdBalance: bigint;
  collateralRatio: bigint;
  paymentCount: bigint;
}

let provider: JsonRpcProvider;
let executorWallet: Wallet;
let vaultContract: Contract;

export function initVaultService() {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const privateKey = process.env.EXECUTOR_PRIVATE_KEY;
  const contractAddress = process.env.VAULT_CONTRACT_ADDRESS;

  if (!contractAddress) {
    logger.warn("VAULT_CONTRACT_ADDRESS not set — vault service running in mock mode");
    return;
  }

  provider = new JsonRpcProvider(rpcUrl);

  if (privateKey) {
    executorWallet = new Wallet(privateKey, provider);
    vaultContract = new Contract(contractAddress, VAULT_ABI, executorWallet);
    logger.info(`VaultService initialized`, {
      rpc: rpcUrl,
      contract: contractAddress,
      executor: executorWallet.address,
    });
  } else {
    logger.warn("EXECUTOR_PRIVATE_KEY not set — read-only mode");
    vaultContract = new Contract(contractAddress, VAULT_ABI, provider);
  }
}

export async function getUserPayments(userAddress: string): Promise<OnChainPayment[]> {
  if (!vaultContract) return getMockPayments(userAddress);
  try {
    const raw = await vaultContract.getUserPayments(userAddress);
    return raw.map((p: any) => ({
      recipient: p.recipient,
      amount: p.amount,
      interval: p.interval,
      lastExecuted: p.lastExecuted,
      isActive: p.isActive,
      isX402: p.isX402,
      endpoint: p.endpoint,
    }));
  } catch (err) {
    logger.error("getUserPayments failed", { userAddress, err });
    return [];
  }
}

export async function getVaultInfo(userAddress: string): Promise<OnChainVaultInfo> {
  if (!vaultContract) return getMockVaultInfo(userAddress);
  try {
    const info = await vaultContract.getVaultInfo(userAddress);
    return {
      collateral: info.collateral,
      musdBalance: info.musdBalance,
      collateralRatio: info.collateralRatio,
      paymentCount: info.paymentCount,
    };
  } catch (err) {
    logger.error("getVaultInfo failed", { userAddress, err });
    return { collateral: 0n, musdBalance: 0n, collateralRatio: 0n, paymentCount: 0n };
  }
}

export async function isDue(userAddress: string, paymentId: number): Promise<boolean> {
  if (!vaultContract) return true; // mock always due
  try {
    return await vaultContract.isDue(userAddress, paymentId);
  } catch {
    return false;
  }
}

export async function executePaymentOnChain(
  userAddress: string,
  paymentId: number
): Promise<{ txHash: string; success: boolean }> {
  if (!vaultContract || !executorWallet) {
    logger.warn("executePaymentOnChain: mock mode — simulating execution");
    return { txHash: `0xmock_${Date.now()}`, success: true };
  }

  try {
    logger.info("Executing on-chain payment", { userAddress, paymentId });
    const tx = await vaultContract.executePayment(userAddress, paymentId);
    const receipt = await tx.wait();
    logger.info("On-chain payment confirmed", {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    });
    return { txHash: receipt.hash, success: true };
  } catch (err: any) {
    logger.error("On-chain execution failed", { userAddress, paymentId, error: err.message });
    return { txHash: "", success: false };
  }
}

// ─── MOCK DATA (Demo Mode) ────────────────────────────────────────────────────

const MOCK_USERS: Record<string, OnChainPayment[]> = {};

export function seedMockUser(address: string) {
  if (MOCK_USERS[address]) return;

  // Demo seed values are driven by env vars — no hardcoded amounts or addresses
  const mockWalletRecipient = process.env.MOCK_RECIPIENT_ADDRESS || "0x0000000000000000000000000000000000000000";
  const mockWalletAmount    = process.env.MOCK_WALLET_AMOUNT     || "100";
  const mockX402Amount      = process.env.MOCK_X402_AMOUNT       || "10";
  const mockX402Endpoint    = process.env.MOCK_X402_ENDPOINT     || "https://api.example.com/premium";
  const mockInterval        = BigInt(process.env.MOCK_PAYMENT_INTERVAL || "2592000");

  MOCK_USERS[address] = [
    {
      recipient: mockWalletRecipient,
      amount: ethers.parseEther(mockWalletAmount),
      interval: mockInterval,
      lastExecuted: 0n,
      isActive: true,
      isX402: false,
      endpoint: "",
    },
    {
      recipient: ethers.ZeroAddress,
      amount: ethers.parseEther(mockX402Amount),
      interval: mockInterval,
      lastExecuted: 0n,
      isActive: true,
      isX402: true,
      endpoint: mockX402Endpoint,
    },
  ];
}

function getMockPayments(address: string): OnChainPayment[] {
  if (!MOCK_USERS[address]) seedMockUser(address);
  return MOCK_USERS[address];
}

function getMockVaultInfo(address: string): OnChainVaultInfo {
  // Demo vault values driven by env vars — no hardcoded amounts
  const mockBtcCollateral = process.env.MOCK_BTC_COLLATERAL || "2";
  const mockMUSDBalance   = process.env.MOCK_MUSD_BALANCE   || "10000";
  const collateralBig     = ethers.parseEther(mockBtcCollateral);
  const musdBig           = ethers.parseEther(mockMUSDBalance);
  const btcPrice          = BigInt(process.env.MOCK_BTC_PRICE_USD || "65000");

  // Calculate ratio: (collateral * btcPrice / 1e18) * 100 / (musd / 1e18)
  const collateralUSD  = (collateralBig * btcPrice) / BigInt("1000000000000000000");
  const musdUnits      = musdBig / BigInt("1000000000000000000");
  const ratio          = musdUnits > 0n ? (collateralUSD * 100n) / musdUnits : BigInt("999999999999999999");

  const payments       = MOCK_USERS[address];
  const paymentCount   = BigInt(payments ? payments.length : 0);

  return {
    collateral: collateralBig,
    musdBalance: musdBig,
    collateralRatio: ratio,
    paymentCount,
  };
}

export function getAllMockUsers(): string[] {
  return Object.keys(MOCK_USERS);
}

export function addMockPayment(address: string, payment: OnChainPayment): number {
  if (!MOCK_USERS[address]) seedMockUser(address);
  MOCK_USERS[address].push(payment);
  return MOCK_USERS[address].length - 1;
}

export function cancelMockPayment(address: string, paymentId: number): boolean {
  const payments = MOCK_USERS[address];
  if (!payments || paymentId < 0 || paymentId >= payments.length) return false;
  if (!payments[paymentId].isActive) return false;
  payments[paymentId] = { ...payments[paymentId], isActive: false };
  return true;
}

export function updateMockPaymentLastExecuted(address: string, paymentId: number, timestamp: number): void {
  const payments = MOCK_USERS[address];
  if (!payments || paymentId < 0 || paymentId >= payments.length) return;
  payments[paymentId] = { ...payments[paymentId], lastExecuted: BigInt(timestamp) };
}
