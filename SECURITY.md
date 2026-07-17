# Security Policy

We take the security of OpenPrep AI seriously. If you believe you have found a security vulnerability, please read this document to understand how to report it and what to expect.

## Supported Versions

Only the latest release version of OpenPrep AI is actively supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| v1.0.x  | :white_check_mark: |
| < v1.0  | :x:                |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please report security vulnerabilities by emailing us at **nishit.g.doshi.cg@gmail.com**.

Please include the following details in your report:

1. **Description**: A detailed description of the vulnerability and its potential impact.
2. **Steps to Reproduce**: Detailed step-by-step instructions (and code snippets, if applicable) to reproduce the vulnerability.
3. **Environment**: Version of OpenPrep AI, OS, browser, Node.js version, and database configurations.
4. **Suggested Mitigation**: If you have a fix or suggestion, please share it.

We will acknowledge receipt of your email within **48 hours** and provide a preliminary response with next steps within **5 days**.

## Scope of Security Expectations

We are committed to securing the following areas:

* **Authentication & Authorization**: Preventing token leaks, unauthorized route access, or session hijacking.
* **Data Privacy**: Secure handling of uploaded PDFs, custom notes, quiz performance analytics, and user metadata.
* **API Protection**: Safe interaction with the Gemini API to prevent API key exposure or prompt injection exploits.

## Security Practices in Development

To ensure the codebase remains secure:

1. **Secret Management**: Never commit `.env` files or hardcoded credentials. Use `process.env` and Docker environment variables.
2. **Dependencies**: We run automated dependency vulnerability checks via GitHub Actions (using `npm audit` or Snyk).
3. **Input Sanitization**: All user inputs in the Node.js/Express backend are validated and sanitized to prevent SQL/NoSQL Injection and Cross-Site Scripting (XSS).
