# FSWealth Axis — Project Documentation

_Last updated: 2026-07-26_

## Overview

FSWealth Axis is a personal finance platform for the Pakistani market. It tracks bank accounts, digital wallets, expenses, stock and mutual fund investments, gold jewellery, interpersonal dues, institutional debts, rent income, physical assets, recurring bills, and zakat, with an AI assistant that answers natural-language questions about the user's own data. The backend is Node.js / Express 5 with Prisma ORM on Supabase PostgreSQL (pgvector enabled); the frontend is React 19 + Vite + Tailwind CSS + TanStack Query v5, with a Storybook workspace for the shared UI kit.

---

## Backend

### API Endpoints

All protected routes require a JWT bearer token (`Authorization: Bearer <token>`). ✅ = auth required, ❌ = public.

---

#### `/api/auth`

Rate-limited to 10 requests per 15 minutes (GET `/me` is excluded).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/config` | ❌ | Returns which sign-in options are enabled (Google, Apple) |
| POST | `/api/auth/register` | ❌ | Creates a new user account |
| POST | `/api/auth/login` | ❌ | Authenticates with email/password, returns JWT |
| POST | `/api/auth/google` | ❌ | Signs in with a Google ID token, creating the account if new |
| POST | `/api/auth/apple` | ❌ | Signs in with an Apple identity token, creating the account if new |
| POST | `/api/auth/verify-otp` | ❌ | Verifies the OTP code sent after login |
| POST | `/api/auth/resend-otp` | ❌ | Resends the OTP to the user's email |
| POST | `/api/auth/verify-email` | ❌ | Confirms an email address from the verification link |
| POST | `/api/auth/resend-verification` | ❌ | Resends the email verification link |
| GET | `/api/auth/me` | ✅ | Returns the authenticated user's profile |
| PUT | `/api/auth/pin` | ✅ | Sets up the 4-digit app PIN |
| PUT | `/api/auth/pin/change` | ✅ | Changes the existing app PIN |
| POST | `/api/auth/verify-pin` | ✅ | Verifies the app PIN |
| POST | `/api/auth/forgot-password` | ❌ | Sends a password-reset email |
| POST | `/api/auth/reset-password` | ❌ | Resets the password using the reset token |
| PUT | `/api/auth/first-password` | ✅ | Completes the forced first-login password change |
| POST | `/api/auth/accept-legal` | ✅ | Records that the user accepted the terms and privacy policy |

---

#### `/api/banks`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/banks` | ✅ | Lists all bank accounts for the logged-in user |
| POST | `/api/banks` | ✅ | Creates a new bank account |
| GET | `/api/banks/:id` | ✅ | Returns a single bank account with its statements |
| PUT | `/api/banks/:id` | ✅ | Updates bank account details |
| PUT | `/api/banks/:id/balance` | ✅ | Updates the current balance |
| DELETE | `/api/banks/:id` | ✅ | Deletes a bank account and all its data |
| POST | `/api/banks/:bankId/statements/upload` | ✅ | Uploads and imports a PDF or CSV statement (10 MB max) |
| POST | `/api/banks/:bankId/statements/preview` | ✅ | Parses an uploaded file and returns the rows for review without saving |
| POST | `/api/banks/:bankId/statements/commit` | ✅ | Saves the reviewed rows from a preview as a statement |
| GET | `/api/banks/:bankId/transactions` | ✅ | Returns all approved transactions across every statement |
| GET | `/api/banks/:bankId/category-summary` | ✅ | Returns spending totals grouped by category |
| GET | `/api/banks/:bankId/statements/:statementId/transactions` | ✅ | Returns parsed transactions for one statement |
| POST | `/api/banks/:bankId/transactions/:txId/approve` | ✅ | Approves a single parsed transaction |
| PUT | `/api/banks/:bankId/transactions/:txId` | ✅ | Updates the category of a parsed transaction |
| DELETE | `/api/banks/:bankId/transactions/:txId` | ✅ | Deletes a parsed transaction |
| POST | `/api/banks/:bankId/bulk-approve` | ✅ | Approves all pending transactions for the bank |
| POST | `/api/banks/:bankId/statements/:statementId/sync` | ✅ | Syncs the statement closing balance to the bank balance |
| DELETE | `/api/banks/:bankId/statements/:statementId` | ✅ | Deletes a statement and its transactions |

> The three per-transaction routes also exist nested under `/statements/:statementId/…` for backwards compatibility. Both forms do the same thing.

---

#### `/api/wallets`

