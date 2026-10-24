/**
 * Prompt Injection Sanitizer Middleware
 * Scans incoming AI prompts against jailbreak signatures and strips dangerous HTML/script injection vectors.
 */

const { redactObjectFields } = require('../services/piiRedactorService');

const JAILBREAK_PATTERNS = [
  /ignore\s+(all\s+|previous\s+|prior\s+)?instructions/i,
  /system\s+override/i,
  /disregard\s+(all\s+|previous\s+)?guidelines/i,
  /you\s+are\s+now\s+(DAN|jailbroken|unrestricted)/i,
  /bypass\s+(safety|content)\s+(filters|policies)/i,
  /forget\s+(all\s+)?previous\s+rules/i,
  /act\s+as\s+an?\s+unfiltered\s+AI/i,
  /do\s+anything\s+now/i,
  // Prompt leak probes
  /(print|show|reveal|repeat|display|output|leak)\s+(me\s+)?(your\s+|the\s+)?(system|hidden|initial)\s+(prompt|instructions?|message)/i,
  /what\s+(are|is|were)\s+your\s+(system\s+prompt|initial\s+instructions|hidden\s+instructions)/i,
  // Developer / god mode
  /(enable|enter|activate|switch\s+to|you\s+are\s+now\s+in)\s+(developer|dev|god)\s+mode/i,
];

// Markdown image/link whose URL carries a query string or a long encoded payload (data exfiltration).
const MARKDOWN_EXFIL_PATTERNS = [
  /!?\[[^\]]*\]\(\s*https?:\/\/[^)\s]*\?[^)\s]+\)/i,
  /!?\[[^\]]*\]\(\s*https?:\/\/[^)\s]*[A-Za-z0-9+/_%=-]{80,}[^)\s]*\)/i,
];

// Fold invisible characters and common Cyrillic lookalikes so phrases cannot be disguised.
const LOOKALIKES = { '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p', '\u0441': 'c', '\u0456': 'i' };
const normalizeForScan = (value) =>
  value
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\u0430\u0435\u043e\u0440\u0441\u0456]/g, (ch) => LOOKALIKES[ch]);

const SCRIPT_INJECTION_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /(?<=<[^>]*\s)on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
];

const scanForJailbreak = (value) => {
  if (typeof value !== 'string') return false;
  const normalized = normalizeForScan(value);
  return (
    JAILBREAK_PATTERNS.some((pattern) => pattern.test(normalized)) ||
    MARKDOWN_EXFIL_PATTERNS.some((pattern) => pattern.test(normalized))
  );
};

const sanitizeInputString = (str) => {
  if (typeof str !== 'string') return str;
  let clean = str;
  SCRIPT_INJECTION_PATTERNS.forEach((pattern) => {
    clean = clean.replace(pattern, '');
  });
  return clean;
};

const recursivelySanitize = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeInputString(obj[key]);
    } else if (typeof obj[key] === 'object') {
      recursivelySanitize(obj[key]);
    }
  }
  return obj;
};

const REDACT_FIELDS = ['prompt', 'topic', 'content', 'message', 'text', 'notesText'];

const aiSanitizer = (req, res, next) => {
  try {
    const fieldsToScan = ['prompt', 'topic', 'content', 'message', 'text', 'notesText'];
    let jailbreakDetected = false;
    let offendingField = null;

    // Scan top-level body fields
    for (const field of fieldsToScan) {
      if (req.body && req.body[field] && scanForJailbreak(req.body[field])) {
        jailbreakDetected = true;
        offendingField = field;
        break;
      }
    }

    // Scan full stringified body if not caught in top-level fields
    if (!jailbreakDetected && req.body && typeof req.body === 'object') {
      const stringifiedBody = JSON.stringify(req.body);
      if (scanForJailbreak(stringifiedBody)) {
        jailbreakDetected = true;
        offendingField = 'body';
      }
    }

    if (jailbreakDetected) {
      const identifier = req.user && req.user.id ? `user ${req.user.id}` : `IP ${req.ip || '127.0.0.1'}`;
      console.warn(`[SECURITY AUDIT] Prompt injection attempt detected and blocked from ${identifier} in field '${offendingField}'.`);

      return res.status(400).json({
        success: false,
        error: 'Prompt injection or unsafe input detected. Request blocked for security compliance.',
        securityViolation: true,
      });
    }

    // Sanitize harmless HTML/Script vectors
    if (req.body && typeof req.body === 'object') {
      recursivelySanitize(req.body);
      // Mask PII / secrets in free-text fields before they reach the model (opt out with AI_PII_REDACTION=false).
      if (process.env.AI_PII_REDACTION !== 'false') {
        const counts = redactObjectFields(req.body, REDACT_FIELDS);
        const types = Object.keys(counts);
        if (types.length) {
          console.warn(`[SECURITY AUDIT] Redacted sensitive data (${types.map((t) => `${t}:${counts[t]}`).join(', ')}) from AI request.`);
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  aiSanitizer,
  scanForJailbreak,
  sanitizeInputString,
};
