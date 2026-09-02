---
title: '[FEAT]: Enterprise SSO Integration supporting OpenID Connect (OIDC) & SAML 2.0 Identity Providers'
labels: 'security, backend, auth, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
To deploy OpenPrep AI across university campuses, colleges, and coaching institutions, students and faculty must authenticate seamlessly via institutional Identity Providers (IdPs) like Google Workspace, Microsoft Entra ID (Azure AD), Okta, and Shibboleth without creating separate passwords.

This feature adds **Enterprise Single Sign-On (SSO) with OpenID Connect (OIDC) & SAML 2.0 Protocol Handlers**, automated domain discovery, and institutional role mapping.

---

## Technical Scope & Architecture

### Backend Auth Pipeline
1. **Institutional Domain Router (`backend/middleware/ssoDiscovery.js`)**:
   - Parses student email domain (e.g. `student@mit.edu`, `user@iitd.ac.in`).
   - Resolves configured institutional SSO profile and routes to appropriate IdP login challenge.
2. **Passport SAML 2.0 & OIDC Strategy (`backend/services/ssoAuthService.js`)**:
   - Implements `@node-saml/passport-saml` and `openid-client` strategies.
   - Verifies X.509 certificates, XML digital signatures, and IdP token assertions.
   - Enforces SHA-256 signature validation, clock skew tolerance ($\pm 60\text{s}$), and replay attack prevention (Assertion ID deduplication).
3. **Role & Course Attribute Mapping**:
   - Ingests SAML/OIDC attribute assertions (`eduPersonAffiliation`, `department`, `groups`).
   - Automatically maps incoming users to corresponding institutional cohorts and role permissions (`Student`, `Teacher Assistant`, `Faculty Admin`).

---

## Acceptance Criteria
- [ ] Students entering university email domains are seamlessly redirected to their institutional IdP.
- [ ] Validates SAML 2.0 XML assertions and OIDC ID tokens with strict cryptographic signature checks.
- [ ] Automatically provisions user accounts and assigns academic group memberships based on IdP claims.
- [ ] Comprehensive unit and integration tests covering IdP assertion validation and signature expiry edge cases.
