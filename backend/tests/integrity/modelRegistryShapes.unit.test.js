import { describe, it, expect } from 'vitest';

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  auditRegistry,
  classify,
  registryImports,
  calledInits,
  exportedIdentifiers,
  consumerReferences,
  modelFiles,
  unregisteredModels,
  INDEX_PATH,
  MODELS_DIR,
} = require('../../scripts/check-model-registry');

/**
 * The registry gate, run against the audit that scripts/check-model-registry.js
 * exposes rather than against a second copy of the same parsing.
 *
 * models/index.js had all four failure modes live at the same time:
 *
 *   - StudyHabit, HabitLog and HabitStreak had been rewritten to export a
 *     defined instance while the registry still invoked them as factories.
 *     `require('../models')` threw "Class constructor model cannot be invoked
 *     without 'new'" at models/index.js:58, so every vitest file in the backend
 *     reported "no tests" — 202 suites collected nothing and CI was green on an
 *     empty run.
 *   - AIUsageLog and ProviderHealthStatus were the mirror image: factories
 *     imported without being invoked, which puts a bare function in the
 *     registry. aiUsageBudgetService catches and fails open, so the only
 *     symptom was that AI budget limits silently stopped being enforced.
 *   - Bounty, BountySolution, BountySolutionVote, LearningPath and
 *     ExamIntegrityReport were wired into associations with no require at all.
 *   - ModeratorAuditLog, StudyGoal, StudyGoalProgress, WeeklyStudyReport,
 *     StudyMilestone and UserMilestone were listed in module.exports without a
 *     require, which is a ReferenceError thrown while the object is built.
 *
 * Every assertion here is source-level, so it runs without PostgreSQL and
 * reports the model by name instead of dying inside a stack that points at a
 * controller.
 */

const SOURCE = fs.readFileSync(INDEX_PATH, 'utf8');
const FINDINGS = auditRegistry();

describe('the registry audit is looking at something', () => {
  it('finds the model files on disk', () => {
    expect(modelFiles().length).toBeGreaterThan(100);
  });

  it('finds the models the registry imports', () => {
    // A parsing change that silently matched nothing would make every
    // assertion below vacuously true.
    expect(registryImports(SOURCE).size).toBeGreaterThan(90);
  });

  it('finds the consumers that read models off the registry', () => {
    expect(consumerReferences().size).toBeGreaterThan(30);
  });

  it('classifies at least one file into each of the three export shapes', () => {
    const kinds = new Set(
      modelFiles().map((file) => classify(path.basename(file, '.js')).kind)
    );

    expect(kinds).toContain('instance');
    expect(kinds).toContain('factory');
    expect(kinds).toContain('pair');
  });
});

describe('models/index.js passes every registry check', () => {
  for (const [check, entries] of Object.entries(FINDINGS)) {
    it(`never ${check}`, () => {
      expect(entries).toEqual([]);
    });
  }
});

describe('each export shape is imported the way it is written', () => {
  const IMPORTS = registryImports(SOURCE);

  it('invokes every factory export it imports', () => {
    const uncalled = [...IMPORTS.values()]
      .filter((entry) => classify(entry.module).kind === 'factory')
      .filter((entry) => !entry.invoked)
      .map((entry) => entry.module);

    expect(uncalled).toEqual([]);
  });

  it('never invokes an instance export', () => {
    // This is the one that took the backend down: invoking a model that is
    // already defined throws before any test can be collected.
    const invoked = [...IMPORTS.values()]
      .filter((entry) => classify(entry.module).kind === 'instance')
      .filter((entry) => entry.invoked)
      .map((entry) => entry.module);

    expect(invoked).toEqual([]);
  });

  it('destructures every { Model, initModel } pair and calls its init', () => {
    const inits = calledInits(SOURCE);

    const broken = [...IMPORTS.values()]
      .map((entry) => ({ entry, shape: classify(entry.module) }))
      .filter(({ shape }) => shape.kind === 'pair')
      .filter(({ entry, shape }) => !entry.destructured || !inits.has(shape.init))
      .map(({ entry }) => entry.module);

    expect(broken).toEqual([]);
  });

  it('calls no init that it did not import', () => {
    // An init left behind after its model was removed is a ReferenceError at
    // load, in a block that reads like boilerplate and gets skimmed.
    const imported = new Set(
      [...IMPORTS.values()].flatMap((entry) => entry.names).filter((n) => /^init[A-Z]/.test(n))
    );

    const orphaned = [...calledInits(SOURCE)].filter((name) => !imported.has(name));

    expect(orphaned).toEqual([]);
  });

  it('binds each model under its own module name', () => {
    const renamed = [...IMPORTS.values()]
      .filter((entry) => !entry.destructured && entry.binding !== entry.module)
      .map((entry) => `${entry.binding} = require('./${entry.module}')`);

    expect(renamed).toEqual([]);
  });
});

