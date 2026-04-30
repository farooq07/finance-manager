# Architecture Overview

## System Architecture

Finance Manager follows a **three-tier client-server architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                     │
│  - Dashboard, Pages, Components                              │
│  - State Management (Context API)                            │
│  - API Client, Services                                      │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST API
                     │ (JSON)
┌────────────────────▼────────────────────────────────────────┐
│           BACKEND (Node.js/Express)                          │
│  - API Routes                                                │
│  - Controllers (Business Logic)                              │
│  - Services (Utilities, Email, Cron)                        │
│  - Middleware (Auth, Error Handling)                         │
└────────────────────┬────────────────────────────────────────┘
                     │ SQL Queries
                     │ (Prisma ORM)
┌────────────────────▼────────────────────────────────────────┐
│           DATABASE (PostgreSQL)                              │
│  - Users, Wallets, Banks, Stocks, Funds                     │
│  - Transactions, Expenses, Assets                           │
│  - Ledger, Snapshots                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

### Backend Structure

```
backend/
├── src/
│   ├── controllers/          # Request handlers and business logic
│   │   ├── auth.controller.js       # Authentication endpoints
│   │   ├── dashboard.controller.js  # Dashboard metrics and email
│   │   └── ...
│   │
│   ├── routes/              # API endpoint definitions
│   │   ├── auth.routes.js          # /auth/register, /auth/login, etc
│   │   ├── dashboard.routes.js     # /dashboard/summary, etc
│   │   └── ...
│   │
│   ├── services/            # Business logic and utilities
│   │   ├── cron.service.js         # Scheduled tasks
│   │   └── ...
│   │
│   ├── utils/               # Helper functions
│   │   ├── email.js                # Email sending utilities
│   │   ├── prisma.js               # Database client
│   │   └── ...
│   │
│   ├── middleware/          # Express middleware
│   │   ├── auth.middleware.js      # JWT token verification
│   │   └── ...
│   │
│   └── server.js            # Express app setup and initialization
│
├── prisma/
│   └── schema.prisma        # Database schema definition
│
├── .env                     # Environment variables
├── package.json
└── node_modules/
```

### Frontend Structure

```
frontend/
├── src/
│   ├── pages/               # Page components (screens)
│   │   ├── Dashboard.jsx    # Financial overview dashboard
│   │   ├── Login.jsx        # Login screen
│   │   ├── Register.jsx     # Registration screen
│   │   └── ...
│   │
│   ├── components/          # Reusable UI components
│   │   ├── MaskedBalance.jsx       # Secure balance display
│   │   ├── Skeleton.jsx             # Loading skeletons
│   │   └── ...
│   │
│   ├── context/             # React Context providers
│   │   ├── AuthContext.jsx         # Authentication state
│   │   ├── PinContext.jsx          # PIN verification state
│   │   └── ...
│   │
│   ├── services/            # API client and data services
│   │   ├── api.js                  # Axios HTTP client
│   │   └── ...
│   │
│   ├── utils/               # Utility functions
│   │   ├── currency.js             # Currency formatting
│   │   ├── dates.js                # Date utilities
│   │   └── ...
│   │
│   ├── App.jsx              # Root component
│   └── main.jsx             # Entry point
│
├── .env                     # Environment variables
├── package.json
├── vite.config.js           # Vite configuration
└── node_modules/
```

---

## Data Flow

### Example: Fetching Dashboard Summary

```
┌─────────────────────┐
│ User Clicks         │
│ Dashboard Page      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Dashboard Component             │
│ useEffect runs on mount         │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ api.get('/dashboard/summary')   │
│ (Axios HTTP client)             │
│ Includes JWT token in header    │
└──────────┬──────────────────────┘
           │ HTTP GET Request
           │
           ▼
┌─────────────────────────────────┐
│ Backend Route                   │
│ GET /dashboard/summary          │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Middleware                      │
│ verifyToken (JWT validation)    │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Controller                      │
│ getDashboardSummary()           │
│ - Extract userId from JWT       │
│ - Call fetchDashboardData()     │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Service/Data Layer              │
│ fetchDashboardData(userId)      │
│ - Query banks via Prisma        │
│ - Query wallets via Prisma      │
│ - Query stocks/funds            │
│ - Calculate metrics             │
└──────────┬──────────────────────┘
           │ SQL Queries
           │
           ▼
┌─────────────────────────────────┐
│ PostgreSQL Database             │
│ Returns user's data             │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Service processes data          │
│ Returns metrics + charts        │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Controller returns JSON         │
│ res.json(data)                  │
└──────────┬──────────────────────┘
           │ HTTP 200 Response
           │
           ▼
┌─────────────────────────────────┐
│ Frontend receives data          │
│ setData(response.data)          │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Component re-renders            │
│ Charts and metrics displayed    │
└─────────────────────────────────┘
```

