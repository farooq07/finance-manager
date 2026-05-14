# FSWealth Axis — Project Documentation
_Last updated: 2026-05-14_

## Overview

FSWealth Axis is a personal finance management platform that tracks bank accounts, digital wallets, expenses, stock and mutual fund investments, dues/receivables, rent income, physical assets, and zakat, with an AI-powered chat assistant that answers natural-language questions about the user's financial data. The stack is Node.js / Express with Prisma ORM on a Supabase PostgreSQL database (pgvector enabled) for the backend, and React + Vite + TailwindCSS with TanStack Query for the frontend.

---

## Backend

### API Endpoints

All protected routes require a valid JWT bearer token (`Authorization: Bearer <token>`). ✅ = auth required, ❌ = public.

---

#### `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/config` | ❌ | Returns whether public registration is enabled. |
| POST | `/api/auth/register` | ❌ | Creates a new user account and returns a JWT. |
| POST | `/api/auth/login` | ❌ | Validates credentials and sends a 6-digit OTP to the user's email. |
| POST | `/api/auth/verify-otp` | ❌ | Verifies the OTP and returns the JWT token on success. |
| GET | `/api/auth/me` | ✅ | Returns the authenticated user's profile. |
| PUT | `/api/auth/pin` | ✅ | Sets or updates the user's app PIN. |
| PUT | `/api/auth/pin/change` | ✅ | Changes the app PIN after verifying the current one. |
| POST | `/api/auth/verify-pin` | ✅ | Verifies the user's PIN; used by the frontend PIN gate. |
| POST | `/api/auth/forgot-password` | ❌ | Sends a password-reset OTP to the provided email. |
| POST | `/api/auth/reset-password` | ❌ | Resets password using a valid OTP. |
| PUT | `/api/auth/first-password` | ✅ | Forces a password change for accounts flagged `must_change_password`. |

---

#### `/api/banks`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/banks` | ✅ | Creates a new bank account for the logged-in user. |
| GET | `/api/banks` | ✅ | Returns all bank accounts for the logged-in user. |
| GET | `/api/banks/:id` | ✅ | Returns a single bank account with its statements. |
| PUT | `/api/banks/:id` | ✅ | Updates bank account details (name, IBAN, currency, exchange rate). |
| PUT | `/api/banks/:id/balance` | ✅ | Manually updates the current balance of a bank account. |
| DELETE | `/api/banks/:id` | ✅ | Deletes a bank account and all associated data. |
| POST | `/api/banks/:bankId/statements/upload` | ✅ | Uploads a PDF or CSV bank statement; parses transactions, detects duplicates, and auto-categorises. |
| GET | `/api/banks/:bankId/transactions` | ✅ | Returns all transactions across all statements for a bank. |
| GET | `/api/banks/:bankId/category-summary` | ✅ | Returns a category-wise spending breakdown for approved transactions. |
| GET | `/api/banks/:bankId/statements/:statementId/transactions` | ✅ | Returns all transactions for a specific statement. |
| POST | `/api/banks/:bankId/statements/:statementId/transactions/:txId/approve` | ✅ | Approves a transaction and converts debit entries into Expense records. |
| PUT | `/api/banks/:bankId/statements/:statementId/transactions/:txId` | ✅ | Updates the category, notes, amount, or type of a transaction. |
| DELETE | `/api/banks/:bankId/statements/:statementId/transactions/:txId` | ✅ | Deletes a transaction and its linked expense if any. |
| POST | `/api/banks/:bankId/bulk-approve` | ✅ | Bulk-approves a list of pending transactions. |
| POST | `/api/banks/:bankId/statements/:statementId/sync` | ✅ | Re-parses the stored statement file and syncs the closing balance to the bank. |
| DELETE | `/api/banks/:bankId/statements/:statementId` | ✅ | Deletes a statement and all of its transactions and linked expenses. |

---