Mirrors the bank routes for digital wallets.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/wallets` | ✅ | Lists all wallets for the logged-in user |
| POST | `/api/wallets` | ✅ | Creates a new wallet |
| PUT | `/api/wallets/:id` | ✅ | Updates wallet balance and details |
| DELETE | `/api/wallets/:id` | ✅ | Deletes a wallet and all its data |
| POST | `/api/wallets/:walletId/statements/upload` | ✅ | Uploads and imports a PDF or CSV statement (10 MB max) |
| POST | `/api/wallets/:walletId/statements/preview` | ✅ | Parses an uploaded file and returns the rows for review without saving |
| POST | `/api/wallets/:walletId/statements/commit` | ✅ | Saves the reviewed rows from a preview as a statement |
| GET | `/api/wallets/:walletId/transactions` | ✅ | Returns all approved transactions across every statement |
| GET | `/api/wallets/:walletId/statements/:statementId/transactions` | ✅ | Returns parsed transactions for one statement |
| POST | `/api/wallets/:walletId/transactions/:txId/approve` | ✅ | Approves a single parsed transaction |
| PUT | `/api/wallets/:walletId/transactions/:txId` | ✅ | Updates the category of a parsed transaction |
| DELETE | `/api/wallets/:walletId/transactions/:txId` | ✅ | Deletes a parsed transaction |
| POST | `/api/wallets/:walletId/bulk-approve` | ✅ | Approves all pending transactions for the wallet |
| POST | `/api/wallets/:walletId/statements/:statementId/sync` | ✅ | Syncs the statement closing balance to the wallet balance |
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

#### `/api/dashboard`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard/summary` | ✅ | Returns aggregated net worth and all headline metrics |
| GET | `/api/dashboard/insights` | ✅ | Returns spending analytics for a period: trend, categories, top destinations, weekday rhythm |
| GET | `/api/dashboard/spending` | ✅ | Returns the raw spending rows behind the insights view |
| POST | `/api/dashboard/send-summary` | ✅ | Emails a financial summary to the logged-in user |

---

#### `/api/networth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/networth/history` | ✅ | Returns the daily net-worth snapshot history |
| POST | `/api/networth/snapshot` | ✅ | Captures a net-worth snapshot immediately instead of waiting for the nightly job |

---

#### `/api/gold`

The Gold Vault is protected by its own PIN, separate from the app PIN.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/gold/items` | ✅ | Lists gold items with today's value, purchase value, and gain/loss each |
| POST | `/api/gold/items` | ✅ | Adds a gold item by weight and carat |
| PUT | `/api/gold/items/:id` | ✅ | Updates a gold item |
| DELETE | `/api/gold/items/:id` | ✅ | Deletes a gold item |
| POST | `/api/gold/sync-price` | ✅ | Scrapes the current gold price on demand |
| GET | `/api/gold/latest-price` | ✅ | Returns the most recent 24K price per tola and per gram |
| GET | `/api/gold/price-history` | ✅ | Returns the daily gold price series |
| GET | `/api/gold/has-pin` | ✅ | Reports whether a Gold Vault PIN has been set |
| POST | `/api/gold/set-pin` | ✅ | Sets the Gold Vault PIN for the first time |
| POST | `/api/gold/change-pin` | ✅ | Changes the Gold Vault PIN |
| POST | `/api/gold/verify-pin` | ✅ | Verifies the Gold Vault PIN and unlocks the vault |
| GET | `/api/gold/zakat-summary` | ✅ | Returns total 24K-equivalent weight, the 85 g nisab check, and zakat due |

---

#### `/api/debts`

Institutional debt — credit cards, loans, mortgages. Separate from the interpersonal dues ledger.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/debts` | ✅ | Lists all debts with their outstanding balances |
| GET | `/api/debts/:id` | ✅ | Returns one debt with its payment history |
| POST | `/api/debts` | ✅ | Creates a debt record |
| PATCH | `/api/debts/:id` | ✅ | Updates a debt's details |
| DELETE | `/api/debts/:id` | ✅ | Deletes a debt and its payments |
| POST | `/api/debts/:id/payments` | ✅ | Logs a payment and reduces the outstanding balance |

---

#### `/api/recurring`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/recurring` | ✅ | Lists recurring payments and subscriptions |
| GET | `/api/recurring/upcoming` | ✅ | Lists items due soon, for the reminders panel |
| POST | `/api/recurring` | ✅ | Creates a recurring payment |
| PATCH | `/api/recurring/:id` | ✅ | Updates a recurring payment |
| DELETE | `/api/recurring/:id` | ✅ | Deletes a recurring payment |
| POST | `/api/recurring/:id/paid` | ✅ | Marks the current cycle paid and rolls the due date forward |

