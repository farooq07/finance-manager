# React Native Paper Migration Guide
**Finance Manager Mobile App**

## Overview
Migrate custom UI components to use React Native Paper (RNP v5.12.2) as the single source of truth. All components use Material Design 3 with your global `Colors` palette.

---

## Current Status
✅ **Already using RNP:**
- Card (wrapped)
- Input/TextInput (wrapped)
- FAB (wrapped)
- Text & Button (from RNP)

⚠️ **Need migration:**
- Custom Button variants
- Custom Dialog/Modal components
- Custom Divider usage
- Badge customization
- Custom layout components

---

## Color System Integration
Your `Colors.ts` is already M3-compliant. **No color hardcoding** — always import from Constants/colors:

```typescript
import { Colors } from '../../constants/colors';
```

### RNP Theme Configuration (App-level)
Create a global theme in your App root or theme provider:

```typescript
import { MD3LightTheme } from 'react-native-paper';
import { Colors } from './constants/colors';

const theme = {
  ...MD3LightTheme,
  colors: {
    primary: Colors.primary,
    onPrimary: Colors.onPrimary,
    primaryContainer: Colors.primaryContainer,
    onPrimaryContainer: Colors.onPrimaryContainer,
    
    secondary: Colors.secondary,
    onSecondary: Colors.onSecondary,
    secondaryContainer: Colors.secondaryContainer,
    onSecondaryContainer: Colors.onSecondaryContainer,
    
    tertiary: Colors.tertiary,
    onTertiary: Colors.onTertiary,
    
    error: Colors.error,
    onError: Colors.onError,
    errorContainer: Colors.errorContainer,
    
    background: Colors.background,
    onBackground: Colors.onBackground,
    surface: Colors.surface,
    onSurface: Colors.onSurface,
    surfaceVariant: Colors.surfaceVariant,
    onSurfaceVariant: Colors.onSurfaceVariant,
    
    outline: Colors.outline,
    outlineVariant: Colors.outlineVariant,
  },
};
```

---

## Component Migration Map

### 1. **Button** → `react-native-paper` Button
**Import:** `{ Button } from 'react-native-paper'`

```typescript
// ❌ OLD: Custom button with hardcoded colors
<TouchableOpacity 
  style={{ 
    backgroundColor: '#1f4741', 
    paddingVertical: 12, 
    borderRadius: 8 
  }}
>
  <Text style={{ color: '#fff' }}>Submit</Text>
</TouchableOpacity>

// ✅ NEW: Use RNP Button with variants
<Button mode="contained" onPress={handleSubmit}>
  Submit
</Button>

// Different variants:
<Button mode="contained">Filled (default)</Button>
<Button mode="outlined">Outlined</Button>
<Button mode="text">Text-only</Button>

// With icon:
<Button 
  mode="contained" 
  icon="plus"
  onPress={handleAdd}
>
  Add Item
</Button>

// Loading state:
<Button 
  mode="contained" 
  loading={isLoading}
  disabled={isLoading}
>
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

**When to use each mode:**
- `contained`: Primary actions (Submit, Save, Create)
- `outlined`: Secondary actions (Cancel, Learn More)
- `text`: Tertiary actions (Skip, Details)

---

### 2. **Card** → Already Wrapped (Optimize)
**Current:** `components/ui/Card.tsx` wraps RNPCard

**Keep the wrapper but simplify:**

```typescript
import { Card as RNPCard } from 'react-native-paper';
import { ViewStyle, StyleProp } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined';
  onPress?: () => void;
}

export function Card({ children, style, variant = 'outlined', onPress }: Props) {
  const mode = variant === 'elevated' ? 'elevated' : 'outlined';
  
  return (
    <RNPCard
      mode={mode}
      onPress={onPress}
      style={[{ marginBottom: 8 }, style]}
    >
      <RNPCard.Content style={{ paddingVertical: 16, paddingHorizontal: 16 }}>
        {children}
      </RNPCard.Content>
    </RNPCard>
  );
}
```

**Usage:**
```typescript
<Card variant="outlined">
  <Text variant="titleMedium">Account Balance</Text>
  <Text variant="displaySmall">PKR 50,000</Text>
</Card>

