# Dashboard API & Metrics Documentation

## Overview

The Dashboard API provides a comprehensive financial overview by aggregating data from multiple modules (bank accounts, wallets, investments, ledger dues, expenses, and assets). It calculates net worth, investment distributions, and expense analytics.

---

## Core Module: `dashboard.controller.js`

**Location:** `/backend/src/controllers/dashboard.controller.js`

### Main Functions

#### `fetchDashboardData(userId)`

**Purpose:** Aggregate all user financial data and calculate comprehensive metrics

**Parameters:**
- `userId` (string) - The user's unique identifier

**Returns:** Promise<Object> with metrics and chart data

**Processing Steps:**

1. **Bank & Wallet Balance Aggregation**
   - Fetches all wallet accounts with exchange rate conversion
   - Fetches all bank accounts with exchange rate conversion
   - Calculates total liquid cash available

2. **Stock Investment Calculation**
   - Retrieves latest PSX snapshot if available (for uploaded portfolios)
   - Falls back to manual stock entries if no snapshot exists
   - Calculates current market value and cost basis
   - Includes trading cash from PSX account

3. **Mutual Fund Valuation**
   - Gets latest portfolio snapshot if available
   - Falls back to manual mutual fund entries
   - Calculates total current value and invested amount
   - Computes gain/loss metrics

4. **Ledger Dues Analysis**
   - Aggregates all person-based transactions
   - Calculates net balance per person (receivable vs payable)
   - Sums total receivables and payables

5. **Expense Analytics**
   - Calculates total expenses year-to-date
   - Breaks down expenses by month
   - Computes current month spending

6. **Asset Valuation**
   - Sums all physical and non-liquid assets
   - Includes property, vehicles, gold, etc.

7. **Net Worth Calculation**
   - Formula: `Liquid Cash + Investments + Receivables - Payables`
   - Excludes physical assets from comprehensive net worth

---

### Response Structure

#### Complete Response Object

```javascript
{
  metrics: {
    // Core Financial Metrics
    netWorth: 1500000,                    // Total net worth in PKR
    totalBankBalance: 500000,             // Sum of all bank accounts
    totalWalletBalance: 100000,           // Sum of all digital wallets
    totalInvestments: 800000,             // Stocks + Mutual Funds + Trading Cash
    
    // Investment Breakdown
    mutualFundValue: 400000,              // Current market value
    mutualFundCost: 380000,               // Amount invested
    stockValue: 400000,                   // Current market value
    stockCost: 350000,                    // Amount invested
    
    // Ledger Analysis
    totalReceivable: 50000,               // Money owed to user
    totalPayable: 0,                      // Money user owes
    
    // Expense Tracking
    totalExpenses: 120000,                // Year-to-date total
    currentMonthExpenses: 45000,          // Current month spending
    
    // Asset Tracking
    totalAssetValue: 150000               // Physical assets total
  },
  
  charts: {
    // Monthly expense breakdown (12 months)
    monthlyExpenses: [
      { month: "Jan", amount: 10000 },
      { month: "Feb", amount: 15000 },
      // ... 12 months total
    ],
    
    // Investment allocation pie chart
    investmentDistribution: [
      { name: "Mutual Funds", value: 400000 },
      { name: "Stocks", value: 400000 }
    ],
    
    // Asset allocation pie chart
    assetAllocation: [
      { name: "Banks", value: 500000 },
      { name: "Wallets", value: 100000 },
      { name: "Mutual Funds", value: 400000 },
      { name: "Stocks", value: 400000 },
      { name: "Physical Assets", value: 150000 },
      { name: "Ledger Dues", value: 50000 }
    ]
  }
}
```

---

## API Endpoints

### 1. Get Dashboard Summary

**Endpoint:** `GET /dashboard/summary`