---

#### `/api/fx`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/fx/latest` | ✅ | Returns the latest PKR rate for each tracked currency |
| GET | `/api/fx/history` | ✅ | Returns the stored rate history for charting |
| POST | `/api/fx/refresh` | ✅ | Fetches fresh rates from the provider immediately |

---

#### `/api/assets`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/assets` | ✅ | Lists all physical assets for the logged-in user |
| POST | `/api/assets` | ✅ | Creates a physical asset record |
| DELETE | `/api/assets/:id` | ✅ | Deletes a physical asset record |

---

#### `/api/stocks`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/stocks` | ✅ | Lists all stock holdings for the logged-in user |
| POST | `/api/stocks` | ✅ | Adds a stock holding |
| PUT | `/api/stocks/:id` | ✅ | Updates the market price of a stock |
| POST | `/api/stocks/:id/transactions` | ✅ | Records a buy transaction |
| DELETE | `/api/stocks/:id` | ✅ | Deletes a stock holding |
| GET | `/api/stocks/psx` | ✅ | Returns live PSX market data for all listed stocks |
| POST | `/api/stocks/psx/sync` | ✅ Admin | Triggers a scrape of live PSX prices |
| GET | `/api/stocks/psx/status` | ✅ | Returns when prices were last synced successfully, for the staleness badge |
| GET | `/api/stocks/psx/history` | ✅ | Daily closes for several tickers at once (`?tickers=FFC,OGDC&days=30`) |
| GET | `/api/stocks/:ticker/history` | ✅ | Daily close series for one ticker (`?days=30`) |
| POST | `/api/stocks/news/sync` | ✅ | Fetches the latest news for PSX tickers |
| GET | `/api/stocks/:ticker/news` | ✅ | Returns recent news articles for a ticker |

> The `/api/stocks` and `/api/stocks/:id/transactions` endpoints above are live but **not used by the web frontend** — the Stocks page reads holdings from `PsxSnapshot` instead, and only the mobile app writes `StockTransaction` rows. Per-lot buy/sell tracking on the web is planned but not built.

---

#### `/api/watchlist`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/watchlist` | ✅ | Lists tracked tickers with their current quote attached |
| POST | `/api/watchlist` | ✅ | Adds a ticker to the watchlist |
| DELETE | `/api/watchlist/:ticker` | ✅ | Removes a ticker from the watchlist |

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
| PUT | `/api/psx/snapshots/:id/summary` | ✅ | Updates a snapshot's summary data |
| DELETE | `/api/psx/snapshots/:id` | ✅ | Deletes a snapshot |
| DELETE | `/api/psx/snapshots/:id/symbols/:symbol` | ✅ | Removes one symbol from a snapshot |

---

#### `/api/broker-accounts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/broker-accounts` | ✅ | Lists saved broker accounts |
| POST | `/api/broker-accounts` | ✅ | Saves a broker account (CDC/NCCPL details) |
| DELETE | `/api/broker-accounts/:id` | ✅ | Deletes a broker account |

---

#### `/api/mutual-funds`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/mutual-funds` | ✅ | Lists all mutual fund holdings |
| POST | `/api/mutual-funds` | ✅ | Adds a mutual fund holding |
| DELETE | `/api/mutual-funds/:id` | ✅ | Deletes a holding |
| POST | `/api/mutual-funds/bulk-delete` | ✅ | Deletes several holdings at once |
| POST | `/api/mutual-funds/upload` | ✅ | Uploads a CSV portfolio export to create holdings |
| POST | `/api/mutual-funds/sync-data` | ✅ | Syncs current NAV prices into existing holdings |
| GET | `/api/mutual-funds/snapshots` | ✅ | Lists portfolio snapshots |
| DELETE | `/api/mutual-funds/snapshots/:id` | ✅ | Deletes a snapshot |
| DELETE | `/api/mutual-funds/snapshots/:id/funds/:symbol` | ✅ | Removes one fund from a snapshot |
| POST | `/api/mutual-funds/snapshots/bulk-delete` | ✅ | Deletes several snapshots at once |

---

#### `/api/dividends`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dividends` | ✅ | Lists all dividend records |
| POST | `/api/dividends/sync` | ✅ | Syncs dividends from the broker data source |
| DELETE | `/api/dividends/:id` | ✅ | Deletes a dividend record |

---