<Card variant="elevated" onPress={() => navigate('details')}>
  <Text>Tap for details</Text>
</Card>
```

---

### 3. **Dialog/Modal** → `react-native-paper` Dialog
**Import:** `{ Dialog, Portal } from 'react-native-paper'`

**Before (Custom Modal):**
```typescript
<Modal visible={showModal} transparent>
  <View style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <View style={{ backgroundColor: 'white', padding: 20 }}>
      <Text>Confirm Action?</Text>
      <Button onPress={() => setShowModal(false)}>Cancel</Button>
      <Button onPress={handleConfirm}>Confirm</Button>
    </View>
  </View>
</Modal>
```

**After (RNP Dialog):**
```typescript
import { Dialog, Portal, Button } from 'react-native-paper';

<Portal>
  <Dialog visible={showModal} onDismiss={() => setShowModal(false)}>
    <Dialog.Title>Confirm Action</Dialog.Title>
    <Dialog.Content>
      <Text>Are you sure you want to proceed?</Text>
    </Dialog.Content>
    <Dialog.Actions>
      <Button onPress={() => setShowModal(false)}>Cancel</Button>
      <Button onPress={handleConfirm} mode="contained">
        Confirm
      </Button>
    </Dialog.Actions>
  </Dialog>
</Portal>
```

**Usage patterns:**
```typescript
// Confirmation Dialog
<Dialog visible={showConfirm} onDismiss={() => setShowConfirm(false)}>
  <Dialog.Title>Delete Account?</Dialog.Title>
  <Dialog.Content>
    <Text>This action cannot be undone.</Text>
  </Dialog.Content>
  <Dialog.Actions>
    <Button onPress={() => setShowConfirm(false)}>Cancel</Button>
    <Button onPress={handleDelete} textColor={Colors.error}>Delete</Button>
  </Dialog.Actions>
</Dialog>

// Alert Dialog
<Dialog visible={showAlert} onDismiss={() => setShowAlert(false)}>
  <Dialog.Icon icon="alert" />
  <Dialog.Title>Payment Failed</Dialog.Title>
  <Dialog.Content>
    <Text>Please try again with a valid card.</Text>
  </Dialog.Content>
  <Dialog.Actions>
    <Button onPress={() => setShowAlert(false)} mode="contained">OK</Button>
  </Dialog.Actions>
</Dialog>
```

---

### 4. **Divider** → `react-native-paper` Divider
**Import:** `{ Divider } from 'react-native-paper'`

```typescript
// ❌ OLD: Custom View
<View style={{ height: 1, backgroundColor: '#e0e0e0', marginVertical: 12 }} />

// ✅ NEW: RNP Divider
<Divider style={{ marginVertical: 12 }} />

// In Lists:
<List.Item title="Item 1" />
<Divider />
<List.Item title="Item 2" />

// Custom styling (use sparingly):
<Divider 
  style={{ 
    backgroundColor: Colors.borderLight,
    marginVertical: 8,
    height: 2
  }} 
/>
```

---

### 5. **Badge** → `react-native-paper` Badge
**Import:** `{ Badge } from 'react-native-paper'`

**Current custom:** `components/ui/Badge.tsx`

**Simplify to:**
```typescript
import { Badge as RNPBadge } from 'react-native-paper';
import { View } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  children: React.ReactNode;
  variant?: 'primary' | 'error' | 'success' | 'warning';
  size?: number;
  style?: any;
}

export function Badge({ children, variant = 'primary', size = 20, style }: Props) {
  const colorMap = {
    primary: Colors.primary,
    error: Colors.error,
    success: Colors.success,
    warning: Colors.warning,
  };

  return (
    <RNPBadge 
      size={size} 
      style={[{ backgroundColor: colorMap[variant] }, style]}
    >
      {children}
    </RNPBadge>
  );
}
```

**Usage:**
```typescript
<Badge variant="error">5</Badge>
<Badge variant="success" size={24}>New</Badge>

// On icons:
<View style={{ position: 'relative' }}>
  <MaterialCommunityIcons name="bell" size={24} />
  <Badge style={{ position: 'absolute', top: -8, right: -8 }}>3</Badge>
