# Finance Manager Mobile - Implementation Guide

## ✅ Completed Features

### New Screens Created
1. **Dues Ledger** (`/app/dues.tsx`)
   - List all persons with dues
   - View detailed transaction history per person
   - Add/edit/delete transactions (receivable/payable)
   - Net balance calculation and summary

2. **Zakat** (`/app/zakat.tsx`)
   - Track zakat entries with amounts
   - Show current year total
   - Add/delete zakat entries
   - Date and description tracking

3. **Rental Income** (`/app/rent.tsx`)
   - Record rental income by month/year
   - Track payer information
   - Account source and notes
   - Total received summary

4. **Physical Assets** (`/app/assets.tsx`)
   - Categorize assets (Vehicle, Property, Jewelry, etc.)
   - Track asset values and purchase dates
   - Visual icons for each asset type
   - Total asset value summary

5. **Broker Accounts** (`/app/broker.tsx`)
   - Store broker account details
   - Client code and account numbers
   - CDC Sub Account and PIN code storage
   - Multiple broker accounts support

6. **Change PIN** (`/app/change-pin.tsx`)
   - Secure PIN change functionality
   - Current PIN verification
   - PIN confirmation matching
   - 4-6 digit PIN requirements

## 📱 Data Synchronization

### How It Works
Both mobile and web apps automatically sync data through the same backend:

```
Mobile App → API (Railway) ← Web App
     ↓                           ↓
  Same Backend Database
```

### Key Points
- **Single Source of Truth**: Both apps use the same PostgreSQL database via Supabase
- **API Endpoints**: All data operations go through the same REST API endpoints
- **Auth Token**: Mobile app stores token securely in SecureStore
- **Query Cache**: React Query manages cache invalidation after mutations
- **Automatic Sync**: When you add data on mobile, it's immediately available on web

### API Configuration
```
Base URL: https://finance-manager-production-30c4.up.railway.app/api
Auth: Bearer token in headers
Content-Type: application/json
```

### Query Cache Invalidation
All mutations include `onSuccess` callbacks that invalidate related queries:

Example:
```typescript
export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/expenses', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.expenses })
  });
}
```

This ensures:
- After adding expense on mobile, the list refreshes
- Web app fetches updated data on next query
- Real-time sync through shared database

## 🎨 UI/UX Improvements

### Color Palette
- **Primary**: #10B981 (Vibrant Emerald Green)
- **Primary Dark**: #059669
- **Success**: #10B981
- **Danger**: #EF4444
- **Warning**: #F59E0B
- **Background**: #F5F5F5
- **Surface**: #FFFFFF

### Bottom Tab Styling
- Emerald-tinted border
- Soft shadow elevation
- Active/inactive color differentiation
- Premium feel with elevation

### Modal/Bottom Sheet
All modals include:
- Close button with increased hit area (hitSlop)
- Back button navigation
- Header with proper styling
- Keyboard-aware ScrollView
- Activity indicators during loading

### Filter Pills
- Improved text contrast (dark text on white background)
- Better visibility and readability
- No clipping issues
- Stable rendering during navigation

## 🔧 Technical Details

### Dependencies Used
- `@tanstack/react-query` - State management and caching
- `expo-router` - Navigation
- `react-native-safe-area-context` - Safe area handling
- `expo-secure-store` - Secure token storage
- `react-hook-form` - Form management
- `zod` - Schema validation
- `react-native-toast-message` - Notifications

### Folder Structure
```
app/
├── (tabs)/
│   ├── index.tsx (Dashboard)
│   ├── expenses.tsx
│   ├── accounts.tsx
│   ├── portfolio/
│   ├── more.tsx
│   └── _layout.tsx
├── (auth)/
├── dues.tsx (NEW)
├── rent.tsx (NEW)
├── zakat.tsx (NEW)
├── assets.tsx (NEW)
├── broker.tsx (NEW)
├── change-pin.tsx (NEW)
└── _layout.tsx

hooks/
├── useDues.ts
├── useRent.ts
├── useZakat.ts
├── useAssets.ts
├── useBrokers.ts
└── useAuth.ts (includes useChangePin)

types/
└── api.ts (all data models)

constants/
├── colors.ts (design tokens)
├── queryKeys.ts (React Query keys)
└── categories.ts

services/
└── api.ts (Axios configuration)
```