---

## Key Design Patterns

### 1. MVC Pattern (Backend)

**Model:** Prisma ORM + PostgreSQL
```javascript
// Query data
const user = await prisma.user.findUnique({ where: { id: userId } });
```

**View:** JSON responses sent to frontend

**Controller:** Handles HTTP requests
```javascript
export const getDashboardSummary = async (req, res) => {
  const userId = req.user.id;
  const data = await fetchDashboardData(userId);
  res.json(data);
};
```

---

### 2. Service Layer Pattern

Separate business logic from controllers:

```
Controller → Service → Database
```

**Example:**
```javascript
// dashboard.controller.js
export const getDashboardSummary = async (req, res) => {
  try {
    const data = await fetchDashboardData(req.user.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

// fetchDashboardData is the service function
export const fetchDashboardData = async (userId) => {
  // All the business logic here
  // Queries, calculations, aggregations
};
```

---

### 3. Middleware Pattern

Wrap requests with cross-cutting concerns:

```
Request → Middleware 1 → Middleware 2 → Controller → Response
```

**Authentication Example:**
```javascript
// auth.middleware.js
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Usage in routes
router.use(verifyToken); // Applied to all routes below
```

---

### 4. Dependency Injection

Services depend on utilities and the database client:

```javascript
// email.js - Utility
export const sendSummaryEmail = async (to, name, metrics) => {
  // Uses nodemailer transporter defined at module level
};

// cron.service.js - Service
import { sendSummaryEmail } from '../utils/email.js';
import { fetchDashboardData } from '../controllers/dashboard.controller.js';

export const initCronJobs = () => {
  cron.schedule(CRON_SCHEDULE, async () => {
    const data = await fetchDashboardData(userId);
    await sendSummaryEmail(email, name, data.metrics);
  });
};
```

---

### 5. Context API (Frontend State Management)

Manage global state without prop drilling:

```jsx
// AuthContext.jsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
  };
  
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };
  
  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Usage in component
export function Dashboard() {
  const { user, token } = useContext(AuthContext);
  // ...
}
```

---

## Communication Protocol

### HTTP Methods

| Method | Purpose | Example |
|--------|---------|---------|
| GET | Retrieve data | `GET /dashboard/summary` |
| POST | Create resource | `POST /auth/register` |
| PUT | Update resource | `PUT /auth/pin` |
| DELETE | Delete resource | `DELETE /wallet/123` |

### Authentication

Every protected request includes JWT token:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response Format

**Success (200 OK):**
```json
{
  "metrics": { /* data */ },
  "charts": { /* data */ }
}
```

**Error (4xx/5xx):**
```json
{
  "message": "Error description"
}
```

---

## Database Schema (Key Tables)

```
Users
├── id (PK)
├── name
├── email (UNIQUE)
├── password_hash
├── pin_hash
└── created_at

Banks
├── id (PK)
├── user_id (FK → Users)
├── account_name
├── current_balance
├── exchange_rate
└── created_at

Wallets
├── id (PK)
├── user_id (FK → Users)
├── name
├── balance
├── exchange_rate
└── created_at

Stocks
├── id (PK)
├── user_id (FK → Users)
├── symbol
├── current_market_price
└── transactions (Related)

Expenses
├── id (PK)
├── user_id (FK → Users)
├── category
├── amount
├── expense_date
└── created_at

Person (Dues Ledger)
├── id (PK)
├── user_id (FK → Users)
├── name
└── transactions (Related)

Asset
├── id (PK)
├── user_id (FK → Users)
├── type (property, vehicle, gold, etc)
├── value
└── created_at
```

---

## Authentication & Authorization Flow

