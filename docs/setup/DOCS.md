# FSWealth Axis — Project Documentation

_Last updated: 2026-05-19_

## Overview

FSWealth Axis is a personal finance management platform that tracks bank accounts, digital wallets, expenses, stock and mutual fund investments, dues/receivables, rent income, physical assets, and zakat, with an AI-powered chat assistant that answers natural-language questions about the user's financial data. The stack is Node.js / Express 5 with Prisma ORM on a Supabase PostgreSQL database (pgvector enabled) for the backend, and React 19 + Vite + TailwindCSS + TanStack Query v5 for the frontend.

---

## Backend

### API Endpoints

All protected routes require a valid JWT bearer token (`Authorization: Bearer <token>`). ✅ = auth required, ❌ = public.

---

#### `/api/auth`

Rate-limited to 10 requests per 15 minutes (GET `/me` is excluded).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/config` | ❌ | Returns auth configuration flags (OTP enabled, etc.) |
| POST | `/api/auth/register` | ❌ | Creates a new user account |
| POST | `/api/auth/login` | ❌ | Authenticates with email/password, returns JWT |
| POST | `/api/auth/verify-otp` | ❌ | Verifies the OTP code sent after login |
| POST | `/api/auth/resend-otp` | ❌ | Resends the OTP to the user's email |
| POST | `/api/auth/verify-email` | ❌ | Confirms email address from verification link |
| POST | `/api/auth/resend-verification` | ❌ | Resends email verification link |
| GET | `/api/auth/me` | ✅ | Returns the authenticated user's profile |
| PUT | `/api/auth/pin` | ✅ | Sets up a 4-digit app PIN |
| PUT | `/api/auth/pin/change` | ✅ | Changes the existing app PIN |
| POST | `/api/auth/verify-pin` | ✅ | Verifies the app PIN |
| POST | `/api/auth/forgot-password` | ❌ | Sends a password-reset email |
| POST | `/api/auth/reset-password` | ❌ | Resets password using the reset token |
| PUT | `/api/auth/first-password` | ✅ | Forces a first-login password change |

---

#### `/api/banks`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/banks` | ✅ | Lists all bank accounts for the logged-in user |
| POST | `/api/banks` | ✅ | Creates a new bank account |
| GET | `/api/banks/:id` | ✅ | Returns a single bank account with its statements |
| PUT | `/api/banks/:id` | ✅ | Updates bank account details |
| PUT | `/api/banks/:id/balance` | ✅ | Updates the current balance of a bank account |
| DELETE | `/api/banks/:id` | ✅ | Deletes a bank account and all its data |
| POST | `/api/banks/:bankId/statements/upload` | ✅ | Uploads a PDF or CSV bank statement (10 MB max) |
| GET | `/api/banks/:bankId/transactions` | ✅ | Returns all approved transactions across all statements for a bank |
| GET | `/api/banks/:bankId/category-summary` | ✅ | Returns spending totals grouped by category for a bank |
| GET | `/api/banks/:bankId/statements/:statementId/transactions` | ✅ | Returns parsed transactions for a specific statement |
| POST | `/api/banks/:bankId/statements/:statementId/transactions/:txId/approve` | ✅ | Approves a single parsed transaction |
| PUT | `/api/banks/:bankId/statements/:statementId/transactions/:txId` | ✅ | Updates the category of a parsed transaction |
| DELETE | `/api/banks/:bankId/statements/:statementId/transactions/:txId` | ✅ | Deletes a parsed transaction |
| POST | `/api/banks/:bankId/bulk-approve` | ✅ | Approves all pending transactions for a bank |
| POST | `/api/banks/:bankId/statements/:statementId/sync` | ✅ | Syncs the statement closing balance with the bank balance |
| DELETE | `/api/banks/:bankId/statements/:statementId` | ✅ | Deletes a statement and its transactions |

---