#### `/api/wallets`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/wallets` | ✅ | Returns all wallets (EasyPaisa, JazzCash, NayaPay, etc.) for the user. |
| POST | `/api/wallets` | ✅ | Creates a new digital wallet. |
| PUT | `/api/wallets/:id` | ✅ | Updates the balance of a wallet. |
| DELETE | `/api/wallets/:id` | ✅ | Deletes a wallet and its statements. |
| POST | `/api/wallets/:walletId/statements/upload` | ✅ | Uploads a PDF or CSV wallet statement; parses, deduplicates, and categorises transactions. |
| GET | `/api/wallets/:walletId/transactions` | ✅ | Returns all transactions across all statements for a wallet. |
| GET | `/api/wallets/:walletId/statements/:statementId/transactions` | ✅ | Returns transactions for a specific wallet statement. |
| POST | `/api/wallets/:walletId/statements/:statementId/transactions/:txId/approve` | ✅ | Approves a wallet transaction and creates an Expense record. |
| PUT | `/api/wallets/:walletId/statements/:statementId/transactions/:txId` | ✅ | Updates category or notes on a wallet transaction. |
| DELETE | `/api/wallets/:walletId/statements/:statementId/transactions/:txId` | ✅ | Deletes a wallet transaction and its linked expense. |
| POST | `/api/wallets/:walletId/bulk-approve` | ✅ | Bulk-approves pending wallet transactions. |
| POST | `/api/wallets/:walletId/statements/:statementId/sync` | ✅ | Re-parses the wallet statement file and syncs the closing balance. |
| DELETE | `/api/wallets/:walletId/statements/:statementId` | ✅ | Deletes a wallet statement and all linked data. |

---

#### `/api/chat`

Rate-limited to 30 messages per hour per user on the `message` endpoint.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/chat/sessions` | ✅ | Creates a new AI chat session. |
| GET | `/api/chat/sessions` | ✅ | Lists all chat sessions for the user, ordered by last update. |
| GET | `/api/chat/sessions/:id` | ✅ | Returns a session with its full message history. |
| DELETE | `/api/chat/sessions/:id` | ✅ | Deletes a chat session and all its messages. |
| POST | `/api/chat/sessions/:id/message` | ✅ | Sends a message to the AI assistant; triggers tool calls and returns the response. |
| GET | `/api/chat/documents` | ✅ | Lists all uploaded RAG documents for the user. |
| POST | `/api/chat/documents/upload` | ✅ | Uploads a document (PDF, TXT, MD, CSV) for RAG indexing. |
| DELETE | `/api/chat/documents/:docId` | ✅ | Deletes a RAG document and all its stored chunks. |

---

#### `/api/expenses`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/expenses` | ✅ | Returns all manual expenses for the logged-in user. |
| POST | `/api/expenses` | ✅ | Creates a single expense entry. |
| POST | `/api/expenses/batch` | ✅ | Bulk-creates multiple expense entries in one request. |
| PUT | `/api/expenses/:id` | ✅ | Updates an existing expense. |
| DELETE | `/api/expenses/:id` | ✅ | Deletes an expense. |

---

#### `/api/dashboard`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard/summary` | ✅ | Returns aggregated net-worth metrics, investment values, dues, monthly expense chart data, and asset allocation data. |
| POST | `/api/dashboard/send-summary` | ✅ | Triggers an on-demand financial summary email to the logged-in user. |

---

#### `/api/mutual-funds`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/mutual-funds` | ✅ | Returns all mutual fund holdings for the user. |
| POST | `/api/mutual-funds` | ✅ | Creates a manual mutual fund entry. |
| POST | `/api/mutual-funds/upload` | ✅ | Uploads a portfolio CSV to bulk-import fund data. |
| POST | `/api/mutual-funds/sync-data` | ✅ | Syncs portfolio data from a parsed CSV payload. |
| GET | `/api/mutual-funds/snapshots` | ✅ | Returns historical portfolio snapshots. |
| DELETE | `/api/mutual-funds/snapshots/:id` | ✅ | Deletes a portfolio snapshot. |
| DELETE | `/api/mutual-funds/snapshots/:id/funds/:symbol` | ✅ | Removes a single fund symbol from a snapshot. |
| POST | `/api/mutual-funds/snapshots/bulk-delete` | ✅ | Bulk-deletes portfolio snapshots. |
| POST | `/api/mutual-funds/bulk-delete` | ✅ | Bulk-deletes multiple fund records. |
| DELETE | `/api/mutual-funds/:id` | ✅ | Deletes a single fund record. |

---

