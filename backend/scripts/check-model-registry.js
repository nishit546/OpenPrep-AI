#!/usr/bin/env node
/**
 * Static audit of backend/models/index.js.
 *
 * The registry is the one place every model has to be imported in the shape it
 * was written, associated, and re-exported. Getting any of those three wrong is
 * a load-time failure for the whole backend, and the symptom never names the
 * registry:
 *
 *   - invoking an instance export throws "Class constructor model cannot be
 *     invoked without 'new'" from models/index.js, so `require('../models')`
 *     throws and every test file reports "no tests" rather than a failure;
 *   - not invoking a factory export leaves a bare function in the registry, so
 *     the first query against it throws "findAll is not a function" from a
 *     stack that points at whichever controller happened to touch it first;
 *   - a `{ Model, initModel }` pair that is imported but never initialised is
 *     an uninitialised Model subclass, which throws only once queried;
 *   - a name used in an association or listed in module.exports without a
 *     matching require is a ReferenceError while the file is still loading.
 *
 * This runs without a database and without loading the models, so it can gate a
 * pull request before anything tries to boot. `node scripts/check-model-registry.js`
 * prints a report and exits non-zero on the first category with findings.
 *
 * The equivalent assertions run in the test suite as
 * tests/integrity/modelRegistryShapes.unit.test.js; this script exists so the
 * same audit is available from a shell and from CI without vitest.
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '..');
const MODELS_DIR = path.join(BACKEND_ROOT, 'models');
const INDEX_PATH = path.join(MODELS_DIR, 'index.js');

/**
 * Directories whose modules pull models off the registry rather than importing
 * a model file directly. A name they dereference but the registry does not
 * export is `undefined` in a variable, not a load error, so it surfaces as a
 * TypeError from inside a request.
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

/** Registry exports that are deliberately not models. */
const NON_MODEL_EXPORTS = new Set(['sequelize', 'Sequelize']);

/**
 * A file exports a factory when module.exports is a function whose parameter
 * list mentions `sequelize` — `(sequelize, DataTypes) => ...` in every case in
 * the tree today.
 */
const FACTORY_EXPORT =
  /module\.exports\s*=\s*(?:async\s*)?(?:\([^)]*sequelize[^)]*\)|function\s*\([^)]*sequelize[^)]*\))/;

/** A file exports a pair when module.exports is an object carrying an init*. */
const PAIR_EXPORT = /module\.exports\s*=\s*\{([\s\S]*?)\}/;

const readFile = (file) => fs.readFileSync(file, 'utf8');

/** Every model file on disk, without the registry itself. */
function modelFiles() {
  return fs
    .readdirSync(MODELS_DIR)
    .filter((file) => file.endsWith('.js') && file !== 'index.js')
    .sort();
}

/**
 * Classifies a model file as 'factory', 'pair' or 'instance', and for a pair
 * reports the name of its init function.
 */
function classify(modelName) {
  const file = path.join(MODELS_DIR, `${modelName}.js`);
  if (!fs.existsSync(file)) return { kind: 'missing' };

  const source = readFile(file);
  if (FACTORY_EXPORT.test(source)) return { kind: 'factory' };

  const pair = source.match(PAIR_EXPORT);
  if (pair && /\binit[A-Z]/.test(pair[1])) {
    const init = pair[1].match(/\b(init[A-Za-z0-9_]*)/)[1];
    return { kind: 'pair', init };
  }

  return { kind: 'instance' };
}

/**
 * How the registry imports each model, keyed by module name.
 *
 * `invoked` records whether the require is immediately called, which is the
 * difference between importing a factory and importing an instance.
 */
function registryImports(source) {
  const imports = new Map();

  const direct =
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\('\.\/([A-Za-z_$][\w$]*)'\)(\s*\()?/g;
  for (const match of source.matchAll(direct)) {
    imports.set(match[2], {
      module: match[2],
      binding: match[1],
      invoked: Boolean(match[3]),
      destructured: false,
      names: [match[1]],
    });
  }

  const destructured =
    /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*require\('\.\/([A-Za-z_$][\w$]*)'\)/g;
  for (const match of source.matchAll(destructured)) {
    const names = match[1]
      .split(',')
      .map((part) => part.split(':').pop().trim())
      .filter(Boolean);

    imports.set(match[2], {
      module: match[2],
      binding: null,
      invoked: false,
      destructured: true,
      names,
    });
  }

  return imports;
}

/** Every top-level identifier the registry binds. */
function boundIdentifiers(source) {
  const bound = new Set();

  for (const match of source.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) {
    bound.add(match[1]);
  }

  for (const match of source.matchAll(/(?:const|let|var)\s*\{([^}]+)\}\s*=/g)) {
    for (const part of match[1].split(',')) {
      const name = part.split(':').pop().trim();
      if (name) bound.add(name);
    }
  }

  return bound;
}

