# Finance Manager Documentation Index

**Total Documentation:** 2,843 lines across 6 comprehensive guides
**Last Updated:** April 11, 2026
**Coverage:** Recent 5 commits (96e4aa3 → 5bd94e1)

---

## Documentation Files

### 1. **[README.md](./README.md)** - Start Here (93 lines)
Main entry point with navigation and overview of all features.

**Contains:**
- Quick navigation to all docs
- Recent features summary (last 5 commits)
- Technology stack overview
- Project structure
- Getting started guide
- Required environment variables

**Read this first to understand the project layout.**

---

### 2. **[EMAIL_SYSTEM.md](./EMAIL_SYSTEM.md)** - Email & Notifications (420 lines)
Complete guide to email functionality including OTP, summaries, and reminders.

**Topics Covered:**
- OTP email for login verification
- Weekly automated summaries (every Sunday 9 AM)
- Manual summary trigger endpoint
- Reminder emails for pending dues
- Nodemailer SMTP configuration
- Cron job scheduling
- Gmail setup and app passwords
- Frontend integration with Dashboard
- Error handling and troubleshooting
- Development mode fallback
- Testing and security considerations

**Use when:** Implementing email features or troubleshooting email delivery

---

### 3. **[DASHBOARD_API.md](./DASHBOARD_API.md)** - Financial Metrics (510 lines)
Comprehensive guide to dashboard metrics calculation and API endpoints.

**Topics Covered:**
- Dashboard data aggregation process
- Metric calculations (net worth, investments, expenses)
- API endpoints with examples
- Database queries and Prisma usage
- Response structure and formatting
- Investment breakdowns (stocks, funds)
- Ledger dues analysis
- Monthly expense analytics
- Frontend integration
- Performance optimization
- Currency handling and conversions
- Error handling and edge cases

**Use when:** Working with financial calculations or dashboard data

---

### 4. **[AUTHENTICATION.md](./AUTHENTICATION.md)** - User Management (781 lines)
Complete authentication system documentation with all user flows.

**Topics Covered:**
- User registration flow
- Email/password login with OTP verification
- OTP validation and expiration
- JWT token management and usage
- PIN setup, verification, and change
- Password reset flow with email tokens
- Protected routes and middleware
- Frontend integration examples
- API service setup with axios
- Error handling and status codes
- Testing scenarios
- Security best practices
- Environment variable configuration

**Use when:** Implementing authentication features or debugging login issues

---

### 5. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System Design (695 lines)
Complete system architecture, design patterns, and data flow documentation.

**Topics Covered:**
- Three-tier architecture (Frontend -> Backend -> Database)
- Project structure breakdown
- Data flow diagrams and examples
- MVC and service layer patterns
- Middleware pattern usage
- Context API state management
- HTTP communication protocol
- Database schema overview
- Authentication flow diagrams
- Error handling strategies
- Performance considerations
- Security measures
- Deployment architecture
- Development workflow
- Monitoring and logging
- API documentation references

**Use when:** Understanding system design or planning new features

---

### 6. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Cheat Sheet (344 lines)
Quick lookup guide for common tasks and information.

**Topics Covered:**
- API endpoints table
- Key file locations
- Common tasks with code examples
- Environment variables reference
- Cron schedule patterns
- Common errors and solutions
- Testing checklist
- Performance tips
- Security checklist
- Useful CLI commands
- Links to detailed documentation

**Use when:** You need quick answers without reading full docs

---

## Quick Navigation by Feature

### Want to implement...

| Feature | File |
|---------|------|
| **User Registration/Login** | AUTHENTICATION.md |
| **OTP Email Verification** | EMAIL_SYSTEM.md |
| **Dashboard with Metrics** | DASHBOARD_API.md |
| **Weekly Summary Emails** | EMAIL_SYSTEM.md |
| **PIN Management** | AUTHENTICATION.md |
| **Password Reset** | AUTHENTICATION.md |
| **New API Endpoint** | ARCHITECTURE.md + QUICK_REFERENCE.md |
| **Database Query** | DASHBOARD_API.md |
| **Frontend Component** | ARCHITECTURE.md |