</View>
```

---

### 6. **Text** → `react-native-paper` Text
**Import:** `{ Text } from 'react-native-paper'`

**Already in use — ensure consistent variants:**

```typescript
// Heading hierarchy (M3)
<Text variant="displayLarge">Large Title</Text>     {/* 57px */}
<Text variant="displayMedium">Medium Title</Text>   {/* 45px */}
<Text variant="displaySmall">Small Title</Text>    {/* 36px */}

<Text variant="headlineLarge">Large Headline</Text>
<Text variant="headlineMedium">Medium Headline</Text>
<Text variant="headlineSmall">Small Headline</Text>

// Body text
<Text variant="bodyLarge">Large Body</Text>         {/* 16px, Primary text */}
<Text variant="bodyMedium">Medium Body</Text>       {/* 14px */}
<Text variant="bodySmall">Small Body</Text>        {/* 12px */}

// Labels
<Text variant="labelLarge">Large Label</Text>
<Text variant="labelMedium">Medium Label</Text>
<Text variant="labelSmall">Small Label</Text>

// With color
<Text variant="bodyLarge" style={{ color: Colors.textSecondary }}>
  Secondary text
</Text>
```

---

### 7. **Icons** → `@expo/vector-icons` (MaterialCommunityIcons)
**Already installed and compatible with RNP**

```typescript
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

// In buttons:
<Button icon="plus" mode="contained">Add</Button>

// Standalone:
<MaterialCommunityIcons 
  name="bank" 
  size={24} 
  color={Colors.primary} 
/>

// Icon sizes guide:
// - Small (16): labels, badges
// - Medium (20): buttons, list items (default)
// - Large (24): section headers
// - XL (32): emphasis points

