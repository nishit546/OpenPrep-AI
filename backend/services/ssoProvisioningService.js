/**
 * @fileoverview SSO User Provisioning & Identity Linking Service (#2198).
 * Integrates with oauthAccountLinker.js to safely link or provision
 * institutional user accounts and map IdP roles & cohorts.
 */

const User = require('../models/User');
const { sequelize } = require('../config/db');
const { decideOAuthAction, ACTIONS } = require('./oauthAccountLinker');

/**
 * Resolves role from institutional claim rules.
 *
 * @param {object} institution - Institutional configuration profile
 * @param {string[]|string} externalRoles - Affiliations or roles from IdP
 * @returns {string} OpenPrep role ('student' | 'contributor' | 'admin')
 */
function resolveRole(institution, externalRoles) {
  const rolesList = Array.isArray(externalRoles)
    ? externalRoles
    : typeof externalRoles === 'string'
    ? [externalRoles]
    : [];

  const mapping = institution.roleMapping || {};

  // Precedence order: admin > contributor > student
  let highestRole = institution.defaultRole || 'student';

  for (const roleClaim of rolesList) {
    const mapped = mapping[roleClaim.toLowerCase()] || mapping[roleClaim];
    if (mapped === 'admin') return 'admin';
    if (mapped === 'contributor') highestRole = 'contributor';
  }

  return highestRole;
}

/**
 * Resolves academic cohort IDs from institutional claim rules.
 *
 * @param {object} institution
 * @param {string[]|string} externalGroups
 * @returns {string[]} Cohort IDs
 */
function resolveCohorts(institution, externalGroups) {
  const groupsList = Array.isArray(externalGroups)
    ? externalGroups
    : typeof externalGroups === 'string'
    ? [externalGroups]
    : [];

  const mapping = institution.cohortMapping || {};
  const matchedCohorts = [];

  for (const group of groupsList) {
    if (mapping[group]) {
      matchedCohorts.push(mapping[group]);
    }
  }

  return matchedCohorts;
}

/**
 * Provisions or links an institutional SSO user account safely.
 *
 * @param {object} params
 * @param {object} params.institution - Matched institution profile
 * @param {string} params.email - Verified email reported by IdP
 * @param {boolean} params.emailVerified - Whether IdP verified the email
 * @param {string} params.subjectId - IdP Unique Subject / NameID
 * @param {string} [params.name] - User full name
 * @param {string[]|string} [params.roles] - IdP role/affiliation claims
 * @param {string[]|string} [params.groups] - IdP group claims
 * @returns {Promise<object>} User instance
 */
async function provisionSsoUser({
  institution,
  email,
  emailVerified = true,
  subjectId,
  name,
  roles,
  groups,
}) {
  if (!email) {
    throw new Error('SSO Provisioning Failed: Provider did not return an email address');
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Find existing accounts
  const userBySocialId = await User.findOne({ where: { socialId: subjectId } });
  const userByEmail = await User.findOne({ where: { email: normalizedEmail } });

  // Use oauthAccountLinker logic to prevent account takeover via unverified email
  const decision = decideOAuthAction({
    userByProviderId: userBySocialId,
    userByEmail,
    email: normalizedEmail,
    emailVerified,
  });

  if (decision.action === ACTIONS.REJECT_UNVERIFIED) {
    throw new Error('SSO Provisioning Rejected: Institutional IdP email is not verified');
  }

  const targetRole = resolveRole(institution, roles);
  const targetCohorts = resolveCohorts(institution, groups);
  const userName = name || normalizedEmail.split('@')[0];

  // Case 1: Existing account by provider ID (LOGIN)
  if (decision.action === ACTIONS.LOGIN) {
    userBySocialId.role = targetRole;
    userBySocialId.ownedCosmetics = Array.from(
      new Set([...(userBySocialId.ownedCosmetics || []), ...targetCohorts])
    );
    await userBySocialId.save();
    return userBySocialId;
  }

  // Case 2: Verified email matches existing local account (LINK)
  if (decision.action === ACTIONS.LINK) {
    userByEmail.socialId = subjectId;
    userByEmail.provider = `sso:${institution.id}`;
    userByEmail.isEmailVerified = true;
    userByEmail.role = targetRole;
    userByEmail.ownedCosmetics = Array.from(
      new Set([...(userByEmail.ownedCosmetics || []), ...targetCohorts])
    );
    await userByEmail.save();
    return userByEmail;
  }

  // Case 3: Verified email, no existing account (CREATE)
  if (decision.action === ACTIONS.CREATE) {
    const newUser = await sequelize.transaction(async (t) => {
      return User.create(
        {
          name: userName,
          email: normalizedEmail,
          password: null, // Passwordless SSO account
          role: targetRole,
          provider: `sso:${institution.id}`,
          socialId: subjectId,
          isEmailVerified: true,
          ownedCosmetics: targetCohorts,
        },
        { transaction: t }
      );
    });

    return newUser;
  }

  throw new Error(`SSO Provisioning Failed: ${decision.reason}`);
}

module.exports = {
  resolveRole,
  resolveCohorts,
  provisionSsoUser,
};
