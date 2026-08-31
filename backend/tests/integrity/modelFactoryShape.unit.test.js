import { describe, it, expect } from 'vitest';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '..', '..');
const MODELS_DIR = path.join(BACKEND_ROOT, 'models');
const INDEX_PATH = path.join(MODELS_DIR, 'index.js');
const SOURCE = fs.readFileSync(INDEX_PATH, 'utf8');

const MODEL_FILES = fs
  .readdirSync(MODELS_DIR)
  .filter((file) => file.endsWith('.js') && file !== 'index.js')
  .sort();

/**
 * Two export shapes coexist in backend/models, and the registry has to import
 * each one the way it was written.
 *
 *   factory  — `module.exports = (sequelize, DataTypes) => { ... }`
 *              must be called: `require('./X')(sequelize, DataTypes)`
 *   instance — `module.exports = X` where X is already `sequelize.define(...)`
 *              must NOT be called: `require('./X')`
 *
 * Getting it backwards fails in two different, equally unhelpful ways. Calling
 * an instance throws "require(...) is not a function"; not calling a factory
 * leaves a bare function in the registry, so the first `Model.findAll()`
 * against it throws "findAll is not a function" from a stack that points at a
 * controller rather than at the registry that mis-imported it.
 */
const FACTORY_EXPORT =
  /module\.exports\s*=\s*(?:async\s*)?(?:\([^)]*sequelize[^)]*\)|function\s*\([^)]*sequelize[^)]*\))/;

/** Reads a model file once; these are small and the suite reads each twice. */
const readModel = (() => {
  const cache = new Map();
  return (file) => {
    if (!cache.has(file)) {
      cache.set(file, fs.readFileSync(path.join(MODELS_DIR, file), 'utf8'));
    }
    return cache.get(file);
  };
})();

/** True when the model file exports a `(sequelize, DataTypes)` factory. */
function isFactory(file) {
  return FACTORY_EXPORT.test(readModel(file));
}

/**
 * How models/index.js imports each model, keyed by module name.
 *
 * `called: true` means the require is immediately invoked. Destructured
 * imports (`const { Bounty, initBounty } = require('./Bounty')`) are a third
 * shape that neither branch of this gate applies to, so they are recorded
 * separately rather than guessed at.
 */
function registryImports(source) {
  const imports = new Map();

  const direct =
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\('\.\/([A-Za-z_$][\w$]*)'\)(\s*\()?/g;
  for (const match of source.matchAll(direct)) {
    imports.set(match[2], {
      binding: match[1],
      module: match[2],
      called: Boolean(match[3]),
      destructured: false,
    });
  }

  const destructured = /(?:const|let|var)\s*\{[^}]+\}\s*=\s*require\('\.\/([A-Za-z_$][\w$]*)'\)/g;
  for (const match of source.matchAll(destructured)) {
    imports.set(match[1], {
      binding: null,
      module: match[1],
      called: false,
      destructured: true,
    });
  }

  return imports;
}

const IMPORTS = registryImports(SOURCE);

describe('models/index.js is a registry, not a scaffold', () => {
  it('exports exactly once, at the end of the file', () => {
    // A merge dropped a placeholder registry on top of the real one, complete
    // with its own `module.exports = { User, Quiz, ... }` at line 9. Every
    // require below it still ran, so the file looked plausible in a diff — but
    // the second assignment silently replaced the first, and any require that
    // landed between them was dead weight.
    const assignments = [...SOURCE.matchAll(/^module\.exports\s*=/gm)];

    expect(assignments).toHaveLength(1);
  });

  it('places the export after every require', () => {
    const exportIndex = SOURCE.indexOf('module.exports');
    const lastRequire = SOURCE.lastIndexOf("require('./");

    expect(exportIndex).toBeGreaterThan(lastRequire);
  });

  it('carries no scaffold placeholders', () => {
    // `// ... other models` and `// ... other exports` are the giveaway that a
    // generated skeleton was committed rather than adapted.
    const placeholders = SOURCE.split('\n')
      .map((line, index) => ({ line: line.trim(), number: index + 1 }))
      .filter(({ line }) => /^\/\/\s*\.\.\.\s*other\b/.test(line))
      .map(({ line, number }) => `models/index.js:${number}: ${line}`);

    expect(placeholders).toEqual([]);
  });

  it('declares no top-level identifier twice', () => {
    // `Quiz` was bound by the scaffold and again by the real registry. Both
    // were `const` in the same scope, which is a SyntaxError — the file never
    // parsed, so the failure surfaced as "no tests" for the entire backend
    // suite rather than as anything to do with models.
    const seen = new Map();

    for (const match of SOURCE.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)) {
      seen.set(match[1], (seen.get(match[1]) || 0) + 1);
    }

    const duplicated = [...seen.entries()]
      .filter(([, count]) => count > 1)
      .map(([name, count]) => `${name} (${count}x)`);

    expect(duplicated).toEqual([]);
  });

  it('imports DataTypes before using it', () => {
    // The scaffold called every model factory with `DataTypes` but never
    // imported it. That is a ReferenceError at load, and it fired before the
    // duplicate-Quiz SyntaxError could even be reached once Quiz was renamed.
    if (/\bDataTypes\b/.test(SOURCE)) {
      expect(SOURCE).toMatch(
        /(?:const|let|var)\s*\{[^}]*\bDataTypes\b[^}]*\}\s*=\s*require\('sequelize'\)/
      );
    }
  });

  it('takes the Sequelize instance from config/db, not the sequelize-cli config', () => {
    // config/database.js is the sequelize-cli JSON-ish config, not an
    // instance. Importing it yields an object with no `.define`, which is the
    // "Cannot read properties of undefined (reading 'define')" that tests/setup
    // now calls out by name.
    expect(SOURCE).toMatch(
      /(?:const|let|var)\s*\{\s*sequelize\s*\}\s*=\s*require\('\.\.\/config\/db'\)/
    );
    expect(SOURCE).not.toMatch(/require\('\.\.\/config\/database'\)/);
  });
});

