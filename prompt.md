# BITSTREAM — FULL RESUME PROMPT
# DO NOT START FRESH. Work only on: https://github.com/enkethomassen/settlemint
# Read every file before touching anything.

---

## IDENTITY & MISSION

You are a senior full-stack blockchain engineer, DeFi architect, and AI agent systems designer. You are resuming work on Bitstream — a Bitcoin-backed automated cashflow engine built on Mezo. The product is mid-build. Your job is to audit what exists, make a checklist of what is missing or broken, fix everything in order, and push working code. You do not start from scratch under any circumstances.

---

## STEP 0: CLONE AND READ EVERYTHING FIRST

```bash
git clone https://github.com/enkethomassen/settlemint bitstream
cd bitstream
```

If clone fails: stop and report the exact error. Do not proceed.

After cloning, read every single file in this order:
1. /bitstream/package.json — monorepo root config
2. /bitstream/pnpm-workspace.yaml — workspace packages
3. /bitstream/vercel.json — deployment config (ROOT CAUSE OF VERCEL BUG IS HERE)
4. /bitstream/frontend/package.json — frontend deps
5. /bitstream/frontend/next.config.js — Next.js config
6. /bitstream/frontend/vercel.json — frontend-level vercel config
7. /bitstream/backend/package.json — backend deps
8. /bitstream/backend/src/ — every file in backend
9. /bitstream/frontend/src/ — every file in frontend
10. /bitstream/contracts/ — every contract
11. /bitstream/shared/ — shared types

Do not skip any file. Do not assume. Read everything.

---

## STEP 1: AUDIT AND PRODUCE A CHECKLIST

After reading every file, produce a structured checklist in this exact format before writing any code:
AUDIT RESULTS
VERCEL BUILD ISSUE

 Root cause identified: [explain exactly what the vercel.json says and why it fails]
 Fix: [exact change needed]

MISSING FEATURES

 Feature: [name] — Status: [not started / partial / broken]
Files affected: [list]

BROKEN CODE

 File: [path] — Issue: [exact problem]

DEPENDENCY ISSUES

 [package] — Issue: [version conflict or missing]

ENVIRONMENT VARIABLES

 [VAR_NAME] — Used in: [file] — Currently: [set/missing]


Show this checklist to the user and confirm before writing any code.

---

## STEP 2: FIX VERCEL ROOT DIRECTORY BUG (FIRST PRIORITY)

The Vercel error "root directory frontend not found" means the vercel.json at the repo root is incorrectly configured. Here is the correct fix:

The root /bitstream/vercel.json should be:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "frontend/$1"
    }
  ]
}
```

OR if Vercel is configured with "Root Directory = frontend" in the dashboard, the root vercel.json should be deleted and only /frontend/vercel.json should exist:
```json
{
  "framework": "nextjs"
}
```

Check which approach matches the current setup. Apply the correct fix. Do not guess — read both vercel.json files first.

Also fix the pnpm lockfile issue. The pnpm-lock.yaml must be in sync with all package.json files:
```bash
pnpm install --no-frozen-lockfile
```

Commit and push this fix first before anything else.

---

## STEP 3: FULL PRODUCT ARCHITECTURE (build this, nothing else)

Bitstream has exactly these layers. Build all of them:
┌─────────────────────────────────────────────────────┐
│                    USER INTERFACES                   │
│  Next.js Dashboard  │  Telegram Bot  │  WhatsApp Bot │
└──────────────┬──────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────┐
│                  BACKEND API (Express)               │
│  /api/wallet/analyze    /api/payments/schedule       │
│  /api/agent/run         /api/x402/execute            │
│  /api/bot/telegram      /api/bot/whatsapp            │
└──────────────┬──────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────┐
│              AGENT LAYER (OpenAI-powered)            │
│  WalletAnalyzerAgent   RecurringDetectorAgent        │
│  TreasuryManagerAgent  X402PaymentAgent              │
│  SwapOptimizerAgent    InsightGeneratorAgent         │
└──────────────┬──────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────┐
│           MEZO / BLOCKCHAIN LAYER                    │
│  BitStreamVault.sol   PaymentScheduler.sol           │
│  CollateralGuard.sol  Mezo Passport Auth             │
└─────────────────────────────────────────────────────┘

---

## STEP 4: ENVIRONMENT VARIABLES

Create this exact .env.example at repo root and populate .env for local dev:
Mezo / Blockchain
MEZO_RPC_URL=https://rpc.mezo.org
MEZO_CHAIN_ID=31611
PRIVATE_KEY=                          # agent wallet private key (never user's key)
MUSD_CONTRACT_ADDRESS=
VAULT_CONTRACT_ADDRESS=
PAYMENT_SCHEDULER_ADDRESS=
OpenAI (for all AI agent features)
OPENAI_API_KEY=                       # GPT-4o for all agentic reasoning
Redis (BullMQ job queue)
REDIS_URL=redis://localhost:6379
x402
X402_FACILITATOR_URL=https://x402.org/facilitator
Telegram Bot
TELEGRAM_BOT_TOKEN=                   # from @BotFather
WhatsApp Bot
WHATSAPP_TOKEN=                       # Meta Cloud API token
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=                # any string you choose
Blockchain explorers / data
ALCHEMY_API_KEY=                      # for EVM wallet analysis
BITCOIN_API_URL=https://blockstream.info/api   # for BTC address analysis
App
NEXT_PUBLIC_APP_NAME=Bitstream
NEXT_PUBLIC_MEZO_NETWORK=testnet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
PORT=3001

---

## STEP 5: WALLET EXPENSE ANALYZER (full feature spec)

This is a core feature. Users input any EVM wallet address or Bitcoin address (no wallet connection required to analyze). The system fetches their full transaction history and runs AI analysis.

### Backend: /api/wallet/analyze

```typescript
// POST /api/wallet/analyze
// Body: { address: string, addressType: 'evm' | 'bitcoin', range: '30d' | '90d' | '180d' }
// Returns: WalletAnalysis object

