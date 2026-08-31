import { describe, it, expect } from 'vitest';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '..', '..');

/**
 * Directories whose modules reach for models via `require('../models')`.
 *
 * Sixty-odd files in the tree take the whole registry as one object and
 * dereference models off it — `db.AIUsageLog.sum(...)`, `models.Quiz.findAll()`.
 * That indirection is what made the scaffold regression so quiet: a name
 * missing from models/index.js exports is not a load error anywhere, it is
 * `undefined` sitting in a variable until the first call against it throws a
 * TypeError from inside whatever request happened to touch it first.
 *
 * services/aiUsageBudgetService.js was the live example. It read
 * `db.AIUsageLog`, `db.ProviderHealthStatus` and `db.Sequelize.Op`, none of
 * which the registry exported, and `canMakeRequest` catches everything and
 * fails open — so the only symptom of three broken queries was that AI budget
 * limits silently stopped being enforced.
 */
const CONSUMER_DIRS = [
  'services',
  'controllers',
  'middleware',
  'jobs',
  'workers',
  'utils',
  'sockets',
  'routes',
];

/** `const db = require('../models')` — captures whatever alias is used. */
const REGISTRY_IMPORT = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\('\.\.\/models'\)/;

/** `const { Quiz, User } = require('../models')` — the destructured shape. */
const REGISTRY_DESTRUCTURE = /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*require\('\.\.\/models'\)/g;

function jsFilesIn(dir) {
  const full = path.join(BACKEND_ROOT, dir);
  if (!fs.existsSync(full)) return [];

  return fs
    .readdirSync(full)
    .filter((file) => file.endsWith('.js'))
    .sort()
    .map((file) => ({
      dir,
      file,
      relative: `${dir}/${file}`,
      source: fs.readFileSync(path.join(full, file), 'utf8'),
    }));
}

const ALL_MODULES = CONSUMER_DIRS.flatMap(jsFilesIn);

/**
 * Modules that take the registry as a single object, with the model names they
 * dereference off it.
 *
 * Only PascalCase properties are collected: `db.sequelize`, `db.transaction`
 * and friends are registry plumbing rather than models, and lowercase method
 * calls would swamp the signal.
 */
const NAMESPACE_CONSUMERS = ALL_MODULES.map((module) => {
  const match = module.source.match(REGISTRY_IMPORT);
  if (!match) return null;

  const alias = match[1];
  const pattern = new RegExp(`\\b${alias}\\.([A-Z][A-Za-z0-9_]*)\\b`, 'g');
  const referenced = [...new Set([...module.source.matchAll(pattern)].map((m) => m[1]))].sort();

  return { ...module, alias, referenced };
}).filter(Boolean);

/** Modules that destructure named models straight out of the registry. */
const DESTRUCTURING_CONSUMERS = ALL_MODULES.map((module) => {
  const names = new Set();

  for (const match of module.source.matchAll(REGISTRY_DESTRUCTURE)) {
    for (const part of match[1].split(',')) {
      // `{ Quiz, User: Learner }` — the model is the key, not the local name.
      const name = part.split(':')[0].trim();
      if (/^[A-Z][A-Za-z0-9_]*$/.test(name)) names.add(name);
    }
  }

  return names.size ? { ...module, referenced: [...names].sort() } : null;
}).filter(Boolean);

describe('the consumer scan is actually looking at something', () => {
  it('finds modules in every consumer directory it claims to cover', () => {
    const empty = CONSUMER_DIRS.filter((dir) => jsFilesIn(dir).length === 0);

    expect(empty).toEqual([]);
  });

  it('finds a substantial number of registry consumers', () => {
    // If a refactor changes how models are imported, this gate would quietly
    // start covering nothing. Better that it fails loudly and gets updated.
    expect(NAMESPACE_CONSUMERS.length + DESTRUCTURING_CONSUMERS.length).toBeGreaterThan(30);
  });

  it('sees aiUsageBudgetService among the namespace consumers', () => {
    // The module the regression actually broke. If it stops matching, the
    // specific assertions below are passing vacuously.
    const entry = NAMESPACE_CONSUMERS.find(
      (m) => m.relative === 'services/aiUsageBudgetService.js'
    );

    expect(entry).toBeDefined();
    expect(entry.referenced).toEqual(
      expect.arrayContaining(['AIUsageLog', 'ProviderHealthStatus', 'Sequelize'])
    );
  });
});

