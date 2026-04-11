# Authentication System Documentation

## Overview

Finance Manager uses a multi-factor authentication system combining:
1. **Email/Password Registration & Login**
2. **OTP (One-Time Password) Email Verification**
3. **PIN (Personal Identification Number) Management**
4. **JWT Token-Based Session Management**
5. **Password Reset via Email**

This provides secure account access with layered authentication mechanisms.

---

## Core Module: `auth.controller.js`

**Location:** `/backend/src/controllers/auth.controller.js`

---

## Authentication Flow

### 1. User Registration

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Validation:**
- All fields required (name, email, password)
- Email must be unique
- Password should meet security requirements (enforced on frontend)

**Response (201 Created):**
```json
{
  "user": {
    "id": "uuid-string",
    "name": "John Doe",
    "email": "john@example.com",
    "hasPin": false
  },
  "token": "jwt-token-string"
}
```

**Process:**
1. Check if email already registered
2. Hash password using bcrypt (salt rounds: 10)
3. Create user in database
4. Generate JWT token (expires in 7 days)
5. Return user data with token

**Error Cases:**
```json
// 400 Bad Request - Missing fields
{
  "message": "All fields are required"
}

// 400 Bad Request - User exists
{
  "message": "User with this email already exists"
}

// 500 Server Error
{
  "message": "Server error during registration"
}
```

---

### 2. User Login

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "identifier": "john@example.com",  // Can be email or username
  "password": "securePassword123"
}
```

**Process:**
1. Find user by email OR username
2. Verify password using bcrypt
3. Generate 6-digit OTP
4. Send OTP to user's email
5. Return user info (without token yet)

**Response (200 OK):**
```json
{
  "message": "OTP sent to your email",
  "userId": "uuid-string",
  "email": "john@example.com"
}
```

**Email Sent:**
- Subject: "Your Finance Manager Login Code"
- Contains 6-digit OTP
- Valid for 10 minutes
- Professional HTML template

**Error Cases:**
```json
// 400 Bad Request
{
  "message": "Email/Username and password are required"
}

// 400 Bad Request - Invalid credentials
{
  "message": "Invalid email or password"
}

// 500 Server Error
{
  "message": "Server error during login"
}
```

---

### 3. OTP Verification

**Endpoint:** `POST /auth/verify-otp`

**Request Body:**
```json
{
  "userId": "uuid-string",
  "otp": "123456"
}
```

**Validation:**
- OTP must match stored code
- OTP must not be expired (10 minutes)
- Both fields required

**Response (200 OK):**
```json
{
  "message": "OTP verified successfully",
  "token": "jwt-token-string",
  "user": {
    "id": "uuid-string",
    "name": "John Doe",
    "email": "john@example.com",
    "hasPin": true  // Whether user has set up PIN
  }
}
```

**After Successful OTP:**
- JWT token generated (7 day expiration)
- Session established
- User can access protected routes
- If PIN not set, user should set one for security

**Error Cases:**
```json
// 400 Bad Request
{
  "message": "User ID and OTP are required"
}

// 400 Bad Request - Invalid OTP
{
  "message": "Invalid or expired OTP"
}

// 500 Server Error
{
  "message": "Server error verifying OTP"
}
```

---

## PIN Management

### Setup PIN

**Endpoint:** `PUT /auth/pin`

**Authentication:** Required (JWT Token)

**Request Body:**
```json
{
  "pin": "1234"  // 4-digit PIN
}
```

**Validation:**
- PIN must be 4 digits
- PIN must be unique
- User must be authenticated

**Response (200 OK):**
```json
{
  "message": "PIN set up successfully",
  "hasPin": true
}
```

**Security:**
- PIN hashed using bcrypt before storage
- Original PIN never stored in database
- Salt rounds: 10

**Error Cases:**
```json
// 400 Bad Request
{
  "message": "PIN is required"
}

// 500 Server Error
{
  "message": "Server error setting up PIN"
}
```

---

### Verify PIN

**Endpoint:** `POST /auth/verify-pin`

**Authentication:** Required (JWT Token)

**Purpose:** Verify PIN for sensitive operations (payments, transfers, etc.)

**Request Body:**
```json
{
  "pin": "1234"
}
```

**Response (200 OK):**
```json
{
  "message": "PIN verified successfully",
  "verified": true
}
```

**Error Cases:**
```json
// 400 Bad Request
{
  "message": "PIN is required"
}