```
┌──────────────┐
│ New User     │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ POST /auth/register │
│ (No auth required)  │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Check email unique           │
│ Hash password                │
│ Create user                  │
│ Generate JWT (7d)            │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Return token + user          │
└──────┬───────────────────────┘
       │
       ▼ (Next login)
┌──────────────────────────────┐
│ POST /auth/login             │
│ email + password             │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Verify password              │
│ Generate 6-digit OTP         │
│ Send OTP email               │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ POST /auth/verify-otp        │
│ user_id + otp                │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Verify OTP not expired       │
│ Generate new JWT             │
│ Return token                 │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Protected Resources          │
│ GET /dashboard/summary       │
│ Header: Authorization: Bearer TOKEN
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Middleware verifyToken       │
│ Verify JWT signature         │
│ Check expiration             │
│ Allow request to proceed     │
└──────────────────────────────┘
```

---

## Error Handling Strategy

### Backend Error Handling

```javascript
try {
  // Business logic
  const data = await fetchDashboardData(userId);
  res.json(data);
} catch (error) {
  console.error('Dashboard Error:', error);
  res.status(500).json({ 
    message: 'Server error generating dashboard summary' 
  });
}
```

### Frontend Error Handling

```javascript
try {
  const response = await api.get('/dashboard/summary');
  setData(response.data);
} catch (error) {
  if (error.response?.status === 401) {
    // Token expired - redirect to login
    navigate('/login');
  } else if (error.response) {
    // Server error
    toast.error(error.response.data.message);
  } else {
    // Network error
    toast.error('Connection failed');
  }
}
```

---

## Performance Considerations

### Backend Optimization

1. **Database Queries:**
   - Use `select` to fetch only needed fields
   - Use `include` to prevent N+1 queries
   - Index frequently queried columns

2. **Caching:**
   - Cache dashboard metrics for 1-5 minutes
   - Cache user profile data
   - Cache investment snapshots

3. **Pagination:**
   - Implement for expense lists
   - Implement for transaction history

### Frontend Optimization

1. **Code Splitting:**
   - Lazy load pages using React.lazy()
   - Async import of heavy components

2. **State Management:**
   - Avoid unnecessary re-renders
   - Use useMemo for expensive calculations
   - Use useCallback for function references

3. **Data Fetching:**
   - Cancel requests on component unmount
   - Implement request debouncing
   - Show skeleton loaders while loading

---

## Security Measures

### Input Validation
```javascript
// Backend validates all inputs
if (!name || !email || !password) {
  return res.status(400).json({ message: 'All fields required' });
}
```

### Password Security
```javascript
// Bcrypt hashing
const hashedPassword = await bcrypt.hash(password, 10);
```

### JWT Token Security
```javascript
// Token stored in environment variable
const token = jwt.sign(payload, process.env.JWT_SECRET);
```

### HTTPS Only
```javascript
// All communication over HTTPS in production
// Frontend only stores token in localStorage
// Consider using httpOnly cookies
```

---

## Deployment Architecture

```
┌─────────────────────────────┐
│ Frontend                    │
│ Hosted on: Vercel/Netlify   │
│ - Static build              │
│ - Global CDN                │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Backend                     │
│ Hosted on: Railway/Heroku   │
│ - Node.js server            │
│ - Environment variables     │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Database                    │
│ Hosted on: Vercel/Railway   │
│ - PostgreSQL server         │
│ - Automatic backups         │
└─────────────────────────────┘
```

---

## Development Workflow

```
1. Feature Branch
   └─ Create from main

2. Local Development
   └─ frontend dev server + backend nodemon

3. Testing
   └─ Unit tests, Integration tests

4. Code Review
   └─ Pull Request

5. Merge to Main
   └─ Automated build & deploy

6. Production
   └─ Live on frontend and backend services
```

---

## Monitoring & Logging

### Backend Logging
```javascript
// Console logging for development
console.log('[Cron] Starting weekly email summary dispatch...');
console.error('[Cron] Failed to send summary for user:', error.message);
```

### Frontend Monitoring
```javascript
// Error boundaries for React
// Toast notifications for user feedback
// Console logs for debugging
```

---

## API Documentation

See dedicated documentation files:
- [Email System](./EMAIL_SYSTEM.md) - Email and notification features
- [Dashboard API](./DASHBOARD_API.md) - Financial metrics and calculations
- [Authentication](./AUTHENTICATION.md) - User management and security