/** Model identifiers handed to a Sequelize association call. */
function associationTargets(source) {
  const body = source.slice(0, source.lastIndexOf('module.exports'));
  const targets = new Set();

  for (const match of body.matchAll(
    /\.(?:hasMany|hasOne|belongsTo|belongsToMany)\(\s*([A-Za-z_$][\w$]*)/g
  )) {
    targets.add(match[1]);
  }

  // `Topic.hasMany(...)` also names Topic, at the head of a statement.
  for (const match of body.matchAll(/^([A-Z][A-Za-z0-9_]*)\s*\./gm)) {
    targets.add(match[1]);
  }

  return targets;
}

/** Names listed in the module.exports object literal, one per line. */
function exportedIdentifiers(source) {
  const block = source.slice(source.lastIndexOf('module.exports'));
  const exported = new Set();

  for (const match of block.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*,\s*$/gm)) {
    exported.add(match[1]);
  }

  return exported;
}

/** Init functions the registry actually calls. */
function calledInits(source) {
  const called = new Set();

  for (const match of source.matchAll(/^(init[A-Za-z0-9_]*)\(\s*sequelize\s*\)/gm)) {
    called.add(match[1]);
  }

  return called;
}

/** Model names every registry consumer dereferences or destructures. */
function consumerReferences() {
  const references = new Map();

  for (const dir of CONSUMER_DIRS) {
    const full = path.join(BACKEND_ROOT, dir);
    if (!fs.existsSync(full)) continue;

    for (const file of fs.readdirSync(full).filter((name) => name.endsWith('.js'))) {
      const relative = `${dir}/${file}`;
      const source = readFile(path.join(full, file));
      const names = new Set();

      const namespaced = source.match(
        /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\('\.\.\/models'\)/
      );
      if (namespaced) {
        const pattern = new RegExp(`\\b${namespaced[1]}\\.([A-Z][A-Za-z0-9_]*)\\b`, 'g');
        for (const match of source.matchAll(pattern)) names.add(match[1]);
      }

      for (const match of source.matchAll(
        /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*require\('\.\.\/models'\)/g
      )) {
        for (const part of match[1].split(',')) {
          const name = part.split(':')[0].trim();
          if (/^[A-Z][A-Za-z0-9_]*$/.test(name)) names.add(name);
        }
      }

      if (names.size) references.set(relative, [...names].sort());
    }
  }

  return references;
}

/**
 * Runs every check and returns them as named groups of findings.
 *
 * Exported so the vitest gate can assert on the same data rather than
 * reimplementing the parsing and drifting away from it.
 */
