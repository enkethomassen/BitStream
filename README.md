# MUSD Paycheck Vault

> **Bitcoin-native cashflow automation on Mezo.**
> Lock BTC as collateral, mint MUSD, and automate recurring payments — to wallets or x402 API endpoints.

**Mezo Hackathon 2026 · MUSD Track / Bank on Bitcoin Track**

---

## What It Does

Users deposit BTC collateral via Mezo, mint MUSD (Bitcoin-backed stablecoin), and configure recurring payments that run automatically. The system behaves like a **self-custodial Bitcoin bank account with automated spending**.

- Bitcoin is NEVER sold
- MUSD is the only spending currency
- Payments execute on schedule with zero user intervention
- x402 enables native HTTP payments to APIs and services

---

## Architecture

```
[ Frontend (Next.js) ]
        ↓
[ Backend Agent (Node.js) ]          ← Automation Layer
        ↓                   ↘
[ MUSDVault.sol (Mezo EVM) ]    [ x402 Payment Network ]
  Capital Layer                    Payment Layer
```

### Three-Layer Separation

| Layer | Technology | Responsibility |
|---|---|---|
| **Capital** | `MUSDVault.sol` | BTC collateral, MUSD minting, vault accounting |
| **Automation** | `scheduler.ts` + `paymentExecutor.ts` | Scheduling, balance checks, execution routing |
| **Payment** | `x402/client.ts` | HTTP 402 payments to API endpoints |

---

## Project Structure

```
/
├── contracts/              # Solidity smart contracts (Hardhat)
│   ├── contracts/
│   │   └── MUSDVault.sol   # Main vault contract
│   ├── scripts/
│   │   └── deploy.ts
│   └── test/
│       └── MUSDVault.test.ts
│
├── backend/                # Node.js automation agent
│   └── src/
│       ├── agents/
│       │   ├── scheduler.ts        # Cron-based payment scheduler
│       │   └── paymentExecutor.ts  # Routes to on-chain or x402
│       ├── services/
│       │   └── vaultService.ts     # ethers.js contract wrapper
│       ├── x402/
│       │   └── client.ts           # HTTP 402 payment client
│       ├── routes/
│       │   └── vault.ts            # REST API endpoints
│       └── index.ts
│
├── frontend/               # Next.js dashboard
│   └── src/
│       ├── app/
│       │   ├── page.tsx            # Main SPA (Dashboard/Create/Payments/Agent)
│       │   └── layout.tsx
│       ├── components/
│       │   ├── WalletConnect.tsx
│       │   ├── VaultStats.tsx
│       │   ├── PaymentList.tsx
│       │   ├── CreatePaymentForm.tsx
│       │   ├── SchedulerPanel.tsx
│       │   └── ExecutionLog.tsx
│       └── lib/
│           ├── api.ts              # Backend API client
│           └── wallet.ts           # Mock Mezo Passport
│
└── shared/                 # Shared TypeScript types
```

---

## Setup

### Prerequisites
- Node.js 20+
- pnpm 8+

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Leave VAULT_CONTRACT_ADDRESS empty for demo/mock mode
```

### 3. Start backend agent

```bash
pnpm dev:backend
# → Running on http://localhost:4000
```

### 4. Start frontend

```bash
pnpm dev:frontend
# → Running on http://localhost:3000
```

### 5. (Optional) Deploy smart contract locally

```bash
# In another terminal
cd contracts
pnpm install
npx hardhat node

# In another terminal
pnpm deploy:local
# Copy the deployed address to .env: VAULT_CONTRACT_ADDRESS=0x...
```

---

## Demo Script

### Full Flow Demo

1. **Open** `http://localhost:3000`

2. **Connect wallet** → click "Connect Wallet" → select "Alice (Demo Wallet 1)"

3. **View Dashboard** → see 2 BTC collateral, 50,000 MUSD balance, 260% collateral ratio

4. **Create a wallet payment**:
   - Tab: "Create Payment"
   - Type: Wallet Transfer
   - Recipient: `0xDeaD000000000000000000000000000000000001` (rent)
   - Amount: `500`
   - Interval: Monthly
   - Click "Schedule Payment"

5. **Create an x402 payment**:
   - Type: x402 API Payment
   - Endpoint: `https://api.mock-service.xyz/premium`
   - Amount: `20`
   - Interval: Monthly

6. **Trigger the scheduler**:
   - Tab: "Agent"
   - Click "Trigger Scheduler Now"
   - Watch the execution log populate in real-time

7. **View results**:
   - Switch to Dashboard → see execution log
   - Wallet payment: shows mock tx hash
   - x402 payment: shows simulated 402 → sign → retry → success flow

### x402 Payment Flow (Simulated)

```
Agent → POST https://api.mock-service.xyz/premium
         ← 402 Payment Required + payment details
Agent → Parse payment request (amount, payTo, asset: MUSD)
Agent → Construct payment proof (signed MUSD authorization)
Agent → Retry POST with X-PAYMENT header
         ← 200 OK + data
Agent → Record spend, update MUSD balance on-chain
```

---

## Smart Contract

### MUSDVault.sol Key Functions

```solidity
depositCollateral()                          // Lock mock BTC
withdrawCollateral(uint256 amount)           // Release BTC (checks ratio)
mintMUSD(uint256 amount)                     // Mint MUSD (150% collateral required)
burnMUSD(uint256 amount)                     // Reduce debt

schedulePayment(
  address recipient,
  uint256 amount,
  uint256 interval,
  bool isX402,
  string endpoint
) returns (uint256 paymentId)

cancelPayment(uint256 paymentId)
executePayment(address user, uint256 paymentId)  // Called by executor

getUserPayments(address user)
getVaultInfo(address user)
isDue(address user, uint256 paymentId)
```

### Security Features

- `ReentrancyGuard` on all state-changing functions
- `Ownable` + executor role separation
- `Pausable` emergency stop
- Collateral ratio enforcement (min 150%)
- Interval enforcement (prevents early re-execution)

---

## Backend API

```
GET  /api/health                    # Health + mode (demo/live)
GET  /api/vault/:address            # Vault info + payments
POST /api/users/register            # Register address with scheduler
GET  /api/scheduler/status          # Cron status + stats
POST /api/scheduler/trigger         # Manual trigger (demo)
GET  /api/payments/log              # Execution history
GET  /api/payments/stats            # Aggregate stats
POST /api/x402/simulate             # Simulate x402 payment flow
```

---

## Why This Is a Strong Mezo Project

| Criterion | How We Hit It |
|---|---|
| **Mezo Integration** | MUSD is the sole spending currency; BTC collateral via Mezo vault |
| **Business Viability** | Recurring payments = real consumer finance need |
| **UX** | Set once → everything runs automatically |
| **Technical Depth** | 3-layer architecture, x402 protocol, smart contract vault |
| **x402** | Used as the execution layer for API/service payments |

---

## Live Deployment (Production Path)

1. Deploy `MUSDVault.sol` to Mezo EVM testnet
2. Set `VAULT_CONTRACT_ADDRESS` + `EXECUTOR_PRIVATE_KEY` in `.env`
3. Fund executor wallet with gas
4. Replace mock x402 client with real `x402-fetch` + live wallet signer
5. Integrate Mezo Passport SDK for wallet connection

---

*MUSD Paycheck Vault — Bitcoin is money. Now it can pay your bills.*