interface WalletAnalysis {
  address: string
  addressType: 'evm' | 'bitcoin'
  range: string
  totalOutflow: number          // USD value
  totalInflow: number
  monthlyBurn: number           // normalized monthly spend
  runway: string                // "∞" if income > spend, else "X months"
  reserveScore: number          // 0-100
  transactions: Transaction[]   // filtered, clean list
  recurringPayments: RecurringPayment[]
  spendByCategory: CategoryBreakdown[]
  aiInsights: string[]          // GPT-4o generated insight bullets
  topRecipients: Recipient[]
}

interface Transaction {
  hash: string
  timestamp: number
  from: string
  to: string
  amount: number
  amountUSD: number
  token: string
  category: TransactionCategory
  isFiltered: boolean           // true = hidden from main view (gas/swap noise)
  filterReason?: string         // 'gas_fee' | 'self_swap' | 'dex_internal' | 'dust'
  userTag?: string              // user-applied label
  predictedTag?: string         // AI-predicted label
  confidence?: number           // 0-1
}

type TransactionCategory = 
  | 'payment'
  | 'subscription'
  | 'yield'
  | 'swap'           // filtered by default
  | 'gas'            // filtered by default
  | 'transfer'
  | 'stablecoin'
  | 'nft'
  | 'unknown'

interface RecurringPayment {
  toAddress: string
  toLabel?: string
  amount: number
  amountUSD: number
  token: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'irregular'
  confidence: number            // 0-1, how confident the agent is this is recurring
  nextExpected?: Date
  occurrences: number
  totalSpent: number
}
```

### Smart Filtering Rules (apply ALL of these automatically)

Filter OUT (isFiltered = true) any transaction that matches:
1. Gas fees — tx.value < 0.001 ETH AND tx.to matches known router addresses
2. DEX swaps — tx.to matches known DEX router addresses (Uniswap, 1inch, Curve, PancakeSwap, etc.)
3. Self-transfers — tx.from === tx.to
4. Internal contract calls with value = 0
5. Dust transactions — amountUSD < $0.50
6. Failed transactions — tx.status === 0
7. Approval transactions — tx.methodId === '0x095ea7b3'
8. Wrap/unwrap — WETH↔️ETH, WBTC↔️BTC transactions
9. LP token operations — addLiquidity, removeLiquidity method signatures

Known DEX routers to filter (hardcode this list):
```typescript
const DEX_ROUTERS = [
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2
  '0xe592427a0aece92de3edee1f18e0157c05861564', // Uniswap V3
  '0x1111111254fb6c44bac0bed2854e76f90643097d', // 1inch V4
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f', // Sushi
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff', // 0x
  // add more as needed
]
```

Show filtered transactions in a collapsed "Hidden noise" section with count. User can unhide any.

### Data Sources for EVM Wallets
- Use Alchemy API: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
- Endpoint: `alchemy_getAssetTransfers` for full tx history
- Also fetch current balances: ETH, USDC, USDT, WBTC, any ERC-20

### Data Sources for Bitcoin Wallets
- Use Blockstream API: `https://blockstream.info/api/address/${address}/txs`
- Fetch UTXOs: `https://blockstream.info/api/address/${address}/utxo`
- Convert BTC amounts to USD using CoinGecko price API