#### `/api/wallets`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/wallets` | ✅ | Lists all digital wallets for the logged-in user |
| POST | `/api/wallets` | ✅ | Creates a new wallet |
| PUT | `/api/wallets/:id` | ✅ | Updates wallet balance and details |
| DELETE | `/api/wallets/:id` | ✅ | Deletes a wallet and all its data |
| POST | `/api/wallets/:walletId/statements/upload` | ✅ | Uploads a PDF or CSV wallet statement (10 MB max) |
| GET | `/api/wallets/:walletId/transactions` | ✅ | Returns all approved transactions across all statements for a wallet |
| GET | `/api/wallets/:walletId/statements/:statementId/transactions` | ✅ | Returns parsed transactions for a specific wallet statement |
| POST | `/api/wallets/:walletId/statements/:statementId/transactions/:txId/approve` | ✅ | Approves a single parsed transaction |
| PUT | `/api/wallets/:walletId/statements/:statementId/transactions/:txId` | ✅ | Updates the category of a parsed transaction |
| DELETE | `/api/wallets/:walletId/statements/:statementId/transactions/:txId` | ✅ | Deletes a parsed transaction |
| POST | `/api/wallets/:walletId/bulk-approve` | ✅ | Approves all pending transactions for a wallet |
| POST | `/api/wallets/:walletId/statements/:statementId/sync` | ✅ | Syncs the statement closing balance with the wallet balance |
| DELETE | `/api/wallets/:walletId/statements/:statementId` | ✅ | Deletes a statement and its transactions |

---

#### `/api/expenses`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/expenses` | ✅ | Returns expenses for the logged-in user, filterable by month |
| POST | `/api/expenses` | ✅ | Creates a single expense entry |
| POST | `/api/expenses/batch` | ✅ | Creates multiple expense entries in one request |
| PUT | `/api/expenses/:id` | ✅ | Updates an expense entry |
| DELETE | `/api/expenses/:id` | ✅ | Deletes an expense entry |

---

#### `/api/assets`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/assets` | ✅ | Lists all physical assets for the logged-in user |
| POST | `/api/assets` | ✅ | Creates a new physical asset record |
| DELETE | `/api/assets/:id` | ✅ | Deletes a physical asset record |

---

#### `/api/stocks`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/stocks` | ✅ | Lists all stock holdings for the logged-in user |
| POST | `/api/stocks` | ✅ | Adds a new stock holding |
| PUT | `/api/stocks/:id` | ✅ | Updates the market price of a stock |
| POST | `/api/stocks/:id/transactions` | ✅ | Records a buy transaction for a stock |
| DELETE | `/api/stocks/:id` | ✅ | Deletes a stock holding |
| GET | `/api/stocks/psx` | ✅ | Returns live PSX market data for all listed stocks |
| POST | `/api/stocks/psx/sync` | ✅ Admin | Triggers a scrape of live PSX prices |
| POST | `/api/stocks/news/sync` | ✅ | Fetches latest news for PSX tickers |
| GET | `/api/stocks/:ticker/news` | ✅ | Returns recent news articles for a given ticker |

---

#### `/api/psx`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/psx/investments` | ✅ | Lists bank investment (TDR/saving) records |
| POST | `/api/psx/investments` | ✅ | Adds a bank investment record |
| DELETE | `/api/psx/investments/:id` | ✅ | Deletes a bank investment record |
| GET | `/api/psx/snapshots` | ✅ | Lists all PSX portfolio snapshots |
| POST | `/api/psx/snapshots` | ✅ | Uploads a new PSX portfolio snapshot |
| POST | `/api/psx/sync-data` | ✅ | Syncs current market prices into the latest snapshot |
| PUT | `/api/psx/snapshots/:id/summary` | ✅ | Updates the summary data for a snapshot |
| DELETE | `/api/psx/snapshots/:id` | ✅ | Deletes a PSX snapshot |
| DELETE | `/api/psx/snapshots/:id/symbols/:symbol` | ✅ | Removes a single symbol from a snapshot |

---

