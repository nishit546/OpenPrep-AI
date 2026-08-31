/**
 * Static integrity checks for backend source modules.
 *
 * These deliberately never execute the modules they inspect: a boot-blocking
 * defect has to be catchable without a database, Redis, or a network, or it
 * only gets caught by whoever runs the server next.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const BACKEND_ROOT = path.join(__dirname, '..', '..');

/** Source directories whose modules are loaded during server boot. */
const SOURCE_DIRS = [
  'controllers',
  'services',
  'routes',
  'models',
  'middleware',
  'sockets',
  'utils',
  'jobs',
];

/** Modules outside those directories that the server still loads at boot. */
const ROOT_FILES = ['server.js'];

/** Test fixtures and generated output are not part of the boot path. */
const IGNORED_SEGMENTS = ['node_modules', 'tests', '__tests__', 'coverage', 'uploads'];

function isIgnored(relativePath) {
  const segments = relativePath.split(path.sep);
  return (
    segments.some((segment) => IGNORED_SEGMENTS.includes(segment)) ||
    /\.(test|spec)\.js$/.test(relativePath)
  );
}

/** Every .js module under the directories the server boots from. */
function collectSourceFiles(root = BACKEND_ROOT, dirs = SOURCE_DIRS) {
  const found = [];

  const walk = (absoluteDir) => {
    if (!fs.existsSync(absoluteDir)) return;

    for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
      const absolute = path.join(absoluteDir, entry.name);
      const relative = path.relative(root, absolute);
      if (isIgnored(relative)) continue;

      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        found.push(relative.replace(/\\/g, '/'));
      }
    }
  };


  for (const dir of dirs) {
    walk(path.join(root, dir));
  }

  for (const file of ROOT_FILES) {
    if (fs.existsSync(path.join(root, file))) found.push(file);
  }

  return found.sort();
}

/**
 * Every name a module binds at the top level, including destructured requires.
 *
 * `const { protect } = require('./auth')` binds `protect`, and
 * `const { a: b } = ...` binds `b`, so both forms have to be recognised or the
 * checks below report false positives.
 */
function boundIdentifiers(source) {
  const bound = new Set();

  for (const match of source.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) {
    bound.add(match[1]);
  }

  for (const match of source.matchAll(/(?:const|let|var)\s*\{([^}]*)\}\s*=/g)) {
    for (const part of match[1].split(',')) {
      const name = part.split(':').pop().trim().replace(/\s*=.*$/, '');
      if (name) bound.add(name);
    }
  }

  for (const match of source.matchAll(/function\s+([A-Za-z_$][\w$]*)/g)) {
    bound.add(match[1]);
  }

  return bound;
}

/**
 * Compiles a file without running it.
 *
 * `vm.Script` covers CommonJS in-process, which is almost everything here and
 * keeps the whole sweep well under a second. A handful of modules use ESM
 * syntax, which `vm.Script` cannot compile; those fall through to `node
 * --check`, whose verdict is authoritative for either module system.
 *
 * @returns {{ file: string, ok: boolean, error: string|null }}
 */
function parseFile(relativePath, root = BACKEND_ROOT) {
  const absolute = path.join(root, relativePath);
  const source = fs.readFileSync(absolute, 'utf8');

  try {
    new vm.Script(source, { filename: absolute });
    return { file: relativePath, ok: true, error: null };
  } catch (commonjsError) {
    const check = spawnSync(process.execPath, ['--check', absolute], { encoding: 'utf8' });

    if (check.status === 0) {
      return { file: relativePath, ok: true, error: null };
    }

    const reported = (check.stderr || '').trim() || commonjsError.message;
    const syntaxLine = reported
      .split('\n')
      .find((line) => /Error:/.test(line));

    return { file: relativePath, ok: false, error: (syntaxLine || reported).trim() };
  }
}