#### `/api/stocks`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/stocks` | ✅ | Returns the user's stock holdings. |
| POST | `/api/stocks` | ✅ | Creates a new stock holding. |
| PUT | `/api/stocks/:id` | ✅ | Updates the current market price for a stock. |
| POST | `/api/stocks/:id/transactions` | ✅ | Adds a buy transaction to a stock holding. |
| DELETE | `/api/stocks/:id` | ✅ | Deletes a stock holding and its transactions. |
| GET | `/api/stocks/psx` | ✅ | Returns the latest scraped PSX market data for all tracked tickers. |
| POST | `/api/stocks/psx/sync` | ✅ (admin) | Triggers a live scrape of PSX prices for all tracked tickers. |
| POST | `/api/stocks/news/sync` | ✅ | Scrapes and stores TradingView news for a given ticker. |
| GET | `/api/stocks/:ticker/news` | ✅ | Returns stored news articles for a ticker. |

---

#### `/api/psx`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/psx/investments` | ✅ | Returns all broker bank investment deposit/withdrawal records. |
| POST | `/api/psx/investments` | ✅ | Records a deposit or withdrawal into the brokerage account. |
| DELETE | `/api/psx/investments/:id` | ✅ | Deletes a bank investment record. |
| GET | `/api/psx/snapshots` | ✅ | Returns all PSX portfolio snapshots for the user. |
| POST | `/api/psx/snapshots` | ✅ | Creates a new PSX portfolio snapshot from uploaded CSV data. |
| POST | `/api/psx/sync-data` | ✅ | Syncs PSX holdings from a parsed HTML/CSV paste. |
| PUT | `/api/psx/snapshots/:id/summary` | ✅ | Updates the daily summary stats (trading cash, working capital) on a snapshot. |
| DELETE | `/api/psx/snapshots/:id` | ✅ | Deletes a PSX snapshot. |
| DELETE | `/api/psx/snapshots/:id/symbols/:symbol` | ✅ | Removes a single symbol from a snapshot. |

---

#### `/api/dues`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dues` | ✅ | Returns all people with their full dues ledger (net balances). |
| POST | `/api/dues` | ✅ | Creates a new person in the dues ledger. |
| GET | `/api/dues/:id` | ✅ | Returns a single person with their transaction history. |
| PUT | `/api/dues/:id` | ✅ | Updates a person's name or contact details. |
| DELETE | `/api/dues/:id` | ✅ | Deletes a person and all their transactions. |
| POST | `/api/dues/:id/transactions` | ✅ | Records a payable or receivable transaction for a person. |
| POST | `/api/dues/:id/upload-csv` | ✅ | Bulk-imports dues transactions from a CSV file. |
| POST | `/api/dues/:id/reminder` | ✅ | Sends a dues reminder email to the person. |
| DELETE | `/api/dues/transactions/delete` | ✅ | Bulk-deletes selected due transactions. |
| POST | `/api/dues/transactions/bulk-type` | ✅ | Bulk-updates the type (payable/receivable) of selected transactions. |
| PUT | `/api/dues/transactions/:txId` | ✅ | Updates a single due transaction. |

---

#### `/api/beneficiaries`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/beneficiaries` | ✅ | Returns all beneficiaries with their linked accounts and transaction totals. |
| POST | `/api/beneficiaries` | ✅ | Creates a new beneficiary. |
| GET | `/api/beneficiaries/:id` | ✅ | Returns a single beneficiary with full transaction history. |
| PUT | `/api/beneficiaries/:id` | ✅ | Updates beneficiary details. |
| DELETE | `/api/beneficiaries/:id` | ✅ | Deletes a beneficiary and all linked data. |
| POST | `/api/beneficiaries/:id/accounts` | ✅ | Adds a bank/wallet account number to a beneficiary. |
| DELETE | `/api/beneficiaries/:id/accounts/:accountId` | ✅ | Removes an account from a beneficiary. |
| POST | `/api/beneficiaries/:id/rescan` | ✅ | Re-scans approved transactions to auto-link matching ones to this beneficiary. |

---

#### `/api/rents`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/rents` | ✅ | Returns all rent income entries for the user. |
| POST | `/api/rents` | ✅ | Records a new rent payment received. |
| PUT | `/api/rents/:id` | ✅ | Updates a rent entry. |
| DELETE | `/api/rents/:id` | ✅ | Deletes a rent entry. |

