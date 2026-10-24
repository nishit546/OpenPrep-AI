/**
 * Shared PII / secret redactor for text that is about to be sent to an AI model.
 * Pure functions, no I/O. Matched values are never logged or returned in findings.
 */

// Regex work is capped so a huge payload cannot stall the event loop.
const MAX_INPUT_LENGTH = 20000;

// Order matters: specific secret shapes first so they are not eaten by looser patterns.
const SECRET_RULES = [
  { type: 'JWT', regex: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g },
  { type: 'BEARER_TOKEN', regex: /\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/gi },
  { type: 'API_KEY', regex: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { type: 'API_KEY', regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { type: 'API_KEY', regex: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
  { type: 'API_KEY', regex: /\bAKIA[0-9A-Z]{16}\b/g },
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
const CARD_REGEX = /\b\d(?:[ -]?\d){12,18}\b/g;
// Optional +country code, then digit groups separated by space, dot, dash or parentheses.
const PHONE_REGEX = /(?<![\w.])(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?|\d{2,5}[\s.-])\d{2,5}(?:[\s.-]\d{2,5}){0,2}(?![\w])/g;

const luhnValid = (digits) => {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
};

const isPhoneLike = (match) => {
  const digits = match.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return false;
  // Date / range style values such as 2019-2020-2021 are not phone numbers.
  if (/^(?:19|20)\d{2}[\s.-](?:19|20)\d{2}/.test(match)) return false;
  return true;
};

/**
 * Redacts emails, SSNs, card numbers, phone numbers and common API key shapes.
 * @param {*} text
 * @returns {{ text: *, findings: Array<{type: string, count: number}> }}
 */
const redactSensitive = (text) => {
  if (typeof text !== 'string' || text.length === 0) return { text, findings: [] };

  const counts = {};
  const bump = (type) => {
    counts[type] = (counts[type] || 0) + 1;
  };
  const apply = (input, regex, type, shouldRedact) =>
    input.replace(regex, (match) => {
      if (shouldRedact && !shouldRedact(match)) return match;
      bump(type);
      return `[REDACTED_${type}]`;
    });

  let head = text.slice(0, MAX_INPUT_LENGTH);
  const tail = text.slice(MAX_INPUT_LENGTH);

  SECRET_RULES.forEach((rule) => {
    head = apply(head, rule.regex, rule.type);
  });
  head = apply(head, EMAIL_REGEX, 'EMAIL');
  head = apply(head, SSN_REGEX, 'SSN');
  head = apply(head, CARD_REGEX, 'CARD', (m) => {
    const digits = m.replace(/\D/g, '');
    return digits.length >= 13 && digits.length <= 19 && luhnValid(digits);
  });
  head = apply(head, PHONE_REGEX, 'PHONE', isPhoneLike);

  const findings = Object.keys(counts).map((type) => ({ type, count: counts[type] }));
  return { text: head + tail, findings };
};

/**
 * Recursively redacts string values of the given keys (or all strings when keys is omitted).
 * Mutates and returns the object. Returns aggregated findings.
 */
const redactObjectFields = (obj, keys, depth = 0, acc = {}) => {
  if (!obj || typeof obj !== 'object' || depth > 6) return acc;
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === 'string') {
      if (!keys || keys.includes(key)) {
        const result = redactSensitive(value);
        obj[key] = result.text;
        result.findings.forEach((f) => {
          acc[f.type] = (acc[f.type] || 0) + f.count;
        });
      }
    } else if (value && typeof value === 'object') {
      redactObjectFields(value, keys, depth + 1, acc);
    }
  }
  return acc;
};

module.exports = { redactSensitive, redactObjectFields, luhnValid, MAX_INPUT_LENGTH };