#### `/api/zakat`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/zakat` | ✅ | Lists all zakat payment entries |
| POST | `/api/zakat` | ✅ | Records a zakat payment |
| DELETE | `/api/zakat/:id` | ✅ | Deletes a zakat payment entry |

---

#### `/api/rents`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/rents` | ✅ | Lists all rent income entries |
| POST | `/api/rents` | ✅ | Records a rent payment received |
| PUT | `/api/rents/:id` | ✅ | Updates a rent entry |
| DELETE | `/api/rents/:id` | ✅ | Deletes a rent entry |

---

#### `/api/dues`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dues` | ✅ | Lists contacts with their running receivable/payable balances |
| POST | `/api/dues` | ✅ | Creates a contact in the dues ledger |
| GET | `/api/dues/:id` | ✅ | Returns a contact with their full transaction history |
| PUT | `/api/dues/:id` | ✅ | Updates a contact's details |
| DELETE | `/api/dues/:id` | ✅ | Deletes a contact and all their transactions |
| POST | `/api/dues/:id/transactions` | ✅ | Records a dues transaction for a contact |
| POST | `/api/dues/:id/reminder` | ✅ | Emails a payment reminder to the contact |
| POST | `/api/dues/:id/upload-csv` | ✅ | Imports transactions for a contact from a CSV file |
| PUT | `/api/dues/transactions/:txId` | ✅ | Updates a dues transaction |
| POST | `/api/dues/transactions/delete` | ✅ | Bulk-deletes dues transactions |
| POST | `/api/dues/transactions/bulk-type` | ✅ | Bulk-changes transactions between receivable and payable |

---

#### `/api/beneficiaries`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/beneficiaries` | ✅ | Lists all saved beneficiaries |
| POST | `/api/beneficiaries` | ✅ | Creates a beneficiary |
| GET | `/api/beneficiaries/:id` | ✅ | Returns a beneficiary with accounts and matched transactions |
| PUT | `/api/beneficiaries/:id` | ✅ | Updates beneficiary details |
| DELETE | `/api/beneficiaries/:id` | ✅ | Deletes a beneficiary |
| POST | `/api/beneficiaries/:id/accounts` | ✅ | Adds a bank account or IBAN to a beneficiary |
| DELETE | `/api/beneficiaries/:id/accounts/:accountId` | ✅ | Removes an account from a beneficiary |
| POST | `/api/beneficiaries/:id/rescan` | ✅ | Re-scans transactions to match this beneficiary's accounts |

---

#### `/api/chat`

The message endpoint is rate-limited to 30 requests per hour.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/chat/sessions` | ✅ | Lists all chat sessions |
| POST | `/api/chat/sessions` | ✅ | Creates a chat session |
| GET | `/api/chat/sessions/:id` | ✅ | Returns a session with its message history |
| DELETE | `/api/chat/sessions/:id` | ✅ | Deletes a session and its messages |
| POST | `/api/chat/sessions/:id/message` | ✅ | Sends a message and returns the AI response |
| GET | `/api/chat/documents` | ✅ | Lists uploaded documents used for RAG context |
| POST | `/api/chat/documents/upload` | ✅ | Uploads a PDF/TXT/MD/CSV document (20 MB max) for indexing |
| DELETE | `/api/chat/documents/:docId` | ✅ | Deletes a document and its embeddings |

---

#### `/api/export`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/export/transactions.csv` | ✅ | Downloads all bank and wallet transactions as CSV |
| GET | `/api/export/expenses.csv` | ✅ | Downloads all expense entries as CSV |
| GET | `/api/export/dues.csv` | ✅ | Downloads the dues ledger as CSV |
| GET | `/api/export/all.json` | ✅ | Downloads a full export of the user's data as JSON |

---

#### `/api/feedback`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/feedback` | ✅ | Submits a bug report, feature request, or question |
| GET | `/api/feedback/mine` | ✅ | Lists the logged-in user's own submissions |
| GET | `/api/feedback` | ✅ Admin | Lists all submissions from all users |
| PATCH | `/api/feedback/:id/status` | ✅ Admin | Moves a submission to in progress or resolved |

---

#### `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | ✅ Admin | Lists all users |
| POST | `/api/users` | ✅ Admin | Creates a user account |
| GET | `/api/users/deletion-requests` | ✅ Super-admin | Lists users an admin has requested to delete |
| GET | `/api/users/:id` | ✅ | Returns a user's details |
| PUT | `/api/users/:id` | ✅ Admin | Updates a user's name or email |
| PUT | `/api/users/:id/role` | ✅ Admin | Changes a user's role |
| PUT | `/api/users/:id/password` | ✅ Super-admin | Resets a user's password |
| POST | `/api/users/:id/soft-delete` | ✅ Admin | Deactivates the account and queues it for super-admin review |
| POST | `/api/users/:id/restore` | ✅ Super-admin | Restores a soft-deleted account |
| DELETE | `/api/users/:id` | ✅ Super-admin | Permanently deletes a user and all their data |