---

#### `/api/zakat`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/zakat` | ✅ | Returns all zakat payment records for the user. |
| POST | `/api/zakat` | ✅ | Records a new zakat payment. |
| DELETE | `/api/zakat/:id` | ✅ | Deletes a zakat record. |

---

#### `/api/assets`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/assets` | ✅ | Returns all physical assets and total value for the user. |
| POST | `/api/assets` | ✅ | Creates a new physical asset entry. |
| DELETE | `/api/assets/:id` | ✅ | Deletes an asset. |

---

#### `/api/dividends`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dividends` | ✅ | Returns all dividend records for the user. |
| POST | `/api/dividends/sync` | ✅ | Bulk-upserts dividend records from a parsed CDC statement payload. |
| DELETE | `/api/dividends/:id` | ✅ | Deletes a dividend record. |

---

#### `/api/institutions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/institutions` | ✅ | Returns all institutions saved by the user. |
| POST | `/api/institutions` | ✅ | Creates a new institution entry. |
| POST | `/api/institutions/seed` | ✅ | Seeds a default set of common Pakistani banks and wallets. |
| DELETE | `/api/institutions/:id` | ✅ | Deletes an institution. |

---

#### `/api/broker-accounts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/broker-accounts` | ✅ | Returns all broker accounts for the user. |
| POST | `/api/broker-accounts` | ✅ | Creates a new broker account entry. |
| DELETE | `/api/broker-accounts/:id` | ✅ | Deletes a broker account. |

---

#### `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | ✅ | Returns all users in the system (admin use). |
| GET | `/api/users/:id` | ✅ | Returns a single user by ID. |
| POST | `/api/users` | ✅ | Creates a new user (admin provisioning). |
| PUT | `/api/users/:id/role` | ✅ | Updates a user's role. |
| PUT | `/api/users/:id/password` | ✅ (super.admin) | Resets a user's password. |
| DELETE | `/api/users/:id` | ✅ | Deletes a user. |

---

### Services

**`ragEngine.service.js`** — The central AI chat engine. Supports Google Gemini, Groq (Llama), and OpenAI providers; reads `AI_CHAT_PROVIDER` from `.env` and auto-detects a fallback. For each user message it retrieves the last 20 conversation messages, performs a RAG document search for context, builds a system prompt, calls the selected provider, executes any tool the model requests, sends the tool result back for a natural-language answer, and persists both messages. Key export: `chat(userId, sessionId, userMessage)`.

**`financialTools.js`** — Defines the 13 callable tool schemas (`TOOL_DEFINITIONS` / `GROQ_TOOL_DEFINITIONS`) and implements `executeTool(toolName, args, userId)`. Tools cover: `getExpenseSummary`, `getTransactionList`, `getWalletTransactions`, `getIncomeVsExpense`, `getBeneficiaryStats`, `getTopMerchants`, `getMonthlyExpenses`, `getCashFlow`, `getAssetSummary`, `getMutualFundPerformance`, `getStockPortfolio`, `getDuesList`, `getWalletSummary`.

**`documentProcessor.service.js`** — Handles RAG document ingestion and retrieval using `gemini-embedding-001` (3072-dim vectors stored via pgvector). Splits uploaded text into 500-word overlapping chunks, embeds each chunk, and stores them in the `document_chunks` table. Returns the top-K most relevant chunks for a query via cosine similarity. Key exports: `processDocument`, `searchChunks`, `deleteDocument`, `listDocuments`.

**`aiCategorizer.service.js`** — Sends batches of unique transaction descriptions to Gemini or Groq for classification into 18 predefined expense categories. Also provides a DB-backed result cache (`getCachedCategories`, `saveToCache`) to avoid redundant AI calls. Key exports: `aiCategorizeBatch`, `getCachedCategories`, `saveToCache`.

**`categorizer.service.js`** — Four-layer categorisation pipeline for incoming transactions: (1) user-learned keyword patterns, (2) DB category cache, (3) Fuse.js fuzzy keyword matching against a built-in corpus, (4) AI batch call via `aiCategorizer`. Records user approvals as new patterns to improve future accuracy. Key exports: `categorizeTransaction`, `categorizeTransactionBatch`, `recordUserCategory`, `getCategoryOptions`.

