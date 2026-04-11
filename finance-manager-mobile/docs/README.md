# Finance Manager Mobile - Technical Documentation

Welcome to the Finance Manager Mobile technical documentation. This guide covers all recent features, APIs, and implementation details.

## Quick Navigation

- **[Email & Notifications System](./EMAIL_SYSTEM.md)** - Weekly summaries, manual triggers, OTP emails, and reminder emails
- **[Dashboard API & Metrics](./DASHBOARD_API.md)** - Complete financial overview endpoint and metric calculations
- **[Authentication System](./AUTHENTICATION.md)** - User registration, OTP verification, PIN management, and password reset
- **[Architecture Overview](./ARCHITECTURE.md)** - System design and module structure

## Recent Features (Last 5 Commits)

### 1. Weekly Email Summary & Manual Trigger (Commit: 96e4aa3)
- Automated weekly email summaries sent every Sunday at 9:00 AM
- Manual trigger endpoint for on-demand summary emails
- Comprehensive financial metrics included in emails
- Cron job scheduling using `node-cron`

### 2. Stock Module Updates (Commit: 9447fbc)
- Enhanced PSX snapshot handling
- Improved trading cash tracking
- Better cost basis calculations for stock holdings

### 3. MPIN Updates (Commit: 5bd94e1)
- Enhanced PIN management system
- Improved security for transaction verification

### 4. UI/UX Design & App Prompts (Commits: 817bf5a, a66fdce)
- Comprehensive design system documentation
- React Native app prompt for consistent development patterns

## Technology Stack

**Backend:**
- Node.js / Express.js
- Prisma ORM
- PostgreSQL
- nodemailer for email services
- node-cron for scheduled tasks
- JWT for authentication

**Frontend:**
- React / React with Vite
- ECharts for data visualization
- Lucide React for icons
- Tailwind CSS for styling
- Sonner for toast notifications

## Project Structure

```
/backend
  /src
    /controllers      - Request handlers
    /routes          - API endpoint definitions
    /services        - Business logic (cron jobs, etc)
    /utils           - Helper functions (email, database)
    /middleware      - Express middleware
    
/frontend
  /src
    /pages           - Page components
    /components      - Reusable UI components
    /services        - API client
    /context         - React context providers
    /utils           - Frontend utilities
```

## Getting Started

1. Start with the [Dashboard API](./DASHBOARD_API.md) to understand financial metrics
2. Review the [Email System](./EMAIL_SYSTEM.md) for notification features
3. Check [Authentication](./AUTHENTICATION.md) for user management
4. See [Architecture](./ARCHITECTURE.md) for system design patterns

## Environment Variables Required

```env
# Email Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-specific-password

# Authentication
JWT_SECRET=your-jwt-secret-key

# Database
DATABASE_URL=your-postgres-connection-string
```

## Support

For questions or issues, refer to the specific documentation file for that feature.