describe('the models this fix restored to the registry', () => {
  /**
   * Named one at a time so a regression reports which model went missing
   * rather than dropping a thirty-entry array into the report.
   *
   * Split by why they were absent: the first group was invoked or not invoked
   * against the wrong shape, the second was associated without a require, the
   * third was exported without one.
   */
  const WRONG_SHAPE = ['StudyHabit', 'HabitLog', 'HabitStreak', 'AIUsageLog', 'ProviderHealthStatus'];
  const ASSOCIATED_UNBOUND = [
    'Bounty',
    'BountySolution',
    'BountySolutionVote',
    'LearningPath',
    'ExamIntegrityReport',
  ];
  const EXPORTED_UNBOUND = [
    'ModeratorAuditLog',
    'StudyGoal',
    'StudyGoalProgress',
    'WeeklyStudyReport',
    'StudyMilestone',
    'UserMilestone',
  ];

  const RESTORED = [...WRONG_SHAPE, ...ASSOCIATED_UNBOUND, ...EXPORTED_UNBOUND];

  it.each(RESTORED)('%s has a model file on disk', (name) => {
    expect(fs.existsSync(path.join(MODELS_DIR, `${name}.js`))).toBe(true);
  });

  it.each(RESTORED)('%s is imported by the registry', (name) => {
    expect(registryImports(SOURCE).has(name)).toBe(true);
  });

  it.each(RESTORED)('%s is re-exported by the registry', (name) => {
    expect(exportedIdentifiers(SOURCE).has(name)).toBe(true);
  });

  it.each(RESTORED)('%s is queryable off the loaded registry', (name) => {
    const models = require('../../models');

    expect(models[name], `${name} is missing from models/index.js`).toBeDefined();
    expect(typeof models[name].findAll).toBe('function');
  });
});

describe('the loaded registry agrees with the static audit', () => {
  const models = require('../../models');

  it('exports every name the source lists', () => {
    const missing = [...exportedIdentifiers(SOURCE)].filter((name) => models[name] === undefined);

    expect(missing).toEqual([]);
  });

  it('holds no bare factory functions', () => {
    const bare = Object.entries(models)
      .filter(([name]) => name !== 'sequelize' && name !== 'Sequelize')
      .filter(([, value]) => typeof value === 'function' && typeof value.findAll !== 'function')
      .map(([name]) => name);

    expect(bare).toEqual([]);
  });

  it('holds no uninitialised Model subclasses', () => {
    // A pair whose init never ran is a class with no attributes. Sequelize
    // only complains once queried, which is far from here.
    const uninitialised = Object.entries(models)
      .filter(([name]) => name !== 'sequelize' && name !== 'Sequelize')
      .filter(([, model]) => {
        try {
          return Object.keys(model.getAttributes()).length === 0;
        } catch {
          return true;
        }
      })
      .map(([name]) => name);

    expect(uninitialised).toEqual([]);
  });

  it('defines every model against the one shared instance', () => {
    const foreign = Object.entries(models)
      .filter(([name]) => name !== 'sequelize' && name !== 'Sequelize')
      .filter(([, model]) => model.sequelize !== models.sequelize)
      .map(([name]) => name);

    expect(foreign).toEqual([]);
  });

  it('exports the instance and the library namespace as distinct values', () => {
    const { Sequelize } = require('sequelize');

    expect(models.sequelize).toBeDefined();
    expect(models.Sequelize).toBe(Sequelize);
    expect(models.Sequelize).not.toBe(models.sequelize);
    expect(typeof models.Sequelize.Op.gte).toBe('symbol');
  });

  it('is require-cache safe', () => {
    // The association block runs at module scope and Sequelize throws on a
    // duplicate alias, so a registry that re-executes blows up on the second
    // require rather than the first.
    expect(require('../../models')).toBe(models);
  });
});