// Color usage:
// - Primary action: Colors.primary
// - Secondary: Colors.textSecondary
// - Error states: Colors.error
// - Success: Colors.success
```

---

### 8. **List Items** → `react-native-paper` List
**Import:** `{ List } from 'react-native-paper'`

```typescript
import { List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

// Simple list
<List.Section>
  <List.Item 
    title="Bank Accounts"
    left={() => <List.Icon icon="bank" color={Colors.primary} />}
  />
  <Divider />
  <List.Item 
    title="Investments"
    left={() => <List.Icon icon="trending-up" color={Colors.success} />}
  />
</List.Section>

// With description
<List.Item
  title="Main Account"
  description="PKR 50,000"
  left={() => <List.Icon icon="wallet" color={Colors.primary} />}
  right={() => <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>12:30 PM</Text>}
  onPress={() => navigate('account')}
/>

// Checkboxes
<List.Item
  title="Save my card"
  left={() => <Checkbox status={checked ? 'checked' : 'unchecked'} />}
  onPress={() => setChecked(!checked)}
/>
```

---

### 9. **Checkbox/Radio** → `react-native-paper` Checkbox & RadioButton
**Import:** `{ Checkbox, RadioButton } from 'react-native-paper'`

```typescript
// Checkbox
import { Checkbox } from 'react-native-paper';

<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Checkbox 
    status={agreeTerms ? 'checked' : 'unchecked'}
    onPress={() => setAgreeTerms(!agreeTerms)}
    color={Colors.primary}
  />
  <Text>I agree to the terms</Text>
</View>

// RadioButton
import { RadioButton } from 'react-native-paper';

<RadioButton.Group 
  onValueChange={value => setPaymentMethod(value)}
  value={paymentMethod}
>
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <RadioButton value="card" color={Colors.primary} />
    <Text>Credit Card</Text>
  </View>
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <RadioButton value="bank" color={Colors.primary} />
    <Text>Bank Transfer</Text>
  </View>
</RadioButton.Group>
```

---

### 10. **BottomDrawer** → Keep Custom Wrapper (Enhanced)
**Current:** `components/ui/BottomDrawer.tsx`

Since you're using `@gorhom/bottom-sheet`, keep this but ensure it uses RNP styles internally:

```typescript
import BottomSheet from '@gorhom/bottom-sheet';
import { Button, Text, Divider } from 'react-native-paper';
import { Colors } from '../../constants/colors';

export function BottomDrawer({ visible, onClose, children, title }) {
  return (
    <BottomSheet
      visible={visible}
      onDismiss={onClose}
      snapPoints={[200, 400, 600]}
      style={{ backgroundColor: Colors.surface }}
    >
      <View style={{ padding: 16 }}>
        <Text variant="headlineSmall">{title}</Text>
        <Divider style={{ marginVertical: 12 }} />
        {children}
      </View>
    </BottomSheet>
  );
}
```

---

### 11. **Empty State** → Combine Components
**Current:** `components/ui/EmptyState.tsx`

```typescript
import { View } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface Props {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: Props) {
  return (
    <View style={{ 
      alignItems: 'center', 
      justifyContent: 'center', 
      paddingVertical: 40 
    }}>
      <MaterialCommunityIcons 
        name={icon} 
        size={48} 
        color={Colors.textTertiary} 
      />
      <Text 
        variant="headlineSmall" 
        style={{ marginTop: 16, textAlign: 'center' }}
      >
        {title}
      </Text>
      {description && (
        <Text 
          variant="bodyMedium" 
          style={{ 
            color: Colors.textSecondary, 
            marginTop: 8,
            textAlign: 'center'
          }}
        >
          {description}
        </Text>
      )}
      {actionLabel && (
        <Button 
          mode="contained" 
          style={{ marginTop: 20 }}
          onPress={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
```

---

## Migration Checklist

### Phase 1: Foundation
- [ ] Set up theme at App root
- [ ] Review Colors.ts — verify M3 compliance
- [ ] Update `Input.tsx` to remove hardcoded colors
- [ ] Update `Card.tsx` — remove unnecessary wrapper logic

### Phase 2: Component Library
- [ ] Create/update `components/ui/Badge.tsx` using RNP
- [ ] Create/update `components/ui/EmptyState.tsx` using RNP components
- [ ] Add dialog patterns to `components/layout/` if needed
- [ ] Document all icon names used in app

### Phase 3: Screen-by-Screen
Start with one screen and migrate all:
- Button → RNP Button
- Custom Text → RNP Text variants
- Hardcoded dividers → RNP Divider
- Modal/Alert → RNP Dialog
- List items → RNP List
- Custom styling → Remove (rely on RNP defaults)

**Recommended migration order:**
1. `(tabs)/more.tsx` (usually simpler settings)
2. `(tabs)/index.tsx` (dashboard)
3. `(tabs)/accounts.tsx` 
4. `(auth)/*` screens
5. `(tabs)/portfolio/*`

### Phase 4: Testing
- [ ] Run on Android device
- [ ] Run on iOS device
- [ ] Check all button interactions
- [ ] Verify dialog animations
- [ ] Test color contrast for accessibility
- [ ] Verify tab bar doesn't overlap with FAB

---

## Key Principles

1. **No Hardcoded Colors** — Use `Colors.*` always
2. **No Custom Padding/Spacing** — Let RNP defaults handle it
3. **Use Text Variants** — Not custom fontSize/weight
4. **One Theme Source** — Set globally, not per-component
5. **Icons from Paper** — Button's `icon` prop uses MaterialCommunityIcons
6. **Container over View** — RNP components handle styling
7. **Wrap only when needed** — Most cases don't need custom wrappers

---

## Common Pitfalls

❌ **DON'T:**
```typescript
// Hardcoded color
<Text style={{ color: '#1f4741' }}>Text</Text>

// Custom button styling
<TouchableOpacity style={{ padding: 12, backgroundColor: '#fff' }} />

// Manual dividers
<View style={{ height: 1, backgroundColor: '#eee' }} />

// Direct theme color strings
backgroundColor: '#1f4741'
```

✅ **DO:**
```typescript
// Color from constants
<Text style={{ color: Colors.primary }}>Text</Text>

// RNP Button with variants
<Button mode="contained" onPress={handle} />

// RNP Divider
<Divider />

// Import from theme
theme.colors.primary
```

---

## Resources
- [React Native Paper Docs](https://callstack.github.io/react-native-paper/)
- [Material Design 3 Guidelines](https://m3.material.io/)
- [Icon Search - MaterialCommunityIcons](https://materialdesignicons.com/)

---

## Questions During Migration?
Check the RNP docs and look for existing usage in the codebase. Most components have multiple examples across screens.
