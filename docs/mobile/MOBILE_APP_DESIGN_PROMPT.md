# Finance Manager — Complete Mobile App UI/UX Design Prompt

> Hand this document to any UI/UX designer or AI design tool (Figma AI, Galileo, Framer AI, Uizard, etc.).
> It contains everything needed to design all screens with zero additional context.

---

## 1. PROJECT BRIEF

**App Name:** Finance Manager
**Type:** Personal Finance & Investment Tracking Mobile App
**Target Users:** Pakistani professionals managing personal finances, investments, and dues
**Primary Currency:** PKR (Pakistani Rupee)
**Platform:** iOS and Android (design both, prioritize iOS first)
**Reference Device:** iPhone 14 Pro — 393 × 852 pt @ 3x (use for all mockups)
**Android reference:** Pixel 7 — 412 × 892 dp

### What the app does:
- Tracks personal expenses by category and payment method
- Manages mutual fund portfolio (CSV upload, NAV, gain/loss tracking)
- Tracks stock portfolio with PSX (Pakistan Stock Exchange) live prices
- Manages a dues ledger (money owed to/from people)
- Records rental income entries
- Manages bank accounts and digital wallets
- Tracks physical assets (property, gold, vehicles)
- Records zakat payments
- Shows a comprehensive financial dashboard with net worth

---

## 2. BRAND & VISUAL IDENTITY

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#0F172A` | App background (dark mode), headers |
| `accent` | `#10B981` | Buttons, CTAs, positive values, gains |
| `accent-light` | `#D1FAE5` | Accent backgrounds, chip backgrounds |
| `warning` | `#F59E0B` | Alerts, pending states, amber highlights |
| `danger` | `#EF4444` | Losses, errors, delete actions, payables |
| `danger-light` | `#FEE2E2` | Danger chip backgrounds |
| `surface` | `#FFFFFF` | Card backgrounds (light mode) |
| `surface-dark` | `#1E293B` | Card backgrounds (dark mode) |
| `bg-light` | `#F8FAFC` | Page background (light mode) |
| `bg-dark` | `#0F172A` | Page background (dark mode) |
| `text-primary` | `#0F172A` | Primary text (light mode) |
| `text-primary-dark` | `#F1F5F9` | Primary text (dark mode) |
| `text-secondary` | `#64748B` | Secondary text, labels |
| `text-muted` | `#94A3B8` | Placeholder text, captions |
| `border` | `#E2E8F0` | Dividers, input borders |
| `border-dark` | `#334155` | Dark mode borders |
| `gain` | `#10B981` | Positive amounts, receivables |
| `loss` | `#EF4444` | Negative amounts, payables |
| `masked` | `#94A3B8` | Masked balance text (****) |

### Typography

| Style | Font | Size | Weight | Line Height |
|---|---|---|---|---|
| Display | Inter | 28pt | 700 (Bold) | 34pt |
| Title | Inter | 22pt | 700 (Bold) | 28pt |
| Subtitle | Inter | 18pt | 600 (Semibold) | 24pt |
| Body Large | Inter | 16pt | 400 (Regular) | 22pt |
| Body | Inter | 15pt | 400 (Regular) | 21pt |
| Body Medium | Inter | 15pt | 500 (Medium) | 21pt |
| Caption | Inter | 13pt | 400 (Regular) | 18pt |
| Caption Medium | Inter | 13pt | 500 (Medium) | 18pt |
| Micro | Inter | 11pt | 500 (Medium) | 15pt |
| Mono Amount | Inter | 20pt | 700 (Bold) | 26pt |

> Use SF Pro on iOS system-level elements. Use Inter for all app content.

### Shape & Elevation

| Element | Corner Radius | Shadow |
|---|---|---|
| Card (main) | 16pt | `0 2px 12px rgba(0,0,0,0.08)` |
| Card (nested) | 12pt | None |
| Input field | 12pt | None, 1pt border |
| Button (primary) | 12pt | `0 4px 12px rgba(16,185,129,0.3)` |
| Button (small/chip) | 8pt | None |
| Badge | 6pt | None |
| Bottom sheet | 20pt top corners | `0 -4px 24px rgba(0,0,0,0.12)` |
| Modal | 20pt | `0 8px 32px rgba(0,0,0,0.16)` |
| FAB | 28pt (circle-ish) | `0 4px 16px rgba(16,185,129,0.4)` |

### Spacing System

| Token | Value |
|---|---|
| `xs` | 4pt |
| `sm` | 8pt |
| `md` | 16pt |
| `lg` | 24pt |
| `xl` | 32pt |
| `xxl` | 48pt |
| Screen horizontal padding | 16pt |
| Card internal padding | 16pt |
| Section gap | 24pt |

### Iconography
- Library: **SF Symbols** (iOS) / **Material Symbols** (Android)
- Size: 20pt for nav icons, 22pt for action icons, 18pt for inline icons
- Style: Outlined (not filled) by default; filled for active/selected state
- Color: Match text color in context; accent color for active states

---

## 3. NAVIGATION STRUCTURE

