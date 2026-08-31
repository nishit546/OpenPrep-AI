import { describe, it, expect } from 'vitest';

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '..', '..', 'models', 'index.js');
const REGISTRY_SOURCE = fs.readFileSync(REGISTRY_PATH, 'utf8');

/**
 * Names imported by the registry, in source order.
 *
 * The export list in models/index.js is maintained by hand, so it can drift out
 * of sync with the import list every time a model is added. Deriving the
 * expected set from the source is what makes that drift a test failure rather
 * than an `undefined` at request time.
 */
function importedModelNames(source) {
  // Two shapes are in use. Most models export the model directly:
  //
  //   const User = require('./User');
  //
  // The class-based ones export the model alongside an init function, and the
  // registry destructures both:
  //
  //   const { Bounty, initBounty } = require('./Bounty');
  //
  // Matching only the first shape made this check fail on main: Bounty,
  // BountySolution and BountySolutionVote were counted as exported-but-never-
  // imported, so the assertion could not pass however tidy the registry was.
  //
  // A third shape is the `(sequelize, DataTypes)` factory, which is invoked at
  // the point of import:
  //
  //   const StudyHabit = require('./StudyHabit')(sequelize, DataTypes);
  //
  // Requiring the line to end at `');` skipped every one of those, so the
  // factory-backed models read as exported-but-never-imported too.
  return [
    ...source.matchAll(
      /^const\s+(?:(\w+)|\{\s*(\w+)\s*(?:,[^}]*)?\})\s*=\s*require\('\.\/(\w+)'\)(?:\([^)]*\))?;$/gm
    ),
  ].map((match) => match[1] || match[2]);
}

/**
 * Registry keys that are deliberately not models.
 *
 * `sequelize` is the instance. `Sequelize` is the library namespace, exported
 * so consumers can build operators as `db.Sequelize.Op.gte` without a second
 * require — aiUsageBudgetService does exactly that.
 */
const NON_MODEL_EXPORTS = new Set(['sequelize', 'Sequelize']);

/**
 * Model names listed inside the trailing `module.exports = { ... }` literal.
 */
function exportedNames(source) {
  const start = source.indexOf('module.exports');
  expect(start).toBeGreaterThan(-1);
  return [...source.slice(start).matchAll(/^\s{2}(\w+),$/gm)]
    .map((match) => match[1])
    .filter((name) => !NON_MODEL_EXPORTS.has(name));
}

describe('model registry', () => {
  it('loads without throwing', () => {
    expect(() => require('../../models')).not.toThrow();
  });

  it('exports the sequelize instance', () => {
    const models = require('../../models');
    expect(models.sequelize).toBeDefined();
    expect(typeof models.sequelize.define).toBe('function');
  });

  it('exports every model it imports', () => {
    const imported = importedModelNames(REGISTRY_SOURCE);
    const exported = exportedNames(REGISTRY_SOURCE);

    expect(imported.length).toBeGreaterThan(0);
    // Compared as sets: what matters is that nothing imported goes unexported
    // and nothing exported is a name the registry never bound. The two lists
    // are maintained separately and have never shared an order.
    expect([...exported].sort()).toEqual([...imported].sort());
  });

  it('resolves every imported model to a Sequelize model at runtime', () => {
    const models = require('../../models');

    for (const name of importedModelNames(REGISTRY_SOURCE)) {
      expect(models[name], `${name} is missing from the registry exports`).toBeDefined();
      expect(typeof models[name].findAll, `${name} is not a Sequelize model`).toBe('function');
    }
  });

  it('declares each model on its own line', () => {
    // Two require statements collapsed onto one line is how the missing exports
    // stayed invisible during review.
    const collapsed = REGISTRY_SOURCE.split('\n').filter(
      (line) => (line.match(/require\('\.\//g) || []).length > 1
    );

    expect(collapsed).toEqual([]);
  });

  it('never imports the same model twice', () => {
    const imported = importedModelNames(REGISTRY_SOURCE);
    const duplicates = imported.filter((name, index) => imported.indexOf(name) !== index);

    expect(duplicates).toEqual([]);
  });
});

describe('models that were imported but never exported', () => {
  // Regression cover for the eight names that resolved to `undefined` before
  // this fix. Each had at least one consumer destructuring it from the barrel.
  const previouslyMissing = [
    'SecurityAuditLog',
    'Folder',
    'UserProgress',
    'Syllabus',
    'SyllabusTopic',
    'HandwrittenSubmission',
    'NotificationSettings',
    'WeaknessReport',
  ];

  it.each(previouslyMissing)('exports %s', (name) => {
    const models = require('../../models');
    expect(models[name]).toBeDefined();
    expect(typeof models[name].findAll).toBe('function');
  });
});

describe('SecurityAuditLog wiring', () => {
  it('is imported by the registry', () => {
    expect(REGISTRY_SOURCE).toMatch(/const SecurityAuditLog = require\('\.\/SecurityAuditLog'\);/);
  });

  it('is associated to User as securityLogs', () => {
    const { User } = require('../../models');
    expect(User.associations.securityLogs).toBeDefined();
    expect(User.associations.securityLogs.associationType).toBe('HasMany');
  });

  it('keeps the audit row when its user is deleted', () => {
    const { User } = require('../../models');
    // Audit trails must outlive the account they describe.
    expect(User.associations.securityLogs.options.onDelete).toBe('SET NULL');
  });

  it('is the model auditLogMiddleware writes through', () => {
    const middlewareSource = fs.readFileSync(
      path.join(__dirname, '..', '..', 'middleware', 'auditLogMiddleware.js'),
      'utf8'
    );
    expect(middlewareSource).toMatch(/const \{ SecurityAuditLog \} = require\('\.\.\/models'\)/);

    const { SecurityAuditLog } = require('../../models');
    expect(typeof SecurityAuditLog.create).toBe('function');
  });
});
