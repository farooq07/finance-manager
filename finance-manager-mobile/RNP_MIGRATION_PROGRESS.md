# React Native Paper Migration Progress

## Phase 1: Setup ✅ COMPLETE
- [x] Created `constants/rnpTheme.ts` with M3 light & dark themes
- [x] Updated `app/_layout.tsx` with PaperProvider wrapper
- [x] Added dependencies to package.json (react-native-paper, react-native-vector-icons)

## Phase 2: Component Replacements ✅ COMPLETE
- [x] `Button.tsx` - Replaced with RNP Button wrapper
- [x] `Card.tsx` - Replaced with RNP Card component
- [x] `Input.tsx` - Replaced with RNP TextInput
- [x] `FAB.tsx` - Replaced with RNP FAB component
- [x] `Badge.tsx` - Replaced with RNP Chip
- [x] `ScreenHeader.tsx` - Replaced with RNP Appbar.Header

## Phase 3: Icon Migration (IN PROGRESS)
**Strategy**: Replace Ionicons with MaterialCommunityIcons (ships with RNP)

### Updated Screens:
- [x] `app/(tabs)/index.tsx` (Dashboard) - Updated icon references
  - Ionicons → MaterialCommunityIcons
  - Updated icon names (business-outline → bank, etc.)

### Screens Pending Icon Migration:
- `app/(auth)/login.tsx` - Has eye icon for password visibility
- `app/(auth)/register.tsx`
- `app/(auth)/forgot-password.tsx`
- `app/(auth)/reset-password.tsx`
- `app/(auth)/otp-verification.tsx`
- `app/(auth)/pin-setup.tsx`
- `app/(tabs)/_layout.tsx` - Tab navigation icons
- `app/(tabs)/accounts.tsx`
- `app/(tabs)/expenses.tsx`
- `app/(tabs)/more.tsx`
- `app/(tabs)/portfolio/index.tsx`
- `app/(tabs)/portfolio/stocks.tsx`
- `app/(tabs)/portfolio/mutual-funds.tsx`
- `app/(tabs)/portfolio/psx-snapshots.tsx`
- `app/(tabs)/portfolio/mutual-fund-snapshots.tsx`
- `app/zakat/index.tsx`
- `app/rent/index.tsx`
- `app/assets/index.tsx`
- `app/broker/index.tsx`
- `app/dues/index.tsx`
- `app/dues/[personId].tsx`
- `app/stocks/[stockId].tsx`
- `app/change-pin/index.tsx`
- `app/pin-entry.tsx`

### Icon Mapping Reference:
```
Ionicons → MaterialCommunityIcons
eye-outline → eye
eye-off-outline → eye-off
mail-outline → email
arrow-back → arrow-left
business-outline → bank
wallet-outline → wallet
trending-up-outline → trending-up
home-outline → home
cash-outline → cash
receipt-outline → receipt
```

## Phase 4: Component Usage Updates (NEXT)
Update all screen files to:
1. Import RNP components where used (Button, Card, etc.)
2. Update TextInput to RNP TextInput
3. Update Ionicons to MaterialCommunityIcons
4. Remove manual styling where RNP handles it

## Phase 5: Theme Testing (AFTER Phase 4)
- [x] Dark mode toggle integration
- [ ] Visual appearance verification on device
- [ ] Spacing and alignment polish per Payra/Budgetin references
- [ ] Test all screens render correctly

## Summary
- **Components Replaced**: 6/6 (100%)
- **Screens Updated**: 1/26 (4%)
- **Icon Migration**: In Progress
- **Overall Progress**: ~40% complete

Next: Continue systematic icon migration and RNP component updates across all screens