**`transactionParser.service.js`** — Parses raw PDF text extracted from Pakistani bank statements into structured transaction objects. Uses a date-marker block strategy and supports formats from Standard Chartered, Habib Metropolitan, NayaPay, and generic DD/MM/YYYY layouts. Also extracts opening/closing balances and can reconcile transactions against them. Key exports: `parseTransactions`, `parseStatementBalances`, `validateBalance`.

**`documentProcessor.service.js`** — (see above under RAG).

**`pdfParser.service.js`** — Extracts text from PDF files using `pdfreader` (positional table reconstruction) with a fallback to `pdf-parse`; supports password-protected PDFs. Also computes SHA-256 file hashes for duplicate-file detection. Key exports: `extractPdfText`, `getFileHash`.

**`duplicateDetector.service.js`** — Detects duplicate transactions on import by comparing description fuzzy-similarity (>85%), exact amount, and date proximity (within 5 days). Provides separate methods for bank and wallet transactions and checks whether a file hash was already imported. Key exports: `findDuplicates`, `findWalletDuplicates`, `isFilePreviouslyImported`, `isWalletFilePreviouslyImported`.

**`scraper.service.js`** — Uses Playwright (headless Chromium) to scrape live stock prices and statistics from the PSX website and to scrape TradingView news articles for a given PSX ticker. Key exports: `scrapePSX`, `scrapeTradingViewNews`.

**`csvParser.service.js`** — Parses CSV bank/wallet statements into the same transaction shape as the PDF parser, normalising date and amount columns. Key export: `parseCsvTransactions`.

**`cron.service.js`** — Registers a weekly cron job (Sunday 09:00) that fetches dashboard data for every user and dispatches a financial summary email via the configured email utility. Key export: `initCronJobs`.

---

### Database Models

#### User

| Field | Type | Notes |
|-------|------|-------|
| email | String (unique) | Login identifier |
| name | String | Display name |
| password_hash | String | bcrypt hash |
| role | String | `user` / `admin` / `super.admin` |
| app_pin_code | String? | bcrypt-hashed PIN for app lock |
| otp_code / otp_expires_at | String? / DateTime? | OTP fields for login and password reset |
| must_change_password | Boolean | Forces password change on first login |

Relations: owns Expenses, MutualFunds, Stocks, Banks, Wallets, DuesTransactions, RentEntries, Assets, Zakat, Beneficiaries, ChatSessions, ChatDocuments, and more.

---

#### Bank

| Field | Type | Notes |
|-------|------|-------|
| name | String | Friendly name |
| account_no / iban_no | String | Account identifiers |
| currency / exchange_rate | String / Decimal | Multi-currency support |
| starting_balance / current_balance | Decimal | Current balance auto-synced from statements |

Relations: has many `BankStatement`.

---

#### BankStatement

| Field | Type | Notes |
|-------|------|-------|
| month / year | String / Int | Period of the statement |
| file_hash | String? | SHA-256 for duplicate file detection |
| opening_balance / closing_balance | Decimal? | Extracted from the file |
| processing_status | String | `pending` / `reviewed` / `approved` / `reconciled` |

Relations: has many `BankTransactionLog`.

---

#### BankTransactionLog

| Field | Type | Notes |
|-------|------|-------|
| transaction_date | Date | Parsed from statement |
| description | Text | Raw transaction description |
| debit_amount / credit_amount / net_amount | Decimal? / Decimal | Signed amount; negative = debit |
| suggested_category / category_confidence | String? / Decimal? | AI-suggested category and confidence score |
| is_duplicate / duplicate_of_id | Boolean / String? | Duplicate detection flag |
| user_approved / approved_category | Boolean / String? | User review state |
| created_expense_id | String? | Links to the auto-created Expense record |
| processing_status | String | `pending` / `approved` / `rejected` |

---

#### Wallet / WalletStatement / WalletTransactionLog

Mirror structure of Bank / BankStatement / BankTransactionLog respectively. Wallet adds `institution`, `color_theme`, and `account_num` fields.

---

#### Expense

| Field | Type | Notes |
|-------|------|-------|
| amount | Decimal | PKR amount |
| category | String | One of 18 predefined categories |
| expense_date | Date | — |
| payment_method | String? | e.g. `Bank Transfer`, `Wallet`, `Cash` |
| notes | String? | — |