### AI Analysis (OpenAI GPT-4o)

```typescript
// agents/walletAnalyzerAgent.ts
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function analyzeWallet(transactions: Transaction[]): Promise<{
  insights: string[]
  predictedTags: Map<string, string>
  recurringDetected: RecurringPayment[]
}> {
  const prompt = `
You are a financial analyst AI. Analyze these blockchain transactions and return JSON only.

Transactions (filtered, clean):
${JSON.stringify(transactions.filter(t => !t.isFiltered).slice(0, 100), null, 2)}

Return ONLY this JSON structure, no markdown, no explanation:
{
  "insights": [
    "bullet insight 1",
    "bullet insight 2",
    "bullet insight 3",
    "bullet insight 4"
  ],
  "predictedTags": {
    "txHash1": "Spotify subscription",
    "txHash2": "AWS payment",
    "txHash3": "Rent - USDC"
  },
  "recurringDetected": [
    {
      "toAddress": "0x...",
      "toLabel": "Spotify",
      "amount": 9.99,
      "token": "USDC",
      "frequency": "monthly",
      "confidence": 0.92,
      "occurrences": 6
    }
  ],
  "spendByCategory": [
    { "category": "subscriptions", "amountUSD": 120.50, "percentage": 48 },
    { "category": "payments", "amountUSD": 80.00, "percentage": 32 }
  ],
  "monthlyBurn": 83.33,
  "reserveScore": 87
}
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1
  })

  return JSON.parse(response.choices[0].message.content!)
}
```

### Transaction Tagging System

Users can tag any transaction from the dashboard. Tags are stored in a local database (SQLite via better-sqlite3 for simplicity, or PostgreSQL if already set up):

```typescript
// Database schema
interface TransactionTag {
  id: string
  txHash: string
  walletAddress: string
  userTag: string              // what user labeled it
  category: TransactionCategory
  createdAt: Date
}

// API endpoints
// POST /api/wallet/tag — { txHash, walletAddress, tag, category }
// GET /api/wallet/tags?address=0x... — returns all tags for address
// DELETE /api/wallet/tag/:txHash
```

When a user has tagged 3+ transactions, feed their tag history back to GPT-4o as context so future predictions for that wallet are personalized:

```typescript
const userTagContext = existingTags.map(t => 
  `TX to ${t.toAddress}: user labeled "${t.userTag}"`
).join('\n')

