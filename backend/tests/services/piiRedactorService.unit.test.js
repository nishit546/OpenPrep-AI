import piiRedactor from '../../services/piiRedactorService.js';

const { redactSensitive, redactObjectFields, luhnValid } = piiRedactor;

describe('piiRedactorService', () => {
  describe('emails', () => {
    it('masks an email address', () => {
      const { text, findings } = redactSensitive('mail me at jane.doe@college.edu please');
      expect(text).toBe('mail me at [REDACTED_EMAIL] please');
      expect(findings).toEqual([{ type: 'EMAIL', count: 1 }]);
    });
    it('leaves text with an @ but no address alone', () => {
      expect(redactSensitive('use @Override in Java').text).toBe('use @Override in Java');
    });
  });

  describe('phone numbers', () => {
    it('masks international and local formats', () => {
      expect(redactSensitive('call +91 98765 43210 now').text).toBe('call [REDACTED_PHONE] now');
      expect(redactSensitive('call (415) 555-2671 now').text).toContain('[REDACTED_PHONE]');
      expect(redactSensitive('call 415-555-2671').text).toBe('call [REDACTED_PHONE]');
    });
    it('keeps years, scores and short numbers', () => {
      const s = 'I scored 285 out of 300 in 2024, rank 12-15, session 2019-2020';
      expect(redactSensitive(s).text).toBe(s);
    });
  });

  describe('credit cards', () => {
    it('masks Luhn-valid card numbers', () => {
      const { text, findings } = redactSensitive('card 4111 1111 1111 1111 expires soon');
      expect(text).toBe('card [REDACTED_CARD] expires soon');
      expect(findings[0].type).toBe('CARD');
    });
    it('keeps card-like numbers that fail Luhn', () => {
      expect(redactSensitive('id 4111 1111 1111 1112').text).not.toContain('REDACTED_CARD');
    });
    it('luhnValid works', () => {
      expect(luhnValid('4539578763621486')).toBe(true);
      expect(luhnValid('4539578763621487')).toBe(false);
    });
  });

  describe('SSN', () => {
    it('masks SSN format', () => {
      expect(redactSensitive('ssn 123-45-6789').text).toBe('ssn [REDACTED_SSN]');
    });
    it('keeps non SSN dashed numbers', () => {
      expect(redactSensitive('ref 12-345-6789').text).toBe('ref 12-345-6789');
    });
  });

  describe('API keys and tokens', () => {
    const google = `AIza${'a'.repeat(35)}`;
    const openai = `sk-${'b'.repeat(30)}`;
    const github = `ghp_${'c'.repeat(36)}`;
    const aws = 'AKIAIOSFODNN7EXAMPLE';
    // built at runtime so secret scanners do not flag this obviously fake fixture
    const jwt = ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', 'x'.repeat(16)].join('.');

    it.each([
      ['google', google],
      ['openai', openai],
      ['github', github],
      ['aws', aws],
    ])('masks %s key', (_name, key) => {
      const { text, findings } = redactSensitive(`key: ${key} done`);
      expect(text).toBe('key: [REDACTED_API_KEY] done');
      expect(findings).toEqual([{ type: 'API_KEY', count: 1 }]);
    });
    it('masks bearer tokens and JWTs', () => {
      expect(redactSensitive(`Authorization: ${'Bear' + 'er'} ${'z'.repeat(20)}`).text).toContain('[REDACTED_BEARER_TOKEN]');
      expect(redactSensitive(`token ${jwt}`).text).toBe('token [REDACTED_JWT]');
    });
    it('keeps ordinary words that resemble prefixes', () => {
      const s = 'The sk-learn tutorial and the word Bearer of news';
      expect(redactSensitive(s).text).toBe(s);
    });
  });

  describe('general behaviour', () => {
    it('never puts the raw secret in findings', () => {
      const secret = `sk-${'z'.repeat(30)}`;
      const { findings } = redactSensitive(`a@b.com ${secret} 123-45-6789`);
      const dump = JSON.stringify(findings);
      expect(dump).not.toContain(secret);
      expect(dump).not.toContain('a@b.com');
      expect(dump).not.toContain('123-45-6789');
    });
    it('counts multiple matches', () => {
      expect(redactSensitive('a@b.com and c@d.org').findings).toEqual([{ type: 'EMAIL', count: 2 }]);
    });
    it('passes through non-strings and empty strings', () => {
      expect(redactSensitive(42)).toEqual({ text: 42, findings: [] });
      expect(redactSensitive(null)).toEqual({ text: null, findings: [] });
      expect(redactSensitive('')).toEqual({ text: '', findings: [] });
    });
    it('handles very long input quickly', () => {
      const big = `${'1 '.repeat(30000)}a@b.com`;
      const start = Date.now();
      const { text } = redactSensitive(big);
      expect(text.length).toBeGreaterThan(0);
      expect(Date.now() - start).toBeLessThan(2000);
    });
    it('redactObjectFields handles nested objects and only listed keys', () => {
      const body = { prompt: 'x@y.com', meta: { text: 'call 415-555-2671' }, other: 'x@y.com', n: 5 };
      const counts = redactObjectFields(body, ['prompt', 'text']);
      expect(body.prompt).toBe('[REDACTED_EMAIL]');
      expect(body.meta.text).toBe('call [REDACTED_PHONE]');
      expect(body.other).toBe('x@y.com');
      expect(counts).toEqual({ EMAIL: 1, PHONE: 1 });
    });
  });
});
