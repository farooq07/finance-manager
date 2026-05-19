# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: beneficiaries.spec.js >> Beneficiaries page >> adds a new beneficiary and it appears in the list
- Location: e2e\beneficiaries.spec.js:32:3

# Error details

```
TimeoutError: page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"
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
          - generic [ref=e24]: KHI · 10:28 am
        - generic [ref=e26]:
          - generic [ref=e27]:
            - heading "Your money, finally in one quiet place." [level=1] [ref=e28]:
              - generic [ref=e29]: Your
              - generic [ref=e30]: money,
              - generic [ref=e31]: finally
              - generic [ref=e32]: in
              - generic [ref=e33]: one
              - generic [ref=e36]: quiet
              - generic [ref=e37]: place.
            - generic [ref=e38]:
              - paragraph [ref=e39]: Track every rupee across your banks, wallets, dues and investments. Upload a statement and let it sort itself. Ask anything in plain English. Pay your Zakat without a spreadsheet.
              - generic [ref=e40]:
                - link "Open your free ledger" [ref=e41] [cursor=pointer]:
                  - /url: /register
                  - text: Open your free ledger
                  - img [ref=e42]
                - link "I already have one" [ref=e44] [cursor=pointer]:
                  - /url: /login
          - generic [ref=e46]:
            - img [ref=e47]
            - generic [ref=e49]:
              - generic [ref=e50]:
                - generic [ref=e53]: Live · All accounts
                - generic [ref=e54]:
                  - img [ref=e55]
                  - text: 4.2%
              - generic [ref=e58]:
                - generic [ref=e59]: PKR
                - generic [ref=e60]: 12,84,520
              - paragraph [ref=e61]: across 6 banks, 3 wallets, 2 funds
              - generic [ref=e62]:
                - img [ref=e63]
                - generic [ref=e80]:
                  - generic [ref=e81]: Dec
                  - generic [ref=e82]: Jan
                  - generic [ref=e83]: Feb
                  - generic [ref=e84]: Mar
                  - generic [ref=e85]: Apr
                  - generic [ref=e86]: May
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
      - generic [ref=e87]: — Issue 01 / Built in Karachi
    - generic [ref=e89]:
      - generic [ref=e90]: Bank statements ·
      - generic [ref=e91]: Wallets ·
      - generic [ref=e92]: Beneficiaries ·
      - generic [ref=e93]: Dues ledger ·
      - generic [ref=e94]: Mutual funds ·
      - generic [ref=e95]: PSX stocks ·
      - generic [ref=e96]: Rent tracker ·
      - generic [ref=e97]: Zakat ·
      - generic [ref=e98]: Physical assets ·
      - generic [ref=e99]: Cash flow ·
      - generic [ref=e100]: AI assistant ·
      - generic [ref=e101]: Auto-categorise ·
      - generic [ref=e102]: Bank statements ·
      - generic [ref=e103]: Wallets ·
      - generic [ref=e104]: Beneficiaries ·
      - generic [ref=e105]: Dues ledger ·
      - generic [ref=e106]: Mutual funds ·
      - generic [ref=e107]: PSX stocks ·
      - generic [ref=e108]: Rent tracker ·
      - generic [ref=e109]: Zakat ·
      - generic [ref=e110]: Physical assets ·
      - generic [ref=e111]: Cash flow ·
      - generic [ref=e112]: AI assistant ·
      - generic [ref=e113]: Auto-categorise ·
      - generic [ref=e114]: Bank statements ·
      - generic [ref=e115]: Wallets ·
      - generic [ref=e116]: Beneficiaries ·
      - generic [ref=e117]: Dues ledger ·
      - generic [ref=e118]: Mutual funds ·
      - generic [ref=e119]: PSX stocks ·
      - generic [ref=e120]: Rent tracker ·
      - generic [ref=e121]: Zakat ·
      - generic [ref=e122]: Physical assets ·
      - generic [ref=e123]: Cash flow ·
      - generic [ref=e124]: AI assistant ·
      - generic [ref=e125]: Auto-categorise ·
    - generic [ref=e127]:
      - generic [ref=e128]:
        - paragraph [ref=e129]: § Index of contents
        - heading "Twelve kinds of money, one clear ledger." [level=2] [ref=e130]:
          - text: Twelve kinds of money,
          - generic [ref=e131]:
            - text: one
            - generic [ref=e133]: clear
          - text: ledger.
      - generic [ref=e134]:
        - article [ref=e135]:
          - generic [ref=e136]:
            - generic [ref=e137]: 01 —
            - heading "Bank accounts" [level=3] [ref=e138]
          - paragraph [ref=e139]: Multiple banks, multi-currency, balance auto-synced from your uploaded statement.
        - article [ref=e140]:
          - generic [ref=e141]:
            - generic [ref=e142]: 02 —
            - heading "Wallets & cash" [level=3] [ref=e143]
          - paragraph [ref=e144]: NayaPay, Easypaisa, JazzCash, your wallet, your drawer. All on one ledger.
        - article [ref=e145]:
          - generic [ref=e146]:
            - generic [ref=e147]: 03 —
            - heading "Beneficiaries" [level=3] [ref=e148]
          - paragraph [ref=e149]: Name a contact once. Every transfer to them is auto-linked across statements.
        - article [ref=e150]:
          - generic [ref=e151]:
            - generic [ref=e152]: 04 —
            - heading "Dues ledger" [level=3] [ref=e153]
          - paragraph [ref=e154]: Who owes you, who you owe. Send reminders by email when it gets uncomfortable.
        - article [ref=e155]:
          - generic [ref=e156]:
            - generic [ref=e157]: 05 —
            - heading "Mutual funds" [level=3] [ref=e158]
          - paragraph [ref=e159]: NAV-tracked daily. See realised gains, holding period, and tax position at a glance.
        - article [ref=e160]:
          - generic [ref=e161]:
            - generic [ref=e162]: 06 —
            - heading "PSX stocks" [level=3] [ref=e163]
          - paragraph [ref=e164]: Symbol-level P&L with the live PSX feed. Dividends auto-credited to the right book.
        - article [ref=e165]:
          - generic [ref=e166]:
            - generic [ref=e167]: 07 —
            - heading "Rent tracker" [level=3] [ref=e168]
          - paragraph [ref=e169]: Tenants, due dates, late fees, deposits. Quietly nudges you when the month begins.
        - article [ref=e170]:
          - generic [ref=e171]:
            - generic [ref=e172]: 08 —
            - heading "Zakat" [level=3] [ref=e173]
          - paragraph [ref=e174]: A real Hijri calendar. Nisab threshold check. One number when the day comes.
        - article [ref=e175]:
          - generic [ref=e176]:
            - generic [ref=e177]: 09 —
            - heading "Physical assets" [level=3] [ref=e178]
          - paragraph [ref=e179]: Gold, property, vehicles, anything that isn't liquid. Valued, dated, and on the books.
        - article [ref=e180]:
          - generic [ref=e181]:
            - generic [ref=e182]: 10 —
            - heading "Expenses" [level=3] [ref=e183]
          - paragraph [ref=e184]: AI categorisation that learns your style. Override once, it remembers forever.
        - article [ref=e185]:
          - generic [ref=e186]:
            - generic [ref=e187]: 11 —
            - heading "AI assistant" [level=3] [ref=e188]
          - paragraph [ref=e189]: Ask it anything. It runs a real query on your real data — never makes numbers up.
        - article [ref=e190]:
          - generic [ref=e191]:
            - generic [ref=e192]: 12 —
            - heading "Reports" [level=3] [ref=e193]
          - paragraph [ref=e194]: Monthly summaries delivered to your inbox. Category breakdowns when you want them.
    - generic [ref=e195]:
      - generic [ref=e197]:
        - generic [ref=e198]:
          - generic [ref=e199]: 01 — Statements
          - heading "Upload your PDF. That's the end of the work." [level=3] [ref=e200]:
            - text: Upload your PDF.
            - text: That's the end of the work.
          - paragraph [ref=e201]: Drop in a bank statement — protected or not, scanned or digital — and it parses every row, de-duplicates against history, classifies each line into the right category, and updates your account balance from the closing figure. You review, you approve, you're done.
          - generic [ref=e202]:
            - img [ref=e203]
            - text: PDF · CSV · Password-protected · Scanned
        - generic [ref=e207]:
          - generic [ref=e208]:
            - generic [ref=e209]:
              - paragraph [ref=e210]: HBL · ****4521
              - paragraph [ref=e211]: May 2026 Statement
            - generic [ref=e212]:
              - paragraph [ref=e213]: Closing balance
              - paragraph [ref=e214]: PKR 1,006,232.25
          - generic [ref=e215]:
            - generic [ref=e216]:
              - generic [ref=e217]: 07/05
              - generic [ref=e218]: RAAST P2P · Hamza
              - generic [ref=e219]: Transfer
              - generic [ref=e220]: "-200,000"
            - generic [ref=e221]:
              - generic [ref=e222]: 06/05
              - generic [ref=e223]: SALARY · ACME Pvt Ltd
              - generic [ref=e224]: Salary
              - generic [ref=e225]: +450,000
            - generic [ref=e226]:
              - generic [ref=e227]: 05/05
              - generic [ref=e228]: FOODPANDA
              - generic [ref=e229]: Food
              - generic [ref=e230]: "-1,840"
            - generic [ref=e231]:
              - generic [ref=e232]: 04/05
              - generic [ref=e233]: K-ELECTRIC BILL
              - generic [ref=e234]: Utilities
              - generic [ref=e235]: "-12,450"
            - generic [ref=e236]:
              - generic [ref=e237]: 02/05
              - generic [ref=e238]: METRO CASH&CARRY
              - generic [ref=e239]: Groceries
              - generic [ref=e240]: "-6,720"
          - generic [ref=e241]:
            - generic [ref=e242]: 847 transactions parsed in 4.2s
            - generic [ref=e243]:
              - img [ref=e244]
              - text: Auto-categorised
      - generic [ref=e248]:
        - generic [ref=e250]:
          - generic [ref=e252]: How much did I spend on food last month?
          - generic [ref=e253]:
            - paragraph [ref=e254]: You spent PKR 38,420 on food in April 2026 across 23 transactions. Foodpanda accounted for 41% of that.
            - generic [ref=e255]:
              - generic [ref=e256]:
                - generic [ref=e257]: Foodpanda
                - generic [ref=e258]:
                  - generic [ref=e259]: 41%
                  - generic [ref=e260]: PKR 15,820
              - generic [ref=e261]:
                - generic [ref=e262]: Cheetay
                - generic [ref=e263]:
                  - generic [ref=e264]: 24%
                  - generic [ref=e265]: PKR 9,240
              - generic [ref=e266]:
                - generic [ref=e267]: Local restaurants
                - generic [ref=e268]:
                  - generic [ref=e269]: 22%
                  - generic [ref=e270]: PKR 8,360
              - generic [ref=e271]:
                - generic [ref=e272]: Groceries
                - generic [ref=e273]:
                  - generic [ref=e274]: 13%
                  - generic [ref=e275]: PKR 5,000
          - generic [ref=e276]:
            - generic [ref=e277]: "Tool called:"
            - generic [ref=e278]: getExpenseSummary(months=1, category="Food")
        - generic [ref=e279]:
          - generic [ref=e280]: 02 — Assistant
          - heading "Ask in English. Get an honest answer." [level=3] [ref=e281]:
            - text: Ask in English.
            - text: Get an honest answer.
          - paragraph [ref=e282]: Most "AI for finance" tools hallucinate numbers. Ours runs a real query on your real data and shows you the rows it used. Twelve hand-built tools cover every common question — and when it can't answer, it tells you instead of guessing.
          - generic [ref=e283]:
            - img [ref=e284]
            - text: Function-calling RAG · Gemini + Groq fallback
      - generic [ref=e287]:
        - generic [ref=e288]:
          - generic [ref=e289]: 03 — Made here
          - heading "Built for the way Pakistan handles money." [level=3] [ref=e290]:
            - text: Built for the way
            - text: Pakistan handles money.
          - paragraph [ref=e291]: Every value is PKR. Every Hijri date is real. Every bank format — HBL, MCB, Meezan, Standard Chartered, Bank Alfalah — is supported out of the box. Statements come password-protected. We handle that too.
        - generic [ref=e293]:
          - generic [ref=e294]:
            - paragraph [ref=e295]: HBL
            - paragraph [ref=e296]: Habib Bank
          - generic [ref=e297]:
            - paragraph [ref=e298]: MCB
            - paragraph [ref=e299]: MCB Bank
          - generic [ref=e300]:
            - paragraph [ref=e301]: Meezan
            - paragraph [ref=e302]: Islamic Banking
          - generic [ref=e303]:
            - paragraph [ref=e304]: SCB
            - paragraph [ref=e305]: Standard Chartered
          - generic [ref=e306]:
            - paragraph [ref=e307]: BAFL
            - paragraph [ref=e308]: Bank Alfalah
          - generic [ref=e309]:
            - paragraph [ref=e310]: UBL
            - paragraph [ref=e311]: United Bank
          - generic [ref=e312]:
            - paragraph [ref=e313]: NayaPay
            - paragraph [ref=e314]: Wallet
          - generic [ref=e315]:
            - paragraph [ref=e316]: Easypaisa
            - paragraph [ref=e317]: Wallet
    - generic [ref=e320]:
      - generic [ref=e321]:
        - paragraph [ref=e322]: 12L+
        - paragraph [ref=e323]: PKR tracked across early users
      - generic [ref=e324]:
        - paragraph [ref=e325]: "8"
        - paragraph [ref=e326]: Pakistani banks parsed natively
      - generic [ref=e327]:
        - paragraph [ref=e328]: "12"
        - paragraph [ref=e329]: Tools the AI can run on your data
      - generic [ref=e330]:
        - paragraph [ref=e331]: "0"
        - paragraph [ref=e332]: Numbers ever made up
    - generic [ref=e334]:
      - generic [ref=e335]:
        - paragraph [ref=e336]: § A note on safety
        - heading "You bring the data. We keep it to ourselves." [level=2] [ref=e337]:
          - text: You bring the data.
          - text: We keep it to ourselves.
      - generic [ref=e338]:
        - generic [ref=e339]:
          - img [ref=e340]
          - heading "Row-level security on every table" [level=3] [ref=e343]
          - paragraph [ref=e344]: Postgres RLS denies all anon access by default. Even a leaked API key cannot read a row.
        - generic [ref=e345]:
          - img [ref=e346]
          - heading "Two-factor by default" [level=3] [ref=e349]
          - paragraph [ref=e350]: Every sign-in needs a 6-digit code sent to your email. Sessions expire after 7 days.
        - generic [ref=e351]:
          - img [ref=e352]
          - heading "Master PIN gate" [level=3] [ref=e361]
          - paragraph [ref=e362]: A six-digit PIN you choose stands between casual eyes and your balance figures.
    - generic [ref=e365]:
      - generic [ref=e366]:
        - paragraph [ref=e367]: § Step one
        - heading "Take your money thoughtfully , gently." [level=2] [ref=e368]:
          - text: Take your money
          - generic [ref=e371]: thoughtfully
          - text: ", gently."
      - generic [ref=e372]:
        - link "Begin" [ref=e373] [cursor=pointer]:
          - /url: /register
          - text: Begin
          - img [ref=e374]
        - paragraph [ref=e377]:
          - text: Free while we're small.
          - text: No card asked. Cancel anytime.
    - contentinfo [ref=e378]:
      - generic [ref=e379]:
        - generic [ref=e381]: FSWealth Axis
        - paragraph [ref=e382]: © 2026 — Designed and built in Karachi.
        - generic [ref=e383]:
          - link "Sign in" [ref=e384] [cursor=pointer]:
            - /url: /login
          - link "Start free" [ref=e385] [cursor=pointer]:
            - /url: /register
```