// Add to the OpenAI prompt:
`User has previously tagged these transactions:
${userTagContext}

Use these to inform your predictions for similar transactions.`
```

### Frontend: Wallet Analyzer Page (/analyze)

Layout exactly like ACE Protocol's treasury page (from the screenshots):
- Top: address input bar + "Analyze →" button (pill shaped, teal/orange accent)
- Below input: wallet address chip with tx count badge + "Scan different wallet" link
- Stats row: MONTHLY BURN | RECURRING | RUNWAY | RESERVE SCORE (4 cards, dark bg)
- Spend by Category: horizontal progress bar per category, total in top right
- Recent Activity: list of clean transactions with amount + category badge
- Bottom CTA: "Want Bitstream to automate this for you?" → Connect Mezo Passport
- Treasury Chart: bar chart (recharts) showing spend over time, filterable by 30d/90d/180d
- Tabs: Transactions | Recurring | AI Insights | (and add) Tags
- Right sidebar: Spend by Category donut or square breakdown

The Tags tab shows all user-applied tags with edit/delete. Inline on each transaction row: a small tag icon that opens a popover to type a label. On hover show the AI predicted tag in gray, click to confirm it.

---

## STEP 6: MEZO DASHBOARD (connected wallet view)

When user connects Mezo Passport, show a different richer dashboard:

### Vault Panel
- BTC Collateral deposited (amount + USD value)
- Collateral Ratio (gauge, green >200%, yellow 150-200%, red <150%)
- MUSD Minted
- MUSD Available (minted - scheduled outflows)
- Health status: HEALTHY / WARNING / DANGER

### Payment Scheduler Panel
- List of active recurring payment schedules
- Each schedule: recipient label, amount MUSD, frequency, next execution date, status badge
- "Add Payment" button → CreatePaymentForm

### Idle Asset Optimizer Panel
- Connected wallet token balances (ETH, USDC, WBTC, etc.)
- For each non-BTC asset: "Deploy to Mezo" button
- Agent recommendation: "You have $X idle in USDC. Convert to BTC and deploy to earn MUSD capacity"
- Swap preview: estimated BTC received, estimated MUSD mintable, slippage warning

### X402 Payments Panel
- List of x402-enabled endpoints the user has authorized
- Each endpoint: URL, MUSD amount per call, last paid, total spent
- "Add x402 endpoint" button
- Live feed: last 5 x402 payment attempts with status (success/fallback/failed)

### Execution Log Panel
- Full audit trail of all agent actions
- Each entry: timestamp, action type, amount, recipient, txHash, status
- Color coded: green = success, yellow = fallback used, red = failed

---

## STEP 7: AGENTIC TREASURY MANAGER (backend, fully autonomous)

### Agent Loop (runs every hour via BullMQ)

```typescript
// backend/src/agents/treasuryAgent.ts

async function runTreasuryAgent(vaultId: string) {
  const vault = await getVault(vaultId)
  const log: AgentAction[] = []

  // Step 1: Health check
  const ratio = await contract.checkCollateralRatio(vaultId)
  if (ratio < 1.5) {
    await emitAlert(vaultId, 'LOW_COLLATERAL', ratio)
    log.push({ type: 'alert', message: `Collateral ratio ${ratio} below threshold` })
    return { status: 'paused', log } // do not execute payments when unhealthy
  }

  // Step 2: Idle asset detection
  const balances = await getWalletBalances(vault.walletAddress)
  const idleAssets = balances.filter(b => b.token !== 'BTC' && b.valueUSD > 50)
  if (idleAssets.length > 0) {
    const recommendation = await generateSwapRecommendation(idleAssets)
    // Save recommendation to DB, surface in dashboard — DO NOT auto-swap without user approval
    await saveRecommendation(vaultId, recommendation)
    log.push({ type: 'recommendation', data: recommendation })
  }

  // Step 3: Check upcoming payments
  const upcoming = await getPaymentsDueInWindow(vaultId, '1h')
  const musdBalance = await getMUSDBalance(vault.walletAddress)

  // Step 4: Execute payments
  for (const payment of upcoming) {
    // Pre-flight checks
    if (musdBalance < payment.amountMUSD) {
      log.push({ type: 'skipped', payment, reason: 'insufficient_musd' })
      continue
    }
    if (await isSpendingCapExceeded(vaultId, payment)) {
      log.push({ type: 'skipped', payment, reason: 'cap_exceeded' })
      continue
    }

    // Execute
    try {
      let result
      if (payment.type === 'x402') {
        result = await executeX402Payment(payment)
      } else {
        result = await contract.executePayment(payment.id)
      }
      log.push({ type: 'executed', payment, txHash: result.txHash })
    } catch (err) {
      // Fallback: if x402 fails, try direct MUSD transfer
      if (payment.type === 'x402') {
        try {
          const fallback = await executeFallbackTransfer(payment)
          log.push({ type: 'fallback_executed', payment, txHash: fallback.txHash })
        } catch (fallbackErr) {
          log.push({ type: 'failed', payment, error: fallbackErr.message })
        }
      } else {
        log.push({ type: 'failed', payment, error: err.message })
      }
    }
  }

  await saveAgentLog(vaultId, log)
  return { status: 'completed', log }
}
```

### OpenAI-powered Cashflow Forecaster

```typescript
// backend/src/agents/forecastAgent.ts