---

#### `/api/roles`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/roles` | ✅ | Lists all roles |
| GET | `/api/roles/:id` | ✅ | Returns one role by slug |
| POST | `/api/roles` | ✅ Admin | Creates a role |
| PUT | `/api/roles/:id` | ✅ Admin | Updates a role's name or permissions |
| DELETE | `/api/roles/:id` | ✅ Super-admin | Permanently deletes a role |

---

#### `/api/institutions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/institutions` | ✅ | Lists saved institution names |
| POST | `/api/institutions` | ✅ | Saves an institution name (bank, wallet, cash) |
| POST | `/api/institutions/seed` | ✅ | Seeds the list with common Pakistani banks |
| DELETE | `/api/institutions/:id` | ✅ | Deletes an institution entry |

---

#### `/api/menu-visibility`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/menu-visibility` | ✅ | Returns which sidebar items and sub-tabs the current role can see |
| PUT | `/api/menu-visibility` | ✅ Admin | Updates visibility settings per role |

---

### Services

| Service | Description |
|---------|-------------|
| **categorizer.service.js** | Multi-layered transaction categoriser that checks user-learned patterns, a cache, fuzzy keyword matching, and AI fallback in order. Records user corrections to improve future accuracy. |
| **aiCategorizer.service.js** | Calls Gemini 2.5 Flash (Groq llama as fallback) to batch-categorise transaction descriptions into Pakistani banking categories, caching results to avoid repeat API calls. |
| **ragEngine.service.js** | Runs the AI assistant's conversation loop using tool calling and semantic document search, routing between providers depending on availability. |
| **financialTools.js** | Defines the database query tools (expense summaries, cash flow, portfolio performance, dues, gold, assets) that the RAG engine calls to ground answers in real user data. |
| **documentProcessor.service.js** | Ingests uploaded documents by chunking text, generating embeddings, and storing them in pgvector; also handles retrieval for RAG context. |
| **pdfParser.service.js** | Extracts text from PDF statements using positional reconstruction of tabular data, with support for password-protected files and an OCR fallback for scans. |
| **csvParser.service.js** | Parses CSV exports by auto-detecting headers and formats, normalising dates and amounts, and inferring debit/credit direction across bank layouts. |
| **transactionParser.service.js** | Extracts structured transactions from raw statement text across several Pakistani bank formats. |
| **reconcile.service.js** | Checks parsed statement rows against the opening and closing balances, both in total and row by row, so a single misread amount can be pointed at precisely. |
| **duplicateDetector.service.js** | Flags duplicate transactions using fuzzy description matching, amount comparison, and date proximity; deduplicates whole uploads via SHA-256 file hash. |
| **scraper.service.js** | Scrapes live PSX stock prices and TradingView news with a Playwright headless browser. Each ticker is retried with backoff, and a field that fails to parse comes back as null so it is never written over a good stored value. |
| **psxSync.service.js** | The one code path behind both the manual price sync and the weekday cron. Writes only fields that parsed, appends a daily row to the price history, and records the run outcome. Aborts the whole write if more than half the tickers fail, so a site redesign cannot shred the price table. |
| **psxSnapshot.service.js** | Carries each user's latest holdings forward and re-values them at the day's close, so portfolio history accrues without manual CDC uploads. Never overwrites a snapshot the user uploaded themselves. |
| **portfolio.service.js** | Portfolio maths on a `positions[]` array: weights, trailing-twelve-month dividend yields (current and on cost), and total return with dividends separated from price movement. Decimal-safe throughout. |
| **goldScraper.service.js** | Scrapes the daily 24K gold price (per tola and per gram) and stores one row per day, keyed to the Asia/Karachi date. |
| **goldValuation.service.js** | Shared gold maths: per-item value at a given price adjusted for carat purity, purchase value, 24K-equivalent weight, and the nisab and zakat constants. |
| **fxRate.service.js** | Fetches USD-based rates daily and stores one row per PKR pair for USD, EUR, GBP, AED, and SAR. |
| **networthSnapshot.service.js** | Captures net-worth snapshots using the same aggregation as the dashboard, for one user or for everyone. |
| **billReminder.service.js** | Emails reminders for recurring payments coming due inside their reminder window, stamping each item so it is not sent twice in a cycle. |
| **cron.service.js** | Registers all scheduled jobs on server start. |

