# FinanceFlow — Practical User Guide & Tutorial

> **Welcome to FinanceFlow!**  
> This guide is written in plain language to help you get the most out of your personal finance tracker. No technical or programming knowledge required!

---

## Table of Contents

1. [First-Time Setup & Security](#1-first-time-setup--security)
2. [Managing Accounts & Categories](#2-managing-accounts--categories)
3. [Logging Transactions (Manual & Conversational Chat)](#3-logging-transactions-manual--conversational-chat)
4. [Managing Debts & Receivables](#4-managing-debts--receivables)
5. [Setting Up Recurring Rules & Bank Admin Fees](#5-setting-up-recurring-rules--bank-admin-fees)
6. [Scanning Receipts with Camera / OCR](#6-scanning-receipts-with-camera--ocr)
7. [Understanding Your Analytics Dashboard & Reports](#7-understanding-your-analytics-dashboard--reports)
8. [Google Drive Cloud Sync & Backups](#8-google-drive-cloud-sync--backups)
9. [Configuring AI Providers & The Failover Chain](#9-configuring-ai-providers--the-failover-chain)
10. [Connecting the Telegram Bot](#10-connecting-the-telegram-bot)
11. [What to Expect When 100% Offline](#11-what-to-expect-when-100-offline)
12. [Frequently Asked Questions & Troubleshooting](#12-frequently-asked-questions--troubleshooting)

---

## 1. First-Time Setup & Security

### Step 1: Open the App & Choose Base Currency
When you first launch FinanceFlow, it automatically sets up default sample accounts (Bank BCA, Cash Dompet, PayPal USD) and standard spending categories.
- Go to the **Settings** tab.
- Select your primary reporting currency (e.g., **IDR - Indonesian Rupiah**, **USD**, **EUR**, **SGD**). All net worth and dashboard analytics will be calculated in this base currency.

### Step 2: Configure Your Master Security PIN
FinanceFlow is a **Zero-Knowledge** application. This means your data is encrypted with a master key derived from your PIN.
1. In **Settings**, tap **Security & App Lock** (or click **Setup App PIN**).
2. Enter a 6-digit numeric PIN (e.g., `882200`).
3. *(Optional)* Enable **Biometric Unlock** (Fingerprint or FaceID) for quick unlocking without typing your PIN every time.
4. Set an **Auto-Lock Timeout** (e.g., 5 minutes, or immediately upon switching tabs).

> ⚠️ **Important Security Rule**: Because FinanceFlow does not store your PIN on any remote server, **there is no "Forgot PIN" email reset link**. If you forget your PIN, encrypted backups and stored AI keys cannot be decrypted. Store your 6-digit PIN in a safe password manager!

---

## 2. Managing Accounts & Categories

### Accounts
Accounts represent where your money actually lives:
- **Cash**: Physical wallet / cash on hand.
- **Bank**: BCA, Mandiri, BRI, BNI, Bank Jago, etc.
- **E-Wallets**: GoPay, OVO, Dana, ShopeePay.
- **PayPal / International**: Multi-currency accounts (e.g. USD balance).
- **Credit Cards & Investments**: Track liabilities and portfolio values.

To create or edit an account:
1. Tap the **Accounts** tab in the sidebar or bottom navigation.
2. Tap **+ Add Account**.
3. Choose the account type, assign a color and icon, specify the currency, and enter your starting balance.

### Categories & Budgets
1. Tap the **Categories** tab.
2. You can create custom categories for Expense, Income, or Both.
3. **Monthly Budget Ceiling**: Set a monthly budget (e.g., `3,000,000 IDR` for Food & Dining). The dashboard will monitor your progress throughout the month and warn you before you overspend.

---

## 3. Logging Transactions (Manual & Conversational Chat)

FinanceFlow gives you two ways to record spending and income: traditional manual forms and conversational chat.

### Method A: Quick Manual Entry Form
1. Tap the **+ Transaction** button in the top navbar.
2. Choose **Expense**, **Income**, or **Transfer**.
3. Enter the amount, select the account and category, and add an optional description.
4. **Account Transfers**: When transferring money between accounts (e.g., Bank BCA $\to$ GoPay), you can specify a **Transfer Fee** (e.g., `1,000 IDR`). The app automatically deducts the fee and source amount atomically.

---

### Method B: Conversational Chat Entry (Bahasa Indonesia & English)
Tap the **AI Assistant** tab. You can type transactions in natural, casual conversation. FinanceFlow understands standard formal Indonesian, English, colloquial texting shorthand, and Indonesian monetary slang numbers.

#### Example Phrasing You Can Use:

| What You Type | How FinanceFlow Understands It | Resulting Proposal |
|---|---|---|
| `kopi 35k bca` | Everyday coffee, 35,000 IDR, Bank BCA | Expense: 35,000 IDR (Food & Dining, BCA) |
| `makan soto pekgo pke gopay` | "pekgo" slang = 150,000 IDR, GoPay | Expense: 150,000 IDR (Food & Dining, GoPay) |
| `jajan nobango cash tadi` | "nobango" slang = 25,000 IDR, Cash wallet | Expense: 25,000 IDR (Food & Dining, Cash) |
| `beli bensin gocap pke mandiri` | "gocap" slang = 50,000 IDR, Mandiri | Expense: 50,000 IDR (Transport, Mandiri) |
| `kemaren lusa byr listrik 150rb` | "kemaren lusa" = 2 days ago, Bills category | Expense: 150,000 IDR on 2026-10-21 (Bills) |
| `gaji sejt msk bca td pagi` | "sejt" slang = 1,000,000 IDR, Salary | Income: 1,000,000 IDR (Salary, BCA) |
| `transfer 500rb bca ke gopay fee 1rb` | Transfer with fee | Transfer: 500k to GoPay, 1k fee deducted |

#### Monetary Slang Numbers Cheat Sheet:
- `seceng` = 1,000
- `goceng` = 5,000
- `ceban` = 10,000
- `noban` = 20,000
- `nobango` = 25,000
- `gocap` = 50,000
- `cepek` / `cepek ceng` = 100,000
- `pekgo` = 150,000
- `gopek ceng` = 500,000
- `sejt` / `sejuta` = 1,000,000

#### The Zero-Write Confirmation Card
When the assistant processes your input, it **does not** write directly to the database. Instead, it displays an **Action Proposal Card**:
- Check the proposed amount, account, category, and date.
- Tap **Confirm & Add to Ledger** to commit the transaction.
- Tap **Cancel** if you made a typo or changed your mind.

---

## 4. Managing Debts & Receivables

FinanceFlow handles both money you owe to others (**Debt**) and money others owe to you (**Receivable**).

### Understanding the Difference:
- **Debt (Utang)**: You borrowed money. Your cash/bank balance increases initially, and you have a liability to pay back.
- **Receivable (Piutang)**: You lent money to a friend. Your cash/bank balance decreases initially, and the friend owes you money.

### Natural Chat Input & Direction Detection:
Casual Indonesian phrasing can easily be ambiguous when talking about loans. FinanceFlow uses syntax rules to detect who is lending to whom:

- `"aku pinjem budi 50k"` $\to$ **You borrowed from Budi (DEBT)**.
- `"budi pinjem aku 50k"` $\to$ **You are lending to Budi (RECEIVABLE)**.
- `"pinjemin budi 50k cash"` $\to$ **You are lending to Budi (RECEIVABLE)**.
- `"ditalangin budi 50k"` $\to$ **You borrowed from Budi (DEBT)**.
- `"budi nalangin aku 50k"` $\to$ **You borrowed from Budi (DEBT)**.

#### Direction Switch Banner
Whenever a debt or receivable proposal is generated, it includes a prominent banner:
> **🤝 YOU ARE LENDING TO Budi (Receivable)**  
> *Wrong direction? Tap here to switch to: 💳 YOU BORROWED FROM Budi (Debt)*

This gives you a 1-tap guarantee against misclassifications before confirming.

### Recording Repayments:
1. Go to the **Debts & Loans** tab.
2. Select any open debt or loan.
3. Tap **Record Payment**.
4. Enter the installment amount. Once the balance hits zero, the status automatically transitions to **Settled**.

---

## 5. Setting Up Recurring Rules & Bank Admin Fees

### Recurring Subscriptions & Income
1. Open the **Settings** or **Recurring Rules** modal.
2. Tap **+ Add Recurring Rule**.
3. Enter title (e.g. "IndiHome Fiber 100Mbps"), amount, account, and frequency (Monthly, Weekly, Bi-weekly, etc.).
4. Choose **Auto-Post**:
   - `ON`: The transaction automatically posts to your ledger on the scheduled day.
   - `OFF`: The app surfaces a notification reminder asking for your confirmation on the scheduled day.

### Automatic Bank Administration Fees
Banks often charge a monthly account maintenance fee (e.g. BCA charges 15,000 IDR on the 25th of every month):
1. Go to **Accounts** and tap **Edit** on your bank account.
2. Under **Monthly Admin Fee**, toggle `Enabled`.
3. Set amount: `15000`, day of month: `25`.
4. The ledger engine will automatically debit the fee every month without you needing to remember.

---

## 6. Scanning Receipts with Camera / OCR

1. In the **AI Assistant** tab, tap **Scan Receipt** (or the Camera icon).
2. Take a photo of your receipt or select an image from your photo gallery.
3. The on-device OCR engine runs directly inside your browser:
   - Enhances contrast and normalizes lighting.
   - Extracts merchant name, transaction date, subtotal, tax amount, and grand total.
4. **Duplicate Protection**: If you accidentally scan the same receipt twice, FinanceFlow checks the cryptographic fingerprint and alerts you that this receipt was already recorded.
5. Review the extracted fields in the proposal card and tap **Confirm**.

---

## 7. Understanding Your Analytics Dashboard & Reports

### Net Worth & Cash Flow
- **Total Net Worth**: Live aggregated balance across all your bank accounts, cash wallets, and e-wallets, converted into your base reporting currency.
- **Monthly Cash Flow**: Visual green (Income) vs. red (Expense) bar chart for the last 6 rolling months.
- **Savings Rate**: Calculates your net retention percentage:
  $$\text{Savings Rate} = \frac{\text{Monthly Net Cash Flow}}{\text{Monthly Income}} \times 100\%$$

### Budget Performance Widget
Monitors all categories with monthly spending limits:
- **Green ($<80\%$)**: You are comfortably within your budget.
- **Yellow ($80\%\text{--}99\%$)**: Warning: approaching your spending limit.
- **Red ($\ge 100\%$)**: Budget overrun! Displays exact overrun amount in IDR/USD.

### Month-End Burn Rate Projection
Calculates your daily spending velocity and predicts your projected end-of-month spend, helping you adjust your spending habits before the month ends.

### Exporting Reports (Excel & CSV)
1. Tap **Export Report** on the Dashboard.
2. **Excel Workbook**: Generates a clean 3-sheet `.xml` SpreadsheetML workbook:
   - Sheet 1: `Transactions` (date, account, category, amount, exchange rates, notes).
   - Sheet 2: `Accounts` (balances, currencies, fees).
   - Sheet 3: `Debts & Receivables` (counterparties, principal, remaining balance, status).
3. **CSV Export**: Standard CSV file for importing into external spreadsheets.

---

## 8. Google Drive Cloud Sync & Backups

FinanceFlow never uses a centralized database. Cloud sync connects directly to your own Google Drive storage.

### Connecting Google Drive:
1. In **Settings**, find the **Google Drive Cloud Sync** section.
2. Enter your Google OAuth Client ID *(Free to create in Google Cloud Console in 2 minutes)*.
3. Tap **Connect Google Drive** and authorize your account.
4. **Privacy Guarantee**: Sync files are saved into Google Drive's hidden `appDataFolder`. All sync payloads are **encrypted with your master PIN (AES-GCM-256)** before leaving your device. Google cannot read your ledger data!

### Automated Rolling Dual Backups:
- The app automatically creates an encrypted snapshot every day you open the app.
- **Rolling Retention Policy**:
  - Keeps the last **7 daily snapshots**.
  - Keeps the last **4 weekly snapshots** (Sunday archives).
  - Automatically deletes older files so your storage never fills up.

### Restoring Data on a New Device:
1. Install FinanceFlow on your new phone or computer.
2. In **Settings**, tap **Restore Backup File**.
3. Select your `.ffbackup` file and enter your 6-digit Master PIN.
4. Your complete ledger, accounts, categories, and audit history are instantly restored!

---

## 9. Configuring AI Providers & The Failover Chain

FinanceFlow allows you to use your personal AI API keys across multiple top-tier providers, with automatic rollover if one provider is down or out of quota.

### Setting Up API Keys:
1. Go to **Settings** $\to$ **AI Providers & API Key Manager**.
2. Tap the **API Keys** tab $\to$ **Add API Key**.
3. Select the provider (e.g. DeepSeek, OpenRouter, Gemini, Groq, Claude, OpenAI).
4. Enter a label (e.g. "Personal Account") and paste your API key.
5. Enter your **6-digit Master PIN**. Your key is encrypted immediately using AES-GCM-256 before being saved.

### Priority Rollover Chain:
Tap the **Priority Chain** tab to arrange your providers in order of preference:
- **Priority #1**: DeepSeek (low-cost primary)
- **Priority #2**: OpenRouter (Claude 3.5 Sonnet backup)
- **Priority #3**: Google Gemini (free tier fallback)
- **Automatic Fallback #1**: Local Ollama (if running on your PC)
- **Guaranteed Fallback #2**: Phase 7 Deterministic Offline Engine (Always ready!)

#### What Happens When You Send a Chat Message?
1. The app checks its **proactive health cache** and jumps straight to the top healthy provider.
2. If Provider #1 unexpectedly returns an HTTP `429` (Quota Exceeded) or `500` (Server Error), the app **automatically rolls over to Provider #2** without dropping your message.
3. If all internet providers fail, it smoothly drops to the **Phase 7 Offline Engine**.

#### Health Status Indicators:
- 🟢 **Green Dot**: Provider is healthy and responding.
- 🟡 **Amber Dot**: Provider is degraded or rate-limited.
- 🔴 **Red Dot**: Provider is unreachable (wrong key or offline).
- ⚪ **Gray Dot**: Not checked yet.

---

## 10. Connecting the Telegram Bot

FinanceFlow features a **Zero-Knowledge Telegram Ingestion Bridge** that lets you log transactions and receipt photos on the go directly from Telegram. All credentials are encrypted at rest on your device using your Master PIN (AES-GCM-256 with PBKDF2 600,000 rounds), and no mutations ever touch your ledger without your explicit review and confirmation.

You can configure and manage the entire integration under **Settings** $\to$ **Telegram Ingestion Bridge**.

---

### Step-by-Step Setup Guide

#### Step 1: Create your Bot via @BotFather
1. Open the Telegram app on your phone or computer.
2. Search for the official account **`@BotFather`** (verified with a blue checkmark) and send `/start`.
3. Send `/newbot` and follow the prompts:
   - Choose a display name (e.g. `My FinanceFlow Bot`).
   - Choose a unique username ending in `bot` (e.g. `dhika_financeflow_bot`).
4. @BotFather will reply with your **HTTP API Token** (e.g. `123456789:ABCdefGhIjklmNoPQRstuVWxyz`). Copy this token.

#### Step 2: Enter Token & Link Your Chat ID in FinanceFlow
1. In FinanceFlow, navigate to **Settings** $\to$ **Telegram Ingestion Bridge**.
2. Paste your token into the **Telegram Bot Token** field.
3. Click **Test Connection** — FinanceFlow queries Telegram's `getMe` endpoint and displays your bot's `@username` with a green checkmark.
4. Open your new bot in Telegram and tap **Start** or send any message (like `/start` or `hello`).
5. Back in FinanceFlow, click **Auto-Detect Chat ID**. The app listens to recent updates and automatically extracts your numeric Chat ID and name. *(If offline or auto-detection is unavailable, click "Or enter Chat ID manually" and type your numeric ID).*

#### Step 3: Choose Your Bridge Mode (Option A vs Option B)
FinanceFlow offers two connection modes depending on your setup:

| Feature | Option A — Cloudflare Worker Relay | Option B — Desktop Long-Polling Daemon |
| :--- | :--- | :--- |
| **Availability** | **24/7 Mobile Access** | **While Computer is Awake** |
| **Setup Effort** | 1-time Cloudflare Worker deployment | 1 terminal command (`npx tsx`) |
| **Open Ports / IP** | None required (uses Cloudflare URL) | Zero open ports / zero tunnels |
| **Best For** | Logging expenses all day from your phone | Desktop-only use or local server |

#### Step 4: Launch Your Chosen Mode

##### For Option A (Cloudflare Worker Relay):
1. Deploy [`worker/telegram-relay.ts`](file:///c:/Personal%20Finance/worker/telegram-relay.ts) to a free Cloudflare Worker account:
   ```bash
   npx wrangler deploy worker/telegram-relay.ts --name financeflow-relay
   ```
2. Enter your deployed Worker URL (e.g. `https://financeflow-relay.yourname.workers.dev`) in FinanceFlow and click **Verify Webhook**.
3. Point your Telegram Bot webhook to your Worker:
   ```bash
   curl -F "url=https://<your-worker>.workers.dev" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
   ```

##### For Option B (Desktop Long-Polling Daemon):
1. In FinanceFlow, select **Option B — Local Desktop Long-Polling**.
2. Click **Copy Command** and run it in your computer's terminal:
   ```bash
   npx tsx scripts/telegram-daemon.ts --chat-id YOUR_CHAT_ID
   ```
3. The daemon polls Telegram directly via `getUpdates` and persists incoming messages to `telegram_inbox_queue.json` for client-side ingestion.

#### Step 5: Save with Your Master Security PIN
1. Enter your **6-digit Master PIN** in the encryption field.
2. Click **Save Telegram Settings**.
3. Your bot token and optional webhook secret are encrypted immediately with AES-GCM-256 before being saved to IndexedDB.

---

### How to Send Transactions on the Go

Open your Telegram bot from anywhere and type your transaction naturally:

#### Bahasa Indonesia (Formal & Slang Supported):
- `"kopi kenangan 35k bca"` $\to$ Expense 35,000 IDR (Kategori: Makanan, Rekening: BCA)
- `"beli bensin gocap cash"` $\to$ Expense 50,000 IDR (Kategori: Transportasi, Rekening: Cash)
- `"makan siang padang ceban gopay"` $\to$ Expense 10,000 IDR (Kategori: Makanan, Rekening: GoPay)
- `"gaji bulanan 12.5jt bca"` $\to$ Income 12,500,000 IDR (Kategori: Gaji)

#### English:
- `"lunch 14.50 card"` $\to$ Expense 14.50 (Category: Food, Account: Card)
- `"uber to airport 45 cash"` $\to$ Expense 45 (Category: Transport, Account: Cash)
- `"grocery shopping 120 bca"` $\to$ Expense 120 (Category: Groceries, Account: BCA)

#### Receipt Photos:
- Simply take a clear photo of any store or restaurant paper receipt and send it to your bot!

---

### Reviewing & Confirming in the Telegram Inbox

1. In FinanceFlow, click **Open Telegram Inbox** in the Settings section or click the paper-plane icon with the pending badge in the top navigation bar.
2. The app uses its client-side OCR and AI engines to parse the text and receipt images into **Action Proposals**.
3. Inspect each item: review the amount, merchant, category, and payment account.
4. Click **Confirm** on individual items or **Confirm All Pending** to post them directly to your ledger!
5. To discard an invalid or accidental message, simply click **Dismiss**.

---

### Disconnecting & Managing Settings

- **Connection Status**: The status pill at the top displays **Connected** (green), **Token Active (Awaiting Chat ID)** (amber), or **Not Configured** (gray).
- **Change Bot Token**: Click **Change Token** to update your bot credentials.
- **Disconnect**: Click **Disconnect Telegram** to completely erase the stored encrypted token, Chat ID, and relay configuration from IndexedDB.

---

## 11. What to Expect When 100% Offline

When traveling or in airplane mode with no internet connection:

```
┌────────────────────────────────────────────────────────┐
│             WORKS 100% OFFLINE (NO INTERNET)           │
├────────────────────────────────────────────────────────┤
│  ✔  All transaction logging, editing, and deleting     │
│  ✔  Conversational chat entry using Indonesian slang   │
│     (pekgo, gocap, ceban, nobango, sejt, etc.)         │
│  ✔  Debt and loan tracking, repayments, directions     │
│  ✔  Offline transaction search & financial summaries   │
│  ✔  Analytics dashboard, cash flow, and budget widgets │
│  ✔  Exporting Excel workbooks and CSV files            │
│  ✔  Camera receipt OCR scanning (uses cached WASM)     │
│  ✔  PIN lock and biometric security                    │
│  ✔  Daily automated rolling backups to device storage  │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│           REQUIRES ACTIVE INTERNET CONNECTION          │
├────────────────────────────────────────────────────────┤
│  🌐  Syncing data with Google Drive                    │
│  🌐  Fetching fresh live European Central Bank FX rates │
│  🌐  Ingesting new messages from Telegram              │
│  🌐  Querying cloud AI endpoints (Claude, DeepSeek)    │
└────────────────────────────────────────────────────────┘
```

---

## 12. Frequently Asked Questions & Troubleshooting

### Q: Why does my AI provider show an Amber or Red dot in Settings?
- **Red dot**: Indicates an invalid API key, network timeout, or that your device is currently offline. When offline, cloud health checks are automatically skipped to save battery.
- **Amber dot**: Indicates a rate limit or that your account balance/quota on that provider has run out (HTTP 429). Check your billing dashboard on OpenRouter, DeepSeek, or OpenAI.

### Q: What should I do if a "Sync Conflict" notification appears?
If you edited the same transaction on your phone and your laptop while offline, FinanceFlow uses **Last-Write-Wins (LWW)** to select the newer version.
- Tap **Review Conflicts** in the navbar or Settings.
- You can inspect the superseded version and tap **Restore** if you prefer the other device's version.

### Q: What happens if I forget my 6-digit Master PIN?
Because FinanceFlow uses zero-knowledge encryption, your PIN is never sent to a server. If you forget your PIN:
- You can continue using the app if biometric unlock (Fingerprint/FaceID) is active.
- However, if the app locks and you cannot provide the PIN, encrypted backups and stored AI keys cannot be recovered. Always store your PIN in a password manager.

### Q: Why does key reveal state "Memory clearing is best-effort"?
When you tap the eye icon to view your API key, FinanceFlow decrypts it in your browser's memory for 10 seconds, then zeroes the variable. In modern JavaScript runtimes, memory cleanup is managed by the browser's garbage collector. While the key is removed from view and cleared, low-level memory zeroing cannot be guaranteed by JavaScript the way it can in languages like C or Rust.