async function forecastCashflow(vault: Vault, history: AgentLog[]): Promise<Forecast> {
  const prompt = `
You are a DeFi treasury manager AI. Analyze this vault's payment history and forecast upcoming needs.

Vault state:
- BTC collateral: ${vault.btcCollateral} BTC ($${vault.btcValueUSD})
- Collateral ratio: ${vault.collateralRatio}%
- MUSD balance: ${vault.musdBalance} MUSD
- Scheduled payments: ${JSON.stringify(vault.scheduledPayments)}
- Payment history (last 90 days): ${JSON.stringify(history)}

Return ONLY JSON:
{
  "next30DaysOutflow": 450.00,
  "projectedRatio30Days": 187,
  "riskLevel": "low",
  "recommendations": [
    "You have $200 idle USDC. Consider deploying to increase MUSD buffer.",
    "Subscription to 0x1234 is due in 3 days. Ensure MUSD balance is sufficient."
  ],
  "alerts": []
}
`
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1
  })

  return JSON.parse(response.choices[0].message.content!)
}
```

---

## STEP 8: X402 PAYMENT EXECUTION

```typescript
// backend/src/x402/client.ts
import { wrapFetchWithPayment } from 'x402-fetch'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`)
const walletClient = createWalletClient({
  account,
  transport: http(process.env.MEZO_RPC_URL)
})

// Wrap fetch with x402 payment handling
export const x402Fetch = wrapFetchWithPayment(fetch, walletClient)

// Execute an x402 payment with full error handling
export async function executeX402Payment(payment: Payment): Promise<{
  success: boolean
  txHash?: string
  response?: any
  fallbackUsed: boolean
  error?: string
}> {
  try {
    const response = await x402Fetch(payment.endpoint, {
      method: payment.method || 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payment.body ? JSON.stringify(payment.body) : undefined
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    return { success: true, response: data, fallbackUsed: false }

  } catch (err) {
    // Fallback: direct MUSD transfer to recipient address
    console.warn(`x402 failed for ${payment.endpoint}, using fallback transfer`)
    
    try {
      const txHash = await executeMUSDTransfer(
        payment.fallbackAddress,
        payment.amountMUSD
      )
      return { success: true, txHash, fallbackUsed: true }
    } catch (fallbackErr) {
      return { 
        success: false, 
        fallbackUsed: true, 
        error: fallbackErr.message 
      }
    }
  }
}
```

```typescript
// backend/src/x402/middleware.ts — expose paid endpoints
import { paymentMiddleware } from 'x402-express'

export const x402Routes = (app: Express) => {
  app.use('/api/premium', paymentMiddleware({
    'GET /forecast': {
      price: '$0.10',
      network: 'base-sepolia',
      config: {
        description: 'AI cashflow forecast for your vault',
        mimeType: 'application/json'
      }
    },
    'GET /insights': {
      price: '$0.05',
      network: 'base-sepolia', 
      config: {
        description: 'AI spending insights',
        mimeType: 'application/json'
      }
    }
  }))

  app.get('/api/premium/forecast', async (req, res) => {
    const forecast = await forecastCashflow(req.vault, req.paymentHistory)
    res.json(forecast)
  })

  app.get('/api/premium/insights', async (req, res) => {
    const insights = await generateInsights(req.query.address as string)
    res.json(insights)
  })
}
```

---

## STEP 9: TELEGRAM BOT (full spec)

Install: `npm install telegraf`

The bot does exactly 2 things:
1. Check Mezo wallet balance (BTC collateral, MUSD minted, MEZO token balance)
2. Analyse treasury and spending patterns

```typescript
// backend/src/bots/telegramBot.ts
import { Telegraf, Markup } from 'telegraf'

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!)

// /start command
bot.start(ctx => ctx.reply(
  `⚡ Welcome to Bitstream Bot\n\nI can help you:\n• Check your Mezo wallet balances\n• Analyse your spending patterns\n\nCommands:\n/balance <wallet_address> — Check BTC, MUSD, MEZO balances\n/analyse <wallet_address> — AI treasury & spending analysis\n/help — Show this message`
))

// /balance command
// Usage: /balance 0xYourMezoAddress
bot.command('balance', async ctx => {
  const parts = ctx.message.text.split(' ')
  const address = parts[1]

  if (!address) {
    return ctx.reply('Please provide a wallet address.\nExample: /balance 0xYourAddress')
  }

  if (!isValidAddress(address)) {
    return ctx.reply('Invalid wallet address. Please provide a valid EVM or Bitcoin address.')
  }

  await ctx.reply('🔍 Fetching balances...')

  try {
    const balances = await fetchMezoBalances(address)
    
    const message = `