describe('every model is imported in the shape it exports', () => {
  const factories = MODEL_FILES.filter((file) => isFactory(file));
  const instances = MODEL_FILES.filter((file) => !isFactory(file));

  it('finds both export shapes in the tree', () => {
    // If either list empties out, the heuristic above has drifted from the
    // code and the rest of this block is asserting nothing.
    expect(factories.length).toBeGreaterThan(0);
    expect(instances.length).toBeGreaterThan(0);
  });

  it('calls every factory it imports', () => {
    const uncalled = factories
      .map((file) => path.basename(file, '.js'))
      .filter((name) => IMPORTS.has(name))
      .filter((name) => {
        const entry = IMPORTS.get(name);
        return !entry.destructured && !entry.called;
      });

    expect(uncalled).toEqual([]);
  });

  it('does not call an already-defined model', () => {
    // StudyHabit, HabitLog, HabitStreak, StudyMilestone and UserMilestone are
    // factories that were being imported as instances; User and Quiz are
    // instances that the scaffold was calling as factories. Both directions
    // were live in the same file.
    const wronglyCalled = instances
      .map((file) => path.basename(file, '.js'))
      .filter((name) => IMPORTS.has(name))
      .filter((name) => IMPORTS.get(name).called);

    expect(wronglyCalled).toEqual([]);
  });

  it('binds each model under its own module name', () => {
    // A rename between the require and the binding is legal JavaScript and an
    // invisible way to register a model under a name nothing looks it up by.
    const renamed = [...IMPORTS.values()]
      .filter((entry) => !entry.destructured && entry.binding !== entry.module)
      .map((entry) => `${entry.binding} = require('./${entry.module}')`);

    expect(renamed).toEqual([]);
  });
});

/**
 * Registry keys that are deliberately not Sequelize models.
 *
 * `sequelize` is the instance; `Sequelize` is the library namespace, exported
 * so callers can reach `db.Sequelize.Op` without a second require.
 */
const NON_MODEL_EXPORTS = new Set(['sequelize', 'Sequelize']);

describe('the loaded registry exposes usable models', () => {
  const models = require('../../models');

  it('exports the Sequelize instance', () => {
    expect(models.sequelize).toBeDefined();
    expect(typeof models.sequelize.define).toBe('function');
  });

  it('exports no bare factory functions', () => {
    // The failure mode this whole suite exists to prevent: a registry entry
    // that is still the factory rather than the model it returns.
    const bare = Object.entries(models)
      .filter(([name]) => !NON_MODEL_EXPORTS.has(name))
      .filter(([, value]) => typeof value === 'function' && typeof value.findAll !== 'function')
      .map(([name]) => name);

    expect(bare).toEqual([]);
  });

  it('exports no undefined entries', () => {
    const empty = Object.entries(models)
      .filter(([, value]) => value === undefined || value === null)
      .map(([name]) => name);

    expect(empty).toEqual([]);
  });

  it('gives every exported model the standard Sequelize query surface', () => {
    const incomplete = Object.entries(models)
      .filter(([name]) => !NON_MODEL_EXPORTS.has(name))
      .filter(([, model]) => {
        return ['findAll', 'findOne', 'create', 'update', 'destroy'].some(
          (method) => typeof model[method] !== 'function'
        );
      })
      .map(([name]) => name);

    expect(incomplete).toEqual([]);
  });

  it('registers a substantial number of models', () => {
    // Guards against a future scaffold shrinking the registry back down to a
    // four-model placeholder without anything else failing.
    expect(Object.keys(models).length).toBeGreaterThan(50);
  });
});