// 400 Bad Request - Incorrect
{
  "message": "Incorrect PIN"
}

// 500 Server Error
{
  "message": "Server error verifying PIN"
}
```

---

### Change PIN

**Endpoint:** `PUT /auth/pin/change`

**Authentication:** Required (JWT Token)

**Request Body:**
```json
{
  "oldPin": "1234",
  "newPin": "5678"
}
```

**Validation:**
- Old PIN must be correct
- New PIN must be 4 digits
- Both fields required

**Response (200 OK):**
```json
{
  "message": "PIN changed successfully"
}
```

**Error Cases:**
```json
// 400 Bad Request - Missing fields
{
  "message": "Both old and new PIN are required"
}

// 400 Bad Request - Wrong old PIN
{
  "message": "Incorrect current PIN"
}

// 500 Server Error
{
  "message": "Server error changing PIN"
}
```

---

## Password Reset

### Forgot Password

**Endpoint:** `POST /auth/forgot-password`

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Process:**
1. Check if user exists with email
2. Generate secure reset token
3. Store token with expiration (15 minutes)
4. Send reset link to email
5. Return success message

**Response (200 OK):**
```json
{
  "message": "Password reset link sent to your email"
}
```

**Email Content:**
- Reset link with token
- Expiration notice (15 minutes)
- Security warning if didn't request

**Note:** Success message returned even if email not found (security best practice)

**Error Cases:**
```json
// 500 Server Error
{
  "message": "Server error processing password reset"
}
```

---

### Reset Password

**Endpoint:** `POST /auth/reset-password`

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword456"
}
```

**Validation:**
- Token must be valid and not expired
- New password should meet security requirements
- Both fields required

**Response (200 OK):**
```json
{
  "message": "Password reset successfully"
}
```

**Process:**
1. Validate reset token
2. Check token expiration
3. Hash new password
4. Update user password
5. Invalidate token

**After Reset:**
- User must login again with new password
- OTP sent to email for verification
- Previous sessions remain valid until token expires

**Error Cases:**
```json
// 400 Bad Request
{
  "message": "Token and new password are required"
}

// 400 Bad Request - Invalid token
{
  "message": "Invalid or expired reset token"
}

// 500 Server Error
{
  "message": "Server error resetting password"
}
```

---

## JWT Token Management

### Token Structure

**Payload:**
```javascript
{
  id: "user-uuid",
  email: "user@example.com",
  iat: 1234567890,      // Issued at
  exp: 1234654290       // Expires in 7 days
}
```

### Token Usage

**Every Protected Request:**
```
Authorization: Bearer <jwt-token>
```

**Example:**
```javascript
import api from './api';

// API automatically includes token in headers
const response = await api.get('/dashboard/summary');

// Behind the scenes:
// Headers: {
//   'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIs...'
// }
```

### Token Validation

**Middleware:** `verifyToken` (applied to all protected routes)

**Process:**
1. Extract token from Authorization header
2. Verify JWT signature
3. Check expiration
4. Attach user data to request
5. Allow request to proceed

**If Token Invalid/Expired:**
```json
{
  "message": "Unauthorized - Invalid or expired token"
}
```

---

## Protected Routes

**All these routes require valid JWT token:**

```
GET    /auth/me                    → Get current user info
PUT    /auth/pin                   → Setup PIN
PUT    /auth/pin/change            → Change PIN
POST   /auth/verify-pin            → Verify PIN
GET    /dashboard/summary          → Get dashboard metrics
POST   /dashboard/send-summary     → Send summary email
(+ all other feature routes)
```

**Unprotected Routes:**
```
POST   /auth/register              → Create new account
POST   /auth/login                 → Request OTP
POST   /auth/verify-otp            → Login with OTP
POST   /auth/forgot-password       → Request password reset
POST   /auth/reset-password        → Reset with token
```

---

## Security Best Practices

### Password Security
- **Hashing:** bcrypt with 10 salt rounds
- **Storage:** Never store plaintext passwords
- **Transmission:** Only over HTTPS
- **Complexity:** Enforce on frontend (8+ chars, mixed case, numbers)

### OTP Security
- **Length:** 6 digits
- **Expiration:** 10 minutes
- **One-time use:** Consumed after verification
- **Delivery:** Via email only