#### `/api/broker-accounts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/broker-accounts` | ✅ | Lists all broker account credentials for the logged-in user |
| POST | `/api/broker-accounts` | ✅ | Saves a broker account (CDC/NCCPL details) |
| DELETE | `/api/broker-accounts/:id` | ✅ | Deletes a broker account |

---

#### `/api/mutual-funds`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/mutual-funds` | ✅ | Lists all mutual fund holdings for the logged-in user |
| POST | `/api/mutual-funds` | ✅ | Adds a mutual fund holding |
| DELETE | `/api/mutual-funds/:id` | ✅ | Deletes a mutual fund holding |
| POST | `/api/mutual-funds/bulk-delete` | ✅ | Deletes multiple mutual fund holdings at once |
| POST | `/api/mutual-funds/upload` | ✅ | Uploads a CSV portfolio export to create holdings |
| POST | `/api/mutual-funds/sync-data` | ✅ | Syncs current NAV prices into existing holdings |
| GET | `/api/mutual-funds/snapshots` | ✅ | Lists all portfolio snapshots |
| DELETE | `/api/mutual-funds/snapshots/:id` | ✅ | Deletes a portfolio snapshot |
| DELETE | `/api/mutual-funds/snapshots/:id/funds/:symbol` | ✅ | Removes a single fund from a snapshot |
| POST | `/api/mutual-funds/snapshots/bulk-delete` | ✅ | Deletes multiple portfolio snapshots at once |

---

#### `/api/dividends`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dividends` | ✅ | Lists all dividend records for the logged-in user |
| POST | `/api/dividends/sync` | ✅ | Syncs dividends from the broker data source |
| DELETE | `/api/dividends/:id` | ✅ | Deletes a dividend record |

---

#### `/api/zakat`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/zakat` | ✅ | Lists all zakat payment entries for the logged-in user |
| POST | `/api/zakat` | ✅ | Records a zakat payment |
| DELETE | `/api/zakat/:id` | ✅ | Deletes a zakat payment entry |

---

#### `/api/rents`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/rents` | ✅ | Lists all rent income entries for the logged-in user |
| POST | `/api/rents` | ✅ | Records a rent payment received |
| PUT | `/api/rents/:id` | ✅ | Updates a rent entry |
| DELETE | `/api/rents/:id` | ✅ | Deletes a rent entry |

---

#### `/api/dues`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dues` | ✅ | Lists all contacts with their running balances (receivable/payable) |
| POST | `/api/dues` | ✅ | Creates a new contact in the dues ledger |
| GET | `/api/dues/:id` | ✅ | Returns a contact with their full transaction history |
| PUT | `/api/dues/:id` | ✅ | Updates a contact's details |
| DELETE | `/api/dues/:id` | ✅ | Deletes a contact and all their transactions |
| POST | `/api/dues/:id/transactions` | ✅ | Records a new dues transaction for a contact |
| POST | `/api/dues/:id/reminder` | ✅ | Sends a payment reminder email to a contact |
| POST | `/api/dues/:id/upload-csv` | ✅ | Imports transactions from a CSV file for a contact |
| PUT | `/api/dues/transactions/:txId` | ✅ | Updates a specific dues transaction |
| POST | `/api/dues/transactions/delete` | ✅ | Bulk-deletes dues transactions |
| POST | `/api/dues/transactions/bulk-type` | ✅ | Bulk-updates the type (receivable/payable) of transactions |

---

#### `/api/beneficiaries`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/beneficiaries` | ✅ | Lists all saved beneficiaries for the logged-in user |
| POST | `/api/beneficiaries` | ✅ | Creates a new beneficiary |
| GET | `/api/beneficiaries/:id` | ✅ | Returns a beneficiary with their accounts and transaction history |
| PUT | `/api/beneficiaries/:id` | ✅ | Updates beneficiary details |
| DELETE | `/api/beneficiaries/:id` | ✅ | Deletes a beneficiary |
| POST | `/api/beneficiaries/:id/accounts` | ✅ | Adds a bank account/IBAN to a beneficiary |
| DELETE | `/api/beneficiaries/:id/accounts/:accountId` | ✅ | Removes an account from a beneficiary |
| POST | `/api/beneficiaries/:id/rescan` | ✅ | Re-scans transactions to match this beneficiary's accounts |