describe('models the AI budget service reads off the registry', () => {
  // services/aiUsageBudgetService.js reaches for `db.AIUsageLog` and
  // `db.ProviderHealthStatus`. Both were imported by the scaffold and left out
  // of the real exports block, so every budget write threw "Cannot read
  // properties of undefined (reading 'create')" from inside the AI request
  // path — a 500 on question generation with nothing pointing at models.
  const CONSUMED_BY_BUDGET_SERVICE = ['AIUsageLog', 'ProviderHealthStatus'];

  it.each(CONSUMED_BY_BUDGET_SERVICE)('%s is exported by the registry', (name) => {
    const models = require('../../models');

    expect(models[name], `${name} is missing from models/index.js`).toBeDefined();
  });

  it.each(CONSUMED_BY_BUDGET_SERVICE)('%s is a model, not its factory', (name) => {
    const models = require('../../models');

    expect(typeof models[name].findAll).toBe('function');
    expect(models[name].name).toBe(name);
  });

  it('resolves every db.X the budget service dereferences', () => {
    // Catches the next model the service starts using before it reaches
    // production as a TypeError on undefined.
    const source = fs.readFileSync(
      path.join(BACKEND_ROOT, 'services', 'aiUsageBudgetService.js'),
      'utf8'
    );
    const models = require('../../models');

    const referenced = new Set(
      [...source.matchAll(/\bdb\.([A-Z][A-Za-z0-9_]*)\b/g)].map((match) => match[1])
    );

    expect(referenced.size).toBeGreaterThan(0);

    const missing = [...referenced].filter((name) => models[name] === undefined);

    expect(missing).toEqual([]);
  });

  it('exports the Sequelize namespace the budget service builds operators from', () => {
    // `createdAt: { [db.Sequelize.Op.gte]: today }` appears three times in the
    // daily/hourly budget queries. The registry exported the instance but not
    // the library, so each one threw "Cannot read properties of undefined
    // (reading 'Op')" the moment a budget check ran.
    const models = require('../../models');

    expect(models.Sequelize).toBeDefined();
    expect(models.Sequelize.Op).toBeDefined();
    expect(typeof models.Sequelize.Op.gte).toBe('symbol');
  });

  it('keeps the instance and the namespace as distinct exports', () => {
    const models = require('../../models');

    expect(models.Sequelize).not.toBe(models.sequelize);
    expect(models.sequelize).toBeInstanceOf(models.Sequelize);
  });
});

describe('models the registry gained back in this fix', () => {
  // The scaffold's four-model export block replaced a registry of sixty-odd.
  // These are the entries whose absence had a caller in the tree, spot-checked
  // so a re-introduction of the placeholder cannot pass silently.
  const REQUIRED = [
    'User',
    'Quiz',
    'QuizAttempt',
    'Flashcard',
    'FlashcardDeck',
    'StudyHabit',
    'HabitLog',
    'HabitStreak',
    'StudyMilestone',
    'UserMilestone',
    'AIUsageLog',
    'ProviderHealthStatus',
  ];

  it.each(REQUIRED)('%s has a file on disk', (name) => {
    expect(fs.existsSync(path.join(MODELS_DIR, `${name}.js`))).toBe(true);
  });

  it.each(REQUIRED)('%s is registered under its own name', (name) => {
    const models = require('../../models');

    expect(models[name], `${name} is missing from models/index.js`).toBeDefined();
    expect(models[name].name).toBe(name);
  });

  it.each(REQUIRED)('%s is queryable', (name) => {
    const models = require('../../models');

    expect(typeof models[name].findAll).toBe('function');
  });

  it('keeps the habit tracker models associated to User', () => {
    // StudyHabit/HabitLog/HabitStreak were being imported without being
    // called, so the association block below ran against three plain
    // functions. Sequelize accepts that quietly enough to reach runtime.
    const { User, StudyHabit, HabitLog, HabitStreak } = require('../../models');

    expect(typeof StudyHabit.findAll).toBe('function');
    expect(typeof HabitLog.findAll).toBe('function');
    expect(typeof HabitStreak.findAll).toBe('function');
    expect(Object.keys(User.associations).length).toBeGreaterThan(0);
  });

  it('keeps the milestone models associated to User', () => {
    const { StudyMilestone, UserMilestone } = require('../../models');

    expect(typeof StudyMilestone.findAll).toBe('function');
    expect(typeof UserMilestone.findAll).toBe('function');
  });
});

describe('the registry loads without side effects that throw', () => {
  it('is idempotent across repeated requires', () => {
    // models/index.js runs association wiring at module scope. Sequelize
    // throws on a duplicate alias, so a registry that is not require-cache
    // safe blows up the second time anything loads it.
    const first = require('../../models');
    const second = require('../../models');

    expect(second).toBe(first);
  });

  it('defines every model exactly once on the shared instance', () => {
    const models = require('../../models');
    const defined = Object.keys(models.sequelize.models);

    expect(new Set(defined).size).toBe(defined.length);
  });

  it('has no model registered under a placeholder name', () => {
    const models = require('../../models');
    const placeholders = Object.keys(models.sequelize.models).filter((name) =>
      /^(?:Model|Example|Placeholder|Todo)$/i.test(name)
    );

    expect(placeholders).toEqual([]);
  });
});