💰 *Wallet Balances*
\`${truncateAddress(address)}\`

*On Mezo:*
₿ BTC Collateral: \`${balances.btcCollateral} BTC\` ($${balances.btcValueUSD.toFixed(2)})
🟡 MUSD: \`${balances.musd.toFixed(2)} MUSD\`
⚡ MEZO Token: \`${balances.mezo.toFixed(4)} MEZO\`

*Vault Health:*
Collateral Ratio: \`${balances.collateralRatio}%\` ${getRatioEmoji(balances.collateralRatio)}
MUSD Available: \`${balances.musdAvailable.toFixed(2)} MUSD\`

_Updated: ${new Date().toLocaleTimeString()}_
`
    ctx.replyWithMarkdown(message, Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Refresh', `refresh_balance_${address}`)],
      [Markup.button.callback('📊 Analyse Spending', `analyse_${address}`)]
    ]))

  } catch (err) {
    ctx.reply('❌ Could not fetch balances. Check the address and try again.')
  }
})

// /analyse command
// Usage: /analyse 0xYourAddress
bot.command('analyse', async ctx => {
  const parts = ctx.message.text.split(' ')
  const address = parts[1]

  if (!address) {
    return ctx.reply('Please provide a wallet address.\nExample: /analyse 0xYourAddress')
  }

  await ctx.reply('🧠 Analysing your treasury and spending patterns...\nThis may take 15-30 seconds.')

  try {
    const [transactions, analysis] = await Promise.all([
      fetchTransactionHistory(address, '90d'),
      analyzeWallet(address, '90d')
    ])

    const message = `
📊 *Treasury Analysis*
\`${truncateAddress(address)}\` • Last 90 days

*Spending Overview:*
💸 Monthly Burn: \`$${analysis.monthlyBurn.toFixed(2)}\`
🔄 Recurring Payments: \`${analysis.recurringPayments.length} detected\`
⏳ Runway: \`${analysis.runway}\`
🛡 Reserve Score: \`${analysis.reserveScore}/100\`

*Top Spending Categories:*
${analysis.spendByCategory.slice(0, 4).map(c =>
  `• ${c.category}: $${c.amountUSD.toFixed(2)} (${c.percentage}%)`
).join('\n')}

*Recurring Payments Detected:*
${analysis.recurringPayments.slice(0, 3).map(r =>
  `• ${r.toLabel || truncateAddress(r.toAddress)}: $${r.amount} ${r.token} ${r.frequency} (${Math.round(r.confidence * 100)}% confidence)`
).join('\n')}

*AI Insights:*
${analysis.aiInsights.slice(0, 3).map(i => `💡 ${i}`).join('\n')}
`
    ctx.replyWithMarkdown(message, Markup.inlineKeyboard([
      [Markup.button.url('📱 Open Dashboard', `https://bitstream.finance/analyze?address=${address}`)],
      [Markup.button.callback('🔄 Re-analyse', `analyse_${address}`)]
    ]))

  } catch (err) {
    ctx.reply('❌ Analysis failed. Try again or visit the web dashboard.')
  }
})

// Helper functions
function fetchMezoBalances(address: string) {
  // 1. Fetch BTC collateral from BitStreamVault contract
  // 2. Fetch MUSD balance from MUSD token contract
  // 3. Fetch MEZO token balance from MEZO token contract
  // 4. Calculate collateral ratio
  // 5. Return all as structured object
}

function getRatioEmoji(ratio: number): string {
  if (ratio >= 200) return '🟢'
  if (ratio >= 150) return '🟡'
  return '🔴'
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// Start bot
bot.launch()
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

export default bot
```

Register the bot in backend/src/index.ts:
```typescript
import './bots/telegramBot' // starts the bot in polling mode
```

For production: switch to webhook mode using bot.telegram.setWebhook()

---

## STEP 10: WHATSAPP BOT (full spec)

Uses Meta Cloud API (WhatsApp Business). Install: `npm install axios`

```typescript
// backend/src/bots/whatsappBot.ts

// Webhook verification (GET)
app.get('/api/bot/whatsapp', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge)
  } else {
    res.sendStatus(403)
  }
})