/**
 * Seeds a defect into a copy of the registry and asserts the audit reports it.
 *
 * Without this the gate can rot into a no-op: a regex that stops matching
 * turns every assertion above green while the check covers nothing. Each case
 * rewrites the real source in a temporary checkout of models/index.js, runs the
 * audit against it, and restores the original.
 */
function auditWith(mutate) {
  const original = fs.readFileSync(INDEX_PATH, 'utf8');
  const backup = path.join(os.tmpdir(), `model-registry-${process.pid}-${Date.now()}.js`);
  fs.writeFileSync(backup, original);

  try {
    fs.writeFileSync(INDEX_PATH, mutate(original));
    return auditRegistry();
  } finally {
    fs.writeFileSync(INDEX_PATH, fs.readFileSync(backup, 'utf8'));
    fs.unlinkSync(backup);
  }
}

const findingsFor = (findings) => Object.values(findings).flat().join('\n');

describe('the audit detects the defects it exists to catch', () => {
  it('reports an instance import that is invoked', () => {
    const findings = auditWith((source) =>
      source.replace(
        "const StudyHabit = require('./StudyHabit');",
        "const StudyHabit = require('./StudyHabit')(sequelize, DataTypes);"
      )
    );

    expect(findingsFor(findings)).toContain('StudyHabit');
  });

  it('reports a factory import that is not invoked', () => {
    const findings = auditWith((source) =>
      source.replace(
        "const AIUsageLog = require('./AIUsageLog')(sequelize, DataTypes);",
        "const AIUsageLog = require('./AIUsageLog');"
      )
    );

    expect(findingsFor(findings)).toContain('AIUsageLog');
  });

  it('reports a pair whose init is never called', () => {
    const findings = auditWith((source) => source.replace('initBounty(sequelize);\n', ''));

    expect(findings['imports a Model subclass without initialising it']).toEqual([
      'Bounty: initBounty(sequelize) is never called',
    ]);
  });

  it('reports a model associated without a require', () => {
    const findings = auditWith((source) =>
      source.replace("const LearningPath = require('./LearningPath');\n", '')
    );

    expect(findings['associates a model it never requires']).toContain('LearningPath');
  });

  it('reports a name exported without a require', () => {
    const findings = auditWith((source) => source.replace('  Folder,\n', '  NotAModel,\n'));

    expect(findings['exports a name it never binds']).toContain('NotAModel');
  });

  it('reports a model imported but left out of the exports', () => {
    const findings = auditWith((source) => source.replace(/^  Folder,$/m, ''));

    expect(findings['imports a model it never exports']).toContain('Folder');
  });

  it('reports the same model file required twice', () => {
    const findings = auditWith((source) =>
      source.replace(
        "const Folder = require('./Folder');",
        "const Folder = require('./Folder');\nconst FolderAgain = require('./Folder');"
      )
    );

    expect(findings['requires the same model file more than once']).toContain(
      'Folder is required 2 times'
    );
  });

  it('reports a model a consumer reads that the registry drops', () => {
    const findings = auditWith((source) => source.replace(/^  AIUsageLog,$/m, ''));

    expect(findingsFor(findings)).toContain('aiUsageBudgetService.js reads AIUsageLog');
  });

  it('reports a missing Sequelize namespace export', () => {
    const findings = auditWith((source) => source.replace(/^  Sequelize,$/m, ''));

    expect(findings['omits the instance or the Sequelize namespace']).toContain('Sequelize');
  });

  it('leaves the file byte-identical after a seeded run', () => {
    const before = fs.readFileSync(INDEX_PATH, 'utf8');
    auditWith((source) => source.replace('initBounty(sequelize);\n', ''));

    expect(fs.readFileSync(INDEX_PATH, 'utf8')).toBe(before);
  });
});

describe('model files outside the registry', () => {
  it('is reported rather than enforced', () => {
    // Sixty-odd model files have no entry in the registry. That is only a
    // problem once something reads one off it — which the consumer check above
    // covers — so this is surfaced for the backlog, not failed on.
    const unregistered = unregisteredModels();

    expect(Array.isArray(unregistered)).toBe(true);
    expect(unregistered).not.toContain('User');
    expect(unregistered).not.toContain('Quiz');
  });
});