---

#### `/api/chat`

Rate-limited to 30 messages per hour on the message endpoint.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/chat/sessions` | ✅ | Lists all chat sessions for the logged-in user |
| POST | `/api/chat/sessions` | ✅ | Creates a new chat session |
| GET | `/api/chat/sessions/:id` | ✅ | Returns a session with its full message history |
| DELETE | `/api/chat/sessions/:id` | ✅ | Deletes a chat session and all its messages |
| POST | `/api/chat/sessions/:id/message` | ✅ | Sends a message and streams the AI response |
| GET | `/api/chat/documents` | ✅ | Lists all uploaded documents for RAG context |
| POST | `/api/chat/documents/upload` | ✅ | Uploads a document (PDF/TXT/MD/CSV, 20 MB max) for RAG indexing |
| DELETE | `/api/chat/documents/:docId` | ✅ | Deletes a document and its embeddings |

---

#### `/api/dashboard`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard/summary` | ✅ | Returns aggregated net worth and all financial metrics |
| POST | `/api/dashboard/send-summary` | ✅ | Sends a financial summary email to the logged-in user |

---

#### `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | ✅ | Lists all users (admin access) |
| POST | `/api/users` | ✅ | Creates a new user account (admin access) |
| GET | `/api/users/:id` | ✅ | Returns a user's details |
| PUT | `/api/users/:id/role` | ✅ | Updates a user's role |
| PUT | `/api/users/:id/password` | ✅ Super-admin | Resets a user's password |
| DELETE | `/api/users/:id` | ✅ | Deletes a user account |

---

#### `/api/roles`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/roles` | ✅ | Lists all roles |
| GET | `/api/roles/:id` | ✅ | Returns a single role by slug |
| POST | `/api/roles` | ✅ Admin | Creates a new role |
| PUT | `/api/roles/:id` | ✅ Admin | Updates a role's name or permissions |
| DELETE | `/api/roles/:id` | ✅ Super-admin | Permanently deletes a role |

---

#### `/api/institutions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/institutions` | ✅ | Lists all saved institution names for the logged-in user |
| POST | `/api/institutions` | ✅ | Saves a new institution name (bank, wallet, etc.) |
| POST | `/api/institutions/seed` | ✅ | Seeds the user's institution list with common Pakistani banks |
| DELETE | `/api/institutions/:id` | ✅ | Deletes an institution entry |

---

#### `/api/menu-visibility`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/menu-visibility` | ✅ | Returns which sidebar items are visible to the current user's role |
| PUT | `/api/menu-visibility` | ✅ | Updates visibility settings for sidebar items (admin) |

---

### Services

| Service | Description |
|---------|-------------|
| **categorizer.service.js** | Multi-layered transaction categorizer that checks user-learned patterns, a cache, fuzzy keyword matching, and AI fallback in order; also records user feedback to improve future accuracy. |
| **aiCategorizer.service.js** | Calls Gemini 1.5 Flash (or Groq llama as fallback) to batch-categorize transaction descriptions into predefined Pakistani banking categories, with caching to avoid repeat API calls. |
| **ragEngine.service.js** | Runs the AI assistant's multi-turn conversation loop using tool calling (12 financial query tools) and semantic document search, routing between Gemini, Groq, and OpenAI depending on availability. |
| **documentProcessor.service.js** | Ingests uploaded documents by chunking text, generating embeddings via Gemini's embedding model, and storing them in pgvector; also handles retrieval for RAG context. |
| **pdfParser.service.js** | Extracts text from PDF bank statements using positional reconstruction of tabular data, with support for password-protected files and OCR fallback for scanned documents. |
| **csvParser.service.js** | Parses CSV exports by auto-detecting column headers and formats, normalising date/amount fields, and inferring debit/credit direction across different bank CSV layouts. |
| **transactionParser.service.js** | Extracts and structures transactions from raw bank statement text, supporting multiple Pakistani bank formats, and validates parsed results against statement opening/closing balances. |
| **duplicateDetector.service.js** | Flags duplicate transactions within and across imported statements by combining fuzzy description matching, amount comparison, and date proximity; also deduplicates statement uploads via SHA-256 file hash. |
| **scraper.service.js** | Scrapes live PSX stock prices and TradingView news using a Playwright headless browser session against the PSX market data portal. |
| **cron.service.js** | Schedules a weekly job (Sundays 9 AM) that computes dashboard metrics for every user and emails each user their financial summary. |
| **financialTools.js** | Defines 12 database query tools (expense summaries, cash flow, portfolio performance, dues, assets, etc.) that the RAG engine calls to ground AI responses in real user data. |