// Message handler (POST)
app.post('/api/bot/whatsapp', async (req, res) => {
  const body = req.body

  if (body.object !== 'whatsapp_business_account') return res.sendStatus(404)

  const entry = body.entry?.[0]
  const change = entry?.changes?.[0]
  const message = change?.value?.messages?.[0]

  if (!message || message.type !== 'text') return res.sendStatus(200)

  const from = message.from
  const text = message.text.body.trim().toLowerCase()

  // Parse commands
  if (text.startsWith('balance ')) {
    const address = text.replace('balance ', '').trim()
    await handleWhatsAppBalance(from, address)
  } else if (text.startsWith('analyse ') || text.startsWith('analyze ')) {
    const address = text.replace(/^anal[yz]e /, '').trim()
    await handleWhatsAppAnalyse(from, address)
  } else {
    await sendWhatsAppMessage(from, 
      `⚡ *Bitstream Bot*\n\nCommands:\n• balance <wallet_address>\n• analyse <wallet_address>\n\nExample:\nbalance 0xYourAddress`
    )
  }

  res.sendStatus(200)
})

async function sendWhatsAppMessage(to: string, text: string) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    },
    {
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
    }
  )
}

async function handleWhatsAppBalance(from: string, address: string) {
  await sendWhatsAppMessage(from, '🔍 Fetching balances...')
  
  const balances = await fetchMezoBalances(address)
  
  const msg = `💰 Wallet Balances
${address.slice(0,8)}...${address.slice(-4)}

BTC Collateral: ${balances.btcCollateral} BTC ($${balances.btcValueUSD.toFixed(2)})
MUSD: ${balances.musd.toFixed(2)} MUSD
MEZO: ${balances.mezo.toFixed(4)} MEZO

Collateral Ratio: ${balances.collateralRatio}%
MUSD Available: ${balances.musdAvailable.toFixed(2)} MUSD`

  await sendWhatsAppMessage(from, msg)
}

async function handleWhatsAppAnalyse(from: string, address: string) {
  await sendWhatsAppMessage(from, '🧠 Analysing treasury... (15-30 seconds)')
  
  const analysis = await analyzeWallet(address, '90d')
  
  const msg = `📊 Treasury Analysis (90d)

Monthly Burn: $${analysis.monthlyBurn.toFixed(2)}
Recurring Payments: ${analysis.recurringPayments.length} detected
Runway: ${analysis.runway}
Reserve Score: ${analysis.reserveScore}/100

Top Spend:
${analysis.spendByCategory.slice(0, 3).map(c => `• ${c.category}: $${c.amountUSD.toFixed(2)}`).join('\n')}

AI Insight:
${analysis.aiInsights[0]}

Full dashboard: https://bitstream.finance/analyze?address=${address}`

  await sendWhatsAppMessage(from, msg)
}
```

---

## STEP 11: DATABASE SCHEMA (SQLite for simplicity)

Install: `npm install better-sqlite3 @types/better-sqlite3`

```typescript
// backend/src/db/schema.ts

