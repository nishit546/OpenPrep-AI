/**
 * @fileoverview Trusted Enterprise Institutional SSO Directory Config.
 * Defines OIDC and SAML 2.0 configuration profiles, domain mappings,
 * role mappings, and cohort assignment rules.
 */

const INSTITUTIONS = {
  // Example OIDC Institution: MIT
  'mit.edu': {
    id: 'inst-mit',
    name: 'Massachusetts Institute of Technology',
    domains: ['mit.edu', 'csail.mit.edu'],
    protocol: 'oidc',
    issuer: process.env.SSO_MIT_ISSUER || 'https://auth.mit.edu/oidc',
    clientId: process.env.SSO_MIT_CLIENT_ID || 'openprep-mit-client-id',
    clientSecret: process.env.SSO_MIT_CLIENT_SECRET || 'mit-secret-token',
    authorizationEndpoint: process.env.SSO_MIT_AUTH_URL || 'https://auth.mit.edu/oidc/auth',
    tokenEndpoint: process.env.SSO_MIT_TOKEN_URL || 'https://auth.mit.edu/oidc/token',
    jwksUri: process.env.SSO_MIT_JWKS_URI || 'https://auth.mit.edu/oidc/jwks',
    redirectUri: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/sso/oidc/callback`,
    scopes: ['openid', 'profile', 'email'],
    roleMapping: {
      faculty: 'contributor',
      staff: 'contributor',
      student: 'student',
      admin: 'admin',
    },
    defaultRole: 'student',
    cohortMapping: {
      'CS101-2026': 'cohort-cs101',
    },
  },

  // Example SAML 2.0 Institution: Stanford
  'stanford.edu': {
    id: 'inst-stanford',
    name: 'Stanford University',
    domains: ['stanford.edu'],
    protocol: 'saml',
    entryPoint: process.env.SSO_STANFORD_ENTRY_POINT || 'https://idp.stanford.edu/idp/profile/SAML2/Redirect/SSO',
    issuer: process.env.SSO_STANFORD_ENTITY_ID || 'https://openprep.ai/shibboleth', // SP Entity ID
    cert: process.env.SSO_STANFORD_IDP_CERT || `-----BEGIN CERTIFICATE-----\nMIIE...\n-----END CERTIFICATE-----`,
    callbackUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/sso/saml/callback`,
    signatureAlgorithm: 'sha256',
    roleMapping: {
      'faculty@stanford.edu': 'contributor',
      'staff@stanford.edu': 'contributor',
      'student@stanford.edu': 'student',
      'admin@stanford.edu': 'admin',
    },
    defaultRole: 'student',
    cohortMapping: {
      'STANFORD-CS224N': 'cohort-cs224n',
    },
  },
};

/**
 * Normalizes email address and resolves its institutional profile.
 * Rejects domain spoofing (e.g. evil-mit.edu).
 *
 * @param {string} email
 * @returns {object|null} Matched institution profile or null
 */
function findInstitutionByEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return null;
  }

  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return null;
  const domain = parts[1];

  // 1. Direct match on main configured keys or listed domain arrays
  for (const [key, profile] of Object.entries(INSTITUTIONS)) {
    if (key === domain || (Array.isArray(profile.domains) && profile.domains.includes(domain))) {
      return profile;
    }
  }

  // 2. Strict subdomain match (e.g. cs.stanford.edu matches stanford.edu)
  // Ensures strict boundary check so evilstanford.edu is NOT matched.
  for (const profile of Object.values(INSTITUTIONS)) {
    if (Array.isArray(profile.domains)) {
      for (const parentDomain of profile.domains) {
        if (domain.endsWith('.' + parentDomain)) {
          return profile;
        }
      }
    }
  }

  return null;
}

module.exports = {
  INSTITUTIONS,
  findInstitutionByEmail,
};