---

### Database Models

| Model | Key Fields | Relationships |
|-------|-----------|---------------|
| **User** | email, name, role (`user` / `admin` / `super.admin`), app_pin_code, email_verified, must_change_password | Has many of every financial model |
| **MenuVisibility** | path (PK), name, icon, visible_to_roles (array), sort_order | — |
| **Expense** | amount, category, expense_date, payment_method, notes | Belongs to User |
| **Bank** | name, account_no, iban_no, currency, exchange_rate, starting_balance, current_balance | Belongs to User; has many BankStatement |
| **BankStatement** | month, year, file_hash, opening_balance, closing_balance, total_credits, total_debits, processing_status | Belongs to Bank; has many BankTransactionLog |
| **BankTransactionLog** | transaction_date, description, debit_amount, credit_amount, net_amount, suggested_category, category_confidence, is_duplicate, user_approved, approved_category | Belongs to BankStatement |
| **Wallet** | name, institution, balance, currency, exchange_rate, color_theme, account_num | Belongs to User; has many WalletStatement |
| **WalletStatement** | month, year, file_hash, opening_balance, closing_balance, total_credits, total_debits, processing_status | Belongs to Wallet; has many WalletTransactionLog |
| **WalletTransactionLog** | transaction_date, description, debit_amount, credit_amount, net_amount, suggested_category, user_approved, approved_category | Belongs to WalletStatement |
| **Stock** | stock_symbol, company_name, current_market_price | Belongs to User; has many StockTransaction |
| **StockTransaction** | buy_date, buy_price, quantity, brokerage_fee | Belongs to Stock and User |
| **PsxStock** | ticker (unique), companyName, price, change, changePct, volume, high, low, marketCap | Global (not per-user) |
| **StockNews** | ticker, title, link (unique), source, publishedAt | Global (not per-user) |
| **PsxSnapshot** | snapshot_date, total_custody, total_invested, holdings_data (JSON), summary_data (JSON) | Belongs to User; unique per user+date |
| **BankInvestment** | transaction_date, amount (positive=deposit, negative=withdrawal), description | Belongs to User |
| **MutualFund** | fund_name, fund_symbol, units, current_nav, current_value, invested_amount, gain_loss_fytd, gain_loss_since_inception | Belongs to User; has many MutualFundHistory |
| **PortfolioSnapshot** | upload_date, total_value, total_gain, total_invested, funds_data (JSON) | Belongs to User |
| **BrokerAccount** | account_title, client_code, participant_acc_no, cdc_sub_acc_no, stock_pin_code | Belongs to User |
| **Dividend** | security_symbol, security_name, gross_dividend_amount, net_dividend_amount, payment_date, status | Belongs to User |
| **Person** | name, email | Belongs to User; has many DuesTransaction |
| **DuesTransaction** | transaction_type (`receivable`/`payable`), amount, transaction_date, description | Belongs to Person and User |
| **RentEntry** | month, year, payer_name, amount, payment_date, account_source, notes | Belongs to User |
| **Zakat** | amount, description, date | Belongs to User |
| **Asset** | name, type, value, purchase_date, description | Belongs to User |
| **Beneficiary** | name, nickname, phone, notes | Belongs to User; has many BeneficiaryAccount and BeneficiaryTransaction |
| **BeneficiaryAccount** | account_label, account_no | Belongs to Beneficiary |
| **BeneficiaryTransaction** | amount, direction (`credit`/`debit`), transaction_date, description, bank_transaction_id | Belongs to Beneficiary |
| **Institution** | name, type (`bank`/`wallet`/`cash`), color | Belongs to User; unique per user+name |
| **CategoryPattern** | keyword, assigned_category, confidence, occurrences | Belongs to User; unique per user+keyword+category |
| **CategoryCache** | description, category, source (`ai`/`manual`), confidence, hit_count | Belongs to User; unique per user+description |
| **ChatSession** | title | Belongs to User; has many ChatMessage |
| **ChatMessage** | role, content, tool_name, tool_data (JSON) | Belongs to ChatSession |
| **ChatDocument** | filename, mime_type, char_count | Belongs to User; has many DocumentChunk |
| **DocumentChunk** | chunk_index, content, embedding (vector 3072-dim) | Belongs to ChatDocument |

