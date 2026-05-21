Build a complete Gold Asset module for the Finance Manager monorepo. Follow existing 
patterns exactly — don't introduce new libraries or styles. The module needs a 
double-PIN lock (app PIN + separate gold PIN), live PKR gold price sync (scraped from 
the web), per-item value calculation with carat purity, a 30-day price history chart, 
and Zakat eligibility logic.

═══════════════════════════════════════════════════════════════════════════════
CONTEXT — existing patterns to mirror
═══════════════════════════════════════════════════════════════════════════════

- PSX scraper at backend/src/services/scraper.service.js → mirror this for gold prices
- Cron jobs at backend/src/services/cron.service.js → add daily 10 AM PKT gold sync
- PIN flow in mobile: stores/pinStore.ts + components/ui/MaskedBalance.tsx + 
  pin-entry.tsx → mirror this exact pattern for the gold PIN
- Hook pattern: hooks/useZakat.js, hooks/useAssets.js → follow shape for hooks/useGold.ts
- Route pattern: backend/src/routes/zakat.routes.js, assets.routes.js
- All endpoints behind authenticate middleware, scoped by req.user.id
- Mobile uses Expo SDK 54, Zustand, TanStack Query v5, Victory Native, Zod, 
  React Hook Form, Ionicons, expo-secure-store
- Design system: emerald #10B981, glassmorphic surfaces, no external UI libs

═══════════════════════════════════════════════════════════════════════════════
BACKEND — Prisma schema additions
═══════════════════════════════════════════════════════════════════════════════

Append to prisma/schema.prisma and add corresponding relations on User model:

model GoldItem {
  id           String   @id @default(cuid())
  userId       String
  name         String                          // "Bridal set", "Engagement ring"
  type         String                          // "ring" | "set" | "chain" | "bangle" | "earring" | "other"
  weight_grams Float                           // physical weight
  carats       Int      @default(20)           // 24 | 22 | 21 | 20 | 18
  purchase_date DateTime?
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model GoldPriceHistory {
  id                   String   @id @default(cuid())
  date                 DateTime
  price_24k_per_tola   Decimal  @db.Decimal(12, 2)   // PKR
  price_24k_per_gram   Decimal  @db.Decimal(12, 2)   // PKR (derived: tola / 11.664)
  source               String   @default("sarafa")
  createdAt            DateTime @default(now())

  @@unique([date])
}

model GoldPin {
  id        String   @id @default(cuid())
  userId    String   @unique
  pinHash   String                                  // bcrypt, SEPARATE from user.app_pin_code
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

Generate migration: `npx prisma migrate dev --name add_gold_module`

═══════════════════════════════════════════════════════════════════════════════
BACKEND — backend/src/services/goldScraper.service.js
═══════════════════════════════════════════════════════════════════════════════

Mirror scraper.service.js (Playwright headless). Target one of:
  1. https://www.hamariweb.com/finance/gold_rates.aspx (primary — stable structure)
  2. https://www.geo.tv/gold-rate (fallback)

Extract the 24K per-tola PKR price. Compute per-gram = tola_price / 11.664.
Upsert into GoldPriceHistory by date (yyyy-mm-dd today, Asia/Karachi timezone).

Export: syncGoldPrice() → returns the new row.
Wrap in try/catch with 30s timeout. Log a warning if scrape fails, don't crash.

═══════════════════════════════════════════════════════════════════════════════
BACKEND — backend/src/services/cron.service.js (modify)
═══════════════════════════════════════════════════════════════════════════════

Add a second job alongside the existing weekly summary:

cron.schedule('0 10 * * *', async () => {
  console.log('[Cron] Syncing gold price…');
  try {
    await syncGoldPrice();
    console.log('[Cron] Gold price synced.');
  } catch (e) {
    console.error('[Cron] Gold sync failed:', e.message);
  }
}, { timezone: 'Asia/Karachi' });

═══════════════════════════════════════════════════════════════════════════════
BACKEND — backend/src/routes/gold.routes.js
═══════════════════════════════════════════════════════════════════════════════

Mount in app.js: `app.use('/api/gold', authenticate, goldRouter);`

Endpoints (all return JSON, all scoped by req.user.id):

GET    /items
  → For each GoldItem, attach current_value_pkr using latest GoldPriceHistory.
    Formula: weight_grams × (price_24k_per_gram × carats / 24)
  → Response: { items: [...], total_value_pkr, latest_price: {...} }

POST   /items
  Body: { name, type, weight_grams, carats, purchase_date?, notes? }
  Zod validate. carats ∈ [18, 20, 21, 22, 24]. weight_grams > 0.

PUT    /items/:id   → partial update, verify ownership (403 if not owner)
DELETE /items/:id   → verify ownership

POST   /sync-price
  → Calls syncGoldPrice() service. Returns the new row.
  → Use this for the manual sync button.

GET    /price-history?days=30
  → Last N days of GoldPriceHistory ordered ASC by date.
  → Response: [{ date, price_24k_per_gram, price_24k_per_tola }]

GET    /latest-price
  → Returns the most recent GoldPriceHistory row + computed prices for 
    22K, 21K, 20K, 18K (price_24k × carats/24).

GET    /has-pin
  → { hasGoldPin: boolean }

POST   /set-pin
  Body: { pin: string }  (min 4 digits)
  Idempotent: if record exists, update; else create. bcrypt hash, 10 rounds.
  Return: { message: 'Gold PIN set' }

POST   /change-pin
  Body: { currentPin, newPin }
  Verify current against hash, then update.

POST   /verify-pin
  Body: { pin }
  Return: { success: boolean }   (don't issue a new JWT — just confirm)

GET    /zakat-summary
  → Compute:
      total_24k_equivalent_grams = Σ (weight_grams × carats / 24)
      total_value_pkr            = Σ (per-item current value, as in /items)
      nisab_gold_grams           = 85
      nisab_value_pkr            = 85 × latest_price_24k_per_gram
      is_nisab_met               = total_24k_equivalent_grams >= 85
      zakat_due_pkr              = is_nisab_met ? total_value_pkr × 0.025 : 0
  → Return all above plus item count.

═══════════════════════════════════════════════════════════════════════════════
MOBILE — file structure to create
═══════════════════════════════════════════════════════════════════════════════

finance-manager-mobile/
├── app/
│   └── gold/
│       └── index.tsx                       ← main screen (gated)
├── components/
│   ├── ui/
│   │   ├── GoldPinGate.tsx                 ← double-lock wrapper
│   │   └── GoldPinSheet.tsx                ← keypad sheet (mirrors pin-entry.tsx)
│   └── forms/
│       └── GoldItemForm.tsx                ← add/edit bottom sheet
├── hooks/
│   └── useGold.ts
├── stores/
│   └── goldPinStore.ts

═══════════════════════════════════════════════════════════════════════════════
MOBILE — stores/goldPinStore.ts
═══════════════════════════════════════════════════════════════════════════════

Mirror pinStore.ts exactly. State:
  isGoldUnlocked: boolean
  unlock(): void
  lock(): void

Set up AppState listener: on 'background' → call lock().
Also expose a "lockOnBlur" helper to call from useFocusEffect on the gold screen 
so leaving the screen re-locks it.

═══════════════════════════════════════════════════════════════════════════════
MOBILE — hooks/useGold.ts
═══════════════════════════════════════════════════════════════════════════════

Add to constants/queryKeys.ts:
  gold: ['gold'],
  goldPriceHistory: ['goldPriceHistory'],
  goldLatestPrice: ['goldLatestPrice'],
  goldZakat: ['goldZakat'],
  goldHasPin: ['goldHasPin'],

Export hooks:
  useGoldItems()              GET /gold/items
  useGoldLatestPrice()        GET /gold/latest-price
  useGoldPriceHistory(days)   GET /gold/price-history?days=30
  useGoldZakatSummary()       GET /gold/zakat-summary
  useGoldHasPin()             GET /gold/has-pin

  useAddGoldItem()            POST /gold/items  → invalidate gold, goldZakat
  useUpdateGoldItem()         PUT  /gold/items/:id
  useDeleteGoldItem()         DELETE /gold/items/:id
  useSyncGoldPrice()          POST /gold/sync-price  → invalidate everything gold

  useSetGoldPin()             POST /gold/set-pin
  useVerifyGoldPin()          POST /gold/verify-pin  (does NOT cache)

═══════════════════════════════════════════════════════════════════════════════
MOBILE — components/ui/GoldPinGate.tsx
═══════════════════════════════════════════════════════════════════════════════

Wraps the screen content. Logic:

  const isAppPinVerified = usePinStore(s => s.isPinVerified)
  const isGoldUnlocked   = useGoldPinStore(s => s.isGoldUnlocked)
  const { data: pinStatus } = useGoldHasPin()

  if (!isAppPinVerified) {
    return <Redirect href="/pin-entry?returnTo=/gold" />
  }

  if (pinStatus && !pinStatus.hasGoldPin) {
    return <GoldPinSetup onDone={() => goldPinStore.unlock()} />
  }

  if (!isGoldUnlocked) {
    return <GoldPinSheet onSuccess={() => goldPinStore.unlock()} />
  }

  return children

GoldPinSheet design:
  • Full-screen, emerald gradient backdrop
  • Centered: gold/lock Ionicon (size 64), title "Gold Vault", subtitle 
    "Enter your private PIN"
  • 6 dot indicators
  • Custom 3×4 keypad (reuse existing keypad styles from pin-entry.tsx)
  • Shake + haptic on wrong PIN
  • Distinct visual treatment from the main app PIN screen — gold accent 
    color (#D4AF37 or similar amber) so it FEELS like a vault, not just 
    another PIN

═══════════════════════════════════════════════════════════════════════════════
MOBILE — app/gold/index.tsx (main screen)
═══════════════════════════════════════════════════════════════════════════════

export default function GoldScreen() {
  return (
    <GoldPinGate>
      <GoldVaultContent />
    </GoldPinGate>
  )
}

GoldVaultContent layout (ScrollView, pull-to-refresh):

  ┌─ ScreenHeader ─────────────────────────────────┐
  │ ← Gold Vault                     [⟳]  [+]     │
  │ Last synced: Today, 2:14 PM                    │
  └────────────────────────────────────────────────┘

  ┌─ Live Prices Card (glassmorphic emerald) ──────┐
  │  Live Gold Price · PKR                         │
  │  ─────────────────────────                     │
  │   24K   28,450 /g    331,800 /tola             │
  │   22K   26,080 /g    304,150 /tola             │
  │   21K   24,890 /g    290,325 /tola             │
  │   20K   23,710 /g    276,500 /tola  ← yours    │
  │   18K   21,338 /g    248,850 /tola             │
  └────────────────────────────────────────────────┘

  ┌─ 30-day Trend ────────────────────────────────┐
  │ [Victory Native VictoryLine — 24K per gram]    │
  │   x: date (formatted "d MMM" via date-fns)     │
  │   y: PKR (formatted with fmtPKR)               │
  └────────────────────────────────────────────────┘

  ┌─ My Gold ──────────────────────────────────────┐
  │ Total Value: PKR 4,12,600                      │
  │ Total Weight: 97g                              │
  └────────────────────────────────────────────────┘

  [Card per GoldItem — swipeable for delete, tap to edit]
  ┌────────────────────────────────────────────────┐
  │ 💍 Bridal Set                      [⋮]        │
  │ 20 carats · 85g                                │
  │ Current value: PKR 2,01,535                    │
  │ Purchased: Mar 2018                            │
  └────────────────────────────────────────────────┘

  ┌─ Zakat Status ────────────────────────────────┐
  │  ✅ Nisab threshold met                        │
  │  ──────────────────────────                    │
  │  Your gold (24K eq.):   97g                   │
  │  Nisab threshold:       85g                   │
  │  Total value:           PKR 4,12,600          │
  │  Zakat due (2.5%):      PKR 10,315            │
  │                                                │
  │  [Record Zakat Payment →]   // navigates to    │
  │                              // existing zakat │
  │                              // screen with    │
  │                              // amount         │
  │                              // pre-filled     │
  └────────────────────────────────────────────────┘

useFocusEffect: on blur → goldPinStore.lock()

═══════════════════════════════════════════════════════════════════════════════
MOBILE — components/forms/GoldItemForm.tsx
═══════════════════════════════════════════════════════════════════════════════

Bottom sheet, React Hook Form + Zod:

  goldItemSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['ring','set','chain','bangle','earring','other']),
    weight_grams: z.number().positive(),
    carats: z.union([z.literal(18), z.literal(20), z.literal(21), 
                     z.literal(22), z.literal(24)]),
    purchase_date: z.string().optional(),
    notes: z.string().optional(),
  })

Fields:
  • Name (text)
  • Type (segmented control: Ring / Set / Chain / Bangle / Earring / Other)
  • Weight in grams (numeric input with "g" suffix)
  • Carats (picker: 24K / 22K / 21K / 20K / 18K — default 20K)
  • Purchase date (optional DatePicker)
  • Notes (optional textarea)

Live preview at the bottom of the form:
  "Estimated current value: PKR 23,510 (at today's rate)"
  → computed live from form values × latest 24K price × carats/24

═══════════════════════════════════════════════════════════════════════════════
MOBILE — navigation entry in app/(tabs)/more.tsx
═══════════════════════════════════════════════════════════════════════════════

Add a new item in the More menu list, ABOVE the existing Zakat entry:

  { icon: 'diamond-outline', label: 'Gold Vault', 
    route: '/gold', badge: 'Locked' }

(The "Locked" badge is purely visual — a small emerald pill — to signal the 
extra security layer.)

═══════════════════════════════════════════════════════════════════════════════
MOBILE — Zakat screen integration
═══════════════════════════════════════════════════════════════════════════════

In the existing Zakat screen (likely app/zakat or in more.tsx), add a summary 
line that calls /gold/zakat-summary:

  "Gold assets: PKR 4,12,600 · Zakat due: PKR 10,315"

Tapping this row navigates to /gold (which will trigger the double lock).

═══════════════════════════════════════════════════════════════════════════════
ACCEPTANCE CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

[ ] Migration runs cleanly; new tables visible in Prisma Studio
[ ] Manual scrape: `node -e "require('./src/services/goldScraper.service').syncGoldPrice().then(console.log)"` 
    returns a row with realistic PKR values
[ ] Cron job logs at 10 AM PKT
[ ] All /api/gold endpoints return correctly with auth, 401 without
[ ] Mobile: tapping "Gold Vault" in More → forces app PIN if not verified
[ ] After app PIN, shows Gold PIN setup the first time
[ ] On subsequent visits, shows Gold PIN entry sheet (different color/feel 
    from main PIN screen)
[ ] Wrong gold PIN → shake + haptic, no unlock
[ ] After unlock: live prices, chart, items list, zakat panel all render
[ ] Add item → appears in list with correct PKR value
[ ] Sync button → updates "last synced" and refreshes prices
[ ] Leaving screen (back navigation or backgrounding app) re-locks gold
[ ] Zakat eligibility correctly flips based on 85g 24K-equivalent threshold
[ ] All amounts use fmtPKR formatter and currency.js for math

═══════════════════════════════════════════════════════════════════════════════
NON-NEGOTIABLES
═══════════════════════════════════════════════════════════════════════════════

- Do NOT introduce new UI libraries. Use existing components/ui primitives.
- Do NOT store the gold PIN in plain text anywhere — server-side bcrypt only.
- Do NOT cache the gold PIN in SecureStore — it must be re-entered each session.
- Do NOT reuse the existing app PIN hash for the gold PIN — they are separate.
- Do NOT change existing patterns; mirror them.
- Use currency.js for any PKR arithmetic to avoid float drift.
- All carat math must round monetary values to 2 decimal places using 
  currency.js, never JS native arithmetic.

Build the backend first, test the scraper and one endpoint with curl, then 
build the mobile side. Stop and confirm with me at the end of each layer 
before moving on.