**Authentication:** Required (JWT Bearer Token)

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "metrics": { /* See response structure above */ },
  "charts": { /* See response structure above */ }
}
```

**Error Responses:**

```json
// 500 Internal Server Error
{
  "message": "Server error generating dashboard summary"
}
```

**Example Usage (Frontend):**
```javascript
import api from '../services/api';

const fetchDashboard = async () => {
    try {
        const response = await api.get('/dashboard/summary');
        const { metrics, charts } = response.data;
        // Use metrics and charts in UI
    } catch (error) {
        console.error('Failed to load dashboard', error);
    }
};
```

---

### 2. Send Manual Summary Email

**Endpoint:** `POST /dashboard/send-summary`

**Authentication:** Required (JWT Bearer Token)

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{}
```

**Response (200 OK):**
```json
{
  "message": "Summary email sent successfully to farooqibex@gmail.com"
}
```

**Error Responses:**

```json
// 500 Internal Server Error
{
  "message": "Server error sending summary email"
}
```

**What Happens:**
1. Fetches user's dashboard metrics
2. Retrieves user's name and email
3. Sends formatted summary email
4. Returns success/error message

**Example Usage (Frontend):**
```javascript
const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
        const response = await api.post('/dashboard/send-summary');
        console.log(response.data.message);
        toast.success('Email sent!');
    } catch (error) {
        console.error('Failed:', error);
        toast.error('Failed to send email');
    } finally {
        setSendingEmail(false);
    }
};
```

---

## Metric Calculations

### Net Worth Formula

```
Net Worth = Liquid Cash + Investments + Receivables - Payables

Where:
  Liquid Cash = Banks + Wallets
  Investments = Stocks + Mutual Funds + Trading Cash
  Receivables = Money owed to user by others
  Payables = Money user owes to others
```

**Note:** Physical assets are tracked separately and not included in net worth calculation.

---

### Investment Calculations

#### Stocks
```
Stock Value = Latest PSX Snapshot Total Custody (OR)
              Sum of (Quantity × Current Market Price) for manual entries

Stock Cost = Sum of total cost from holdings_data in PSX snapshot
```

#### Mutual Funds
```
Fund Value = Latest Portfolio Snapshot Total Value (OR)
             Sum of current value from manual entries

Fund Cost = Sum of total_invested from manual entries
```

#### Trading Cash
```
Trading Cash = summary_data.trading_cash from PSX snapshot (if available)
```

---

### Expense Analytics

#### Monthly Breakdown
```javascript
// Calculated for each month of current year
monthlyExpenses = [
  Jan: sum of Jan expenses,
  Feb: sum of Feb expenses,
  // ... through Dec
]
```

#### Current Month
```
Current Month Expenses = Sum of expenses with expense_date in current month
```

---

### Ledger Analysis

#### Per Person Calculation
```javascript
// For each person:
netBalance = sum(receivable transactions) - sum(payable transactions)

// Aggregated:
totalReceivable = sum of all positive netBalance values
totalPayable = sum of all negative netBalance values (absolute)
```

---

## Database Queries

### Key Prisma Calls

**1. Wallet Balance:**
```javascript
const wallets = await prisma.wallet.findMany({ 
  where: { user_id: userId } 
});
totalWalletBalance = wallets.reduce((sum, w) => 
  sum + (Number(w.balance) * Number(w.exchange_rate || 1)), 0
);
```

**2. Bank Balance:**
```javascript
const banks = await prisma.bank.findMany({ 
  where: { user_id: userId } 
});
totalBankBalance = banks.reduce((sum, b) => 
  sum + (Number(b.current_balance) * Number(b.exchange_rate || 1)), 0
);
```

**3. Latest PSX Snapshot:**
```javascript
const latestPsx = await prisma.psxSnapshot.findFirst({
  where: { user_id: userId },
  orderBy: { snapshot_date: 'desc' }
});
```

**4. Mutual Fund Portfolio:**
```javascript
const latestMfSnapshot = await prisma.portfolioSnapshot.findFirst({
  where: { user_id: userId },
  orderBy: { upload_date: 'desc' }
});
```