# Test source

```ts
  1  | import { test as base } from '@playwright/test';
  2  | 
  3  | async function injectToken(page, token, baseURL) {
  4  |   // Go to login page first so localStorage is writable on the app's origin
  5  |   await page.goto(baseURL + '/login');
  6  |   await page.evaluate((t) => {
  7  |     localStorage.setItem('token', t);
  8  |   }, token);
  9  | 
  10 |   // Navigate to root and wait for the /auth/me validation to complete
  11 |   await Promise.all([
> 12 |     page.waitForResponse(
     |          ^ TimeoutError: page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"
  13 |       (resp) => resp.url().includes('/auth/me') && resp.status() === 200,
  14 |       { timeout: 10_000 }
  15 |     ),
  16 |     page.goto(baseURL + '/'),
  17 |   ]);
  18 | 
  19 |   // Wait for any sidebar/nav element to confirm the app shell is rendered
  20 |   await page.waitForSelector('nav a, aside a, [data-testid="sidebar"]', { timeout: 10_000 }).catch(() => {});
  21 | }
  22 | 
  23 | export const test = base.extend({
  24 |   /** Authenticated as a regular user */
  25 |   page: async ({ page, baseURL }, use) => {
  26 |     const token = process.env.E2E_USER_TOKEN;
  27 |     if (!token) throw new Error('E2E_USER_TOKEN is not set in .env.test');
  28 |     await injectToken(page, token, baseURL);
  29 |     await use(page);
  30 |   },
  31 | });
  32 | 
  33 | export const adminTest = base.extend({
  34 |   /** Authenticated as an admin / super.admin user */
  35 |   page: async ({ page, baseURL }, use) => {
  36 |     const token = process.env.E2E_ADMIN_TOKEN;
  37 |     if (!token) throw new Error('E2E_ADMIN_TOKEN is not set in .env.test');
  38 |     await injectToken(page, token, baseURL);
  39 |     await use(page);
  40 |   },
  41 | });
  42 | 
  43 | export { expect } from '@playwright/test';
  44 | 
```