**Scheduled jobs**

| Job | Schedule |
|-----|----------|
| Weekly summary email | Sundays 09:00 |
| Daily FX rate fetch | 06:00 |
| Daily bill reminders | 08:00 |
| Daily gold price sync | 10:00 (Asia/Karachi) |
| PSX price sync | Weekdays 16:30 (Asia/Karachi), skipping market holidays |
| PSX portfolio snapshot | Weekdays 17:00 (Asia/Karachi), skipping market holidays |
| Nightly net-worth snapshot | 23:55 |

Market holidays come from `PSX_HOLIDAYS` in `backend/src/utils/dates.js`, which needs extending each year.

---

### Database Models

| Model | Key Fields | Relationships |
|-------|-----------|---------------|
| **User** | email, name, role (`user`/`admin`/`super.admin`), app_pin_code, email_verified, must_change_password, terms_accepted_at, privacy_accepted_at, auth_provider, provider_id, avatar_url, deleted_at, deletion_requested_by | Owns every financial model below |
| **MenuVisibility** | path (PK), name, icon, visible_to_roles (array), sort_order | — |
| **NetWorthSnapshot** | captured_at, bank_total, wallet_total, investment_total, asset_total, receivable_total, payable_total, rent_balance_total, expense_total, net_worth | Belongs to User |
| **RecurringPayment** | name, amount, frequency (`weekly`/`monthly`/`yearly`), next_due_date, auto_debit, reminder_days, is_active, last_paid_at | Belongs to User |
| **Debt** | name, debt_type (`credit_card`/`personal_loan`/`mortgage`/`car_loan`/`other`), principal, outstanding, interest_rate, minimum_payment, due_day, target_payoff | Belongs to User; has many DebtPayment |
| **DebtPayment** | amount, paid_at, principal_portion, interest_portion | Belongs to Debt and User |
| **GoldItem** | name, type, weight_grams, carats, purchase_date, purchase_price_per_gram, image_url | Belongs to User |
| **GoldPriceHistory** | date (unique), price_24k_per_tola, price_24k_per_gram, source | Global (not per-user) |
| **GoldPin** | pin_hash | One per User; separate from the app PIN |
| **FxRate** | base, quote, rate, fetched_at, source | Global (not per-user) |
| **Feedback** | type (`bug`/`feature`/`question`/`other`), title, description, screenshot, status | Belongs to User |
| **Expense** | amount, category, expense_date, payment_method, notes | Belongs to User |
| **Bank** | name, account_no, iban_no, currency, exchange_rate, starting_balance, current_balance | Belongs to User; has many BankStatement |
| **BankStatement** | month, year, file_hash, opening_balance, closing_balance, total_credits, total_debits, processing_status | Belongs to Bank; has many BankTransactionLog |
| **BankTransactionLog** | transaction_date, description, debit_amount, credit_amount, net_amount, suggested_category, category_confidence, is_duplicate, user_approved, approved_category | Belongs to BankStatement |
| **Wallet** | name, institution, balance, currency, exchange_rate, color_theme, account_num | Belongs to User; has many WalletStatement |
| **WalletStatement** | month, year, file_hash, opening_balance, closing_balance, total_credits, total_debits, processing_status | Belongs to Wallet; has many WalletTransactionLog |
| **WalletTransactionLog** | transaction_date, description, debit_amount, credit_amount, net_amount, suggested_category, user_approved, approved_category | Belongs to WalletStatement |
| **Stock** | stock_symbol, company_name, current_market_price | Belongs to User; has many StockTransaction |
| **StockTransaction** | buy_date, buy_price, quantity, brokerage_fee | Belongs to Stock and User |
| **PsxStock** | ticker (unique), companyName, price, change, changePct, volume, high, low, marketCap | Global (not per-user); holds only the current price, overwritten each sync |
| **PsxPriceHistory** | ticker, date, open, high, low, close, volume; unique per ticker + date | Global (not per-user); daily closes keyed to the Asia/Karachi trading day |
| **ScrapeRun** | source, status (`success`/`partial`/`failed`), started_at, finished_at, tickers_ok, tickers_failed, error | Global (not per-user) |
| **Watchlist** | ticker, notes, added_at; unique per user + ticker | Belongs to User |
| **StockNews** | ticker, title, link (unique), source, publishedAt | Global (not per-user) |
| **PsxSnapshot** | snapshot_date, total_custody, total_invested, holdings_data (JSON), summary_data (JSON) | Belongs to User; unique per user + date |
| **BankInvestment** | transaction_date, amount (positive = deposit, negative = withdrawal), description | Belongs to User |
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
| **Institution** | name, type (`bank`/`wallet`/`cash`), color | Belongs to User; unique per user + name |
| **CategoryPattern** | keyword, assigned_category, confidence, occurrences | Belongs to User |
| **CategoryCache** | description, category, source (`ai`/`manual`), confidence, hit_count | Belongs to User |
| **ChatSession** | title | Belongs to User; has many ChatMessage |
| **ChatMessage** | role, content, tool_name, tool_data (JSON) | Belongs to ChatSession |
| **ChatDocument** | filename, mime_type, char_count | Belongs to User; has many DocumentChunk |
| **DocumentChunk** | chunk_index, content, embedding (vector) | Belongs to ChatDocument |