**5. Ledger Dues:**
```javascript
const people = await prisma.person.findMany({
  where: { user_id: userId },
  include: { transactions: true }
});
```

**6. Expenses:**
```javascript
const expenses = await prisma.expense.findMany({ 
  where: { user_id: userId } 
});
```

---

## Frontend Integration

### Dashboard Component Example

**Location:** `/frontend/src/pages/Dashboard.jsx`

**Features:**
- Displays comprehensive financial metrics
- Shows 4 main stat cards (Net Worth, Total Investments, etc.)
- Renders monthly expense bar chart
- Renders asset allocation pie chart
- Send summary email button with loading state
- Skeleton loading states while data loads
- Error handling with user feedback

**Key Components:**
```jsx
// Load dashboard data
useEffect(() => {
  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard/summary');
      setData(response.data);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };
  fetchDashboard();
}, []);

// Send manual email
const handleSendEmail = async () => {
  setSendingEmail(true);
  try {
    await api.post('/dashboard/send-summary');
    toast.success('Summary email sent successfully');
  } catch (error) {
    toast.error('Failed to send email');
  } finally {
    setSendingEmail(false);
  }
};
```

**Chart Libraries:**
- ECharts for data visualization
- Responsive chart sizing
- Color-coded by category

---

## Performance Considerations

### Query Optimization
- Uses `findMany` with specific `where` conditions to limit results
- Latest snapshots fetched with `findFirst` and `orderBy desc`
- Reduces N+1 queries by using `include` for relations

### Calculation Efficiency
- Single pass through array aggregations
- Math operations performed server-side
- Formatted currency strings prepared once

### Caching Opportunities
- Dashboard data could be cached for 1-5 minutes
- Snapshot data is relatively static
- Ledger data updates when transactions added

---

## Data Types & Conversions

### Currency Handling
- Primary currency: **PKR (Pakistani Rupee)**
- Exchange rates stored with bank/wallet accounts
- All calculations in base currency after rate conversion
- Frontend formatting using `.toLocaleString('en-PK')`

### Number Precision
- JavaScript numbers used (floating point)
- For financial data, consider using Decimal.js for high precision
- Current implementation suitable for most use cases

### Date Handling
- Expense dates compared to current year/month
- PSX snapshot ordered by `snapshot_date DESC`
- Portfolio snapshot ordered by `upload_date DESC`

---

## Error Handling

### Try-Catch Pattern
```javascript
try {
  const data = await fetchDashboardData(userId);
  res.json(data);
} catch (error) {
  console.error('Dashboard Summary Error:', error);
  res.status(500).json({ 
    message: 'Server error generating dashboard summary' 
  });
}
```

### Common Issues
- **Missing user data** - Returns empty arrays, aggregates to 0
- **No snapshots** - Falls back to manual entries
- **Missing exchange rates** - Uses default rate of 1
- **Invalid data types** - Converted to Number() for safety

---

## Testing

### Test Cases
```javascript
// Test 1: User with complete data
userId = 'user-with-all-data'
// Expected: Full metrics with all categories populated

// Test 2: New user with no data
userId = 'new-user'
// Expected: All metrics should be 0 or empty arrays

// Test 3: User with PSX snapshot
userId = 'user-with-psx'
// Expected: stockValue from snapshot, not manual entries

// Test 4: User with MF snapshot
userId = 'user-with-mf'
// Expected: fundValue from snapshot, not manual entries
```

---

## Future Enhancements

- [ ] Historical net worth tracking (chart over time)
- [ ] Gain/loss analysis per investment
- [ ] Budget vs actual expense comparison
- [ ] Sector-wise investment breakdown
- [ ] Performance metrics (ROI, CAGR)
- [ ] Forecasting and financial projections
- [ ] Currency conversion for multi-currency support
- [ ] Data export (PDF, CSV)
- [ ] Custom date range selection
- [ ] Comparison with previous periods
