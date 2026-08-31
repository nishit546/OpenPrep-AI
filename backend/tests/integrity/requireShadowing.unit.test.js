import { describe, it, expect } from 'vitest';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '..', '..');

/**
 * Catches a `require` inside a function body for a module the file already
 * requires at the top.
 *
 * This is the shape the `generateCustomQuiz` regression arrived in. A usage
 * example for `quizGenerationService` was pasted into the handler, bringing its
 * own require with it:
 *
 *   const quizGenerationService = require('../services/quizGenerationService');
 *   const generatedQuestions = await quizGenerationService.generateQuestionsWithValidation(
 *     topic, questionCount, sourceContext, req.body.quizId
 *   );
 *
 * `quizGenerationService` was already required at module scope, so the inner
 * `const` legally shadows it. Nothing failed at load — the module parsed, the
 * router mounted — and the handler threw `ReferenceError: topic is not defined`
 * at runtime on every request, because none of `topic`, `questionCount` or
 * `sourceContext` exist in that scope.
 *
 * A repeated require is not itself a bug; Node caches modules, so the shadowing
 * binding is the same object. It is a reliable marker of a block that arrived
 * from somewhere else and was never adapted to its surroundings, which is worth
 * failing on while there are none left.
 *
 * Lazy requires that break a genuine circular dependency are a real pattern in
 * this tree and are not flagged: those have no module-level counterpart, which
 * is exactly what this check keys on.
 */
const SOURCE_DIRS = [
  'controllers',
  'services',
  'middleware',
  'routes',
  'sockets',
  'workers',
  'jobs',
  'utils',
  'models',
  'config',
];

function jsFilesIn(dir) {
  const full = path.join(BACKEND_ROOT, dir);
  if (!fs.existsSync(full)) return [];

  return fs
    .readdirSync(full)
    .filter((file) => file.endsWith('.js'))
    .sort()
    .map((file) => `${dir}/${file}`);
}

const SOURCE_FILES = SOURCE_DIRS.flatMap(jsFilesIn);

const read = (file) => fs.readFileSync(path.join(BACKEND_ROOT, file), 'utf8');

/** `const X = require(...)` at column zero. */
const MODULE_LEVEL_REQUIRE = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(/;

/** The same, indented — so inside some block. */
const NESTED_REQUIRE = /^\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(/;

/** Nested requires in `file` that shadow one of its own module-level requires. */
function shadowedRequires(file) {
  const lines = read(file).split(/\r?\n/);
  const moduleLevel = new Map();

  lines.forEach((line, index) => {
    const match = line.match(MODULE_LEVEL_REQUIRE);
    if (match) moduleLevel.set(match[1], index + 1);
  });

  return lines
    .map((line, index) => ({ line, number: index + 1 }))
    .map(({ line, number }) => {
      const match = line.match(NESTED_REQUIRE);
      if (!match || !moduleLevel.has(match[1])) return null;

      return `${file}:${number}: ${match[1]} already required at line ${moduleLevel.get(match[1])}`;
    })
    .filter(Boolean);
}

describe('the shadowing scan covers the tree', () => {
  it('walks a substantial number of source files', () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(200);
  });

  it('includes the controller this gate was written for', () => {
    expect(SOURCE_FILES).toContain('controllers/quizController.js');
  });
});

describe('the patterns distinguish scope correctly', () => {
  it('treats a column-zero require as module level', () => {
    expect(MODULE_LEVEL_REQUIRE.test("const thing = require('./thing');")).toBe(true);
    expect(NESTED_REQUIRE.test("const thing = require('./thing');")).toBe(false);
  });

  it('treats an indented require as nested', () => {
    expect(NESTED_REQUIRE.test("  const thing = require('./thing');")).toBe(true);
    expect(MODULE_LEVEL_REQUIRE.test("  const thing = require('./thing');")).toBe(false);
  });

  it('ignores a destructured require, which binds different names', () => {
    expect(MODULE_LEVEL_REQUIRE.test("const { a, b } = require('./thing');")).toBe(false);
  });

  it('ignores a bare require called for its side effects', () => {
    expect(MODULE_LEVEL_REQUIRE.test("require('./register');")).toBe(false);
    expect(NESTED_REQUIRE.test("  require('./register');")).toBe(false);
  });
});

describe('no function-scoped require shadows a module-level one', () => {
  it('finds none across the backend', () => {
    const shadowed = SOURCE_FILES.flatMap(shadowedRequires);

    expect(shadowed).toEqual([]);
  });

  it.each([
    'controllers/quizController.js',
    'controllers/studyPlanController.js',
    'controllers/flashcardController.js',
  ])('%s has none', (file) => {
    expect(shadowedRequires(file)).toEqual([]);
  });

  it('still allows a lazy require with no module-level counterpart', () => {
    // flashcardController requires gamificationService inside the review
    // handler and nowhere else. That is deliberate and must stay legal.
    const source = read('controllers/flashcardController.js');

    expect(source).toMatch(
      /^\s+const gamificationService = require\('\.\.\/services\/gamificationService'\);/m
    );
    expect(shadowedRequires('controllers/flashcardController.js')).toEqual([]);
  });
});

describe('quizController requires each service once', () => {
  const SOURCE = read('controllers/quizController.js');

  it.each(['quizGenerationService', 'quizEvaluationService', 'quizAnalyticsService'])(
    'requires %s exactly once',
    (name) => {
      const requires = [
        ...SOURCE.matchAll(new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*require\\(`, 'g')),
      ];

      expect(requires).toHaveLength(1);
    }
  );

  it('keeps the three refactor service requires together at module scope', () => {
    // Introduced as a set by the #1907 service extraction. Two are not called
    // yet; that is the refactor still being in progress, not a defect, and is
    // why the fix removes the pasted require rather than the module-level one.
    for (const name of ['quizGenerationService', 'quizEvaluationService', 'quizAnalyticsService']) {
      expect(SOURCE).toMatch(new RegExp(`^const ${name} = require\\(`, 'm'));
    }
  });
});
