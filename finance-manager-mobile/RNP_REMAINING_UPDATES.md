# Remaining React Native Paper Updates

## Screens Updated ✅
1. `app/_layout.tsx` - Added PaperProvider wrapper
2. `app/(tabs)/index.tsx` - Dashboard (Ionicons → MaterialCommunityIcons, RNP imports)
3. `app/(auth)/login.tsx` - Login (RNP TextInput, Button, MaterialCommunityIcons)
4. `app/(tabs)/_layout.tsx` - Tab navigation (MaterialCommunityIcons)

---

## Screens Requiring Updates (19 remaining)

### Quick Update Template
For each screen, follow this pattern:
1. Replace `Ionicons` import with `MaterialCommunityIcons`
2. Update TextInput refs to use RNP TextInput
3. Replace TouchableOpacity buttons with RNP Button (from components/ui/Button)
4. Update custom Card usage to use imported Card component
5. Update icon names to MaterialCommunityIcons equivalents

### Batch 1: Auth Screens

#### `app/(auth)/register.tsx`
- Replace `Ionicons` with `MaterialCommunityIcons`
- Update eye icon for password toggle (eye-outline → eye)
- Replace custom form inputs with RNP TextInput
- Use Button component for submit button

#### `app/(auth)/forgot-password.tsx`
- Similar to login/register
- Replace TextInput with RNP TextInput
- Use Button component

#### `app/(auth)/reset-password.tsx`
- Replace TextInput with RNP TextInput
- Update eye icon for password visibility (eye-outline → eye)
- Use Button component

#### `app/(auth)/otp-verification.tsx`
- Check if uses TextInput - replace with RNP TextInput
- Use Button component

#### `app/(auth)/pin-setup.tsx`
- Replace TextInput with RNP TextInput
- Update icon references if any
- Use Button component

### Batch 2: Tab Screens

#### `app/(tabs)/accounts.tsx`
- Check for Ionicons usage and replace
- Replace TouchableOpacity with RNP components where applicable
- Update Card usage

#### `app/(tabs)/expenses.tsx`
- Replace Ionicons with MaterialCommunityIcons
- Update Card/Button usage
- Check for TextInput fields and update

#### `app/(tabs)/more.tsx`
- Update Ionicons to MaterialCommunityIcons (likely menu icons)
- Update list item styling to match RNP patterns

#### `app/(tabs)/portfolio/index.tsx`
- Update Ionicons references
- Update Card usage
- Check for nested components

#### `app/(tabs)/portfolio/stocks.tsx`
- Update Ionicons
- Update Card usage

#### `app/(tabs)/portfolio/mutual-funds.tsx`
- Update Ionicons
- Update Card usage

#### `app/(tabs)/portfolio/psx-snapshots.tsx`
- Update Ionicons
- Update Card usage

#### `app/(tabs)/portfolio/mutual-fund-snapshots.tsx`
- Update Ionicons
- Update Card usage

### Batch 3: Feature Screens

#### `app/zakat/index.tsx`
- Update Ionicons to MaterialCommunityIcons
- Replace TextInput with RNP TextInput
- Update Button usage
- Update Card usage

#### `app/rent/index.tsx`
- Update Ionicons
- Update TextInput with RNP
- Update Button usage
- Update Card usage

#### `app/assets/index.tsx`
- Update Ionicons
- Update TextInput with RNP
- Update Button/Card usage

#### `app/broker/index.tsx`
- Update Ionicons
- Update TextInput with RNP
- Update Button/Card usage

#### `app/dues/index.tsx`
- Update Ionicons
- Update TextInput with RNP
- Update Button/Card usage
- Check for complex list rendering

#### `app/dues/[personId].tsx`
- Update Ionicons
- Update TextInput with RNP
- Update Button/Card usage

#### `app/stocks/[stockId].tsx`
- Update Ionicons
- Update Card usage

#### `app/change-pin/index.tsx`
- Update Ionicons (eye icon for passwords)
- Replace TextInput with RNP TextInput
- Update Button usage

#### `app/pin-entry.tsx`
- Replace TextInput with RNP TextInput
- Update Button usage

---

## Icon Mapping Guide

```
Ionicons → MaterialCommunityIcons
===================================
eye-outline → eye
eye-off-outline → eye-off
arrow-back → arrow-left
home → home
receipt-outline → receipt
trending-up → trending-up
card-outline → credit-card
grid-outline → menu
mail-outline → email
business-outline → bank
wallet-outline → wallet
cash-outline → cash
arrow-down-circle-outline → arrow-down-circle
arrow-up-circle-outline → arrow-up-circle
add → plus
search → magnify
close → close
settings → cog
person → account
logout → logout
share → share
edit → pencil
delete → trash-can
```

---

## TextInput Migration Pattern

### Before (Native):
```jsx
<TextInput
  style={styles.input}
  placeholder="Enter text"
  placeholderTextColor="#999"
  value={value}
  onChangeText={setValue}
/>
```

### After (RNP):
```jsx
<TextInput
  label="Enter text"
  mode="outlined"
  value={value}
  onChangeText={setValue}
  style={{ marginBottom: 16 }}
/>
```

---

## Button Migration Pattern

### Before (Custom):
```jsx
<TouchableOpacity style={styles.btn} onPress={handlePress}>
  <Text style={styles.btnText}>SUBMIT</Text>
</TouchableOpacity>
```

### After (RNP):
```jsx
<Button
  title="SUBMIT"
  onPress={handlePress}
  variant="primary"
  style={{ marginVertical: 12 }}
/>
```

---

## Card Migration Pattern

### Before (Custom):
```jsx
<Card style={styles.card}>
  <Text>Content</Text>
</Card>
```

### After (RNP):
```jsx
<Card>
  <Text>Content</Text>
</Card>
```

---

## Testing Checklist

After updating each batch:
- [ ] No TypeScript errors
- [ ] Icons render correctly
- [ ] Buttons respond to taps
- [ ] TextInputs accept input
- [ ] Cards display with proper shadows
- [ ] Dark mode toggle works
- [ ] No console warnings

---

## Build Command

```bash
cd finance-manager-mobile
npm install
npm run android
# or
npm run ios
```

---

## Notes

- **Theme Provider**: Already wrapped in `app/_layout.tsx`
- **Icon Library**: MaterialCommunityIcons ships with RNP, no extra install needed
- **Colors**: Existing Colors constant maps directly to RNP theme
- **Styling**: RNP components handle most M3 styling automatically

---

## Completion Estimate

With 19 screens remaining and ~5-10 minutes per screen (mostly find-replace operations):
- Estimated completion: **2-3 hours of focused work**
- Can be parallelized by updating multiple similar screens at once

---

**Last Updated**: 2026-04-16
**Status**: 21% complete (5/24 screens updated)
**Next Priority**: Batch 1 - Auth screens (simplest updates)
