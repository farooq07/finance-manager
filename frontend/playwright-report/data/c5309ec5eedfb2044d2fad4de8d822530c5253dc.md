# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> Login page >> unauthenticated user is redirected from / to /login
- Location: e2e\auth.spec.js:20:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/login/
Received string:  "http://localhost:5173/welcome"
Timeout: 15000ms

Call log:
  - Expect "toHaveURL" with timeout 15000ms
    18 × unexpected value "http://localhost:5173/welcome"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - link "FSWealth Axis" [ref=e6] [cursor=pointer]:
          - /url: /welcome
          - generic [ref=e7]: FSWealth Axis
        - navigation [ref=e8]:
          - link "What's tracked" [ref=e9] [cursor=pointer]:
            - /url: "#tracked"
          - link "How it works" [ref=e10] [cursor=pointer]:
            - /url: "#pillars"
          - link "Trust" [ref=e11] [cursor=pointer]:
            - /url: "#trust"
        - generic [ref=e12]:
          - link "Sign in" [ref=e13] [cursor=pointer]:
            - /url: /login
          - link "Start free" [ref=e14] [cursor=pointer]:
            - /url: /register
            - text: Start free
            - img [ref=e15]
    - generic [ref=e17]:
      - generic [ref=e18]:
        - generic [ref=e19]:
          - generic [ref=e21]: Volume I
          - generic [ref=e22]: ·
          - generic [ref=e23]: Personal finance, made for Pakistan
          - generic [ref=e24]: KHI · 11:33 pm
        - generic [ref=e26]:
          - generic [ref=e27]:
            - heading "Your money, finally in one quiet place." [level=1] [ref=e28]:
              - generic [ref=e29]: Your
              - generic [ref=e30]: money,
              - generic [ref=e31]: finally
              - generic [ref=e32]: in
              - generic [ref=e33]: one
              - generic [ref=e34]: quiet
              - generic [ref=e35]: place.
            - generic [ref=e36]:
              - paragraph [ref=e37]: Track every rupee across your banks, wallets, dues and investments. Upload a statement and let it sort itself. Ask anything in plain English. Pay your Zakat without a spreadsheet.
              - generic [ref=e38]:
                - link "Open your free ledger" [ref=e39] [cursor=pointer]:
                  - /url: /register
                  - text: Open your free ledger
                  - img [ref=e40]
                - link "I already have one" [ref=e42] [cursor=pointer]:
                  - /url: /login
          - generic [ref=e44]:
            - img [ref=e45]
            - generic [ref=e47]:
              - generic [ref=e48]:
                - generic [ref=e51]: Live · All accounts
                - generic [ref=e52]:
                  - img [ref=e53]
                  - text: 4.2%
              - generic [ref=e56]:
                - generic [ref=e57]: PKR
                - generic [ref=e58]: 12,84,520
              - paragraph [ref=e59]: across 6 banks, 3 wallets, 2 funds
              - generic [ref=e60]:
                - img [ref=e61]
                - generic [ref=e78]:
                  - generic [ref=e79]: Dec
                  - generic [ref=e80]: Jan
                  - generic [ref=e81]: Feb
                  - generic [ref=e82]: Mar
                  - generic [ref=e83]: Apr
                  - generic [ref=e84]: May
            - generic:
              - generic:
                - generic:
                  - img
                - generic: Salary
                - generic: +450,000
              - generic:
                - generic:
                  - img
                - generic: K-Electric
                - generic: −12,450
              - generic:
                - generic:
                  - img
                - generic: Auto-categorised
                - generic: 847 rows
      - generic [ref=e85]: — Issue 01 / Built in Karachi
    - generic [ref=e87]:
      - generic [ref=e88]: Bank statements ·
      - generic [ref=e89]: Wallets ·
      - generic [ref=e90]: Beneficiaries ·
      - generic [ref=e91]: Dues ledger ·
      - generic [ref=e92]: Mutual funds ·
      - generic [ref=e93]: PSX stocks ·
      - generic [ref=e94]: Rent tracker ·
      - generic [ref=e95]: Zakat ·
      - generic [ref=e96]: Physical assets ·
      - generic [ref=e97]: Cash flow ·
      - generic [ref=e98]: AI assistant ·
      - generic [ref=e99]: Auto-categorise ·
      - generic [ref=e100]: Bank statements ·
      - generic [ref=e101]: Wallets ·
      - generic [ref=e102]: Beneficiaries ·
      - generic [ref=e103]: Dues ledger ·
      - generic [ref=e104]: Mutual funds ·
      - generic [ref=e105]: PSX stocks ·
      - generic [ref=e106]: Rent tracker ·
      - generic [ref=e107]: Zakat ·
      - generic [ref=e108]: Physical assets ·
      - generic [ref=e109]: Cash flow ·
      - generic [ref=e110]: AI assistant ·
      - generic [ref=e111]: Auto-categorise ·
      - generic [ref=e112]: Bank statements ·
      - generic [ref=e113]: Wallets ·
      - generic [ref=e114]: Beneficiaries ·
      - generic [ref=e115]: Dues ledger ·
      - generic [ref=e116]: Mutual funds ·
      - generic [ref=e117]: PSX stocks ·
      - generic [ref=e118]: Rent tracker ·
      - generic [ref=e119]: Zakat ·
      - generic [ref=e120]: Physical assets ·
      - generic [ref=e121]: Cash flow ·
      - generic [ref=e122]: AI assistant ·
      - generic [ref=e123]: Auto-categorise ·
    - generic [ref=e125]:
      - generic [ref=e126]:
        - paragraph [ref=e127]: § Index of contents
        - heading "Twelve kinds of money, one quiet ledger." [level=2] [ref=e128]:
          - text: Twelve kinds of money,
          - text: one quiet ledger.
      - generic [ref=e129]:
        - article [ref=e130]:
          - generic [ref=e131]:
            - generic [ref=e132]: 01 —
            - heading "Bank accounts" [level=3] [ref=e133]
          - paragraph [ref=e134]: Multiple banks, multi-currency, balance auto-synced from your uploaded statement.
        - article [ref=e135]:
          - generic [ref=e136]:
            - generic [ref=e137]: 02 —
            - heading "Wallets & cash" [level=3] [ref=e138]
          - paragraph [ref=e139]: NayaPay, Easypaisa, JazzCash, your wallet, your drawer. All on one ledger.
        - article [ref=e140]:
          - generic [ref=e141]:
            - generic [ref=e142]: 03 —
            - heading "Beneficiaries" [level=3] [ref=e143]
          - paragraph [ref=e144]: Name a contact once. Every transfer to them is auto-linked across statements.
        - article [ref=e145]:
          - generic [ref=e146]:
            - generic [ref=e147]: 04 —
            - heading "Dues ledger" [level=3] [ref=e148]
          - paragraph [ref=e149]: Who owes you, who you owe. Send reminders by email when it gets uncomfortable.
        - article [ref=e150]:
          - generic [ref=e151]:
            - generic [ref=e152]: 05 —
            - heading "Mutual funds" [level=3] [ref=e153]
          - paragraph [ref=e154]: NAV-tracked daily. See realised gains, holding period, and tax position at a glance.
        - article [ref=e155]:
          - generic [ref=e156]:
            - generic [ref=e157]: 06 —
            - heading "PSX stocks" [level=3] [ref=e158]
          - paragraph [ref=e159]: Symbol-level P&L with the live PSX feed. Dividends auto-credited to the right book.
        - article [ref=e160]:
          - generic [ref=e161]:
            - generic [ref=e162]: 07 —
            - heading "Rent tracker" [level=3] [ref=e163]
          - paragraph [ref=e164]: Tenants, due dates, late fees, deposits. Quietly nudges you when the month begins.
        - article [ref=e165]:
          - generic [ref=e166]:
            - generic [ref=e167]: 08 —
            - heading "Zakat" [level=3] [ref=e168]
          - paragraph [ref=e169]: A real Hijri calendar. Nisab threshold check. One number when the day comes.
        - article [ref=e170]:
          - generic [ref=e171]:
            - generic [ref=e172]: 09 —
            - heading "Physical assets" [level=3] [ref=e173]
          - paragraph [ref=e174]: Gold, property, vehicles, anything that isn't liquid. Valued, dated, and on the books.
        - article [ref=e175]:
          - generic [ref=e176]:
            - generic [ref=e177]: 10 —
            - heading "Expenses" [level=3] [ref=e178]
          - paragraph [ref=e179]: AI categorisation that learns your style. Override once, it remembers forever.
        - article [ref=e180]:
          - generic [ref=e181]:
            - generic [ref=e182]: 11 —
            - heading "AI assistant" [level=3] [ref=e183]
          - paragraph [ref=e184]: Ask it anything. It runs a real query on your real data — never makes numbers up.
        - article [ref=e185]:
          - generic [ref=e186]:
            - generic [ref=e187]: 12 —
            - heading "Reports" [level=3] [ref=e188]
          - paragraph [ref=e189]: Monthly summaries delivered to your inbox. Category breakdowns when you want them.
    - generic [ref=e190]:
      - generic [ref=e192]:
        - generic [ref=e193]:
          - generic [ref=e194]: 01 — Statements
          - heading "Upload your PDF. That's the end of the work." [level=3] [ref=e195]:
            - text: Upload your PDF.
            - text: That's the end of the work.
          - paragraph [ref=e196]: Drop in a bank statement — protected or not, scanned or digital — and it parses every row, de-duplicates against history, classifies each line into the right category, and updates your account balance from the closing figure. You review, you approve, you're done.
          - generic [ref=e197]:
            - img [ref=e198]
            - text: PDF · CSV · Password-protected · Scanned
        - generic [ref=e202]:
          - generic [ref=e203]:
            - generic [ref=e204]:
              - paragraph [ref=e205]: HBL · ****4521
              - paragraph [ref=e206]: May 2026 Statement
            - generic [ref=e207]:
              - paragraph [ref=e208]: Closing balance
              - paragraph [ref=e209]: PKR 1,006,232.25
          - generic [ref=e210]:
            - generic [ref=e211]:
              - generic [ref=e212]: 07/05
              - generic [ref=e213]: RAAST P2P · Hamza
              - generic [ref=e214]: Transfer
              - generic [ref=e215]: "-200,000"
            - generic [ref=e216]:
              - generic [ref=e217]: 06/05
              - generic [ref=e218]: SALARY · ACME Pvt Ltd
              - generic [ref=e219]: Salary
              - generic [ref=e220]: +450,000
            - generic [ref=e221]:
              - generic [ref=e222]: 05/05
              - generic [ref=e223]: FOODPANDA
              - generic [ref=e224]: Food
              - generic [ref=e225]: "-1,840"
            - generic [ref=e226]:
              - generic [ref=e227]: 04/05
              - generic [ref=e228]: K-ELECTRIC BILL
              - generic [ref=e229]: Utilities
              - generic [ref=e230]: "-12,450"
            - generic [ref=e231]:
              - generic [ref=e232]: 02/05
              - generic [ref=e233]: METRO CASH&CARRY
              - generic [ref=e234]: Groceries
              - generic [ref=e235]: "-6,720"
          - generic [ref=e236]:
            - generic [ref=e237]: 847 transactions parsed in 4.2s
            - generic [ref=e238]:
              - img [ref=e239]
              - text: Auto-categorised
      - generic [ref=e243]:
        - generic [ref=e245]:
          - generic [ref=e247]: How much did I spend on food last month?
          - generic [ref=e248]:
            - paragraph [ref=e249]: You spent PKR 38,420 on food in April 2026 across 23 transactions. Foodpanda accounted for 41% of that.
            - generic [ref=e250]:
              - generic [ref=e251]:
                - generic [ref=e252]: Foodpanda
                - generic [ref=e253]:
                  - generic [ref=e254]: 41%
                  - generic [ref=e255]: PKR 15,820
              - generic [ref=e256]:
                - generic [ref=e257]: Cheetay
                - generic [ref=e258]:
                  - generic [ref=e259]: 24%
                  - generic [ref=e260]: PKR 9,240
              - generic [ref=e261]:
                - generic [ref=e262]: Local restaurants
                - generic [ref=e263]:
                  - generic [ref=e264]: 22%
                  - generic [ref=e265]: PKR 8,360
              - generic [ref=e266]:
                - generic [ref=e267]: Groceries
                - generic [ref=e268]:
                  - generic [ref=e269]: 13%
                  - generic [ref=e270]: PKR 5,000
          - generic [ref=e271]:
            - generic [ref=e272]: "Tool called:"
            - generic [ref=e273]: getExpenseSummary(months=1, category="Food")
        - generic [ref=e274]:
          - generic [ref=e275]: 02 — Assistant
          - heading "Ask in English. Get an honest answer." [level=3] [ref=e276]:
            - text: Ask in English.
            - text: Get an honest answer.
          - paragraph [ref=e277]: Most "AI for finance" tools hallucinate numbers. Ours runs a real query on your real data and shows you the rows it used. Twelve hand-built tools cover every common question — and when it can't answer, it tells you instead of guessing.
          - generic [ref=e278]:
            - img [ref=e279]
            - text: Function-calling RAG · Gemini + Groq fallback
      - generic [ref=e282]:
        - generic [ref=e283]:
          - generic [ref=e284]: 03 — Made here
          - heading "Built for the way Pakistan handles money." [level=3] [ref=e285]:
            - text: Built for the way
            - text: Pakistan handles money.
          - paragraph [ref=e286]: Every value is PKR. Every Hijri date is real. Every bank format — HBL, MCB, Meezan, Standard Chartered, Bank Alfalah — is supported out of the box. Statements come password-protected. We handle that too.
        - generic [ref=e288]:
          - generic [ref=e289]:
            - paragraph [ref=e290]: HBL
            - paragraph [ref=e291]: Habib Bank
          - generic [ref=e292]:
            - paragraph [ref=e293]: MCB
            - paragraph [ref=e294]: MCB Bank
          - generic [ref=e295]:
            - paragraph [ref=e296]: Meezan
            - paragraph [ref=e297]: Islamic Banking
          - generic [ref=e298]:
            - paragraph [ref=e299]: SCB
            - paragraph [ref=e300]: Standard Chartered
          - generic [ref=e301]:
            - paragraph [ref=e302]: BAFL
            - paragraph [ref=e303]: Bank Alfalah
          - generic [ref=e304]:
            - paragraph [ref=e305]: UBL
            - paragraph [ref=e306]: United Bank
          - generic [ref=e307]:
            - paragraph [ref=e308]: NayaPay
            - paragraph [ref=e309]: Wallet
          - generic [ref=e310]:
            - paragraph [ref=e311]: Easypaisa
            - paragraph [ref=e312]: Wallet
    - generic [ref=e315]:
      - generic [ref=e316]:
        - paragraph [ref=e317]: 12L+
        - paragraph [ref=e318]: PKR tracked across early users
      - generic [ref=e319]:
        - paragraph [ref=e320]: "8"
        - paragraph [ref=e321]: Pakistani banks parsed natively
      - generic [ref=e322]:
        - paragraph [ref=e323]: "12"
        - paragraph [ref=e324]: Tools the AI can run on your data
      - generic [ref=e325]:
        - paragraph [ref=e326]: "0"
        - paragraph [ref=e327]: Numbers ever made up
    - generic [ref=e329]:
      - generic [ref=e330]:
        - paragraph [ref=e331]: § A note on safety
        - heading "You bring the data. We keep it to ourselves." [level=2] [ref=e332]:
          - text: You bring the data.
          - text: We keep it to ourselves.
      - generic [ref=e333]:
        - generic [ref=e334]:
          - img [ref=e335]
          - heading "Row-level security on every table" [level=3] [ref=e338]
          - paragraph [ref=e339]: Postgres RLS denies all anon access by default. Even a leaked API key cannot read a row.
        - generic [ref=e340]:
          - img [ref=e341]
          - heading "Two-factor by default" [level=3] [ref=e344]
          - paragraph [ref=e345]: Every sign-in needs a 6-digit code sent to your email. Sessions expire after 7 days.
        - generic [ref=e346]:
          - img [ref=e347]
          - heading "Master PIN gate" [level=3] [ref=e356]
          - paragraph [ref=e357]: A six-digit PIN you choose stands between casual eyes and your balance figures.
    - generic [ref=e360]:
      - generic [ref=e361]:
        - paragraph [ref=e362]: § Step one
        - heading "Take your money seriously, gently." [level=2] [ref=e363]:
          - text: Take your money
          - text: seriously, gently.
      - generic [ref=e364]:
        - link "Begin" [ref=e365] [cursor=pointer]:
          - /url: /register
          - text: Begin
          - img [ref=e366]
        - paragraph [ref=e369]:
          - text: Free while we're small.
          - text: No card asked. Cancel anytime.
    - contentinfo [ref=e370]:
      - generic [ref=e371]:
        - generic [ref=e373]: FSWealth Axis
        - paragraph [ref=e374]: © 2026 — Designed and built in Karachi.
        - generic [ref=e375]:
          - link "Sign in" [ref=e376] [cursor=pointer]:
            - /url: /login
          - link "Start free" [ref=e377] [cursor=pointer]:
            - /url: /register
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Login page', () => {
  4  |   test('renders login form', async ({ page }) => {
  5  |     await page.goto('/login');
  6  |     await expect(page.locator('#login-identifier')).toBeVisible();
  7  |     await expect(page.locator('#login-password')).toBeVisible();
  8  |     await expect(page.locator('#login-submit')).toBeVisible();
  9  |   });
  10 | 
  11 |   test('shows error on wrong credentials', async ({ page }) => {
  12 |     await page.goto('/login');
  13 |     await page.fill('#login-identifier', 'wrong@example.com');
  14 |     await page.fill('#login-password', 'wrongpassword123');
  15 |     await page.click('#login-submit');
  16 |     // Backend returns an error message in a red box
  17 |     await expect(page.locator('text=/invalid|incorrect|failed|not found/i').first()).toBeVisible({ timeout: 8000 });
  18 |   });
  19 | 
  20 |   test('unauthenticated user is redirected from / to /login', async ({ page }) => {
  21 |     await page.goto('/');
> 22 |     await expect(page).toHaveURL(/\/login/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  23 |   });
  24 | 
  25 |   test('unauthenticated user is redirected from /expenses to /login', async ({ page }) => {
  26 |     await page.goto('/expenses');
  27 |     await expect(page).toHaveURL(/\/login/);
  28 |   });
  29 | });
  30 | 
```