### PIN Security
- **Format:** 4 digits
- **Hashing:** Bcrypt encrypted before storage
- **Purpose:** Secondary factor for sensitive operations
- **Attempts:** Consider rate limiting after failed attempts

### JWT Security
- **Expiration:** 7 days
- **Secret:** Stored in environment variable (never hardcoded)
- **Transmission:** Authorization header only
- **Refresh:** Consider refresh token pattern for long sessions

### Token Reset Security
- **Token:** Cryptographically random
- **Expiration:** 15 minutes
- **One-time:** Can only be used once
- **Email:** Only sent to registered email address

---

## Frontend Integration

### Login Flow

```javascript
import { useState } from 'react';
import api from '../services/api';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('login'); // login → otp-verify → dashboard

  const handleLogin = async () => {
    try {
      const res = await api.post('/auth/login', { identifier, password });
      // OTP sent to email
      setStep('otp-verify');
      localStorage.setItem('loginUserId', res.data.userId);
    } catch (error) {
      toast.error(error.response?.data?.message);
    }
  };

  const handleVerifyOtp = async (otp) => {
    try {
      const res = await api.post('/auth/verify-otp', {
        userId: localStorage.getItem('loginUserId'),
        otp
      });
      // Save token
      localStorage.setItem('token', res.data.token);
      // Check if PIN is set
      if (!res.data.user.hasPin) {
        navigate('/setup-pin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message);
    }
  };

  return (
    <>
      {step === 'login' && (
        <form onSubmit={handleLogin}>
          <input placeholder="Email or username" onChange={(e) => setIdentifier(e.target.value)} />
          <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
          <button type="submit">Login</button>
        </form>
      )}
      {step === 'otp-verify' && (
        <OtpVerification onVerify={handleVerifyOtp} />
      )}
    </>
  );
}
```

### API Service Setup

```javascript
// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - redirect to login
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Protected Component Example

```javascript
import { useEffect, useState } from 'react';
import api from '../services/api';

export function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
      } catch (error) {
        // Redirected to login by axios interceptor
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authorized</div>;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      {/* Dashboard content */}
    </div>
  );
}
```

---

## Error Handling

### Common Error Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 400 | Bad Request | Check request format and required fields |
| 401 | Unauthorized | Token missing, invalid, or expired - redirect to login |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Server-side issue - show user friendly message |

### Client-Side Error Handling

```javascript
try {
  await api.post('/auth/login', { identifier, password });
} catch (error) {
  if (error.response) {
    // Server responded with error
    const message = error.response.data.message;
    toast.error(message);
  } else if (error.request) {
    // Request made but no response
    toast.error('Network error - check your connection');
  } else {
    // Error in request setup
    toast.error('An unexpected error occurred');
  }
}
```

---

## Testing Scenarios

### Test Case 1: Complete Registration & Login
```
1. Register new user
2. Verify email doesn't exist
3. Hash password stored
4. JWT token returned
5. Login with email
6. Receive OTP
7. Verify OTP
8. Get token
9. Access protected route ✓
```

### Test Case 2: PIN Setup & Verification
```
1. Login with OTP
2. Call GET /auth/me (should have hasPin: false)
3. Setup PIN with PUT /auth/pin
4. Call PUT /auth/pin/change
5. Call POST /auth/verify-pin ✓
```

### Test Case 3: Password Reset
```
1. Call POST /auth/forgot-password with email
2. Check email for reset link
3. Extract token from link
4. Call POST /auth/reset-password with token + new password
5. Login with new password
6. Verify OTP
7. Access dashboard ✓
```

### Test Case 4: Token Expiration
```
1. Wait 7 days or manually expire token
2. Call protected route with expired token
3. Receive 401 Unauthorized
4. Frontend redirects to login ✓
```

---

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production

# Email Configuration (for OTP & password reset)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-specific-password

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/finance_manager
```

---

## Future Enhancements

- [ ] Refresh token for better session management
- [ ] Multi-device session tracking
- [ ] Login attempt rate limiting
- [ ] SMS OTP as alternative to email
- [ ] Biometric authentication (fingerprint, face)
- [ ] Social login (Google, GitHub)
- [ ] Two-factor authentication (2FA)
- [ ] Session management dashboard
- [ ] Login activity history
- [ ] Suspicious activity alerts