---

#### MutualFund

| Field | Type | Notes |
|-------|------|-------|
| fund_name / fund_symbol | String | Fund identifier |
| units / current_nav / current_value | Decimal | Live position data |
| invested_amount | Decimal | Total cost basis |
| gain_loss_fytd / gain_loss_since_inception | Decimal? | P&L figures |
| status | String | `active` / `inactive` |

Relations: has many `MutualFundHistory` (NAV snapshots over time).

---

#### Stock / StockTransaction

**Stock**: `stock_symbol`, `company_name`, `current_market_price`. Has many `StockTransaction`.

**StockTransaction**: `buy_date`, `buy_price`, `quantity`, `brokerage_fee`.

---

#### PsxSnapshot

| Field | Type | Notes |
|-------|------|-------|
| snapshot_date | Date (unique per user) | One snapshot per day |
| total_custody / total_invested | Decimal | Portfolio totals |
| holdings_data | Json | Array of `{ symbol, holding, market_rate, custody_val, cost_per_unit }` |
| summary_data | Json? | Optional: `{ trading_cash, working_capital, total_worth, margin_pct }` |

---

#### Person / DuesTransaction

**Person**: `name`, `email`. Belongs to a User; has many `DuesTransaction`.

**DuesTransaction**: `transaction_type` (`receivable` / `payable`), `amount`, `transaction_date`, `description`.

---

#### Beneficiary / BeneficiaryAccount / BeneficiaryTransaction

**Beneficiary**: `name`, `nickname`, `phone`, `notes`. Has many accounts and transactions.

**BeneficiaryAccount**: `account_label`, `account_no` — stores IBAN/phone numbers used for auto-linking.

**BeneficiaryTransaction**: linked to `bank_transaction_id` or `wallet_transaction_id`; stores `amount`, `direction`, `transaction_date`.

---

#### ChatSession / ChatMessage / ChatDocument / DocumentChunk

**ChatSession**: `title` (auto-set from first message), belongs to User.

**ChatMessage**: `role` (`user` / `assistant` / `tool`), `content`, `tool_name`, `tool_data` (JSON).

**ChatDocument**: `filename`, `mime_type`, `char_count`. Has many `DocumentChunk`.

**DocumentChunk**: `content`, `embedding` (vector(3072)), `chunk_index`.

---

#### CategoryPattern / CategoryCache

**CategoryPattern**: stores user-learned keyword → category mappings with `confidence` and `occurrences` counters.

**CategoryCache**: stores AI/fuzzy categorisation results per description so the AI is not called again for known descriptions.

---

#### Other Models

| Model | Key Fields |
|-------|-----------|
| RentEntry | `month`, `year`, `payer_name`, `amount`, `payment_date`, `account_source` |
| Asset | `name`, `type`, `value`, `purchase_date` |
| Zakat | `amount`, `description`, `date` |
| Dividend | `security_symbol`, `gross_dividend_amount`, `net_dividend_amount`, `payment_date`, `status` |
| BrokerAccount | `account_title`, `client_code`, `participant_acc_no`, `cdc_sub_acc_no` |
| Institution | `name`, `type` (`bank`/`wallet`/`cash`), `color` |
| PsxStock | `ticker`, `price`, `change`, `changePct`, `volume`, `high`, `low`, `marketCap` |
| StockNews | `ticker`, `title`, `link`, `source`, `publishedAt` |
| BankInvestment | `transaction_date`, `amount` (positive = deposit, negative = withdrawal) |
| PortfolioSnapshot | `total_value`, `total_gain`, `total_invested`, `funds_data` (JSON) |

---

## Frontend

### Routes

