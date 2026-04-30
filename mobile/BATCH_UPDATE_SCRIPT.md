# Batch Update Script for Remaining RNP Screens

## Current Status
- ✅ Phase 1-2: Complete (Setup, Component Replacements)
- ✅ Auth Screens (5/5): Complete (login, register, forgot-password, reset-password, otp-verification, pin-setup)
- ✅ More.tsx & Accounts.tsx: Complete
- ⏳ Remaining: 14 screens

## Remaining Screens to Update (14)

### Quick Updates (Icon Only - No TextInput)
These require only Ionicons → MaterialCommunityIcons migration:

```bash
# File: app/(tabs)/expenses.tsx
- Replace Ionicons with MaterialCommunityIcons
- Icons to update: cash-outline → cash, check-mark-outline → check-mark, close → close
- Features tab bar and list icons

# File: app/(tabs)/portfolio/index.tsx
- Replace Ionicons with MaterialCommunityIcons
- Icons to update: trending-up-outline → trending-up, pie-chart → chart-pie

# File: app/(tabs)/portfolio/stocks.tsx
- Replace Ionicons with MaterialCommunityIcons

# File: app/(tabs)/portfolio/mutual-funds.tsx
- Replace Ionicons with MaterialCommunityIcons

# File: app/(tabs)/portfolio/psx-snapshots.tsx
- Replace Ionicons with MaterialCommunityIcons

# File: app/(tabs)/portfolio/mutual-fund-snapshots.tsx
- Replace Ionicons with MaterialCommunityIcons

# File: app/zakat/index.tsx
- Replace Ionicons with MaterialCommunityIcons
- Update TextInput → RNP TextInput where present

# File: app/rent/index.tsx
- Replace Ionicons with MaterialCommunityIcons
- Update TextInput → RNP TextInput where present

# File: app/assets/index.tsx
- Replace Ionicons with MaterialCommunityIcons
- Update TextInput → RNP TextInput where present

# File: app/broker/index.tsx
- Replace Ionicons with MaterialCommunityIcons
- Update TextInput → RNP TextInput where present

# File: app/dues/index.tsx
- Replace Ionicons with MaterialCommunityIcons
- Update TextInput → RNP TextInput where present
- Complex screen with list handling

# File: app/dues/[personId].tsx
- Replace Ionicons with MaterialCommunityIcons
- Update TextInput → RNP TextInput where present

# File: app/stocks/[stockId].tsx
- Replace Ionicons with MaterialCommunityIcons

# File: app/change-pin/index.tsx
- Replace Ionicons with MaterialCommunityIcons (eye icon for password)
- Update TextInput → RNP TextInput for PIN entry fields
- Update Button component usage

# File: app/pin-entry.tsx
- Replace Ionicons with MaterialCommunityIcons
- Update TextInput usage (simple digit entry)
- Update Button component
```

## Pattern-Based Replacements

### Pattern 1: Ionicons Import
```typescript
// BEFORE
import { Ionicons } from '@expo/vector-icons';

// AFTER
import { MaterialCommunityIcons } from '@expo/vector-icons';
```

### Pattern 2: Icon Component References
```typescript
// BEFORE
<Ionicons name="home-outline" size={20} color={Colors.primary} />

// AFTER
<MaterialCommunityIcons name="home" size={20} color={Colors.primary} />
```

### Pattern 3: Native TextInput
```typescript
// BEFORE
import { TextInput } from 'react-native';
<TextInput
  style={styles.input}
  placeholder="Enter value"
  placeholderTextColor="#999"
  value={value}
  onChangeText={setValue}
/>

// AFTER
import { TextInput } from 'react-native-paper';
<TextInput
  label="Enter value"
  mode="outlined"
  value={value}
  onChangeText={setValue}
  style={styles.input}
/>
```

### Pattern 4: TouchableOpacity Button (with ActivityIndicator)
```typescript
// BEFORE
import { TouchableOpacity, ActivityIndicator } from 'react-native';
<TouchableOpacity style={styles.btn} onPress={handlePress} disabled={loading}>
  {loading ? <ActivityIndicator color="#fff" /> : <Text>Submit</Text>}
</TouchableOpacity>

// AFTER
import { Button } from '../../components/ui/Button';
<Button
  title="Submit"
  onPress={handlePress}
  loading={loading}
  disabled={loading}
  style={styles.btn}
/>
```

