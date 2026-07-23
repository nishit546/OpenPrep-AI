# 🛡️ Security Specifications

This document outlines the security architecture, data validation flows, and policy standards enforced within **OpenPrep AI**.

---

## 🔒 Authentication & Authorization Security

### 1. Token Signature & Verification
* **Algorithm**: `HMAC-SHA256` via the `jsonwebtoken` package.
* **Storage**: Store the JWT on the client side inside `localStorage`.
* **API Ingestion**: Attach the token to the request headers: `Authorization: Bearer <token>`.
* **Route Protection**: The backend uses the `protect` middleware to intercept requests, verify the JWT, and attach the user object to the request context (`req.user`). If token verification fails, it returns a `401 Unauthorized` response.

### 2. Password Encryption
* **Hashing Algorithm**: `bcryptjs` with a work factor (salt rounds) of `10`.
* **Database Isolation**: The `password` field in the User schema is configured with `select: false` to prevent it from being returned in standard user query results:
  ```javascript
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 8,
    select: false
  }
  ```
* **Complexity Requirements**: Passwords must contain at least one uppercase letter, one lowercase letter, one number, and one special character. Validated on both register and reset-password endpoints via `express-validator`.

### 3. Email Verification
* New accounts are created with `isEmailVerified: false`.
* Login returns `403 Forbidden` if email is not verified.
* Verification tokens are generated via `crypto.randomBytes(32)` and stored as SHA-256 hashes.
* Token expires after 24 hours.

### 4. Forgot / Reset Password
* Reset tokens are generated via `crypto.randomBytes(32)` and stored as SHA-256 hashes.
* Token expires after 1 hour.
* Successful password reset invalidates all existing refresh tokens (logout from all devices).

### 5. Refresh Token Security
* Refresh tokens are 64-character cryptographically random hex strings.
* Stored as SHA-256 hashes in the User record's `refreshTokens` array.
* **Rotation**: Each use invalidates the old token and issues a new pair.
* Support for **multi-device login** via the tokens array. 
* Expires after 7 days.

---

## 🛡️ Input Sanitization & Threat Protection

### 1. JWT Secret Validation
* The server validates `JWT_SECRET` on startup. If the environment variable is not set, the server exits with a clear error message.
* No hardcoded fallback secrets exist in the source code. All token signing and verification uses `process.env.JWT_SECRET` exclusively.

### 2. Rate Limiting
* Authentication endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/refresh-token`, `/api/auth/verify-email/:token`) are protected with `express-rate-limit`.
* **Login**: 10 attempts per 15 minutes per IP.
* **Register**: 5 attempts per hour per IP.
* **Forgot Password**: 5 attempts per hour per IP.
* **Refresh Token**: 10 attempts per 15 minutes per IP.
* **Verify Email**: 5 attempts per hour per IP.
* Rate limiting is automatically disabled in test environments.

### 3. Security Headers (Helmet)
* The Express server uses the `helmet` middleware to set critical HTTP security headers including:
  * Content Security Policy (CSP)
  * X-Frame-Options (clickjacking protection)
  * X-Content-Type-Options (MIME sniffing prevention)
  * Strict-Transport-Security (HSTS)
  * X-XSS-Protection

### 4. CORS Configuration
* CORS is restricted to a single allowed origin via the `CORS_ORIGIN` environment variable (defaults to `http://localhost:5173` for development).

### 5. Request Body Size Limiting
* Both `express.json()` and `express.urlencoded()` limit request bodies to **10KB** to prevent memory exhaustion attacks.

### 6. Input Validation
* Authentication routes use **express-validator** middleware for centralized, consistent input validation before reaching controllers.
* Validation errors return uniform `400` responses with comma-separated error messages.

### 7. SQL Injection Prevention
* All database queries use **Sequelize's parameterized queries** (via model methods like `findByPk`, `findOne`, `findAll`, etc.), which automatically escape user input and prevent SQL injection.
* Raw queries are handled through Sequelize's `sequelize.query()` with parameterized bindings — raw string interpolation of user input is never used.

### 8. Cross-Site Scripting (XSS) Mitigation
* The frontend React components escape rendered variables by default.
* Content Security Policy (CSP) headers are configured on production servers to prevent inline script execution.

### 9. API Key Protection
* **Gemini API Key**: The Google Gemini API key is loaded into memory using `process.env.GEMINI_API_KEY` and is never exposed to client browsers. All LLM operations are handled securely on the Node.js backend.

---

## 🚨 Vulnerability Disclosure Policy

If you find a security vulnerability, do not open a public GitHub issue. 

Please email details directly to **security@openprep.ai**. Our security team will respond within 48 hours to acknowledge receipt and coordinate a patch before disclosure.