---

## Frontend

### Pages

| Route | Component | What it renders |
|-------|-----------|-----------------|
| `/welcome` | Landing | Marketing landing page for signed-out visitors |
| `/login` | Login | Email/password sign-in with Google and Apple buttons |
| `/register` | Register | New account registration form |
| `/forgot-password` | ForgotPassword | Password reset request form |
| `/verify-otp` | OTPVerification | OTP code entry after login |
| `/verify-email` | VerifyEmail | Email confirmation landing page |
| `/change-password` | ChangeFirstPassword | Forced first-login password change |
| `/privacy` · `/terms` | Privacy · Terms | Public legal pages |
| `/` | Dashboard | Net worth hero, cash/invested/liability tiles, history chart, allocation donut |
| `/expenses` | Expenses | Merged spending view: period navigator, trend and category charts, top destinations, expense entry |
| `/accounts` | Accounts | Bank and wallet cards, with a beneficiaries tab (`?tab=beneficiaries`) |
| `/banks/:id` | BankDetail | Statement list, parsed transaction table, approve and categorise workflow |
| `/wallets/:id` | WalletDetail | Same workflow for a wallet |
| `/ledger` | Ledger | Dues and debts in one screen: `?tab=people` for contacts, `?tab=loans` for institutional debt |
| `/debts/:id` | DebtDetail | One debt with its payment history and payoff progress |
| `/stocks` | Stocks | PSX holdings and watchlist tabs, performance chart with range tabs, allocation donut, dividends |
| `/stocks/:id` | StockDetail | TradingView chart and transaction history for one stock |
| `/mutual-funds` | MutualFunds | Summary cards, NAV and allocation charts, upload history |
| `/personal` | Personal | Tabbed: Zakat, Rent, Assets, Gold (tabs filtered by role) |
| `/beneficiaries/:id` | BeneficiaryDetail | Contact details, linked accounts, matched transactions |
| `/reports` | Reports | Transaction log with CSV and PDF export |
| `/assistant` | AiAssistant | Chat with session history, document upload, financial Q&A |
| `/settings` | Settings | Profile, PINs, users, roles, menu visibility, recurring payments |
| `/help` | Help | Help content and the feedback submission form |
| `/design-system` | DesignSystem | Internal component showcase |

**Redirects:** `/dues` → `/ledger?tab=people` · `/debts` → `/ledger?tab=loans` · `/rents`, `/zakat`, `/assets`, `/gold` → `/personal?tab=<tab>` · `/beneficiaries` → `/accounts?tab=beneficiaries` · `/bills` → `/expenses` · `/insights` and `/net-worth` render the merged Expenses and Dashboard pages.

---

### Key Components

