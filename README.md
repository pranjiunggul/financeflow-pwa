# FinanceFlow 🪙

> **Privacy-First, Offline-First, Zero-Knowledge Personal Finance PWA**  
> Built with modern web standards, authenticated end-to-end encryption, multi-currency ledger math, local deterministic intelligence, and an extensible multi-provider AI copilot.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bundle Size](https://img.shields.io/badge/Initial%20Load-259%20kB%20gzip-emerald)](ARCHITECTURE.md#performance--bundle-budget)
[![Test Suite](https://img.shields.io/badge/Test%20Suites-8%2F8%20Passing%20(100%25)-success)](tests/)
[![Security](https://img.shields.io/badge/Encryption-AES--GCM--256%20%2B%20PBKDF2-indigo)](ARCHITECTURE.md#encryption--security-architecture)

---

## Table of Contents

- [Overview & Philosophy](#overview--philosophy)
- [Comprehensive Feature Matrix](#comprehensive-feature-matrix)
- [Tech Stack](#tech-stack)
- [Quick Start & Installation](#quick-start--installation)
- [Project Documentation](#project-documentation)
- [Architecture & Performance Highlights](#architecture--performance-highlights)
- [License & Contributions](#license--contributions)

---

## Overview & Philosophy

**FinanceFlow** is a Progressive Web Application (PWA) designed for individuals, freelancers, and privacy-conscious users who want institutional-grade financial tracking without handing their banking data or ledger history to third-party cloud servers.

Traditional finance applications force users into a compromise: either accept full privacy invasion by syncing plain financial records to proprietary backends, or use clunky offline spreadsheets that lack automation, analytics, and intelligent copilot assistance. 

FinanceFlow eliminates this compromise through five foundational principles:

1. **Client-Side-Only & Zero-Knowledge**: No user ledger data, credentials, or API keys ever touch an unauthenticated central server. All data lives in your browser's IndexedDB, encrypted at rest using AES-GCM-256 with keys derived from your PIN via PBKDF2 (600,000 rounds).
2. **True Offline-First Architecture**: The application installs as a PWA, runs without an internet connection, and features a deterministic offline natural language intelligence engine that parses everyday transaction input and colloquial slang without needing an LLM.
3. **Double-Entry Ledger Integrity**: Every balance update, account transfer with bank fees, debt repayment, and recurring rule is tracked with atomic balance reconciliation, soft deletes, and full change audit trails.
4. **Zero-Write AI Safety Gate**: The unified AI copilot and receipt OCR engine utilize internal function calling to propose changes as visual diff cards—nothing is ever committed to your ledger without your explicit approval.
5. **Decoupled Cloud Sync & Extensible AI**: Sync seamlessly across devices using your own Google Drive `appDataFolder` (as authenticated ciphertext), and connect to any AI provider of your choice (DeepSeek, OpenRouter, Gemini, Groq, Claude, OpenAI, Mistral, Local Ollama, or self-hosted LM Studio/vLLM) with automatic priority failover and background health monitoring.

---

## Comprehensive Feature Matrix

### 1. Ledger Engine & Transactions
- **Atomic Balance Accounting**: High-precision balance maintenance across checking accounts, cash wallets, e-wallets, credit cards, and investments.
- **Account Transfers with Fees**: Single-action transfers that debit the source account, credit the destination account, and record optional transfer fees into dedicated fee categories without balance drift.
- **Soft Deletes & Trash Restore**: Non-destructive deletion with full balance recalculation on delete and reversal upon restore.
- **Category Reassignment Protection**: Deleting a category with active transactions prompts for an explicit replacement category before allowing removal.
- **Full Audit Trail**: Every insert, update, soft-delete, restore, and sync conflict resolution is permanently recorded in the `audit_logs` table with before-and-after snapshots.

### 2. Multi-Currency Ledger & Live FX Engine
- **Multi-Currency Accounts**: Hold accounts in IDR, USD, EUR, SGD, GBP, JPY, AUD, MYR, or any standard currency.
- **Per-Transaction Historical Snapshots**: Transactions freeze their `exchangeRateToBase` and `baseAmount` at the moment of recording, preserving historical accounting accuracy even as global market rates fluctuate.
- **Live Frankfurter API Sync**: Fetches real-time ECB rates on demand, caches rates in IndexedDB, and automatically computes reverse rates.
- **Offline Stale-Rate Fallback**: When offline, smoothly falls back to the most recent cached exchange rates with visual stale-rate indicators.

### 3. Debts & Receivables Tracker
- **Bi-Directional Lifecycle**: Track debts (money you owe to counterparties) and receivables (money others owe to you) through `open` $\to$ `partially_paid` $\to$ `settled` states.
- **Partial Repayments**: Record installments that automatically update the debtor's remaining balance and adjust your cash/bank balances.
- **Directionality Disambiguation**: Natural language parser accurately distinguishes borrowing ("aku pinjem budi") from lending ("budi pinjem aku", "pinjemin budi") with an explicit 1-tap direction switch banner on proposals.

### 4. Recurring Rules & Automated Bank Fees
- **Rule Engine**: Schedule recurring expenses, income, or transfers across Daily, Weekly, Bi-weekly, Monthly, or Yearly frequencies with customizable intervals.
- **Auto-Post vs. Reminder**: Configure rules to post automatically on their execution date or prompt the user for confirmation.
- **Bank Administration Fee Engine**: Define per-account monthly maintenance fees (e.g., 15,000 IDR every 25th of the month) that automatically post on due dates.

### 5. Analytics Dashboard & Multi-Format Export
- **Financial Analytics**: 6-month cash flow bar charts, expense category distribution donuts, and historical net worth progression.
- **Budget Performance & Overrun Alerts**: Real-time monthly category budget tracking with visual status indicators (Green $<80\%$, Yellow $80\text{--}99\%$, Red $\ge 100\%$).
- **Month-End Burn Rate Projection**: Predicts end-of-month spend based on current daily spending velocity.
- **3-Sheet Excel Workbook Export**: Clean, standalone XML SpreadsheetML workbook containing separate sheets for `Transactions`, `Accounts`, and `Debts & Receivables`.
- **CSV Data Portability**: Standard CSV exports and imports for accounting software compatibility.

### 6. Security, Encryption & Privacy
- **Web Crypto AES-GCM-256**: Authenticated encryption for all remote sync payloads, local backups, and stored AI API keys.
- **PBKDF2 Key Derivation**: 600,000 SHA-256 rounds with unique 16-byte random salts.
- **App Lock & Inactivity Timer**: PIN-based lock screen with optional WebAuthn biometric unlock (FaceID / Fingerprint) and configurable auto-lock timeouts.
- **Zero-Knowledge API Key Storage**: Hard PIN prerequisite before any key can be saved; keys are stored encrypted at rest, masked in the UI (`sk-...4f8b`), with best-effort in-memory clearing upon revelation.

### 7. Google Drive Sync & Rolling Dual Backup Engine
- **Zero-SDK REST v3 Sync**: Communicates directly with Google Drive API v3 via standard multipart requests without bloated third-party SDKs.
- **Hidden AppData Folder**: Stores sync files in Google Drive's sandboxed `appDataFolder` where they cannot be accidentally moved or deleted.
- **Last-Write-Wins (LWW) Conflict Engine**: Resolves simultaneous edits across devices while recording superseded versions in the local audit log.
- **Rolling Dual Backup Policy**: Automatically retains 7 daily backups and 4 weekly backups (Sunday snapshots) in local OPFS / IndexedDB, with manual export/import of `.ffbackup` files.

### 8. Unified AI Copilot & Internal Tool Calling
- **Single Natural Language Interface**: Chat interface capable of recording transactions, editing/deleting records, searching transaction history, answering budget questions, and evaluating financial health.
- **Internal Tool Calling Schema**: Powered by structured tools (`searchTransactions`, `createTransactionProposal`, `editTransactionProposal`, `deleteTransactionProposal`, `getFinancialSummary`, `getBudgetStatus`, `getAccountsAndBalances`, `getDebtsOverview`).
- **Zero-Write Safety Gate**: AI mutating actions generate visual `ActionProposalCard` diff cards displaying before-and-after states; data is never written to disk without explicit user approval.
- **Serving Badges & Rollover Traces**: Every assistant response displays the exact serving provider/model (e.g., `⚡ via DeepSeek (deepseek-chat)`) and highlights any failover events.

### 9. Lazy OCR Receipt Scanner
- **Dynamic Code-Splitting**: Tesseract.js is isolated in an on-demand bundle chunk (6.83 kB gzip) and is only downloaded when the user opens the camera or uploads a receipt.
- **HTML5 Canvas Preprocessing**: Client-side grayscale conversion, high-contrast thresholding, and luminance normalization for receipt text extraction.
- **SHA-256 Duplicate Receipt Fingerprinting**: Computes cryptographic hashes of scanned receipts to prevent duplicate expense claims.

### 10. Zero-Knowledge Telegram Ingestion Bridge
- **Option A (Cloudflare Worker Relay)**: Stateless serverless relay ([`worker/telegram-relay.ts`](file:///c:/Personal%20Finance/worker/telegram-relay.ts)) verifying webhook signatures and queueing raw encrypted payloads to Google Drive without holding user API keys or running OCR server-side.
- **Option B (Desktop Long-Polling Daemon)**: Local Node.js daemon ([`scripts/telegram-daemon.ts`](file:///c:/Personal%20Finance/scripts/telegram-daemon.ts)) pulling updates directly to local IndexedDB with zero public endpoints or tunnels required.
- **Review Tray & Batch Ingestion**: [`TelegramInboxModal.tsx`](file:///c:/Personal%20Finance/src/components/telegram/TelegramInboxModal.tsx) allows users to review inbound text and photos, execute client-side AI/OCR parsing, and commit items individually or in batches.

### 11. Major Offline Intelligence Engine (Phase 7)
- **100% Deterministic Local Logic**: Fully functional transaction parsing, keyword search, report generation, and financial advice with no internet connection, no API keys, and no local LLMs.
- **Indonesian Slang Numbers**: Full vocabulary of Hokkien/regional monetary terms (`seceng`, `goceng`, `ceban`, `noban`, `nobango`, `gocap`, `cepek`, `cepek ceng`, `pekgo`, `gopek ceng`, `sejt`, `sejuta`).
- **1,500+ Chat Abbreviations**: Normalizes Indonesian texting shorthand (`byr`, `bl`, `trf`, `bwt`, `kmrn`, `blm`, `udh`, `smpe`, `pke`, `ongkir`, etc.).
- **500+ Financial Taxonomy Terms**: Automatic entity and category classification across 20+ Indonesian financial institutions (BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana) and 13 spending categories.

### 12. AI Provider Management & Automatic Failover (Phase 8)
- **Multi-Provider Configuration**: Pre-seeded presets for **DeepSeek**, **OpenRouter**, **Google Gemini**, **Groq**, **Anthropic (Claude)**, **OpenAI**, **Mistral AI**, and **Local Ollama**.
- **Generic Custom Provider**: Connect to any OpenAI-compatible endpoint (LM Studio, vLLM, LocalAI) with custom base URLs, auth header formats, and endpoints.
- **Live Model Synchronization**: Automatically queries live `/models` endpoints upon entering an API key, populating searchable dropdowns with a 1-click "Refresh Models" trigger.
- **Proactive Background Health Checking**: Background scheduler verifies provider and key availability using lightweight model-listing pings, pausing when the tab is hidden and skipping cloud checks entirely when offline (`navigator.onLine === false`).
- **Fast-Path Selection & 429 Safety Net**: Directly invokes the highest-priority healthy tier, automatically rolling down the priority chain on rate limits or outages without dropping requests.
- **Persistent Failure Alerting**: Triggers persistent warning banners in Settings and Dashboard when a provider fails $\ge 3$ consecutive times.
- **Guaranteed 3-Tier Fallback Order**: User Cloud Priority Chain $\to$ Local Ollama $\to$ Phase 7 Offline Deterministic Engine.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework & UI** | [React 19](https://react.dev/) + [TypeScript 5.7](https://www.typescriptlang.org/) | Type-safe reactive component tree |
| **Build & Dev Server** | [Vite 6](https://vitejs.dev/) | Sub-second HMR and Rollup production bundling |
| **Styling & Icons** | [Tailwind CSS 3.4](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/) | Responsive dark-mode styling and UI iconography |
| **Local Database** | [Dexie.js 4.0](https://dexie.org/) (IndexedDB wrapper) | Client-side persistent reactive relational database |
| **Cryptography** | Web Crypto API (`window.crypto.subtle`) | Native AES-GCM-256 and PBKDF2 (600,000 iterations) |
| **PWA & Offline** | [vite-plugin-pwa 0.21](https://vite-pwa-org.netlify.app/) + Workbox | Service Worker, web manifest, offline asset caching |
| **Data Visualizations** | [Chart.js 4.6](https://www.chartjs.org/) + [react-chartjs-2](https://react-chartjs-2.js.org/) | Canvas charts (Cash flow bars, Net worth, Category donuts) |
| **On-Demand OCR** | [Tesseract.js 7.0](https://tesseract.projectnaptha.com/) | Isolated lazy-loaded optical character recognition |
| **Cloud Sync** | Google Drive REST API v3 (Multipart) | Zero-SDK encrypted appDataFolder replication |
| **Test Engine** | [tsx](https://github.com/privatenumber/tsx) + [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) | In-memory integration testing across all 8 phases |

---

## Quick Start & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher
- [npm](https://www.npmjs.com/) v9.0.0 or higher

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/financeflow.git
cd financeflow
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Run Automated Test Suite
FinanceFlow includes automated integration tests covering all 8 phases:
```bash
npm test
```
*(On Windows PowerShell, if script execution policy is restricted, use `powershell -ExecutionPolicy Bypass -Command "npm test"`).*

### 5. Production Build
Type-checks TypeScript and compiles production assets:
```bash
npm run build
```

### 6. Preview Production PWA
```bash
npm run preview
```

---

## Project Documentation

Detailed architecture, deployment topology, and end-user usage guides are available in the repository root:

- 📐 [**ARCHITECTURE.md**](ARCHITECTURE.md) — Comprehensive system architecture, Dexie schema v4, encryption engine, conflict resolution, offline intelligence pipeline, and chunk size metrics.
- 🌐 [**TOPOLOGY.md**](TOPOLOGY.md) — Network topology diagrams, execution boundaries, data flow matrices, and online vs. offline capability breakdowns.
- 📖 [**TUTORIAL.md**](TUTORIAL.md) — Step-by-step user guide written for non-developers, covering account setup, conversational transaction entry, receipt scanning, Google Drive sync, AI failover configuration, and FAQ.

---

## Architecture & Performance Highlights

### Performance & Bundle Budget

FinanceFlow enforces an initial page load budget of **$< 300\text{ kB}$ gzip**:

| Bundle Chunk | Raw Size | Gzip Size | Loading Trigger |
|---|---|---|---|
| `dist/index.html` | 1.56 kB | 0.74 kB | Initial page load |
| `assets/index-*.css` | 44.13 kB | 7.76 kB | Initial page load |
| `assets/vendor-react-*.js` | 4.21 kB | 1.58 kB | Initial page load |
| `assets/vendor-db-*.js` | 106.37 kB | 35.90 kB | Initial page load |
| `assets/vendor-charts-*.js` | 187.61 kB | 65.56 kB | Initial page load |
| `assets/index-*.js` (Main App) | 558.17 kB | 147.57 kB | Initial page load |
| **Total Initial Load** | **902.05 kB** | **259.11 kB** | **Budget: < 300 kB (40.89 kB Headroom)** |
| `assets/engine-*.js` | 29.25 kB | 10.24 kB | **On-Demand**: Only loaded if offline engine runs |
| `assets/index-*.js` (OCR) | 15.83 kB | 6.83 kB | **On-Demand**: Only loaded if receipt camera opens |

---

## License & Contributions

FinanceFlow is open-source software licensed under the [MIT License](LICENSE).

Contributions, bug reports, and pull requests are welcome. For major architectural enhancements, please review [ARCHITECTURE.md](ARCHITECTURE.md) and open an issue for discussion first.