// Create tables on startup:
db.exec(`
  CREATE TABLE IF NOT EXISTS transaction_tags (
    id TEXT PRIMARY KEY,
    tx_hash TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    user_tag TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS wallet_analyses (
    id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    address_type TEXT NOT NULL,
    range TEXT NOT NULL,
    result TEXT NOT NULL,       -- JSON blob
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS agent_logs (
    id TEXT PRIMARY KEY,
    vault_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    data TEXT NOT NULL,         -- JSON blob
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS recommendations (
    id TEXT PRIMARY KEY,
    vault_id TEXT NOT NULL,
    type TEXT NOT NULL,         -- 'swap' | 'rebalance' | 'alert'
    data TEXT NOT NULL,         -- JSON blob
    status TEXT DEFAULT 'pending',  -- 'pending' | 'approved' | 'dismissed'
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_tags_wallet ON transaction_tags(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_tags_hash ON transaction_tags(tx_hash);
  CREATE INDEX IF NOT EXISTS idx_logs_vault ON agent_logs(vault_id);
`)
```

---

## STEP 12: API ROUTES CHECKLIST

These routes must all exist and be wired up in backend/src/index.ts:
GET  /health                              — liveness check
POST /api/wallet/analyze                  — wallet analysis
POST /api/wallet/tag                      — add/update tx tag
GET  /api/wallet/tags                     — get tags for address
DELETE /api/wallet/tag/:txHash            — remove tag
GET  /api/vault/:vaultId                  — vault state
POST /api/vault/deposit                   — initiate deposit
POST /api/payments/schedule              — create recurring payment
GET  /api/payments/:vaultId              — list schedules
DELETE /api/payments/:scheduleId         — remove schedule
POST /api/agent/run                       — manually trigger agent loop
GET  /api/agent/logs/:vaultId            — execution history
GET  /api/agent/recommendations/:vaultId — pending recommendations
POST /api/agent/recommendations/:id/approve
POST /api/agent/recommendations/:id/dismiss
POST /api/x402/execute                   — manual x402 payment trigger
GET  /api/x402/endpoints/:vaultId        — list x402 endpoints
GET  /api/bot/whatsapp                   — webhook verification
POST /api/bot/whatsapp                   — message handler
GET  /api/premium/forecast               — x402-gated AI forecast
GET  /api/premium/insights               — x402-gated AI insights

---

## STEP 13: FRONTEND PAGES CHECKLIST

All pages must exist in /frontend/src/app/:
/                     — Landing page with 3D Bitcoin sphere + full product story
/analyze              — Wallet expense analyzer (no wallet connection needed)
/dashboard            — Connected wallet dashboard (requires Mezo Passport)
/dashboard/vault      — Vault management (deposit, collateral, MUSD)
/dashboard/payments   — Recurring payment schedules
/dashboard/x402       — x402 endpoints and payment log
/dashboard/agent      — Agent logs, recommendations, settings

---

## STEP 14: VERCEL DEPLOYMENT CONFIG (fix once and for all)

The monorepo root must have this vercel.json:
```json
{
  "version": 2,
  "buildCommand": "cd frontend && pnpm install --no-frozen-lockfile && pnpm build",
  "outputDirectory": "frontend/.next",
  "installCommand": "pnpm install --no-frozen-lockfile",
  "framework": "nextjs",
  "rootDirectory": "frontend"
}
```

In Vercel dashboard:
- Root Directory: frontend
- Build Command: pnpm build (or leave as detected)
- Install Command: pnpm install --no-frozen-lockfile
- Node.js version: 20.x

Delete any conflicting vercel.json at the root if rootDirectory is set in the dashboard.

The backend deploys separately (Railway or Render). It is NOT part of the Vercel frontend deployment.

---

## STEP 15: PUSH AND DEPLOY

After every feature is complete and tested locally:

```bash
cd /bitstream
git add -A
git commit -m "feat: [feature name]"
git push origin main
```

Push after each step, not all at once.

---

## EXECUTION ORDER (follow this exactly)

1. Clone repo, read all files
2. Produce audit checklist — show to user
3. Fix Vercel root directory bug → push
4. Fix pnpm lockfile → push
5. Build wallet expense analyzer (backend + frontend)
6. Build transaction tagging system
7. Build OpenAI wallet analysis agent
8. Build Mezo balance fetcher
9. Build Telegram bot
10. Build WhatsApp bot
11. Build agentic treasury manager loop
12. Build x402 execution with fallback
13. Build dashboard pages
14. Wire all API routes
15. Final test: run frontend + backend together
16. Push everything

---

## ABSOLUTE RULES — NEVER VIOLATE

1. Never start from scratch. Work on https://github.com/enkethomassen/settlemint only
2. Never hallucinate contract addresses — use only what is in .env or ask
3. Never use 'any' TypeScript type — always define proper interfaces
4. Never commit .env files — only .env.example
5. Never auto-execute swaps — always save as recommendation for user approval
6. Never use MetaMask-only flows — Mezo Passport is the only wallet layer
7. Never store private keys in frontend — agent private key is backend-only
8. Every OpenAI call must use response_format: json_object to prevent hallucinations
9. Every payment must check collateral ratio before executing
10. Every x402 failure must have a documented fallback path
11. The design uses Bitcoin orange #F7931A as primary accent — never purple as primary
12. pnpm only — never mix npm install and pnpm install in the same workspace