describe('every model dereferenced off the registry is exported by it', () => {
  const models = require('../../models');

  it('resolves every namespaced reference', () => {
    const unresolved = NAMESPACE_CONSUMERS.flatMap(({ relative, alias, referenced }) =>
      referenced
        .filter((name) => models[name] === undefined)
        .map((name) => `${relative}: ${alias}.${name}`)
    );

    expect(unresolved).toEqual([]);
  });

  it('resolves every destructured reference', () => {
    const unresolved = DESTRUCTURING_CONSUMERS.flatMap(({ relative, referenced }) =>
      referenced
        .filter((name) => models[name] === undefined)
        .map((name) => `${relative}: { ${name} }`)
    );

    expect(unresolved).toEqual([]);
  });

  it('hands back models, not bare factory functions', () => {
    // Half of the scaffold regression was shape rather than absence: a model
    // imported without being called is a function that answers to nothing.
    const referencedModels = new Set(
      [...NAMESPACE_CONSUMERS, ...DESTRUCTURING_CONSUMERS].flatMap((m) => m.referenced)
    );

    const notQueryable = [...referencedModels]
      .filter((name) => name !== 'Sequelize' && models[name] !== undefined)
      .filter((name) => typeof models[name].findAll !== 'function')
      .sort();

    expect(notQueryable).toEqual([]);
  });
});

describe('the Sequelize namespace consumers depend on', () => {
  const models = require('../../models');

  /** Modules that build operators as `db.Sequelize.Op.*`. */
  const OPERATOR_CONSUMERS = NAMESPACE_CONSUMERS.filter(({ source, alias }) =>
    new RegExp(`\\b${alias}\\.Sequelize\\.Op\\b`).test(source)
  );

  it('is exported alongside the instance', () => {
    expect(models.Sequelize).toBeDefined();
    expect(models.sequelize).toBeDefined();
    expect(models.Sequelize).not.toBe(models.sequelize);
  });

  it('is the same namespace require("sequelize") returns', () => {
    const { Sequelize } = require('sequelize');

    expect(models.Sequelize).toBe(Sequelize);
  });

  it('carries the operator symbols', () => {
    const { Op } = require('sequelize');

    expect(models.Sequelize.Op).toBeDefined();
    expect(models.Sequelize.Op.gte).toBe(Op.gte);
  });

  it('satisfies every module that builds operators through the registry', () => {
    expect(OPERATOR_CONSUMERS.length).toBeGreaterThan(0);

    const broken = OPERATOR_CONSUMERS.filter(() => models.Sequelize?.Op?.gte === undefined).map(
      (m) => m.relative
    );

    expect(broken).toEqual([]);
  });

  it('resolves every distinct operator those modules reach for', () => {
    const used = new Set();

    for (const { source, alias } of OPERATOR_CONSUMERS) {
      const pattern = new RegExp(`\\b${alias}\\.Sequelize\\.Op\\.([a-zA-Z]+)\\b`, 'g');
      for (const match of source.matchAll(pattern)) used.add(match[1]);
    }

    const missing = [...used].filter((operator) => models.Sequelize.Op[operator] === undefined);

    expect(missing).toEqual([]);
  });
});

describe('registry consumers do not reach around the registry', () => {
  it('takes the instance from the registry or config/db, never config/database', () => {
    // config/database.js is the sequelize-cli config object. Requiring it in
    // place of the instance yields something with no `.define`, which is the
    // failure tests/setup.js now names explicitly.
    const offenders = ALL_MODULES.filter(({ source }) =>
      /require\('\.\.\/config\/database'\)/.test(source)
    ).map((m) => m.relative);

    expect(offenders).toEqual([]);
  });

  it('does not construct a second Sequelize instance', () => {
    // A second instance would define models against a different connection
    // pool, so associations wired in models/index.js would not apply to it.
    const offenders = ALL_MODULES.filter(({ source }) => /new Sequelize\s*\(/.test(source)).map(
      (m) => m.relative
    );

    expect(offenders).toEqual([]);
  });
});

describe('per-consumer resolution', () => {
  // Spelled out one module at a time so a failure names the file rather than
  // dropping a sixty-entry array into the report.
  const models = require('../../models');
  const cases = NAMESPACE_CONSUMERS.filter(({ referenced }) => referenced.length > 0);

  it('has cases to run', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it.each(cases.map(({ relative, alias, referenced }) => [relative, alias, referenced]))(
    '%s resolves every model it dereferences',
    (relative, alias, referenced) => {
      const unresolved = referenced.filter((name) => models[name] === undefined);

      expect(unresolved, `${relative} dereferences ${alias}.${unresolved.join(', ')}`).toEqual([]);
    }
  );
});