---

## Frontend

### Pages

| Route | Component | What it renders |
|-------|-----------|-----------------|
| `/welcome` | Landing | Marketing landing page for unauthenticated visitors |
| `/login` | Login | Email/password sign-in form |
| `/register` | Register | New account registration form |
| `/forgot-password` | ForgotPassword | Password reset request form |
| `/verify-otp` | OTPVerification | OTP code entry after login |
| `/verify-email` | VerifyEmail | Email confirmation landing page |
| `/change-password` | ChangeFirstPassword | Forced first-login password change form |
| `/` | Dashboard | Net worth summary, 8 metric cards, monthly expense chart, asset allocation chart |
| `/expenses` | Expenses | Month picker, expense table, single/batch entry forms |
| `/accounts` | Accounts | Bank account cards with IBAN/balance and wallet cards with color themes |
| `/banks/:id` | BankDetail | Statement list, parsed transaction table, approve/categorise workflow |
| `/wallets/:id` | WalletDetail | Statement list, parsed transaction table, approve/categorise workflow |
| `/stocks` | Stocks | PSX holdings table with live prices, snapshot history, portfolio growth chart, dividend panel |
| `/stocks/:id` | StockDetail | TradingView chart and transaction history for a single stock |
| `/mutual-funds` | MutualFunds | Summary cards, NAV/invested bar chart, allocation pie, timeline chart, upload history |
| `/dues` | DuesLedger | Contact list with running balances, per-contact transaction ledger, reminder emails |
| `/personal` | Personal | Tabbed view of Zakat, Rent Tracker, and Assets sub-pages |
| `/reports` | Reports | Financial reports and export tools |
| `/beneficiaries` | Beneficiaries | Saved payment contacts list |
| `/beneficiaries/:id` | BeneficiaryDetail | Contact details, linked accounts, matched transaction history |
| `/assistant` | AiAssistant | Chat interface with session history, document uploads, and AI financial Q&A |
| `/settings` | Settings | Admin console: bank/wallet setup, broker accounts, users, roles, PIN, menu access |
| `/users` | Users | User list (admin) |
| `/roles` | RolesManagement | Role list with permission management (admin) |
| `/design-system` | DesignSystem | Internal component showcase |

> Routes `/rents`, `/zakat`, and `/assets` redirect to `/personal?tab=<tab>`.

---

### Key Components

