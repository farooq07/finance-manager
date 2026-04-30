# Quick Reference Guide

## API Endpoints at a Glance

### Authentication (`/api/auth`)

| Method | Endpoint | Auth Required | Purpose |
|--------|----------|---------------|---------|
| POST | `/register` | No | Create new account |
| POST | `/login` | No | Request OTP for login |
| POST | `/verify-otp` | No | Login with OTP code |
| GET | `/me` | Yes | Get current user info |
| PUT | `/pin` | Yes | Setup 4-digit PIN |
| PUT | `/pin/change` | Yes | Change existing PIN |
| POST | `/verify-pin` | Yes | Verify PIN for operations |
| POST | `/forgot-password` | No | Request password reset |
| POST | `/reset-password` | No | Reset with token |

### Dashboard (`/api/dashboard`)

| Method | Endpoint | Auth Required | Purpose |
|--------|----------|---------------|---------|
| GET | `/summary` | Yes | Get financial metrics and charts |
| POST | `/send-summary` | Yes | Trigger summary email |

---

## Key Files & Locations

### Backend
- **Auth Logic:** `/backend/src/controllers/auth.controller.js`
- **Dashboard Logic:** `/backend/src/controllers/dashboard.controller.js`
- **Email Utilities:** `/backend/src/utils/email.js`
- **Cron Jobs:** `/backend/src/services/cron.service.js`
- **API Routes:** `/backend/src/routes/*.routes.js`
- **Database Schema:** `/backend/prisma/schema.prisma`

### Frontend
- **Dashboard Page:** `/frontend/src/pages/Dashboard.jsx`
- **API Client:** `/frontend/src/services/api.js`
- **Auth Context:** `/frontend/src/context/AuthContext.jsx`
- **PIN Context:** `/frontend/src/context/PinContext.jsx`
- **Currency Utils:** `/frontend/src/utils/currency.js`

---

## Common Tasks

### Add New API Endpoint

1. **Create route** in `/backend/src/routes/feature.routes.js`:
```javascript
import express from 'express';
import { myHandler } from '../controllers/feature.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(verifyToken); // If protected
router.get('/data', myHandler);

export default router;
```

2. **Create controller** in `/backend/src/controllers/feature.controller.js`:
```javascript
export const myHandler = async (req, res) => {
  try {
    const userId = req.user.id;
    // Your logic here
    res.json({ /* response */ });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};
```

3. **Register route** in `/backend/src/server.js`:
```javascript
import featureRoutes from './routes/feature.routes.js';
app.use('/api/feature', featureRoutes);
```

4. **Call from frontend**:
```javascript
import api from '../services/api';
const response = await api.get('/feature/data');
```

---

### Send Email

```javascript
import { sendSummaryEmail } from '../utils/email.js';

const metrics = {
  netWorth: 1000000,
  totalBankBalance: 500000,
  totalInvestments: 400000,
  totalReceivable: 50000,
  totalPayable: 0
};

await sendSummaryEmail('user@example.com', 'John', metrics);
```

---

### Fetch User Data

```javascript
import prisma from '../utils/prisma.js';

// Get user with all relations
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    banks: true,
    wallets: true,
    expenses: true
  }
});
```

---

### Calculate Metrics

```javascript
import { fetchDashboardData } from '../controllers/dashboard.controller.js';

const data = await fetchDashboardData(userId);
const { metrics, charts } = data;

console.log('Net Worth:', metrics.netWorth);
console.log('Total Investments:', metrics.totalInvestments);
```

---

## Environment Variables

```env
# Required for Email
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-specific-password

# Required for Authentication
JWT_SECRET=your-secret-key

# Required for Database
DATABASE_URL=postgresql://user:password@localhost:5432/db

# Frontend API
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Cron Schedule Patterns

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**Common Patterns:**
- `* * * * *` - Every minute (testing)
- `0 * * * *` - Every hour (top of hour)
- `0 9 * * *` - Every day at 9 AM
- `0 9 * * 0` - Every Sunday at 9 AM (current)
- `0 9 1 * *` - Every month, 1st day at 9 AM
- `*/5 * * * *` - Every 5 minutes

---

## Common Errors & Solutions

### JWT Token Expired
```
Error: 401 Unauthorized
Solution: Clear localStorage, redirect to login
```

### Email Not Sending
```
Error: GMAIL credentials not set
Solution: 
1. Check .env file has GMAIL_USER and GMAIL_APP_PASSWORD
2. Use Google App Password (not main password)
3. Enable 2FA on Gmail account
```

### OTP Not Received
```
Error: Email utility in dev mode
Solution:
1. Check server console for OTP code
2. Or configure Gmail credentials
```

### Database Connection Failed
```
Error: Connection refused
Solution:
1. Check DATABASE_URL in .env
2. Verify PostgreSQL is running
3. Check database credentials
```

---

## Testing Checklist

- [ ] User can register with unique email
- [ ] User receives OTP email on login
- [ ] OTP verification generates JWT
- [ ] Dashboard metrics load correctly
- [ ] Summary email sends successfully
- [ ] Cron job runs at scheduled time
- [ ] Protected routes reject requests without token
- [ ] Token refresh/expiration works correctly
- [ ] PIN setup and verification works
- [ ] Password reset email sends
- [ ] All error messages are user-friendly

---

## Performance Tips

### Backend
- Use pagination for large result sets
- Cache dashboard data (1-5 min TTL)
- Use `select` in Prisma to fetch only needed fields
- Index frequently queried database columns

### Frontend
- Lazy load pages with React.lazy()
- Show skeleton loaders while fetching
- Memoize expensive calculations
- Debounce API calls

---

## Security Checklist

- [ ] Never commit `.env` file
- [ ] Use HTTPS in production
- [ ] Validate all user inputs
- [ ] Hash passwords with bcrypt
- [ ] Store JWT in localStorage (consider httpOnly cookies)
- [ ] Set CORS properly on backend
- [ ] Rate limit sensitive endpoints (login, password reset)
- [ ] Sanitize data before sending to frontend
- [ ] Use environment variables for secrets

---

## Useful Commands

### Backend

```bash
# Start development server
npm run dev

# Run Prisma migrations
npx prisma migrate dev --name migration-name

# Reset database
npx prisma migrate reset

# Access database shell
npx prisma studio
```

### Frontend

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database

```bash
# Connect to PostgreSQL
psql -U username -d database_name

# See all tables
\dt

# Describe table structure
\d table_name

# Execute SQL
SELECT * FROM users;
```

---

## Links to Detailed Documentation

- **[Email System](./EMAIL_SYSTEM.md)** - OTP, summaries, reminders
- **[Dashboard API](./DASHBOARD_API.md)** - Metrics, calculations, endpoints
- **[Authentication](./AUTHENTICATION.md)** - Login flow, JWT, PIN
- **[Architecture](./ARCHITECTURE.md)** - System design, data flow, patterns

---

## Recent Changes Summary

### Commit: 96e4aa3 - Weekly Email Summary
- Added `sendSummaryEmail()` function
- Added `initCronJobs()` for weekly dispatch
- Added `POST /dashboard/send-summary` endpoint
- Integrated with dashboard metrics

### Commit: 9447fbc - Stock Module Updated
- Enhanced PSX snapshot handling
- Improved trading cash tracking
- Better cost basis calculations

### Commit: 5bd94e1 - MPIN Updated
- PIN management improvements
- Security enhancements

---

## Contact & Support

For detailed information on any feature, refer to the specific documentation file listed above.