| Component | Description |
|-----------|-------------|
| **Layout.jsx** | Page wrapper combining Sidebar and Header with the routed content slot |
| **Sidebar.jsx** | Responsive sidebar whose items come from `/api/menu-visibility`, filtered by role |
| **Header.jsx** | Top bar with page title, theme toggle, and masked-balance reveal |
| **PinGate.jsx** | Full-screen app PIN prompt that gates the app when the session is idle |
| **GoldPinGate.jsx** | Separate PIN lock wrapping the Gold Vault tab |
| **LegalAcceptGate.jsx** | Blocks the app until the user accepts the current terms and privacy policy |
| **LegalPageShell.jsx** | Typographic shell used by the public Privacy and Terms pages |
| **StatementFileUpload.jsx** | Drag-and-drop PDF/CSV uploader for bank and wallet statements |
| **StatementReviewModal.jsx** | Editable grid for reviewing PDF-parsed rows before import, with a live reconciliation banner |
| **CsvMappingModal.jsx** | Maps a bank's CSV columns onto the app's canonical fields, showing a sample value per column |
| **StatementTransactionsModal.jsx** | Parsed statement transactions with approve, edit, and delete actions |
| **BankTransactionsTable.jsx** | Approved transaction list with category filters and export |
| **Drawer.jsx** | Right-side offcanvas panel with backdrop, used for detail and form views |
| **Modal.jsx** | Reusable overlay modal built as a `<div>`, not a `<dialog>` |
| **MaskedBalance.jsx** | Amount display that can be toggled to asterisks for privacy |
| **ChatWindow.jsx** | Scrollable message thread with markdown rendering for the AI assistant |
| **AssistantBubble.jsx** | Single chat message bubble with tool-call display |
| **TradingViewChart.jsx** | Embedded TradingView chart for a PSX ticker |
| **InlineChart.jsx** | Lightweight ECharts sparkline for use inside tables and cards |
| **Sparkline.jsx** | Shared inline trend chart; renders a dash rather than a lone dot when given fewer than two points |
| **ErrorBoundary.jsx** | Catches render errors and shows a fallback UI |
| **auth/SocialAuthButtons.jsx** | Google and Apple sign-in buttons, hidden when the provider is not configured |
| **admin/UserTableRow.jsx** | One user row in Settings with role editing, password reset, and delete actions |
| **admin/RoleTableRow.jsx** | One role row in Settings with inline permission editing |

**Shared UI kit** — `frontend/src/components/ui/` holds the shadcn-based primitives (button, dialog, confirm-dialog, data-table, dropdown-menu, select, switch, calendar, tooltip, sonner, and more). Each has a `.stories.jsx` file; run `npm run storybook` in `frontend/` to browse them.

---

### Hooks

| Hook | Data / Mutation | API Endpoint(s) |
|------|-----------------|-----------------|
| **useBanks.js** | Bank accounts, balance updates, category summary | `/banks`, `/banks/:id`, `/banks/:id/balance`, `/banks/:id/category-summary` |
| **useWallets.js** | Wallet accounts and balance updates | `/wallets`, `/wallets/:id` |
| **useStatementTransactions.js** | Parsed statement rows, bulk approve, category updates | `/banks/:id/transactions`, `/banks/:id/statements/:sid/transactions`, `/banks/:id/bulk-approve` |
| **useStaleResource.js** | Handles 404s from rows deleted in another tab by invalidating the bank/wallet caches | — (cache only) |
| **useStocks.js** | Live PSX market data, news sync, sync freshness, price history | `/stocks/psx`, `/stocks/psx/sync`, `/stocks/psx/status`, `/stocks/psx/history`, `/stocks/:ticker/history`, `/stocks/news/sync`, `/stocks/:ticker/news` |
| **useWatchlist.js** | Tracked-but-not-held tickers | `/watchlist` |
| **usePsx.js** | PSX snapshots and bank investment records | `/psx/snapshots`, `/psx/investments`, `/psx/sync-data` |
| **useMutualFunds.js** | Fund holdings and portfolio snapshots | `/mutual-funds`, `/mutual-funds/snapshots`, `/mutual-funds/upload`, `/mutual-funds/sync-data` |
| **useDividends.js** | Dividend records and sync | `/dividends`, `/dividends/sync` |
| **useGold.js** | Gold items, price sync, price history, vault PIN, zakat summary | `/gold/items`, `/gold/sync-price`, `/gold/latest-price`, `/gold/price-history`, `/gold/has-pin`, `/gold/set-pin`, `/gold/verify-pin`, `/gold/zakat-summary` |
| **useZakat.js** | Zakat entries and dashboard totals | `/zakat`, `/dashboard/summary` |
| **useAssets.js** | Physical asset records | `/assets` |
| **useBrokerAccounts.js** | Broker account credentials | `/broker-accounts` |
| **useInstitutions.js** | Institution name list | `/institutions`, `/institutions/seed` |
| **useBeneficiaries.js** | Beneficiaries, linked accounts, transaction rescan | `/beneficiaries`, `/beneficiaries/:id/accounts`, `/beneficiaries/:id/rescan` |
| **useChat.js** | Chat sessions, messages, and RAG documents | `/chat/sessions`, `/chat/sessions/:id/message`, `/chat/documents` |
| **useMenuAccess.js** | `canSee(path)` for menu items and sub-tabs; fails open while loading | `/menu-visibility` |