| Component | Description |
|-----------|-------------|
| **Sidebar.jsx** | Responsive sidebar with dynamic menu items fetched from `/api/menu-visibility`; items filtered by user role |
| **Header.jsx** | Top bar with page title, theme toggle, and masked-balance reveal button |
| **Layout.jsx** | Page wrapper combining Sidebar and Header with main content slot |
| **Modal.jsx** | Reusable overlay modal built as a `<div>` (not `<dialog>`); controlled by open/onClose props |
| **Table.jsx** | Generic sortable data table with pagination |
| **Card.jsx** | Stat/summary card with title, value, and optional trend indicator |
| **Button.jsx** | Styled button with variant (primary/secondary/danger), size, and loading state |
| **TextInput.jsx** | Form text input with label, error message, and dark-mode support |
| **Select.jsx** | Styled dropdown select with label and error message |
| **DatePickerInput.jsx** | Date picker with formatted display using `fmtDateLong()` |
| **MaskedBalance.jsx** | Amount display that can be toggled to asterisks for privacy |
| **PinGate.jsx** | Full-screen PIN prompt that gates the app when the session is idle |
| **Loader.jsx** | Centered spinner for loading states |
| **Skeleton.jsx** | Skeleton placeholder blocks for loading UI |
| **ErrorBoundary.jsx** | React error boundary that catches render errors and shows a fallback UI |
| **ChatWindow.jsx** | Scrollable message thread with markdown rendering for the AI assistant |
| **AssistantBubble.jsx** | Single chat message bubble (user or AI) with tool-call display |
| **StatementFileUpload.jsx** | Drag-and-drop PDF/CSV uploader for bank and wallet statements |
| **StatementTransactionsModal.jsx** | Modal showing parsed statement transactions with approve/edit/delete actions |
| **BankTransactionsTable.jsx** | Approved transaction list with category filters and export |
| **TradingViewChart.jsx** | Embedded TradingView chart widget for a given PSX ticker |
| **InlineChart.jsx** | Lightweight ECharts sparkline for use inside tables or cards |

---

### Hooks

| Hook | Data / Mutation | API Endpoint(s) |
|------|-----------------|-----------------|
| **useBanks.js** | Bank accounts CRUD, balance updates, category summary | GET/POST/PUT/DELETE `/banks`, GET `/banks/:id`, PUT `/banks/:id/balance`, GET `/banks/:id/category-summary` |
| **useWallets.js** | Wallet accounts CRUD and balance updates | GET/POST `/wallets`, PUT `/wallets/:id`, DELETE `/wallets/:id` |
| **useStatementTransactions.js** | Parsed statement transactions, bulk approve, category updates | GET/POST `/banks/:id/transactions`, GET `/banks/:id/statements/:sid/transactions`, POST `/banks/:id/bulk-approve`, PUT/DELETE transaction endpoints |
| **useStocks.js** | Live PSX market data and news sync | GET `/stocks/psx`, POST `/stocks/psx/sync`, POST `/stocks/news/sync`, GET `/stocks/:ticker/news` |
| **usePsx.js** | PSX portfolio snapshots and bank investment records | GET/POST/DELETE/PUT on `/psx/snapshots` and `/psx/investments`, POST `/psx/sync-data` |
| **useMutualFunds.js** | Mutual fund holdings and portfolio snapshots | GET/POST/DELETE on `/mutual-funds` and `/mutual-funds/snapshots`, POST `/mutual-funds/upload`, POST `/mutual-funds/sync-data` |
| **useDividends.js** | Dividend records and sync | GET `/dividends`, POST `/dividends/sync`, DELETE `/dividends/:id` |
| **useZakat.js** | Zakat entries and dashboard summary totals | GET/POST/DELETE `/zakat`, GET `/dashboard/summary` |
| **useAssets.js** | Physical asset records | GET/POST/DELETE `/assets` |
| **useBrokerAccounts.js** | Broker account credentials | GET/POST/DELETE `/broker-accounts` |
| **useInstitutions.js** | Institution name list | GET/POST/DELETE `/institutions`, POST `/institutions/seed` |
| **useBeneficiaries.js** | Beneficiary contacts, linked accounts, and transaction rescan | GET/POST/PUT/DELETE on `/beneficiaries` and `/beneficiaries/:id`, POST `/beneficiaries/:id/accounts`, POST `/beneficiaries/:id/rescan` |
| **useChat.js** | Chat sessions, messages, and RAG documents | GET/POST/DELETE on `/chat/sessions`, POST `/chat/sessions/:id/message`, GET/POST/DELETE `/chat/documents` |
