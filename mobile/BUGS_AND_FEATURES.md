# Finance Manager Mobile - Bugs & Features to Fix

## 🐛 **Issues Found & Solutions**

### 1. **FAB Position Overlapping Bottom Nav (Android)**
**Issue**: Plus icon sits on top of Android bottom navigation bar
**Root Cause**: FAB default `bottom: 24px` doesn't account for tab bar height (~56px)
**Solution**: Adjust FAB bottom position or add tabBarHeight awareness
**Status**: 🔧 IN PROGRESS

**Files to Update**:
- `components/ui/FAB.tsx` - Increase bottom default
- `app/(tabs)/_layout.tsx` - Check if SafeAreaView is used properly

**Change**:
```typescript
// Before
bottom: Spacing.xl (24px)

// After
bottom: 80px (to clear ~56px tab bar + padding)
```

---

### 2. **Rental Income Not Showing on Phone**
**Issue**: Rental Income screen appears empty or not displaying data
**Possible Causes**:
- API data not fetching (`useRent()` hook issue)
- Screen not properly linked in navigation
- Data loading but not rendering

**Solution**:
- Check `hooks/useRent.ts` for proper API call
- Verify `/app/(tabs)/rent` is properly routed
- Test API response in browser: `GET /api/rent`

**Status**: 🔍 NEEDS INVESTIGATION

---

### 3. **Zakat Not Auto-Calculating**
**Issue**: Zakat percentage (2.5%) doesn't auto-calculate from net worth on mobile
**Root Cause**: Currently only manual entry, no auto-calculation feature
**Solution**: 
- Add "Auto Calculate" button in zakat modal
- Calculate 2.5% of (Total Assets - Total Liabilities)
- Show estimated amount before saving

**Status**: 🔧 TO IMPLEMENT

**Formula**:
```typescript
estimatedZakat = (netWorth * 0.025)
// Where netWorth = Total Assets - Total Liabilities
```

---

### 4. **Hide Amounts on Dashboard + PIN-Protected Eye Icon**
**Issue**: All amounts visible on dashboard; need privacy feature with single eye icon at top
**Current**: No amount masking
**Solution**:
- Add eye icon in dashboard header (top-right)
- Click → Ask for PIN
- On success → Show all amounts (toggle view)
- Only show eye icon once at header level, not per item

**Status**: 🔧 TO IMPLEMENT

**Files to Update**:
- `app/(tabs)/index.tsx` - Dashboard screen
- Create `hooks/usePinVerification.ts` - New hook for PIN verification
- Create `components/ui/AmountMask.tsx` - Component for masked amounts

---

### 5. **Transaction Details Not Showing in Dues Ledger**
**Issue**: "When click on person like 2 transactions" - details not expanding/showing
**Possible Meaning**: 
- Clicking person with 2+ transactions should show expanded view
- OR: Individual transaction click should show detail modal

**Status**: 🔍 NEEDS CLARIFICATION
**Suspected Fix**: Add transaction detail modal on press

---

## 📋 **Implementation Priority**

1. **HIGH** - FAB Position Fix (affects Android usability)
2. **HIGH** - Dashboard PIN Privacy Feature (security)
3. **HIGH** - Zakat Auto-calculation (user convenience)
4. **MEDIUM** - Transaction Detail View (UX)
5. **MEDIUM** - Rental Income Investigation (data issue)

---

## 🛠️ **Testing Checklist**

- [ ] FAB appears above bottom nav on Android
- [ ] Dashboard eye icon visible at top
- [ ] PIN verification works correctly
- [ ] Amounts hide/show on eye icon toggle
- [ ] Zakat auto-calc shows on button click
- [ ] Rental income data loads
- [ ] Transaction details modal appears on press

---

## 📱 **Architecture Notes**

### Dashboard Privacy Feature Structure
```
Dashboard (index.tsx)
├── Header with Eye Icon
│   ├── IsAmountHidden state
│   └── onEyePress() → PinVerification
├── PinVerificationModal
│   └── useAuthStore.verifyPin()
└── Amount Component (shows/hides based on state)
    ├── <AmountMask /> if hidden
    └── <Amount /> if shown
```

### Zakat Auto-calc Flow
```
ZakatModal
├── Manual Amount Input
└── "Auto Calculate" Button
    ├── Fetch netWorth from useZakat()
    ├── Calculate 2.5% × netWorth
    ├── Set amount field
    └── Show toast: "Calculated: PKR XX,XXX"
```
