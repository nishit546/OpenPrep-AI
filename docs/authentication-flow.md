# 🔑 Authentication Flow

This document details the security and authentication flows implemented in **OpenPrep AI**.

---

## 🔒 JWT Security Strategy

OpenPrep AI uses a **dual-token authentication strategy** with short-lived access tokens and long-lived refresh tokens.

### Access Token (JWT)
* **Hashing Algorithm**: `HMAC-SHA256` via the `jsonwebtoken` package.
* **Token Lifetime**: 15 minutes (configured via `JWT_EXPIRE` env variable).
* **Storage Location**: Client `localStorage` under the key `token`.
* **Payload Structure**:
```json
{
  "id": "60d0fe4f5311236168a109a1",
  "iat": 1782059349,
  "exp": 1782059949
}
```

### Refresh Token (Crypto-Random)
* **Generation**: `crypto.randomBytes(32).toString('hex')` — 64-character hex string.
* **Storage**: SHA-256 hash stored in the User record's `refreshTokens` array (supports multi-device login).
* **Token Lifetime**: 7 days.
* **Rotation**: Every refresh invalidates the old token and issues a new pair.
* **Invalidation**: Password reset clears all existing refresh tokens.

---

## 🔄 User Registration Flow

The registration flow establishes new user accounts, hashes credentials, and **requires email verification** before the first login:

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant React as React Frontend
    participant Express as Express Backend
    participant DB as PostgreSQL
    
    Student->>React: Enters Name, Email, Password
    React->>Express: POST /api/auth/register (payload)
    Note over Express: Validate email format & password complexity
    Express->>DB: Query User where email = input
    alt Email already registered
        DB-->>Express: Returns existing User object
        Express-->>React: 400 Bad Request { error: "User already exists" }
        React->>Student: Renders inline validation error
    else Email is free
        Express->>Express: Generate Salt and Hash Password (bcrypt)
        Express->>Express: Generate crypto verification token (SHA-256)
        Express->>DB: Insert new User record (isEmailVerified: false)
        DB-->>Express: Returns saved User record
        Express->>Express: Send verification email (nodemailer / console)
        Express-->>React: 201 Created { success: true, message, isEmailVerified: false }
        React->>Student: Shows success message: "Check email to verify"
    end
```

### Email Verification Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant React as React Frontend
    participant Express as Express Backend
    participant DB as PostgreSQL
    
    Student->>React: Clicks verification link from email
    React->>Express: POST /api/auth/verify-email/:token
    Express->>Express: Hash token with SHA-256
    Express->>DB: Find user by hashed token & check expiry
    alt Valid token
        Express->>DB: Update user (isEmailVerified: true, clear token)
        Express->>Express: Sign JWT (15min) + generate refresh token (7d)
        Express-->>React: 200 OK { success: true, token, refreshToken, user }
        React->>React: Save tokens, update Redux store
        React->>Student: Redirect to Dashboard (/dashboard)
    else Invalid / expired token
        Express-->>React: 400 Bad Request { error: "Invalid or expired verification token" }
        React->>Student: Shows error, option to resend
    end
```

---

## 🔄 User Login Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant React as React Frontend
    participant Express as Express Backend
    participant DB as PostgreSQL
    
    Student->>React: Enters Email & Password
    React->>Express: POST /api/auth/login (payload)
    Express->>DB: Query User where email = input (select: +password)
    alt User not found
        DB-->>Express: Returns null
        Express-->>React: 401 Unauthorized { error: "Invalid credentials" }
        React->>Student: Renders warning notification
    else User exists
        alt Email not verified
            Express-->>React: 403 Forbidden { error: "Please verify your email before logging in" }
            React->>Student: Shows verification prompt
        else Email verified
            Express->>Express: Compare password input with hash via bcrypt
            alt Password matches
                Express->>Express: Sign JWT (15min)
                Express->>Express: Generate refresh token (7d, SHA-256 hashed)
                Express->>DB: Save hashed refresh token
                Express-->>React: 200 OK { success: true, token, refreshToken, user }
                React->>React: Save tokens, update Redux store
                React->>Student: Redirect to Dashboard (/dashboard)
            else Password incorrect
                Express-->>React: 401 Unauthorized { error: "Invalid credentials" }
                React->>Student: Renders warning notification
            end
        end
    end
```

---

## 🛡️ Route Protection Flow (API & UI)

### 1. API Route Guards (Backend)
Private Express routes are chained through the `protect` middleware:

```javascript
// backend/routes/quizRoutes.js
router.post('/generate-ai', protect, generateAIQuiz);
```

```mermaid
graph TD
    API[Incoming API Request] --> HeaderCheck{Auth Header Present?}
    HeaderCheck --> |No| Err401[401: Unauthorized - No Token]
    HeaderCheck --> |Yes: Bearer <token>| Decrypt{Verify JWT}
    Decrypt --> |Invalid / Expired| Err401_2[401: Unauthorized - Invalid Token]
    Decrypt --> |Valid| FetchDB[Query User record from PostgreSQL]
    FetchDB --> |Not Found| Err401_3[401: Unauthorized - User Deleted]
    FetchDB --> |Found| AttachReq[Attach user object to req.user]
    AttachReq --> Next[Call next middleware / controller handler]
```

### 2. UI Route Guards (Frontend)
Private pages are shielded from guest access using [ProtectedRoute.jsx](file:///c:/Users/Nishit/OneDrive/Desktop/ALL%20Projects/OPENPREP%20AI/OpenPrep-AI/frontend/src/components/ProtectedRoute.jsx).
1. Upon browser load/refresh, the client dispatches the `loadUser` async thunk.
2. If `localStorage.getItem('token')` is set:
   * It sends a `GET /api/auth/me` request with the token.
   * If the request is successful, the Redux store is populated with `user` data and `isAuthenticated` becomes `true`.
   * If the request fails (e.g., token expired), the client should use the refresh token (`localStorage.getItem('refreshToken')`) to call `POST /api/auth/refresh-token` before retrying.
   * If both tokens are expired, it clears local storage, resets Redux state, and redirects to `/login`.
3. If no token is found, accessing protected paths redirects immediately to `/login`.

### 3. Token Refresh Flow
```mermaid
sequenceDiagram
    autonumber
    participant Client as React Frontend
    participant Express as Express Backend
    participant DB as PostgreSQL

    Client->>Express: API request with expired JWT
    Express-->>Client: 401 Unauthorized (token expired)
    Client->>Client: Detect expired token
    Client->>Express: POST /api/auth/refresh-token { refreshToken }
    Express->>DB: Hash refreshToken, find user with matching hash
    alt Valid refresh token
        Express->>DB: Remove old hashed token, save new one
        Express-->>Client: 200 OK { token (new JWT), refreshToken (new, rotated) }
        Client->>Client: Save new tokens, retry original request
    else Invalid / expired
        Express-->>Client: 401 Unauthorized
        Client->>Client: Clear all tokens, redirect to /login
    end
```