/** Every file that fails to parse, with the reason. */
function findUnparseableFiles(files, root = BACKEND_ROOT) {
  return files.map((file) => parseFile(file, root)).filter((result) => !result.ok);
}

/**
 * Top-level `const`/`let` names declared more than once in a module.
 *
 * This is the signature of two whole modules concatenated by a bad merge -
 * the shape that broke routes/gamificationRoutes.js.
 */
function findDuplicateDeclarations(relativePath, root = BACKEND_ROOT) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const names = [...source.matchAll(/^(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/gm)].map(
    (match) => match[1]
  );

  return [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];
}

/**
 * Identifiers a module uses but never binds.
 *
 * Deliberately narrow: it looks only for the two patterns that have actually
 * caused boot failures here - `express.Router()` without an `express` binding,
 * and `router.<method>()` without a `router` binding. A general undefined
 * identifier analysis would need real scope tracking and would be noisy.
 */
function findUnboundRouterIdentifiers(relativePath, root = BACKEND_ROOT) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const unbound = [];

  const bound = boundIdentifiers(source);

  if (/\bexpress\.Router\s*\(/.test(source) && !bound.has('express')) {
    unbound.push('express');
  }

  if (/^\s*router\.(get|post|put|patch|delete|use|all)\s*\(/m.test(source) && !bound.has('router')) {
    unbound.push('router');
  }

  return unbound;
}

/**
 * Router identifiers mounted with `app.use('/path', name)` but never bound.
 *
 * server.js mounts around eighty routers by hand. A lost require line there
 * parses cleanly and only fails when the process actually boots, which is how
 * sessionRoutes and recommendationRoutes reached main.
 */
function findUnmountableRouters(relativePath, root = BACKEND_ROOT) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const bound = boundIdentifiers(source);

  const mounted = [...source.matchAll(/app\.use\(\s*'[^']*',\s*([A-Za-z_$][\w$]*)/g)].map(
    (match) => match[1]
  );

  return [...new Set(mounted)].filter((name) => !bound.has(name) && name !== 'require');
}

/**
 * Blanks out comments, leaving every other byte and all line breaks in place.
 *
 * Without this, a `require()` written inside a comment as documentation counts
 * as a real dependency. middleware/rateLimiter.js explains its two call shapes
 * in a JSDoc block:
 *
 *   * `require('.../rateLimiter')` used directly as app-level middleware, and
 *   * `const { aiLimiter } = require('.../rateLimiter')` in the route modules.
 *
 * `.../rateLimiter` is an ellipsis standing in for a path, not a path. It does
 * not resolve, so the boot-path check reported the file as broken while the
 * module was fine — a false positive on a gate whose whole value is that a
 * failure means something.
 *
 * Quotes are tracked so a `//` inside a string literal — every `https://` URL
 * in the tree — is not mistaken for the start of a comment. Content is replaced
 * with spaces rather than removed so that offsets and line numbers still line
 * up with the original source for any caller that reports positions.
 */
function stripComments(source) {
  let out = '';
  let quote = null;
  let inLine = false;
  let inBlock = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (inLine) {
      if (char === '\n') {
        inLine = false;
        out += char;
      } else {
        out += ' ';
      }
      continue;
    }

    if (inBlock) {
      if (char === '*' && next === '/') {
        inBlock = false;
        out += '  ';
        i += 1;
      } else {
        out += char === '\n' ? char : ' ';
      }
      continue;
    }

    if (quote) {
      out += char;
      // A backslash escapes the next byte, including the closing quote.
      if (char === '\\') {
        out += source[i + 1] ?? '';
        i += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      out += char;
      continue;
    }

    if (char === '/' && next === '/') {
      inLine = true;
      out += '  ';
      i += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlock = true;
      out += '  ';
      i += 1;
      continue;
    }

    out += char;
  }

  return out;
}

/**
 * Literal `require('...')` targets in a module.
 *
 * Only string literals are collected. A computed require - `require(name)` or
 * a template literal - cannot be checked statically and is skipped rather than
 * guessed at. Comments are stripped first so a documented example is not read
 * as a dependency.
 */
function requiredSpecifiers(source) {
  const specifiers = [];

  for (const match of stripComments(source).matchAll(/\brequire\(\s*(['"])([^'"\n]+)\1\s*\)/g)) {
    const specifier = match[2];
    if (specifier && !specifiers.includes(specifier)) specifiers.push(specifier);
  }

  return specifiers;
}



/** Node builtins, with or without the `node:` prefix. */
function isBuiltinModule(specifier) {
  const bare = specifier.startsWith('node:') ? specifier.slice(5) : specifier;
  return require('module').builtinModules.includes(bare);
}

/**
 * Every `require()` target in `relativePath` that cannot be resolved from it.
 *
 * This is the check that was missing when models/DoubtSessionModel.js reached
 * main naming `mongoose`, a package listed in package.json but never
 * installed and never connected to. The file parsed, the router it fed was
 * bound in server.js, and both existing integrity checks passed - the module
 * only failed when the process actually booted, with MODULE_NOT_FOUND.
 *
 * Resolution is done with `require.resolve` against the module's own
 * directory, so relative paths, package entry points and subpath exports are
 * all judged exactly as Node judges them at boot.
 *
 * @returns {Array<{ specifier: string, reason: string }>}
 */
function findUnresolvableRequires(relativePath, root = BACKEND_ROOT) {
  const absolute = path.join(root, relativePath);
  const source = fs.readFileSync(absolute, 'utf8');
  const fromDirectory = path.dirname(absolute);
  const unresolvable = [];

  for (const specifier of requiredSpecifiers(source)) {
    if (isBuiltinModule(specifier)) continue;

    try {
      require.resolve(specifier, { paths: [fromDirectory] });
    } catch (error) {
      unresolvable.push({ specifier, reason: error.code || error.message });
    }
  }

  return unresolvable;
}

/** Every module with at least one unresolvable require, with the offenders. */
function findModulesWithUnresolvableRequires(files, root = BACKEND_ROOT) {
  return files
    .map((file) => ({ file, unresolvable: findUnresolvableRequires(file, root) }))
    .filter((entry) => entry.unresolvable.length > 0);
}

/**
 * Specifiers required from inside a `try` block.
 *
 * An optional dependency is a real pattern here - quizController and
 * pyqController both do:
 *
 *   let uploadFileToFirebase = null;
 *   try {
 *     const firebaseService = require('../services/firebaseStorageService');
 *     uploadFileToFirebase = firebaseService.uploadFileToFirebase;
 *   } catch (e) {}
 *
 * That module is genuinely absent and the controllers are written to cope. A
 * boot check that cannot tell a guarded require from a bare one would report
 * both, and a check that cries wolf gets skipped.
 *
 * Line-based brace tracking rather than a full parse: the guarded requires
 * that matter are a require on its own line inside a `try {` block, and
 * anything subtler is better caught by the module actually failing to load.
 */
function guardedSpecifiers(source) {
  const guarded = new Set();
  const exitDepths = [];
  let depth = 0;

  for (const line of source.split('\n')) {
    const opensTry = /(?:^|[^\w$])try\s*\{/.test(line);
    const insideTry = exitDepths.length > 0 || opensTry;

    if (insideTry) {
      for (const match of line.matchAll(/\brequire\(\s*(['"])([^'"\n]+)\1\s*\)/g)) {
        guarded.add(match[2]);
      }
    }

    for (const char of line) {
      if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
    }

    if (opensTry) exitDepths.push(depth - 1);
    while (exitDepths.length && depth <= exitDepths[exitDepths.length - 1]) exitDepths.pop();
  }

  return guarded;
}

/**
 * Every module reachable from an entrypoint by following relative requires.
 *
 * A repo-wide sweep is the wrong unit for a boot check: `models/` holds a
 * handful of legacy Mongoose schemas that nothing imports, and failing on
 * those says nothing about whether the server starts. What matters is the
 * transitive closure of `server.js`, because that is exactly the set of
 * modules Node will load before it binds a port.
 *
 * Only relative specifiers are traversed. Package specifiers terminate the
 * walk - their internals are not ours to police.
 */
function collectBootReachableFiles(entry = 'server.js', root = BACKEND_ROOT) {
  const seen = new Set();
  const queue = [entry];

  while (queue.length) {
    const relativePath = queue.shift();
    if (seen.has(relativePath)) continue;

    const absolute = path.join(root, relativePath);
    if (!fs.existsSync(absolute)) continue;
    seen.add(relativePath);

    let source;
    try {
      source = fs.readFileSync(absolute, 'utf8');
    } catch {
      continue;
    }

    for (const specifier of requiredSpecifiers(source)) {
      if (!specifier.startsWith('.')) continue;

      let resolved;
      try {
        resolved = require.resolve(specifier, { paths: [path.dirname(absolute)] });
      } catch {
        continue; // Reported by findBrokenRelativeRequires, not swallowed here.
      }

      if (resolved.includes(`${path.sep}node_modules${path.sep}`)) continue;
      const next = path.relative(root, resolved).replace(/\\/g, '/');
      if (!next.startsWith('..') && !seen.has(next)) queue.push(next);
    }
  }

  return [...seen].sort();
}


/**
 * Relative `require()` targets that do not resolve.
 *
 * Deterministic regardless of what is installed, so it holds equally on a
 * developer machine with a stale node_modules and in CI after `npm ci`. This
 * is the shape a deleted or renamed module leaves behind.
 */
function findBrokenRelativeRequires(files, root = BACKEND_ROOT) {
  return files
    .map((file) => {
      const guarded = guardedSpecifiers(fs.readFileSync(path.join(root, file), 'utf8'));

      return {
        file,
        unresolvable: findUnresolvableRequires(file, root).filter(
          (entry) => entry.specifier.startsWith('.') && !guarded.has(entry.specifier)
        ),
      };
    })
    .filter((entry) => entry.unresolvable.length > 0);
}

/**
 * Packages this stack has no runtime for, mapped to why.
 *
 * config/db.js builds a Sequelize instance and a pg pool, and there is no
 * `mongoose.connect()` call anywhere in the repository. A boot-path module
 * that requires mongoose therefore either fails to load - which is what
 * models/DoubtSessionModel.js did, taking the whole API down - or loads and
 * then buffers every query until Mongoose's timeout fires.
 */
const FORBIDDEN_BOOT_PACKAGES = {
  mongoose: 'this backend is Postgres-only; use a Sequelize model in models/',
};

/** Boot-reachable modules that pull in a package the stack cannot serve. */
function findForbiddenBootPackages(files, root = BACKEND_ROOT) {
  const offenders = [];

  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const specifiers = requiredSpecifiers(source);

    for (const [pkg, reason] of Object.entries(FORBIDDEN_BOOT_PACKAGES)) {
      if (specifiers.includes(pkg)) offenders.push({ file, package: pkg, reason });
    }
  }

  return offenders;
}

module.exports = {
  BACKEND_ROOT,
  SOURCE_DIRS,
  ROOT_FILES,
  boundIdentifiers,
  findUnmountableRouters,
  collectSourceFiles,
  parseFile,
  findUnparseableFiles,
  findDuplicateDeclarations,
  findUnboundRouterIdentifiers,
  stripComments,
  requiredSpecifiers,
  isBuiltinModule,
  findUnresolvableRequires,
  findModulesWithUnresolvableRequires,
  collectBootReachableFiles,
  guardedSpecifiers,
  findBrokenRelativeRequires,
  findForbiddenBootPackages,
  FORBIDDEN_BOOT_PACKAGES,
};