### Bottom Tab Bar (5 tabs)
```
[Dashboard]  [Expenses]  [Portfolio]  [Accounts]  [More]
   home        receipt     trending      wallet     menu
```

- Active tab: accent color icon + label, 2pt accent underline indicator
- Inactive: text-muted color
- Tab bar background: white (light) / surface-dark (dark)
- Height: 83pt (including safe area on iPhone)
- Show labels always (not icon-only)

### Navigation Patterns
- **Stack navigation** for detail screens (Stock Detail, Person Ledger, Bank Detail)
- **Bottom sheet** for add/edit forms (NOT full-screen modals)
- **Tab navigation** for main sections
- **Back arrow** always visible on stack screens
- No hamburger menu — everything accessible from tabs + More

### Floating Action Button (FAB)
- Position: Bottom right, 16pt from edges, 90pt from bottom (above tab bar)
- Size: 56pt diameter
- Color: accent (#10B981) with white plus icon
- Shadow: `0 4px 16px rgba(16,185,129,0.4)`
- Appears on: Dashboard, Expenses, Dues List, Rent, Zakat, Assets, Mutual Funds, Stocks
- On tap: Opens bottom sheet relevant to that screen

---

## 4. GLOBAL UI PATTERNS

### Cards
```
┌─────────────────────────────────┐
│  Card title        [action btn] │  ← 16pt padding all sides
│  Subtitle or meta               │
│                                 │
│  Content area                   │
└─────────────────────────────────┘
```
- Background: white / surface-dark
- Border: none (use shadow only)
- Corner radius: 16pt

### List Items
```
┌─────────────────────────────────┐
│ [Icon] Title              PKR X │  ← 16pt h-padding, 14pt v-padding
│        Subtitle       secondary │
└─────────────────────────────────┘
```
- Divider: 0.5pt border at bottom, indented 16pt from left
- Swipe-to-delete: red delete button reveals from right

### Input Fields
```
Label text *
┌─────────────────────────────────┐
│ Placeholder text           [🔍] │  ← 12pt corners, 1pt border
└─────────────────────────────────┘
Error message in danger color
```
- Height: 48pt
- Border: 1pt `border` color; 2pt accent when focused; 2pt danger when error
- Label above field, 6pt gap
- Error message below field, 4pt gap

### Buttons
```
Primary:    [         SAVE EXPENSE         ]  ← Full width, 48pt height, accent bg
Secondary:  [         CANCEL               ]  ← Full width, 48pt height, outline accent
Danger:     [         DELETE               ]  ← Full width, 48pt height, danger bg
Text btn:   [  Forgot Password?            ]  ← No background
Icon btn:   [⊕]  [↑]  [⋮]                   ← 40pt tap target
Chip:       [ + Add Fund ]                    ← 32pt height, accent-light bg, accent text
```

### Skeleton Loaders
- Use for ALL initial data loading (never use spinner on list screens)
- Shape matches the actual content layout
- Animate: shimmer left-to-right (#E2E8F0 → #F1F5F9 → #E2E8F0)
- Duration: 1.2s loop

### Empty States
```
        [Illustration]
      No expenses yet
  Add your first expense to
  start tracking your spending.
  
     [ + Add Expense ]
```
- Centered vertically in list area
- Illustration: simple, monochromatic, 120pt height
- Title: Subtitle style
- Description: Body style, text-secondary
- CTA: Primary button (not full width — 200pt max)

### Toast Notifications
- Position: Top of screen, below status bar
- Success: accent background, white text, checkmark icon
- Error: danger background, white text, X icon
- Info: `#3B82F6` (blue) background, white text, info icon
- Duration: 3 seconds auto-dismiss
- Corner radius: 12pt
- Width: screen width − 32pt

### Amount Display Rules
- **Positive amount / Gain:** `#10B981` (gain color)
- **Negative amount / Loss:** `#EF4444` (loss color)
- **Neutral amount:** text-primary
- **Masked:** `PKR ****` in text-muted
- **Gain prefix:** `+PKR 12,500`
- **Loss prefix:** `−PKR 3,200`

---

## 5. SCREEN DESIGNS (All 27 Screens)

---

### SCREEN 1 — Splash / Launch Screen

**Purpose:** App loading screen shown while checking auth status.

```
Background: primary (#0F172A) — full screen dark
Center:
  [Logo mark — stylized "FM" in accent green, 80pt]
  Finance Manager         ← Display, white
  Your Complete Financial Picture  ← Body, text-muted
  
Bottom:
  [Linear progress bar, 240pt wide, accent color, animated]
```

- No status bar content (edge-to-edge dark)
- Animate logo with a subtle scale-in (0.8 → 1.0, 400ms ease-out)
- Progress bar animates left to right

---

### SCREEN 2 — Login Screen

**Purpose:** Email and password login entry point.

**Layout:**
```
Status bar (light icons on dark)

[Header area — top 35% of screen]
  Background gradient: primary → slightly lighter navy
  [Logo mark 48pt centered]
  Finance Manager         ← Title, white
  Sign in to continue     ← Body, text-muted

[Form area — white card, rounded top 20pt, fills bottom 65%]
  Welcome back            ← Subtitle, text-primary (top of card, 24pt padding-top)

  Email Address *
  [___________________________]

  Password *
  [___________________________] [👁]   ← Toggle password visibility

  [                  SIGN IN                  ]   ← Primary button

  Forgot Password?    ← centered text button, accent color, 16pt top margin

  ─────────── or ───────────   ← divider with text

  Don't have an account?  Register   ← text-secondary + accent link
```

- Keyboard pushes form up (KeyboardAvoidingView)
- Sign In button shows activity indicator while loading
- Error toast on wrong credentials

---

### SCREEN 3 — OTP Verification Screen

**Purpose:** 6-digit OTP entry after login.

```
Back arrow (top left)

[Icon: envelope with checkmark, 64pt, accent color]
Check your email        ← Title, centered
We sent a 6-digit code to    ← Body, text-secondary
farooq@example.com      ← Body Medium, text-primary

[6 individual input boxes, 48pt × 56pt each, 8pt gap]
│ 3 │ _ │ _ │ _ │ _ │ _ │
  ↑ focused box has accent border

Time remaining: 09:42   ← Caption, text-secondary, countdown

[          VERIFY OTP          ]  ← Primary button

Didn't receive the code?
[Resend OTP]   ← accent text button (disabled until timer = 0)
```

- Auto-advance to next box on digit entry
- Paste support for full 6-digit code
- Shake animation on wrong OTP

---

### SCREEN 4 — Register Screen

**Purpose:** New account creation.

```
Back arrow (top left)

[Same header card style as login]
  Create Account

  Full Name *
  [___________________________]

  Email Address *
  [___________________________]

  Password *          (min 6 characters)
  [___________________________] [👁]

  Confirm Password *
  [___________________________] [👁]

  [              CREATE ACCOUNT              ]

  Already have an account?  Sign In
```

- Password strength indicator below password field (weak/medium/strong)
- Inline validation on blur

---

### SCREEN 5 — Forgot Password Screen

**3-step flow on single screen with step indicator:**

```
Step 1/3 — Enter Email
[1]──────[2]──────[3]   ← step dots, accent for active/done

Forgot Password?   ← Title
Enter your email to receive a reset code   ← Body

Email Address *
[___________________________]

[            SEND OTP            ]

─────────────────────────────────
Step 2/3 — Enter OTP (same as OTP verification screen)
─────────────────────────────────
Step 3/3 — New Password

New Password *
[___________________________] [👁]

Confirm New Password *
[___________________________] [👁]

[          RESET PASSWORD          ]
```

---

### SCREEN 6 — PIN Setup Screen

**Purpose:** First-time PIN configuration after registration.

```
[Shield icon with checkmark, 64pt, accent]
Secure your app         ← Title
Set a PIN to protect your financial data   ← Body, text-secondary

[6 dot indicators: ○ ○ ○ ○ ○ ○]   ← fill with accent as user types

[Custom number keypad — 3×4 grid]
│ 1 │ 2 │ 3 │
│ 4 │ 5 │ 6 │
│ 7 │ 8 │ 9 │
│   │ 0 │ ⌫ │
```

- Dots fill with accent on each digit press
- Haptic feedback on each key press
- Confirm PIN step after initial entry (enter again to verify)

---

### SCREEN 7 — PIN Entry Screen (Unlock)

**Purpose:** Shown when user taps masked balance to reveal it.

```
[Bottom sheet, slides up from bottom]

Enter PIN               ← Subtitle
To view your balances   ← Caption, text-secondary

[6 dot indicators: ● ● ● ○ ○ ○]

[Custom number keypad — same as setup]

[Cancel]   ← text button at bottom
```

- Shake + red flash on wrong PIN
- Haptic error feedback on wrong PIN
- Auto-dismiss and reveal balances on success

---

### SCREEN 8 — Dashboard Screen

**Purpose:** Financial overview and net worth at a glance.

```
Status bar
─────────────────────────────────────────
[Screen header]
Good morning, Farooq 👋        [Avatar 36pt]
Saturday, 5 April 2026

─────────────────────────────────────────
[NET WORTH CARD — full width, 16pt h-margin]
┌─────────────────────────────────────────┐
│ Net Worth                    [👁 Reveal] │
│                                         │
│  PKR ****                               │  ← masked by default
│  (or PKR 45,23,890 when revealed)       │  ← Display size, white
│                                         │
│  ▲ +PKR 1,23,500 this month (accent)   │
└─────────────────────────────────────────┘
Card background: accent (#10B981) gradient → slightly darker green
Text: white

─────────────────────────────────────────
[SUMMARY GRID — 2×2, 8pt gap]
┌──────────────┐  ┌──────────────┐
│ 🏦 Banks &  │  │ 📈 Invested  │
│  Wallets     │  │              │
│  PKR ****   │  │  PKR ****   │
└──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐
│ ↑ Receivable │  │ ↓ Payable    │
│              │  │              │
│  PKR ****   │  │  PKR ****   │
│  (gain clr) │  │  (loss clr) │
└──────────────┘  └──────────────┘
Cards: white, 12pt radius, light shadow

─────────────────────────────────────────
Monthly Expenses                [See All →]
[Mini bar chart — last 6 months]
[Jan][Feb][Mar][Apr][May][Jun]  ← 6 bars, accent color

─────────────────────────────────────────
Recent Expenses                 [See All →]
[5 most recent expense list items]
[🍔 Food         −PKR 850  Apr 4]
[🚗 Transport    −PKR 350  Apr 3]
[🏠 Utilities  −PKR 2,500  Apr 2]

─────────────────────────────────────────
Quick Actions
[+ Expense] [+ Rent] [📧 Send Summary]
← horizontal scroll row of chips

─────────────────────────────────────────
```

- All `PKR ****` values reveal together when PIN entered
- Pull to refresh refreshes all data
- Scroll is continuous (no section separators except subtle spacing)

---

### SCREEN 9 — Expenses Screen

**Purpose:** Full expense list with filters.

```
[Header]
Expenses              [Filter ⊞] [+ icon → bottom sheet]

─────────────────────────────────────────
[Month selector — horizontal scroll]
◀  March 2026  ▶
[Jan][Feb][Mar *][Apr][May]  ← months, active = accent chip

─────────────────────────────────────────
[Category filter chips — horizontal scroll]
[All *][🍔 Food][🚗 Transport][🏠 Utilities][🎮 Entertainment][➕ More]

─────────────────────────────────────────
Total this month          PKR 23,450
  12 transactions

─────────────────────────────────────────
[Expense list — grouped by date]

Today
├─ [🍔] Food           Cash         −PKR 850     ← swipe left to delete
├─ [🚗] Transport      Card         −PKR 350

Yesterday
├─ [🏠] Utilities      Bank Transfer −PKR 2,500
├─ [🎮] Entertainment  Wallet       −PKR 1,200
```

**List item detail:**
```
┌────────────────────────────────────────┐
│ [Category icon in colored circle]      │
│  Category name          −PKR 850       │
│  Apr 4, 2026 • Cash     [method badge] │
│  Note: lunch with team (if notes)      │
└────────────────────────────────────────┘
```
- Tap item → opens edit bottom sheet
- Swipe left → red Delete button (42pt wide)
- Long press → multi-select mode

---

### SCREEN 10 — Add / Edit Expense Bottom Sheet

**Purpose:** Form to add or edit an expense.

```
[Bottom sheet — 60% screen height, slides up]

━━━ drag handle (32pt × 4pt, centered) ━━━

Add Expense         [Cancel]   ← header row

Amount *
[PKR  ________________]   ← large, prominent input, numeric keyboard

Category *
[🍔 Food                    ▾]   ← tap to open category picker

Payment Method
[Cash                       ▾]

Date *
[April 4, 2026              📅]

Notes
[Optional note...              ]

[              SAVE EXPENSE              ]
```

**Category Picker (opens as grid above keyboard):**
```
[ 🍔 Food ] [ 🚗 Transport ] [ 🏠 Utilities ]
[ 🎮 Entertainment ] [ 🛍 Shopping ] [ 💊 Health ]
[ 📚 Education ] [ ✈️ Travel ] [ 💼 Business ]
[ 💰 Investment ] [ 🏋️ Fitness ] [ 🍽 Dining ]
[ Other ]
```

**Payment Method options:**
- Cash, Card, Bank Transfer, Easy Paisa, Jazz Cash, Naya Pay, Other

---

### SCREEN 11 — Portfolio Home Screen

**Purpose:** Overview of all investment types.

```
[Tab: Portfolio]

[Header: Total Investments]
┌────────────────────────────────────────┐
│ Total Portfolio Value                  │
│  PKR ****                  [👁 Reveal] │
│  Invested: PKR ****                    │
│  P&L: **** (▲ ?.??%)                  │
└────────────────────────────────────────┘
(gradient card, accent colors)

[Investment Distribution Donut Chart]
     [Donut chart — center shows total]
     ● Mutual Funds  PKR ****  45%
     ● Stocks        PKR ****  55%

─────────────────────────────────────────
Mutual Funds                    [View All →]
[3 fund cards preview]

─────────────────────────────────────────
Stocks                          [View All →]
[3 stock cards preview]

─────────────────────────────────────────
PSX Snapshots                  [View All →]
[Latest snapshot summary]
```

---

### SCREEN 12 — Mutual Funds Screen

**Purpose:** Full mutual fund portfolio list.

```
[Header]
Mutual Funds    [📤 Upload CSV] [+ Add Fund]

─────────────────────────────────────────
[Portfolio Summary Card]
┌────────────────────────────────────────┐
│ Current Value     PKR ****             │
│ Invested          PKR ****             │
│ Total Gain/Loss   ****  (▲ +?.??%)     │
└────────────────────────────────────────┘

─────────────────────────────────────────
[Allocation Donut Chart — interactive]
     [Donut with fund name segments]
Tap segment → highlights with fund name tooltip

─────────────────────────────────────────
[View Snapshots →]  ← link button

─────────────────────────────────────────
Holdings

[Fund card × N]
┌────────────────────────────────────────┐
│ Meezan Islamic Fund               [⋮] │
│ Symbol: MIF              Units: 2,345  │
│ NAV: 14.23                             │
│ Current Value    PKR ****              │
│ Invested         PKR ****              │
│ Gain/Loss FYTD:  +PKR ***  (▲ +4.2%) │  ← gain color
│ Since Inception: +PKR ***  (▲ +12.3%)│
└────────────────────────────────────────┘
```
- Long press fund → multi-select for bulk delete
- Swipe left on fund → Delete

---

### SCREEN 13 — Upload Portfolio Screen (Bottom Sheet)

**Purpose:** Upload CSV or XLSX mutual fund statement.

```
[Bottom sheet — 50% height]

━━━ handle ━━━

Upload Portfolio        [Cancel]

Supported formats: CSV, XLSX
Meezan Fund format supported

[Upload area — dashed border, 120pt height]
     [📄 icon]
  Tap to select file
  or drag and drop

[After file selected:]
  📄 portfolio_march_2026.csv
  Size: 12.4 KB              [✕ Remove]

  [Progress bar — animates during upload]
  Uploading... 67%

[           UPLOAD & SYNC            ]
```

---

### SCREEN 14 — Mutual Fund Snapshots Screen

**Purpose:** Compare portfolio across different upload dates.

```
[Header]
Snapshots           [🗑 Bulk Delete]

─────────────────────────────────────────
[Date selector — horizontal scroll tabs]
[Mar 31] [Mar 15] [Feb 28] [Feb 15] [Jan 31]
  active tab has accent underline

─────────────────────────────────────────
Mar 31, 2026 Snapshot

Summary
Total Value     PKR 45,23,000
Total Invested  PKR 40,00,000
Total Gain      +PKR 5,23,000  (▲ +13.1%)

─────────────────────────────────────────
Holdings

[Table — horizontal scroll if needed]
Fund Name    | Value      | Invested   | Gain
─────────────────────────────────────────
Meezan IF    | PKR 12,000 | PKR 10,000 | +20%
Al Ameen IF  | PKR 8,500  | PKR 8,000  | +6.3%

─────────────────────────────────────────
[Line chart — portfolio growth over all snapshot dates]
Value
↑
|    *
|   * *
|  *    **
└──────────→ Date
```

---

### SCREEN 15 — Stocks Screen

**Purpose:** Stock portfolio overview.

```
[Header]
Stocks          [🔄 Sync PSX]  [+ Add Stock]

Last synced: 2 hours ago

─────────────────────────────────────────
[Portfolio Summary Card]
┌────────────────────────────────────────┐
│ Market Value     PKR ****              │
│ Total Cost       PKR ****              │
│ P&L              +PKR ****  (▲ +?%)   │
└────────────────────────────────────────┘

─────────────────────────────────────────
Holdings

[Stock card × N]
┌────────────────────────────────────────┐
│ HUBC                        [>]        │
│ Hub Power Company                      │
│ Qty: 500         Avg Buy: PKR 95.50    │
│ Current: PKR 102.30   ▲ +PKR 6.80/sh  │
│                                        │
│ Total Cost     PKR 47,750              │
│ Market Value   PKR 51,150              │
│ P&L            +PKR 3,400  (▲ +7.1%) │← gain color
└────────────────────────────────────────┘
```
- Tap card → Stock Detail screen
- Swipe left → Delete

---

### SCREEN 16 — Stock Detail Screen

**Purpose:** Detailed view of a single stock with transactions.

```
[Navigation header with back arrow]
HUBC                    [+ Add Transaction]
Hub Power Company

─────────────────────────────────────────
[Price card]
┌────────────────────────────────────────┐
│ PKR 102.30                ▲ +7.1%     │
│ Current market price        (gain clr)│
│                                        │
│ [Mini line chart — price trend]        │
└────────────────────────────────────────┘

─────────────────────────────────────────
Holdings Summary

Total Quantity      500 shares
Average Buy Price   PKR 95.50
Total Cost          PKR 47,750
Market Value        PKR 51,150
Total P&L           +PKR 3,400  (▲ +7.1%)
Brokerage Paid      PKR 250

─────────────────────────────────────────
Buy Transactions

[Transaction row × N]
┌────────────────────────────────────────┐
│ Jan 15, 2026                           │
│ 200 shares @ PKR 90.00                 │
│ Cost: PKR 18,000   Brokerage: PKR 100  │
└────────────────────────────────────────┘
```

---

### SCREEN 17 — PSX Snapshots Screen

**Purpose:** Pakistan Stock Exchange portfolio snapshots.

```
[Header]
PSX Portfolio           [+ Upload Snapshot]

─────────────────────────────────────────
[Bank Investments section]
Total Invested (Cash)    PKR ****
                        [+ Add Investment]

[Investment row × N]
Apr 1 — Deposit  +PKR 50,000
Mar 1 — Deposit  +PKR 30,000

─────────────────────────────────────────
Snapshots

[Snapshot card × N — sorted by date desc]
┌────────────────────────────────────────┐
│ April 5, 2026                    [⋮]  │
│ Total Custody    PKR 1,23,000          │
│ Total Invested   PKR 1,00,000          │
│                                        │
│ Holdings (3)                           │
│ HUBC 500 @ 102.30  │  FFC 200 @ 88.00 │
│ MEBL 100 @ 152.00                      │
│                                        │
│ Summary                                │
│ Trading Cash   PKR 5,000               │
│ Margin %       15.3%                   │
└────────────────────────────────────────┘
```

---

### SCREEN 18 — Dues Ledger — People List Screen

**Purpose:** All people with net dues balance.

```
[Header]
Dues Ledger             [+ Add Person]

─────────────────────────────────────────
[Summary bar]
┌──────────┐  ┌──────────┐  ┌──────────┐
│Receivable│  │  Payable │  │    Net   │
│PKR ****  │  │ PKR **** │  │ PKR **** │
│(gain clr)│  │(loss clr)│  │          │
└──────────┘  └──────────┘  └──────────┘

─────────────────────────────────────────
[Search bar]
[🔍 Search people...                    ]

─────────────────────────────────────────
People

[Person card × N]
┌────────────────────────────────────────┐
│ [Avatar initials — "AH"]  Ali Hassan   │
│                   ali@example.com      │
│             Net Balance: +PKR 15,000   │← gain color if receivable
│             (You are owed this amount) │← caption
└────────────────────────────────────────┘

[If payable:]
│             Net Balance: −PKR 8,000    │← loss color
│             (You owe this amount)      │
```

---

### SCREEN 19 — Person Ledger Detail Screen

**Purpose:** Transaction history with a specific person.

```
[Header with back arrow]
Ali Hassan              [📧 Send Reminder] [+ Add]

─────────────────────────────────────────
[Balance card]
┌────────────────────────────────────────┐
│ ali@example.com                        │
│                                        │
│ You are owed                           │
│ PKR 15,000              ← gain color   │
└────────────────────────────────────────┘

─────────────────────────────────────────
[Transaction list — reverse chronological]

April 2026
┌────────────────────────────────────────┐
│ [↑] Apr 4, 2026           +PKR 5,000  │← receivable, gain color
│     Loan for car repair                │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│ [↓] Apr 2, 2026           −PKR 2,000  │← payable, loss color
│     Returned for grocery               │
└────────────────────────────────────────┘

March 2026
[...]
```
- Swipe left on transaction → Edit | Delete options
- [📧 Send Reminder] disabled if person has no email or balance = 0

---

### SCREEN 20 — Rent Tracker Screen

**Purpose:** Monthly rental income list.

```
[Header]
Rent Tracker            [+ Add Entry]

─────────────────────────────────────────
[Total card]
┌────────────────────────────────────────┐
│ Total Received (All Time)              │
│ PKR ****                               │
└────────────────────────────────────────┘

─────────────────────────────────────────
[Year filter tabs — horizontal scroll]
[2024][2025][2026 *]

─────────────────────────────────────────
2026

[Rent card × N]
┌────────────────────────────────────────┐
│ March 2026               PKR 25,000    │
│ Ahmed Khan                             │
│ Paid: Mar 5, 2026                      │
│ Account: Standard Chartered            │
│ Note: On time (if notes)               │
└────────────────────────────────────────┘
```
- Swipe left → Edit | Delete
- Tap → opens edit bottom sheet

---

### SCREEN 21 — Accounts Screen

**Purpose:** All bank accounts and digital wallets.

```
[Header]
Accounts                [+ Add]

─────────────────────────────────────────
[Total balance card]
┌────────────────────────────────────────┐
│ Total Balance (All Accounts)           │
│ PKR ****                   [👁 Reveal] │
└────────────────────────────────────────┘

─────────────────────────────────────────
[Tabs: Banks | Wallets]

BANKS tab:
[Bank card × N]
┌────────────────────────────────────────┐
│ [Bank logo/icon]  Standard Chartered   │
│ ••••  ••••  ••••  1234  (masked)       │
│ Current Balance    PKR ****      [>]   │
└────────────────────────────────────────┘

WALLETS tab:
[Wallet card × N — color-coded by color_theme]
┌────────────────────────────────────────┐
│ [Green gradient] Easy Paisa            │
│ +92 300 1234567                        │
│ Balance    PKR ****                    │
└────────────────────────────────────────┘
```

---

### SCREEN 22 — Bank Detail Screen

**Purpose:** Bank account details and statements.

```
[Header with back arrow]
Standard Chartered      [Edit] [Delete]

─────────────────────────────────────────
[Account info card]
┌────────────────────────────────────────┐
│ Account Number   ••••••••••1234        │
│ IBAN             PK00SCBL0000001234    │
│ Currency         PKR                   │
│ Starting Balance PKR 1,00,000          │
│ Current Balance  PKR ****    [✏ Edit] │
└────────────────────────────────────────┘

─────────────────────────────────────────
Statements

[No statements yet — EmptyState]
or
[Statement row × N]
Mar 2026  |  Closing: PKR 45,000  |  [View]
Feb 2026  |  Closing: PKR 38,000  |  [View]
```

---

### SCREEN 23 — Zakat Screen

**Purpose:** Track zakat payments.

```
[Header]
Zakat                   [+ Record Payment]

─────────────────────────────────────────
[This year card]
┌────────────────────────────────────────┐
│ Paid in 2026                           │
│ PKR 25,000                             │
└────────────────────────────────────────┘

─────────────────────────────────────────
All Payments

[Zakat entry × N]
┌────────────────────────────────────────┐
│ Ramadan 2026           PKR 15,000      │
│ Apr 1, 2026                            │
│ Annual zakat payment                   │
└────────────────────────────────────────┘
```

---

### SCREEN 24 — Assets Screen

**Purpose:** Physical assets tracking.

```
[Header]
Assets                  [+ Add Asset]

─────────────────────────────────────────
[Total card]
┌────────────────────────────────────────┐
│ Total Asset Value                      │
│ PKR ****                               │
└────────────────────────────────────────┘

─────────────────────────────────────────
[Type filter chips — horizontal scroll]
[All *][🏠 Property][🪙 Gold][🚗 Vehicle][Other]

─────────────────────────────────────────
[Asset card × N]
┌────────────────────────────────────────┐
│ [🏠] House - Gulshan           [⋮]    │
│ Property                               │
│ Value:   PKR 1,50,00,000               │
│ Bought:  Jan 2020                      │
│ Rental property in Gulshan             │
└────────────────────────────────────────┘
```

---

### SCREEN 25 — Reports Screen

**Purpose:** Financial analytics and charts.

```
[Header]
Reports

─────────────────────────────────────────
[Date range selector]
[This Month ▾]  ← dropdown: This Week / This Month / This Year / Custom

─────────────────────────────────────────
Expense Breakdown
[Horizontal bar chart — by category]
🍔 Food          ████████████  PKR 12,500  (35%)
🚗 Transport     ██████        PKR 6,800   (19%)
🏠 Utilities     █████         PKR 5,200   (15%)
🎮 Entertainment ████          PKR 4,100   (11%)
Other            ████████      PKR 7,000   (20%)

─────────────────────────────────────────
[Donut chart — category allocation]
Center: Total PKR 35,600

─────────────────────────────────────────
Monthly Trend
[Line chart — 6 months of expenses]
50K ─
40K ─     *
30K ─   *   *   *
20K ─ *           *
10K ─               *
    Jan Feb Mar Apr May Jun

─────────────────────────────────────────
Investment Allocation
[Donut chart — Banks, Wallets, Mutual Funds, Stocks, Physical Assets]
```

---

### SCREEN 26 — Settings Screen

**Purpose:** App configuration and user profile.

```
[Header]
Settings

─────────────────────────────────────────
[Profile card]
┌────────────────────────────────────────┐
│ [Avatar circle — initials "FM"]        │
│ Farooq Ibrahim                         │
│ farooq@example.com                     │
└────────────────────────────────────────┘

─────────────────────────────────────────
Security
├─ Change PIN                         [>]
├─ Change Password                    [>]

─────────────────────────────────────────
Appearance
├─ Dark Mode                [Toggle  ●  ]

─────────────────────────────────────────
Notifications
├─ Weekly Email Summary     [Toggle  ●  ]

─────────────────────────────────────────
Investment
├─ Broker Account                     [>]
├─ Institutions                       [>]

─────────────────────────────────────────
[          SIGN OUT          ]   ← danger outline button
```

---

### SCREEN 27 — More Screen

**Purpose:** Navigation hub for less-used sections.

```
[Header]
More

[Menu list]
┌────────────────────────────────────────┐
│ [📋] Dues Ledger                    [>]│
│ [🏠] Rent Tracker                   [>]│
│ [☪️] Zakat                          [>]│
│ [🏗️] Assets                         [>]│
│ [📊] Reports                        [>]│
│ [⚙️] Settings                       [>]│
└────────────────────────────────────────┘
```

---

## 6. MICRO-INTERACTIONS & ANIMATION SPEC

| Interaction | Animation | Duration | Easing |
|---|---|---|---|
| Screen push navigation | Slide left | 300ms | ease-in-out |
| Bottom sheet open | Slide up + backdrop fade | 350ms | spring (damping 0.8) |
| Bottom sheet close | Slide down | 250ms | ease-in |
| FAB press | Scale 0.92 → 1.0 | 120ms | ease-out |
| Button press | Scale 0.97 → 1.0 | 100ms | ease-out |
| Card press | Scale 0.98 → 1.0 | 100ms | ease-out |
| Swipe-to-delete reveal | Slide left | follows finger | spring |
| Delete confirm tap | Fade + slide left | 250ms | ease-in |
| Toast appear | Slide down from top | 300ms | spring |
| Toast dismiss | Slide up | 200ms | ease-in |
| PIN dot fill | Scale 0 → 1.2 → 1.0 | 200ms | spring |
| Wrong PIN | Shake (4 oscillations) | 400ms | ease-in-out |
| Balance reveal | Blur out to text | 400ms | ease-out |
| Skeleton shimmer | Shimmer left-to-right | 1200ms | linear, loop |
| Pull-to-refresh | Spinner + pull indicator | follows pull | - |
| Chart segment tap | Scale 1.0 → 1.05 | 150ms | ease-out |

---

## 7. DARK MODE SPEC

Every screen must have a dark mode variant. Key mappings:

| Light | Dark |
|---|---|
| `bg-light` (#F8FAFC) | `bg-dark` (#0F172A) |
| `surface` (#FFFFFF) | `surface-dark` (#1E293B) |
| `text-primary` (#0F172A) | `#F1F5F9` |
| `text-secondary` (#64748B) | `#94A3B8` |
| `border` (#E2E8F0) | `border-dark` (#334155) |
| Card shadow | Reduce opacity to 0 (no shadow in dark) |
| Input border | `border-dark` (#334155) |
| Tab bar | `surface-dark` (#1E293B) |

- Accent colors remain the same in dark mode
- Gain/loss colors remain the same
- Status bar icons: light in dark mode, dark in light mode

---

## 8. COMPONENT LIBRARY PAGE

Design a dedicated component library screen showing:

### Buttons
- Primary (filled accent)
- Secondary (outlined accent)
- Danger (filled red)
- Ghost (text only)
- Icon button (circle)
- Chip (small, rounded)
- Loading state (spinner inside button)
- Disabled state (50% opacity)

### Inputs
- Default state
- Focused state (accent border)
- Filled state
- Error state (danger border + error text)
- Disabled state

### Cards
- Standard card (with shadow)
- Amount card (gradient, accent)
- Stat card (2-column grid variant)
- List item row

### Badges / Tags
- Gain badge (accent-light bg, gain text)
- Loss badge (danger-light bg, danger text)
- Neutral badge (slate-100, slate text)
- Category badge (icon + text)
- Payment method badge

### Typography Scale
Show all 10 typography styles with font size and weight

### Color Swatches
All 18 color tokens with hex values

### Data Display
- Masked balance component (PKR ****)
- Revealed balance component
- Gain/loss row component
- Empty state component
- Skeleton loader (various shapes)

---

## 9. DELIVERABLES CHECKLIST

### Figma File Structure
```
Finance Manager
├── 📐 Design System
│   ├── Colors
│   ├── Typography
│   ├── Spacing
│   ├── Components
│   └── Icons
├── 📱 Light Mode
│   ├── Auth Screens (6 screens)
│   ├── Dashboard (1 screen)
│   ├── Expenses (2 screens)
│   ├── Portfolio (4 screens)
│   ├── Dues (2 screens)
│   ├── Accounts (2 screens)
│   ├── More Screens (5 screens)
│   ├── Overlays (Bottom sheets, FAB states)
│   └── Navigation (Tab bar, headers)
├── 🌙 Dark Mode
│   └── [Mirror of Light Mode]
├── 🗺 Flow Diagrams
│   ├── Auth Flow
│   ├── Add Expense Flow
│   ├── Dues Flow
│   └── Portfolio Upload Flow
└── 📋 Handoff Specs
    ├── Spacing annotations
    ├── Font specs
    └── Asset exports
```

### Required Outputs
- [ ] 27 screens × 2 modes (light + dark) = **54 frames**
- [ ] Component library page
- [ ] 4 navigation flow diagrams
- [ ] Interactive prototype (at minimum: Login → Dashboard → Add Expense flow)
- [ ] Developer handoff with all measurements and tokens
- [ ] Exported icon set (SVG)
- [ ] Exported illustrations for empty states (SVG)

---

## 10. SCREEN INVENTORY SUMMARY

| # | Screen Name | Category | Has FAB |
|---|---|---|---|
| 1 | Splash Screen | Auth | No |
| 2 | Login | Auth | No |
| 3 | OTP Verification | Auth | No |
| 4 | Register | Auth | No |
| 5 | Forgot Password | Auth | No |
| 6 | PIN Setup | Auth | No |
| 7 | PIN Entry (unlock) | Overlay | No |
| 8 | Dashboard | Main | Yes |
| 9 | Expenses List | Main | Yes |
| 10 | Add/Edit Expense | Bottom Sheet | No |
| 11 | Portfolio Home | Main | No |
| 12 | Mutual Funds List | Portfolio | Yes |
| 13 | Upload Portfolio | Bottom Sheet | No |
| 14 | MF Snapshots | Portfolio | No |
| 15 | Stocks List | Portfolio | Yes |
| 16 | Stock Detail | Detail | Yes |
| 17 | PSX Snapshots | Portfolio | Yes |
| 18 | Dues People List | Main | Yes |
| 19 | Person Ledger | Detail | Yes |
| 20 | Rent Tracker | More | Yes |
| 21 | Accounts (Banks+Wallets) | Main | Yes |
| 22 | Bank Detail | Detail | No |
| 23 | Zakat | More | Yes |
| 24 | Assets | More | Yes |
| 25 | Reports | More | No |
| 26 | Settings | More | No |
| 27 | More (nav hub) | Navigation | No |

**Total: 27 screens** (54 frames including dark mode)