function auditRegistry() {
  const source = readFile(INDEX_PATH);
  const imports = registryImports(source);
  const bound = boundIdentifiers(source);
  const exported = exportedIdentifiers(source);
  const inits = calledInits(source);

  const shapeMismatches = [];
  const uninitialisedPairs = [];

  for (const entry of imports.values()) {
    const shape = classify(entry.module);

    if (shape.kind === 'missing') {
      shapeMismatches.push(`${entry.module}: required by the registry but models/${entry.module}.js does not exist`);
      continue;
    }

    if (shape.kind === 'factory' && !entry.invoked) {
      shapeMismatches.push(
        `${entry.module}: exports a (sequelize, DataTypes) factory but is imported without being invoked`
      );
    }

    if (shape.kind === 'instance' && entry.invoked) {
      shapeMismatches.push(
        `${entry.module}: exports a defined instance but the registry invokes it`
      );
    }

    if (shape.kind === 'instance' && entry.destructured) {
      shapeMismatches.push(
        `${entry.module}: exports a defined instance but the registry destructures it`
      );
    }

    if (shape.kind === 'pair') {
      if (!entry.destructured) {
        shapeMismatches.push(
          `${entry.module}: exports a { Model, ${shape.init} } pair but is imported as a plain value`
        );
      } else if (!inits.has(shape.init)) {
        uninitialisedPairs.push(`${entry.module}: ${shape.init}(sequelize) is never called`);
      }
    }

    if (!entry.destructured && entry.binding !== entry.module) {
      shapeMismatches.push(
        `${entry.module}: bound as ${entry.binding}, so it is registered under a name nothing looks it up by`
      );
    }
  }

  const unboundAssociations = [...associationTargets(source)]
    .filter((name) => !bound.has(name))
    .sort();

  const unboundExports = [...exported]
    .filter((name) => !NON_MODEL_EXPORTS.has(name) && !bound.has(name))
    .sort();

  const unexportedImports = [...imports.values()]
    .flatMap((entry) => entry.names)
    .filter((name) => !/^init[A-Z]/.test(name))
    .filter((name) => !exported.has(name))
    .sort();

  const duplicateImports = [];
  const seen = new Map();
  for (const match of source.matchAll(/require\('\.\/([A-Za-z_$][\w$]*)'\)/g)) {
    seen.set(match[1], (seen.get(match[1]) || 0) + 1);
  }
  for (const [name, count] of seen) {
    if (count > 1) duplicateImports.push(`${name} is required ${count} times`);
  }

  const unresolvedConsumers = [];
  for (const [file, names] of consumerReferences()) {
    for (const name of names) {
      if (NON_MODEL_EXPORTS.has(name)) continue;
      if (!exported.has(name)) unresolvedConsumers.push(`${file} reads ${name}`);
    }
  }

  const missingNamespace = NON_MODEL_EXPORTS.size
    ? [...NON_MODEL_EXPORTS].filter((name) => !new RegExp(`^\\s*${name},`, 'm').test(source.slice(source.lastIndexOf('module.exports'))))
    : [];

  return {
    'imports a model in the wrong shape': shapeMismatches.sort(),
    'imports a Model subclass without initialising it': uninitialisedPairs.sort(),
    'associates a model it never requires': unboundAssociations,
    'exports a name it never binds': unboundExports,
    'imports a model it never exports': [...new Set(unexportedImports)],
    'requires the same model file more than once': duplicateImports.sort(),
    'omits a model a consumer reads off the registry': unresolvedConsumers.sort(),
    'omits the instance or the Sequelize namespace': missingNamespace,
  };
}

/** Model files that exist but no one has registered — reported, never fatal. */
function unregisteredModels() {
  const imports = registryImports(readFile(INDEX_PATH));

  return modelFiles()
    .map((file) => path.basename(file, '.js'))
    .filter((name) => !imports.has(name));
}

function main() {
  const findings = auditRegistry();
  const failed = Object.entries(findings).filter(([, entries]) => entries.length > 0);

  const registered = registryImports(readFile(INDEX_PATH)).size;
  console.log(`Model registry audit — ${registered} models registered, ${modelFiles().length} on disk.`);

  const unregistered = unregisteredModels();
  if (unregistered.length) {
    console.log(
      `\n  note: ${unregistered.length} model file(s) are not in the registry. That is only a` +
        '\n  problem once something reads them off it, so this is reported, not enforced:' +
        `\n    ${unregistered.join(', ')}`
    );
  }

  if (!failed.length) {
    console.log('\nOK — every model is imported in the shape it exports, associated and re-exported.');
    return 0;
  }

  for (const [check, entries] of failed) {
    console.error(`\nmodels/index.js ${check}:`);
    for (const entry of entries) console.error(`  - ${entry}`);
  }

  console.error(
    `\n${failed.reduce((total, [, entries]) => total + entries.length, 0)} problem(s) found.` +
      '\nSee docs/model-registry.md for the three export shapes and how each is imported.'
  );

  return 1;
}

module.exports = {
  auditRegistry,
  classify,
  registryImports,
  boundIdentifiers,
  associationTargets,
  exportedIdentifiers,
  calledInits,
  consumerReferences,
  modelFiles,
  unregisteredModels,
  INDEX_PATH,
  MODELS_DIR,
  CONSUMER_DIRS,
};

if (require.main === module) {
  process.exit(main());
}