## Icon Mapping Reference

Common icon replacements needed:
```
cash-outline → cash
check-mark-outline → check-mark
close → close
trash-outline → trash-can
add → plus
edit-outline → pencil
search-outline → magnify
person-outline → account
settings-outline → cog
arrow-back → arrow-left
chevron-forward → chevron-right
log-out-outline → logout
```

## Automated Replacement Guide

### Using Find & Replace in VS Code

1. **Replace all Ionicons imports:**
   - Find: `import { Ionicons } from '@expo/vector-icons';`
   - Replace: `import { MaterialCommunityIcons } from '@expo/vector-icons';`

2. **Replace Ionicons component references:**
   - Find: `<Ionicons`
   - Replace: `<MaterialCommunityIcons`

3. **Individual icon name replacements** (use case-sensitive, whole word):
   - Find: `"cash-outline"` → Replace: `"cash"`
   - Find: `"check-mark-outline"` → Replace: `"check-mark"`
   - Find: `"trash-outline"` → Replace: `"trash-can"`
   - etc.

4. **TextInput imports:**
   - Find: `TextInput,` (in react-native imports)
   - Replace with nothing to remove from react-native
   - Add: `import { TextInput } from 'react-native-paper';`

## Expected Changes Per File

| File | Type | Changes | Est. Time |
|------|------|---------|-----------|
| expenses.tsx | Icons | ~5 icon updates | 5 min |
| portfolio/* (5 files) | Icons | ~3 icons each | 15 min |
| zakat/index.tsx | Icons + Input | Icon + TextInput updates | 10 min |
| rent/index.tsx | Icons + Input | Icon + TextInput updates | 10 min |
| assets/index.tsx | Icons + Input | Icon + TextInput updates | 10 min |
| broker/index.tsx | Icons + Input | Icon + TextInput updates | 10 min |
| dues/index.tsx | Icons + Input | Complex list, Icons + TextInput | 15 min |
| dues/[personId].tsx | Icons + Input | Icon + TextInput updates | 10 min |
| stocks/[stockId].tsx | Icons | ~3 icon updates | 5 min |
| change-pin/index.tsx | Icons + Input | Eye icon + PIN TextInput + Button | 10 min |
| pin-entry.tsx | Icons + Input | Simple PIN entry, Button | 5 min |

**Total Estimated Time: ~2-2.5 hours**

## Quality Checklist

After each file update, verify:
- [ ] No TypeScript errors (`npm run tsc --noEmit`)
- [ ] All Ionicons replaced
- [ ] All TextInputs updated to RNP (where applicable)
- [ ] Button components used for submit/action buttons
- [ ] Styles cleaned up (remove unused styling)
- [ ] File compiles without warnings

## Testing After Batch

```bash
# Test compilation
npx tsc --noEmit --skipLibCheck --esModuleInterop

# Test on device
npm run android
# or
npm run ios
```

## Commit Strategy

Commit after each logical group:
1. Commit all portfolio screen updates together
2. Commit all form screens (zakat, rent, assets, broker) together
3. Commit PIN-related screens together
4. Commit change-pin and pin-entry together

Example:
```bash
git commit -m "Update portfolio screens with MaterialCommunityIcons

- Updated stocks, mutual-funds, psx-snapshots, mutual-fund-snapshots
- All Ionicons → MaterialCommunityIcons
- Maintains existing functionality and styling

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

## Notes

- RNP TextInput automatically handles error states, labels, and icons
- No need to import TextInput from react-native when using RNP
- Button component from `components/ui/Button` handles loading states automatically
- Card component (from `components/ui/Card`) is ready, no additional changes needed
- After updates, all screens should have consistent Material Design 3 appearance

---

**Next Step**: Pick any file from the list and apply the patterns above. Start with quick wins (icon-only updates) before tackling TextInput updates.