## 📋 Data Models

### DuesPerson
```typescript
{
  id: string
  name: string
  email?: string
  netBalance: number
  transactions: DuesTransaction[]
}
```

### ZakatEntry
```typescript
{
  id: string
  amount: string
  description?: string
  date: string
}
```

### RentEntry
```typescript
{
  id: string
  payer_name: string
  amount: string
  month: string
  year: number
  payment_date: string
  account_source: string
  notes?: string
}
```

### Asset
```typescript
{
  id: string
  name: string
  type: string (Vehicle|Property|Jewelry|Electronics|Furniture|Other)
  value: string
  purchase_date?: string
  description?: string
}
```

### BrokerAccount
```typescript
{
  id: string
  account_title: string
  client_code: string
  participant_acc_no?: string
  cdc_sub_acc_no?: string
  stock_pin_code?: string
}
```

## 🔐 Security

- **PIN Storage**: Secure PIN change via `/auth/pin/change` endpoint
- **Token Storage**: Uses `expo-secure-store` for secure token storage
- **Auth Headers**: All requests include Bearer token
- **Error Handling**: 401 responses clear auth and log out user
- **Input Validation**: Zod schemas validate all form inputs

## ✨ Best Practices

1. **Query Keys**: Use structured query keys for better cache management
2. **Error Handling**: Toast notifications for user feedback
3. **Loading States**: Skeleton loaders for better UX
4. **Accessibility**: hitSlop on buttons for larger touch targets
5. **Data Validation**: Zod schemas for runtime validation
6. **State Management**: React Query for server state, Zustand for auth

## 🐛 Troubleshooting

### Data Not Syncing
- Check API base URL is correct
- Verify auth token is present
- Check network connectivity
- Review API logs in Railway dashboard

### Close Button Not Working
- Ensure hitSlop is applied to TouchableOpacity
- Check modal is not behind other elements
- Verify onPress callback is called
- Test on actual device if using Android

### Performance Issues
- Review React Query cache settings
- Check for unnecessary re-renders
- Use React.memo for heavy components
- Implement virtualization for long lists

## 📞 API Endpoints

All endpoints follow REST conventions:

```
GET    /dues              - Get all persons
GET    /dues/{id}         - Get specific person with transactions
POST   /dues              - Create person
POST   /dues/{id}/transactions - Add transaction
DELETE /dues/{id}         - Delete person
DELETE /dues/{id}/transactions/{tid} - Delete transaction

GET    /zakat             - Get all zakat entries
POST   /zakat             - Add zakat entry
DELETE /zakat/{id}        - Delete zakat entry

GET    /rent              - Get rental entries
POST   /rent              - Add rental entry
DELETE /rent/{id}         - Delete entry

GET    /assets            - Get all assets
POST   /assets            - Add asset
PUT    /assets/{id}       - Update asset
DELETE /assets/{id}       - Delete asset

GET    /brokers           - Get broker accounts
POST   /brokers           - Add broker account
DELETE /brokers/{id}      - Delete broker

PUT    /auth/pin/change   - Change PIN
```

## 🚀 Deployment

- **Backend**: Railway (https://finance-manager-production-30c4.up.railway.app)
- **Database**: Supabase PostgreSQL
- **Mobile**: Expo (React Native)
- **Build**: EAS Build recommended for production

## 📝 Notes

- All screens use the same design system and color palette
- Modals use `react-native` Modal component
- Query cache invalidation happens on successful mutations
- Forms use react-hook-form with zod validation
- Bottom tabs include all 5 main screens + More section