| Path | Page Component | Description |
|------|----------------|-------------|
| `/login` | `Login` | Email/password login form (public). |
| `/register` | `Register` | New account registration (public; can be disabled server-side). |
| `/forgot-password` | `ForgotPassword` | Initiates OTP-based password reset (public). |
| `/verify-otp` | `OTPVerification` | OTP entry step after login or password reset (public). |
| `/change-password` | `ChangeFirstPassword` | Forced password change for `must_change_password` accounts. |
| `/` | `Dashboard` | Net-worth overview, investment breakdown, monthly expense chart, and asset allocation. |
| `/accounts` | `Accounts` | Lists all bank accounts and wallets; entry point for statement upload. |
| `/banks/:id` | `BankDetail` | Detailed view of a single bank: statements, full transaction table, category summary. |
| `/wallets/:id` | `WalletDetail` | Detailed view of a wallet with transaction review table. |
| `/expenses` | `Expenses` | Manual expense log with CRUD and category filtering. |
| `/mutual-funds` | `MutualFunds` | Mutual fund portfolio with CSV upload and snapshot history. |
| `/stocks` | `Stocks` | PSX stock holdings and market price tracker. |
| `/stocks/:id` | `StockDetail` | Single stock detail with TradingView chart and news feed. |
| `/dues` | `DuesLedger` | People-based payable/receivable ledger with CSV import. |
| `/beneficiaries` | `Beneficiaries` | Beneficiary address book with account numbers and auto-link stats. |
| `/beneficiaries/:id` | `BeneficiaryDetail` | Single beneficiary's full transaction history. |
| `/rents` | `RentTracker` | Rent income log. |
| `/zakat` | `Zakat` | Zakat payment tracker with calculator. |
| `/assets` | `Assets` | Physical asset registry. |
| `/assistant` | `AiAssistant` | AI chat interface with session management and document upload. |
| `/reports` | `Reports` | Financial reports and data export. |
| `/settings` | `Settings` | User profile, PIN setup, preferences. |
| `/users` | `Users` | Admin: user list and management. |
| `/roles` | `RolesManagement` | Admin: role management. |

---

### Components

| Component | Description |
|-----------|-------------|
| `Layout` | Root authenticated shell; renders `Sidebar` and the active page content via React Router `<Outlet>`. |
| `Sidebar` | Collapsible navigation rail listing all app sections; shows admin links only to `admin` / `super.admin` roles. |
| `BankTransactionsTable` | Full transaction review table for a bank or wallet; supports per-row category/amount/type editing, single-row approval, select-all bulk approval, and delete. Shows summary cards with totals. |
| `ChatWindow` | AI chat message thread; renders suggestion chips on empty state, an optimistic pending message while awaiting the AI, a typing indicator, and a `Regenerate` button on the last assistant message. |
| `AssistantBubble` | Renders a single AI response with Markdown formatting, a tool-name badge, an auto-generated inline chart (for financial tool responses), a sortable data table, and follow-up suggestion chips. |
| `StatementFileUpload` | File drop-zone for bank/wallet statement upload; accepts PDF or CSV and shows a password field for encrypted PDFs. |
| `StatementTransactionsModal` | Modal listing transactions from a single statement for quick category-override and individual approval. |
| `MaskedBalance` | Displays a monetary value as dots unless the app PIN is unlocked; tapping prompts the `PinGate`. |
| `PinGate` | App-wide PIN lock overlay; intercepts sensitive views and verifies the 6-digit PIN against the backend before granting access. |
| `InlineChart` | Lightweight Recharts bar/line chart rendered inside `AssistantBubble` for time-series and category tools. |
| `TradingViewChart` | Embeds the TradingView lightweight chart widget on `StockDetail` for live OHLC data. |
| `Header` | Top navigation bar with user menu and theme toggle. |

---

### Hooks

