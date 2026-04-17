# Material Design 3 Migration Guide

## ✅ Completed

### Phase 1: Design Tokens (DONE)
- [x] **Color System** - Updated `constants/colors.ts` with M3 semantic colors
  - Primary, Secondary, Tertiary color families
  - On-color variants for text/icons
  - Container variants for backgrounds
  - Error, Success, Warning colors
  - Surfaces & neutral colors
  - Dark mode palette

- [x] **Typography System** - Created `constants/typography.ts`
  - M3 Type Scale (Display, Headline, Title, Body, Label)
  - Spacing system (4px - 48px)
  - Border radius variants
  - Elevation/shadow system (1-5 levels)

### Phase 2: Components (IN PROGRESS)
- [x] **Button** - Updated to M3 specs
  - Variants: Primary, Secondary, Tertiary, Danger, Ghost
  - Sizes: Small, Medium, Large
  - M3 Label typography
  - Proper color semantics
  - Disabled state (38% opacity)

- [x] **Card** - Updated to M3 specs
  - Variants: Elevated, Outlined, Filled
  - M3 elevation system
  - Proper border colors
  - Outline variant as default

- [ ] **Input** - TODO: Update to M3 specs
  - M3 outlined text field style
  - Focus borders with primary color
  - Support, error, counter text
  - Icon support

- [ ] **FAB** - TODO: Update to M3 specs
  - Standard & Extended FAB
  - Proper elevation on press
  - Ripple effect

- [ ] **Badge** - TODO: Update to M3 specs
  - Small, Medium, Large sizes
  - Proper M3 colors

---

## 📋 Migration Checklist

### Step 1: Test Current Updates
```bash
npm start
# Test Button component with all variants
# Test Card component with all variants
```

### Step 2: Update Remaining Components

#### Input Component
```typescript
// Use Typography.bodyMedium for label
// Use Colors.outline for borders
// Use Colors.primary for focus state
// Use Colors.error for error state
```

#### FAB Component
```typescript
// Use Colors.primary background
// Use Colors.onPrimary for icon
// Add elevation3 from Elevation system
// Add press state with elevation5
```

#### Badge Component
```typescript
// Use Colors.primaryContainer background
// Use Colors.onPrimaryContainer for text
// Use Typography.labelSmall for text
```

### Step 3: Update Screens & Layouts

Replace hard-coded spacing with `Spacing` constants:
```typescript
// Before
<View style={{ padding: 16, marginBottom: 24 }}>

// After
<View style={{ padding: Spacing.lg, marginBottom: Spacing.xl }}>
```

Replace hard-coded colors:
```typescript
// Before
style={{ color: '#1f4741' }}

// After
style={{ color: Colors.primary }}
```

### Step 4: Update Dark Mode Theme Store

Update `stores/themeStore.ts` to use M3 dark colors:
```typescript
const theme = isDark ? Colors.dark : Colors;
```

---

## 🎨 Color Usage Guide

### Semantic Usage

**For Primary Actions:**
```typescript
backgroundColor: Colors.primary
color: Colors.onPrimary
```

**For Secondary Actions:**
```typescript
backgroundColor: Colors.secondaryContainer
color: Colors.onSecondaryContainer
```

**For Text:**
```typescript
// Primary text
color: Colors.text

// Secondary text (helper, supporting)
color: Colors.textSecondary

// Muted text (hints, disabled)
color: Colors.textTertiary
```

**For Borders:**
```typescript
// Default borders
borderColor: Colors.outline

// Focus state
borderColor: Colors.primary

// Error state
borderColor: Colors.error
```

---

## 📐 Spacing Usage Guide

```typescript
import { Spacing } from '../../constants/typography';

// Padding
paddingHorizontal: Spacing.lg   // 16px
paddingVertical: Spacing.md     // 12px

// Margins
marginBottom: Spacing.lg        // 16px
gap: Spacing.md                 // 12px (for flexbox)

// Common Patterns
// Component internal: Spacing.md (12px)
// Section spacing: Spacing.lg (16px)
// Large gaps: Spacing.xl (24px)
```

---

## 🔤 Typography Usage Guide

```typescript
import { Typography } from '../../constants/typography';

// Page headings
<Text style={Typography.headlineLarge}>Title</Text>

// Section headings
<Text style={Typography.titleMedium}>Section</Text>

// Body text
<Text style={Typography.bodyMedium}>Body text</Text>

// Labels & buttons
<Text style={Typography.labelLarge}>Button</Text>

// Supporting text
<Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
  Helper text
</Text>
```

---

## 🎯 Elevation Usage Guide

```typescript
import { Elevation } from '../../constants/typography';

// Cards - subtle shadow
...Elevation.elevation1

// FAB - medium shadow
...Elevation.elevation3

// Modals/Dialogs - prominent shadow
...Elevation.elevation5

// No shadow (flat design)
...Elevation.none
```

---

## 📱 Component Implementation Examples

### Button Examples

```typescript
// Primary action (filled)
<Button title="Save" variant="primary" />

// Secondary action (tonal)
<Button title="Cancel" variant="secondary" />

// Tertiary action (outlined)
<Button title="More" variant="tertiary" />

// Danger action
<Button title="Delete" variant="danger" />

// Text only
<Button title="Learn more" variant="ghost" />

// Different sizes
<Button title="Small" size="small" />
<Button title="Medium" size="medium" />
<Button title="Large" size="large" />
```

### Card Examples

```typescript
// Outlined (default) - clear separation
<Card variant="outlined">
  <Text>Content</Text>
</Card>

// Elevated - subtle variation
<Card variant="elevated">
  <Text>Highlighted content</Text>
</Card>

// Filled - emphasis
<Card variant="filled">
  <Text>Important content</Text>
</Card>
```

---

## 🔄 Dark Mode Support

All colors automatically support dark mode via the `Colors.dark` object:

```typescript
// In components
const theme = isDark ? Colors.dark : Colors;

<View style={{ backgroundColor: theme.surface }}>
  <Text style={{ color: theme.text }}>Content</Text>
</View>
```

---

## 📚 Resources

- [Material Design 3 Specs](https://m3.material.io)
- [Color System](https://m3.material.io/styles/color/the-color-system/key-colors-tones)
- [Typography Scale](https://m3.material.io/styles/typography/overview)
- [Component Specs](https://m3.material.io/components)

---

## 🚀 Next Steps

1. **Review & test** current Button & Card updates
2. **Update remaining components** (Input, FAB, Badge)
3. **Migrate screens** to use new spacing & colors
4. **Test dark mode** across all components
5. **Performance test** the app with new design

---

## ⚠️ Breaking Changes

- Button `variant="ghost"` behavior unchanged
- Card `elevated` prop replaced with `variant="elevated"`
- Some color names changed (now semantic: `onPrimary`, `primaryContainer` instead of hardcoded)

---

## 💡 Tips

- Use `Spacing` constants instead of hardcoding values
- Use `Typography` for text sizes (don't hardcode fontSize)
- Use `Elevation` for shadows (don't hardcode shadowColor, etc.)
- Test with dark mode toggle frequently
- Reference Material Design 3 specs for color contrast ratios (WCAG AA minimum)
