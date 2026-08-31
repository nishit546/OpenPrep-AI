import { describe, it, expect } from 'vitest';

const fs = require('fs');
const path = require('path');

const {
  stripComments,
  requiredSpecifiers,
  collectBootReachableFiles,
  findBrokenRelativeRequires,
} = require('./moduleParser');

/**
 * The boot-path require check regex-scanned raw source, so a `require()`
 * written inside a comment as documentation counted as a real dependency.
 *
 * middleware/rateLimiter.js explains its two call shapes in a JSDoc block:
 *
 *   * `require('.../rateLimiter')` used directly as app-level middleware, and
 *   * `const { aiLimiter } = require('.../rateLimiter')` in the route modules.
 *
 * `.../rateLimiter` is an ellipsis standing in for a path, not a path. It does
 * not resolve, so the gate reported:
 *
 *   × reports no broken relative requires on the boot path
 *   + middleware/rateLimiter.js: .../rateLimiter
 *
 * while the module itself was perfectly fine. A gate that fails on healthy code
 * is worse than no gate: it trains everyone reading CI to skip that line, which
 * is how the genuinely broken routers in this same suite went unnoticed.
 */
describe('stripComments removes comments and nothing else', () => {
  it('blanks a line comment', () => {
    expect(requiredSpecifiers("// require('./ghost')\nconst a = 1;")).toEqual([]);
  });

  it('blanks a block comment', () => {
    expect(requiredSpecifiers("/* require('./ghost') */\nconst a = 1;")).toEqual([]);
  });

  it('blanks a JSDoc block spanning several lines', () => {
    const source = [
      '/**',
      " * `require('.../rateLimiter')` used directly as app-level middleware, and",
      " * `const { aiLimiter } = require('.../rateLimiter')` in the route modules.",
      ' */',
      "const limiter = require('./realLimiter');",
    ].join('\n');

    expect(requiredSpecifiers(source)).toEqual(['./realLimiter']);
  });

  it('keeps a trailing require on a line that begins with a comment', () => {
    expect(requiredSpecifiers("// note\nconst a = require('./real');")).toEqual(['./real']);
  });

  it('keeps a require that precedes a comment on the same line', () => {
    expect(requiredSpecifiers("const a = require('./real'); // and a note")).toEqual(['./real']);
  });

  it('does not treat a URL as the start of a comment', () => {
    // The trap in the naive fix: every https:// in the tree would blank the
    // rest of its line, hiding a real require behind it.
    const source = "const url = 'https://example.com/x'; const a = require('./real');";

    expect(requiredSpecifiers(source)).toEqual(['./real']);
  });

  it('does not treat a block-comment opener inside a string as a comment', () => {
    const source = "const glob = '/*'; const a = require('./real');";

    expect(requiredSpecifiers(source)).toEqual(['./real']);
  });

  it('respects an escaped quote inside a string', () => {
    const source = "const s = 'it\\'s // not a comment'; const a = require('./real');";

    expect(requiredSpecifiers(source)).toEqual(['./real']);
  });

  it('handles a require inside a template literal expression', () => {
    const source = 'const a = require(`./computed`);';

    // A template literal cannot be checked statically and is skipped, as before.
    expect(requiredSpecifiers(source)).toEqual([]);
  });

  it('preserves line count so reported positions stay accurate', () => {
    const source = ['const a = 1;', '/* two', '   lines */', 'const b = 2;'].join('\n');

    expect(stripComments(source).split('\n')).toHaveLength(source.split('\n').length);
  });

  it('preserves byte length so offsets stay accurate', () => {
    const source = "const a = 1; // require('./ghost')\n/* block */\n";

    expect(stripComments(source)).toHaveLength(source.length);
  });

  it('leaves code with no comments untouched', () => {
    const source = "const a = require('./real');\nmodule.exports = a;\n";

    expect(stripComments(source)).toBe(source);
  });

  it('handles an unterminated block comment without looping', () => {
    expect(() => stripComments("/* never closed\nconst a = require('./x');")).not.toThrow();
    expect(requiredSpecifiers("/* never closed\nconst a = require('./x');")).toEqual([]);
  });

  it('collects each specifier once', () => {
    const source = "const a = require('./real');\nconst b = require('./real');";

    expect(requiredSpecifiers(source)).toEqual(['./real']);
  });
});

describe('rateLimiter is no longer reported as broken', () => {
  const RATE_LIMITER = path.join('middleware', 'rateLimiter.js');
  const SOURCE = fs.readFileSync(
    path.join(__dirname, '..', '..', 'middleware', 'rateLimiter.js'),
    'utf8'
  );

  it('still documents both call shapes in a comment', () => {
    // If the comment is ever removed, this gate stops proving anything and the
    // test should be revisited rather than quietly passing.
    expect(SOURCE).toMatch(/require\('\.\.\.\/rateLimiter'\)/);
  });

  it('does not count the documented example as a dependency', () => {
    expect(requiredSpecifiers(SOURCE)).not.toContain('.../rateLimiter');
  });

  it('is on the boot path', () => {
    expect(collectBootReachableFiles()).toContain(RATE_LIMITER);
  });

  it('reports no broken requires for it', () => {
    const offenders = findBrokenRelativeRequires([RATE_LIMITER]);

    expect(offenders).toEqual([]);
  });
});

describe('the boot-path require check still catches real breakage', () => {
  it('reports a require that genuinely cannot resolve', () => {
    // The check's reason for existing: models/DoubtSessionModel.js naming a
    // module that was not there. Stripping comments must not blunt that.
    const source = "const missing = require('./definitelyNotHere');";

    expect(requiredSpecifiers(source)).toEqual(['./definitelyNotHere']);
  });

  it('finds every real require in a module that also documents one', () => {
    const source = [
      '/**',
      " * Use as `require('.../thing')`.",
      ' */',
      "const a = require('./a');",
      "const b = require('./b');",
      "// const c = require('./c');",
      "const { d } = require('./d');",
    ].join('\n');

    expect(requiredSpecifiers(source)).toEqual(['./a', './b', './d']);
  });
});
