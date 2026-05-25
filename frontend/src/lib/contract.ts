/**
 * contract.ts — MUSDVault ABI + typed contract address
 * Generated from contracts/contracts/MUSDVault.sol
 */

export const VAULT_ABI = [
  // ── Capital Layer ──────────────────────────────────────────
  {
    name: "depositCollateral",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    name: "withdrawCollateral",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "mintMUSD",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "burnMUSD",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  // ── Automation Layer ───────────────────────────────────────
  {
    name: "schedulePayment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "interval", type: "uint256" },
      { name: "isX402", type: "bool" },
      { name: "endpoint", type: "string" },
    ],
    outputs: [{ name: "paymentId", type: "uint256" }],
  },
  {
    name: "cancelPayment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "paymentId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "executePayment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "paymentId", type: "uint256" },
    ],
    outputs: [],
  },
  // ── View Functions ─────────────────────────────────────────
  {
    name: "getVaultInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "_collateral", type: "uint256" },
      { name: "_musdBalance", type: "uint256" },
      { name: "_collateralRatio", type: "uint256" },
      { name: "_paymentCount", type: "uint256" },
    ],
  },
  {
    name: "getUserPayments",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "interval", type: "uint256" },
          { name: "lastExecuted", type: "uint256" },
          { name: "isActive", type: "bool" },
          { name: "isX402", type: "bool" },
          { name: "endpoint", type: "string" },
        ],
      },
    ],
  },
  {
    name: "getCollateralRatio",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "isDue",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "paymentId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "musdBalance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "collateral",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "mockBtcPriceUSD",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalMUSDSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // ── Events ─────────────────────────────────────────────────
  {
    name: "CollateralDeposited",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "MUSDMinted",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "PaymentScheduled",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "paymentId", type: "uint256", indexed: true },
      { name: "recipient", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "interval", type: "uint256", indexed: false },
      { name: "isX402", type: "bool", indexed: false },
      { name: "endpoint", type: "string", indexed: false },
    ],
  },
  {
    name: "PaymentExecuted",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "paymentId", type: "uint256", indexed: true },
      { name: "recipient", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "isX402", type: "bool", indexed: false },
    ],
  },
  {
    name: "PaymentCancelled",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "paymentId", type: "uint256", indexed: true },
    ],
  },
] as const;

export const VAULT_ADDRESS = (
  process.env.NEXT_PUBLIC_VAULT_ADDRESS || ""
) as `0x${string}`;