| Hook | Manages | API Endpoint |
|------|---------|--------------|
| `useBanks` / `useBank` | Bank account list and single-bank data | `GET /api/banks`, `GET /api/banks/:id` |
| `useCreateBank` | Create bank | `POST /api/banks` |
| `useUpdateBank` / `useUpdateBankBalance` | Update bank details or balance | `PUT /api/banks/:id`, `PUT /api/banks/:id/balance` |
| `useDeleteBank` | Delete bank | `DELETE /api/banks/:id` |
| `useBankCategorySummary` | Category spending breakdown | `GET /api/banks/:id/category-summary` |
| `useStatementTransactions` / `useBankAllTransactions` | Per-statement and all-bank transactions | `GET /api/banks/:bankId/statements/:id/transactions`, `GET /api/banks/:bankId/transactions` |
| `useApproveTransaction` | Approve a single transaction | `POST /api/banks/:bankId/statements/:sid/transactions/:txId/approve` |
| `useBulkApproveTransactions` | Bulk-approve transactions | `POST /api/banks/:bankId/bulk-approve` |
| `useUpdateTransactionCategory` | Edit category, amount, or type | `PUT /api/banks/:bankId/statements/:sid/transactions/:txId` |
| `useDeleteTransaction` | Delete a transaction | `DELETE /api/banks/:bankId/statements/:sid/transactions/:txId` |
| `useWallets` | Wallet list with statements | `GET /api/wallets` |
| `useCreateWallet` / `useUpdateWalletBalance` / `useDeleteWallet` | Wallet CRUD | `POST /api/wallets`, `PUT /api/wallets/:id`, `DELETE /api/wallets/:id` |
| `useSessions` / `useSession` | Chat session list and detail | `GET /api/chat/sessions`, `GET /api/chat/sessions/:id` |
| `useCreateSession` / `useDeleteSession` | Create or delete a chat session | `POST /api/chat/sessions`, `DELETE /api/chat/sessions/:id` |
| `useSendMessage` | Send a message to the AI | `POST /api/chat/sessions/:id/message` |
| `useDocuments` / `useUploadDocument` / `useDeleteDocument` | RAG document management | `GET/POST/DELETE /api/chat/documents` |
| `useMutualFunds` / `useSnapshots` | Fund holdings and snapshots | `GET /api/mutual-funds`, `GET /api/mutual-funds/snapshots` |
| `useUploadFile` / `useCreateFund` / `useDeleteFund` / `useBulkDeleteFunds` | Fund CRUD | `POST /api/mutual-funds/upload`, `POST/DELETE /api/mutual-funds` |
| `usePsxStocks` / `useSyncPsxStocks` | PSX market data | `GET /api/stocks/psx`, `POST /api/stocks/psx/sync` |
| `useStockNews` / `useSyncStockNews` | Stock news | `GET /api/stocks/:ticker/news`, `POST /api/stocks/news/sync` |
| `usePsxSnapshots` / `useUploadPsxSnapshot` / `useDeletePsxSnapshot` | PSX portfolio snapshots | `GET/POST/DELETE /api/psx/snapshots` |
| `useBankInvestments` / `useAddBankInvestment` / `useDeleteBankInvestment` | Broker bank transfers | `GET/POST/DELETE /api/psx/investments` |
| `useUpdatePsxSummary` / `useSyncPsxData` / `useDeleteSymbolFromSnapshot` | PSX snapshot management | `PUT /api/psx/snapshots/:id/summary`, `POST /api/psx/sync-data`, `DELETE /api/psx/snapshots/:id/symbols/:symbol` |
| `useBeneficiaries` / `useBeneficiary` | Beneficiary list and detail | `GET /api/beneficiaries`, `GET /api/beneficiaries/:id` |
| `useCreateBeneficiary` / `useUpdateBeneficiary` / `useDeleteBeneficiary` | Beneficiary CRUD | `POST/PUT/DELETE /api/beneficiaries/:id` |
| `useAddBeneficiaryAccount` / `useDeleteBeneficiaryAccount` | Account management | `POST/DELETE /api/beneficiaries/:id/accounts` |
| `useRescanBeneficiary` | Re-link transactions to beneficiary | `POST /api/beneficiaries/:id/rescan` |
| `useAssets` / `useCreateAsset` / `useDeleteAsset` | Physical asset management | `GET/POST/DELETE /api/assets` |
| `useInstitutions` / `useCreateInstitution` / `useDeleteInstitution` / `useSeedInstitutions` | Institution management | `GET/POST/DELETE /api/institutions` |
| `useDividends` / `useSyncDividends` / `useDeleteDividend` | Dividend records | `GET /api/dividends`, `POST /api/dividends/sync`, `DELETE /api/dividends/:id` |
| `useBrokerAccounts` / `useCreateBrokerAccount` / `useDeleteBrokerAccount` | Broker account management | `GET/POST/DELETE /api/broker-accounts` |
| `useZakatEntries` / `useCreateZakatEntry` / `useDeleteZakatEntry` | Zakat records | `GET/POST/DELETE /api/zakat` |
| `useDashboardSummary` | Dashboard metrics | `GET /api/dashboard/summary` |
