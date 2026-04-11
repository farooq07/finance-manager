# Email System Documentation

## Overview

The Finance Manager email system provides three core email capabilities:
1. **OTP Authentication Emails** - 6-digit codes for login verification
2. **Weekly Summary Emails** - Automated financial summaries every Sunday
3. **Manual Summary Trigger** - On-demand summary email requests
4. **Reminder Emails** - Pending dues notifications

All emails are sent via Gmail SMTP using nodemailer.

## Features

### Email Types

#### 1. OTP Email (Login Verification)
**Purpose:** Send a 6-digit one-time password for secure login

**Triggered by:** User login attempt → OTP generation → Email delivery
**Expiration:** 10 minutes
**Template:** Professional branded email with prominent OTP display

**Example Response:**
```
Subject: Your Finance Manager Login Code
Body: Contains 6-digit OTP in large formatted box
```

#### 2. Weekly Summary Email
**Purpose:** Automated financial overview sent to users every Sunday

**Schedule:** Every Sunday at 9:00 AM (configurable cron expression: `0 9 * * 0`)
**Triggered by:** Cron job (see [Cron Service](#cron-service))
**Content Includes:**
- Net worth overview
- Bank & wallet balances
- Investment totals (stocks + mutual funds)
- Ledger dues (receivables and payables)

**Template:** Clean, organized HTML with color-coded sections

#### 3. Manual Summary Email
**Purpose:** Allow users to request a summary email on-demand

**Endpoint:** `POST /dashboard/send-summary`
**Authentication:** Required (JWT token)
**Response:**
```json
{
  "message": "Summary email sent successfully to farooqibex@gmail.com"
}
```

#### 4. Reminder Email
**Purpose:** Notify people about pending dues

**Content:** Outstanding balance with PKR formatting
**Use Case:** Can be triggered from dues ledger management

---

## Implementation Details

### Core Module: `email.js`

**Location:** `/backend/src/utils/email.js`

#### Setup
```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});
```

#### Available Functions

##### `sendOtpEmail(to, otp)`
Sends OTP verification code for login.

**Parameters:**
- `to` (string) - Recipient email address
- `otp` (string) - 6-digit code

**Returns:** Promise<void>

**Example:**
```javascript
await sendOtpEmail('user@example.com', '123456');
```

**Dev Mode:** If Gmail credentials not set, logs OTP to console instead

---

##### `sendSummaryEmail(to, userName, metrics)`
Sends comprehensive financial summary.

**Parameters:**
- `to` (string) - Recipient email address
- `userName` (string) - User's display name
- `metrics` (object) - Financial metrics object

**Metrics Object Structure:**
```javascript
{
  netWorth: number,
  totalBankBalance: number,
  totalWalletBalance: number,
  totalInvestments: number,
  totalReceivable: number,
  totalPayable: number,
  mutualFundValue: number,
  stockValue: number,
  totalAssetValue: number
}
```

**Returns:** Promise<void>

**Example:**
```javascript
const metrics = {
  netWorth: 1500000,
  totalBankBalance: 500000,
  totalWalletBalance: 100000,
  totalInvestments: 800000,
  totalReceivable: 50000,
  totalPayable: 0,
  mutualFundValue: 400000,
  stockValue: 400000,
  totalAssetValue: 150000
};

await sendSummaryEmail('user@example.com', 'John', metrics);
```

---

##### `sendReminderEmail(to, personName, netBalance)`
Sends dues reminder to a person.

**Parameters:**
- `to` (string) - Recipient email address
- `personName` (string) - Person's name
- `netBalance` (number) - Outstanding amount in PKR

**Returns:** Promise<void>

**Example:**
```javascript
await sendReminderEmail('friend@example.com', 'Ahmed', 50000);
```

**Format:** PKR with proper locale formatting (`en-PK`)

---

## Cron Service

**Location:** `/backend/src/services/cron.service.js`

### Initialization

```javascript
import { initCronJobs } from '../services/cron.service.js';

// In server startup
initCronJobs();
```

### Schedule Configuration

**Current Schedule:** `0 9 * * 0` (Sunday 9:00 AM)

**To change schedule:**
```javascript
const CRON_SCHEDULE = '0 9 * * 0'; // Modify this
```

**Common Cron Patterns:**
- `* * * * *` - Every minute (for testing)
- `0 * * * *` - Every hour at the top of the hour
- `0 9 * * 1-5` - Weekdays at 9 AM
- `0 9 * * 0` - Sundays at 9 AM (current)
- `0 9 1 * *` - First day of month at 9 AM

### How It Works

1. **Initialization:** Logs that cron job is starting
2. **User Retrieval:** Fetches all users with email addresses
3. **Data Aggregation:** For each user:
   - Calls `fetchDashboardData()` to calculate metrics
   - Prepares summary email content
4. **Email Dispatch:** Sends summary to configured email address
5. **Error Handling:** Logs errors per user without stopping other emails

**Flow:**
```
Cron Trigger → Fetch All Users → For Each User {
  Get Dashboard Data → Format Email → Send Email
}
```

---

## Dashboard Integration

### API Endpoint: `GET /dashboard/summary`

**Purpose:** Fetch financial metrics for dashboard display

**Authentication:** Required (JWT token)

**Response Structure:**
```json
{
  "metrics": {
    "netWorth": 1500000,
    "totalBankBalance": 500000,
    "totalWalletBalance": 100000,
    "totalInvestments": 800000,
    "mutualFundValue": 400000,
    "mutualFundCost": 380000,
    "stockValue": 400000,
    "stockCost": 350000,
    "totalReceivable": 50000,
    "totalPayable": 0,
    "totalExpenses": 120000,
    "currentMonthExpenses": 45000,
    "totalAssetValue": 150000
  },
  "charts": {
    "monthlyExpenses": [
      { "month": "Jan", "amount": 10000 },
      { "month": "Feb", "amount": 15000 }
    ],
    "investmentDistribution": [
      { "name": "Mutual Funds", "value": 400000 },
      { "name": "Stocks", "value": 400000 }
    ],
    "assetAllocation": [
      { "name": "Banks", "value": 500000 },
      { "name": "Wallets", "value": 100000 }
    ]
  }
}
```

---

### API Endpoint: `POST /dashboard/send-summary`

**Purpose:** Trigger on-demand summary email

**Authentication:** Required (JWT token)

**Request Body:** (empty)
```json
{}
```

**Response:**
```json
{
  "message": "Summary email sent successfully to farooqibex@gmail.com"
}
```

**Error Handling:**
```json
{
  "message": "Server error sending summary email"
}
```

---

## Frontend Integration

### Dashboard Component

**Location:** `/frontend/src/pages/Dashboard.jsx`

**Key Features:**
- Displays financial metrics from dashboard API
- Send email button with loading state
- Toast notifications for success/error
- Charts for expense and asset visualization

**Implementation:**
```javascript
const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
        await api.post('/dashboard/send-summary');
        toast.success('Summary email sent successfully to farooqibex@gmail.com');
    } catch (error) {
        toast.error('Failed to send email. Check console.');
    } finally {
        setSendingEmail(false);
    }
};
```

**UI Elements:**
- Mail icon button in dashboard header
- Loading spinner during email send
- Toast notification on success/failure

---

## Environment Configuration

### Required Environment Variables

```env
# Gmail SMTP Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-specific-password

# Note: Use Google App Passwords, not your main Gmail password
```

### Getting Gmail App Password

1. Enable 2-Factor Authentication on Gmail account
2. Go to Google Account → Security → App passwords
3. Select "Mail" and "Windows Computer" (or your device)
4. Generate app password
5. Copy and paste into `GMAIL_APP_PASSWORD` in `.env`

### Development Mode

If email credentials are not set:
- OTP codes logged to console
- Summary emails logged as simulated
- No actual emails sent
- Perfect for local testing

---

## Error Handling

### Try-Catch Pattern
```javascript
try {
    await sendSummaryEmail(email, name, metrics);
    console.log(`Email sent successfully`);
} catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
}
```

### Common Issues

**Issue:** Emails not sending
- **Check:** Gmail credentials in `.env`
- **Check:** App password (not main password)
- **Check:** 2FA enabled on Gmail
- **Check:** Console for error messages in dev mode

**Issue:** Cron job not running
- **Check:** `initCronJobs()` called on server startup
- **Check:** Server console for cron initialization logs
- **Check:** Timezone on server matches expected cron times

---

## Testing

### Manual Testing

**Test OTP Email:**
```bash
# Trigger login flow in app
# Check console for OTP in dev mode
```

**Test Summary Email:**
```bash
# Call POST /dashboard/send-summary endpoint
# Check target email for receipt
```

**Test Cron Job:**
```bash
# Change CRON_SCHEDULE to '* * * * *' (every minute)
# Monitor server logs
# Revert after testing
```

---

## Security Considerations

1. **App Password Required** - Never use main Gmail password
2. **Dev Mode Fallback** - Graceful handling when credentials missing
3. **Email Validation** - Verify recipient email format
4. **Rate Limiting** - Consider adding rate limits to manual send endpoint
5. **Data Privacy** - Email contains sensitive financial data

---

## Future Enhancements

- [ ] Email template customization
- [ ] Multiple email recipient support
- [ ] Frequency preferences (weekly/monthly/daily)
- [ ] Email delivery status tracking
- [ ] HTML email template engine
- [ ] Email attachment support (receipts, PDFs)
- [ ] Unsubscribe links in emails