---

## By Commit/Feature

### Commit: 96e4aa3 - Weekly Email Summary & Manual Trigger
- sendSummaryEmail() function
- initCronJobs() service
- /dashboard/send-summary endpoint
- Integration with dashboard metrics
**Read:** EMAIL_SYSTEM.md + DASHBOARD_API.md

### Commit: 9447fbc - Stock Module Updated
- PSX snapshot handling
- Trading cash tracking
- Cost basis calculations
**Read:** DASHBOARD_API.md

### Commit: 5bd94e1 - MPIN Updated
- PIN management improvements
- Security enhancements
**Read:** AUTHENTICATION.md

### Commits: 817bf5a & a66fdce - Design & App Prompts
- Design system documentation
- React Native development patterns
**Read:** ARCHITECTURE.md

---

## Documentation Checklist

- [x] Email System (OTP, summaries, reminders)
- [x] Dashboard API (metrics, calculations)
- [x] Authentication (registration, login, PIN)
- [x] Architecture (system design, patterns)
- [x] Quick Reference (cheat sheet)
- [x] Main README (navigation, overview)

**Total:** 6 files, 2,843 lines, 89 KB

---

## How to Use This Documentation

### Step 1: Context Setting
Start with README.md to understand the project overview and feature list.

### Step 2: Find Your Topic
Use the Quick Navigation table above to find the relevant file.

### Step 3: Deep Dive
Read the specific section in your chosen file with:
- Clear explanations
- Code examples
- Practical usage patterns
- Common pitfalls

### Step 4: Quick Lookup
When you need quick answers, reference QUICK_REFERENCE.md.

### Step 5: Implementation
Follow code examples and patterns to implement your feature.

---

## File Locations Reference

```
Backend Files:
/backend/src/controllers/auth.controller.js
/backend/src/controllers/dashboard.controller.js
/backend/src/routes/auth.routes.js
/backend/src/routes/dashboard.routes.js
/backend/src/services/cron.service.js
/backend/src/utils/email.js
/backend/prisma/schema.prisma

Frontend Files:
/frontend/src/pages/Dashboard.jsx
/frontend/src/services/api.js
/frontend/src/context/AuthContext.jsx
/frontend/src/context/PinContext.jsx
```

---

## Required Environment Variables

```env
# Email (for OTP and summaries)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=app-specific-password

# Authentication (for JWT)
JWT_SECRET=your-secret-key

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database

# Frontend (API endpoint)
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Need Help?

Each documentation file contains:
- Error Handling sections with solutions
- Testing sections with test cases
- Examples with real code snippets
- Troubleshooting guides

Look for these sections in the relevant file for your issue.

---

## Learning Path

**For Beginners:**
1. README.md - Overview
2. QUICK_REFERENCE.md - Common tasks
3. ARCHITECTURE.md - System design
4. AUTHENTICATION.md - Core feature

**For Advanced Developers:**
1. ARCHITECTURE.md - System patterns
2. DASHBOARD_API.md - Complex calculations
3. EMAIL_SYSTEM.md - Email infrastructure
4. Source code files

---

## Documentation Statistics

| File | Lines | Topics | Code Examples |
|------|-------|--------|----------------|
| README.md | 93 | 6 | 1 |
| EMAIL_SYSTEM.md | 420 | 12 | 25+ |
| DASHBOARD_API.md | 510 | 14 | 30+ |
| AUTHENTICATION.md | 781 | 16 | 40+ |
| ARCHITECTURE.md | 695 | 18 | 35+ |
| QUICK_REFERENCE.md | 344 | 12 | 20+ |
| **TOTAL** | **2,843** | **78** | **150+** |

---

**Created:** April 11, 2026
**Format:** Markdown with code examples
**Target:** Technical developers and engineers
