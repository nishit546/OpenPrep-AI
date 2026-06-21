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
    minlength: 6,
    select: false
  }
  ```

---

## 🛡️ Input Sanitization & Threat Protection

### 1. JWT Secret Validation
* The server validates `JWT_SECRET` on startup. If the environment variable is not set, the server exits with a clear error message.
* No hardcoded fallback secrets exist in the source code. All token signing and verification uses `process.env.JWT_SECRET` exclusively.

### 2. Rate Limiting
* Authentication endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`) are protected with `express-rate-limit`.
* **Login**: 5 attempts per 15 minutes per IP.
* **Register**: 3 attempts per hour per IP.
* **Forgot Password**: 3 attempts per hour per IP.
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

### 7. NoSQL Injection Prevention
* All user inputs are parameterized via **Mongoose Schemas**.
* Input payloads are validated to block NoSQL query operator injection (e.g., preventing inputs containing `{ "$gt": "" }`).

### 2. Cross-Site Scripting (XSS) Mitigation
* The frontend React components escape rendered variables by default.
* Content Security Policy (CSP) headers are configured on production servers to prevent inline script execution.

### 3. API Key Protection
* **Gemini API Key**: The Google Gemini API key is loaded into memory using `process.env.GEMINI_API_KEY` and is never exposed to client browsers. All LLM operations are handled securely on the Node.js backend.

---

## 🚨 Vulnerability Disclosure Policy

If you find a security vulnerability, do not open a public GitHub issue. 

Please email details directly to **security@openprep.ai**. Our security team will respond within 48 hours to acknowledge receipt and coordinate a patch before disclosure.
