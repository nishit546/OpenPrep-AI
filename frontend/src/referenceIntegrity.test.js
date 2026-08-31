import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, extname, resolve } from 'node:path';

/**
 * Catches components and modules that are *referenced* but never *bound*.
 *
 * `sourceIntegrity.test.js` next door checks that every file parses. These
 * defects all parse perfectly — they are free identifiers and unresolvable
 * specifiers, which JavaScript only complains about when the line actually
 * runs. So they reach production as a blank screen with a ReferenceError in
 * the console, or as a build that fails on a module nobody noticed was
 * missing.
 *
 * What was live in main when this file was written:
 *
 *   - `src/main.jsx` rendered <PomodoroProvider> and <SessionTimerProvider>
 *     with no import. That is the application entry point, so the very first
 *     render threw and **the entire app was a white screen**.
 *   - `App.jsx` routed to thirteen components it never imported — CollabNote,
 *     StudySquadDashboard, StreakDashboard, RevisionScheduler and nine more.
 *     Every one of those routes threw on navigation.
 *   - Login, Register, Dashboard and Flashcards each rendered an icon or a
 *     component they never imported, so four of the most-visited pages in the
 *     app crashed on render.
 *   - `services/api.js` was missing five exports that PomodoroWidget and
 *     TwoWayCalendarSyncManager import, which failed the production build.
 *   - Five pages imported `react-helmet-async` and two imported a
 *     `components/common/Navbar` — neither exists.
 *
 * Nothing caught any of it, because nothing checked.
 */

const SRC_DIR = join(process.cwd(), 'src');
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx']);
const IGNORED_DIRECTORIES = new Set(['node_modules', '__snapshots__', 'assets']);

/** Extensions tried when resolving a relative import, in order. */
const RESOLUTION_ORDER = ['', '.js', '.jsx', '/index.js', '/index.jsx'];

/**
 * Names React provides that are never imported as components, plus the
 * lowercase namespaces that only ever appear as `<x.y>`.
 */
const AMBIENT = new Set(['Fragment', 'Suspense', 'StrictMode', 'Profiler']);

/** Non-JS specifiers a bundler resolves that this check should not police. */
const NON_MODULE_IMPORT = /\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|json|woff2?)$/;

function collectSourceFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRECTORIES.has(entry)) continue;

    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      collectSourceFiles(fullPath, found);
    } else if (SOURCE_EXTENSIONS.has(extname(entry))) {
      found.push(fullPath);
    }
  }
  return found;
}

const sourceFiles = collectSourceFiles(SRC_DIR);

/**
 * Source that ships, without the tests.
 *
 * The module-resolution checks below run against this rather than the whole
 * tree: a test file legitimately names paths that do not resolve — `vi.mock`
 * specifiers, and the seeded fixtures at the bottom of this file.
 */
const shippedFiles = sourceFiles.filter((file) => !/\.test\.jsx?$/.test(file));

const asRepoPath = (file) => `src/${relative(SRC_DIR, file)}`;
const read = (file) => readFileSync(file, 'utf8');

const blank = (match) => match.replace(/[^\n]/g, ' ');

/**
 * Blanks out comments only, keeping string literals intact.
 *
 * This is the view used to read imports and collect bindings, both of which
 * are anchored on the quotes in `from '<spec>'`. Blanking those quotes is what
 * a first draft of this file did, and it silently stopped matching every
 * named import in the tree.
 */
function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead) => lead + blank(m.slice(lead.length)));
}

/**
 * Blanks out comments, strings and regex literals.
 *
 * This is the view used to find JSX. `<Route` inside a JSDoc block and
 * `{Array<Object>}` in a `@param` both look exactly like JSX to a regex.
 * Replacing with spaces rather than deleting keeps every offset intact, so
 * anything reported still points at the right place.
 */
function stripNonCode(code) {
  return stripComments(code)
    .replace(/`(?:\\.|[^`\\])*`/g, blank)
    .replace(/'(?:\\.|[^'\\\n])*'/g, blank)
    .replace(/"(?:\\.|[^"\\\n])*"/g, blank)
    .replace(/\/(?![/*])(?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n])+\/[gimsuy]*/g, blank);
}

/**
 * Every identifier a file binds, by any means.
 *
 * Deliberately generous: this gate exists to catch a name bound *nowhere*, so
 * over-collecting costs nothing while a missed binding form is a false
 * positive that gets the whole check disabled.
 */
function boundIdentifiers(code) {
  const bound = new Set(AMBIENT);
  const add = (name) => {
    // `Tooltip as LineTooltip`, `{ a: renamed }`, `...rest` and `x = default`
    // all bind the last identifier in the fragment.
    const cleaned = String(name)
      .replace(/[{}[\]]/g, '')
      .replace(/\.{3}/, '')
      .split('=')[0]
      .split(/\s+as\s+/)
      .pop()
      .split(':')
      .pop()
      .trim();
    if (/^[A-Za-z_$][\w$]*$/.test(cleaned)) bound.add(cleaned);
  };

  // import X from, import X, { Y } from, import * as X from
  for (const m of code.matchAll(/import\s+([A-Za-z_$][\w$]*)\s*(?:,|from)/g)) add(m[1]);
  for (const m of code.matchAll(/import\s*\*\s*as\s+([A-Za-z_$][\w$]*)/g)) add(m[1]);
  // Named imports, in both `import { Y }` and `import X, { Y }` forms.
  for (const m of code.matchAll(/\{([^{}]*)\}\s*from\s*['"]/g)) m[1].split(',').forEach(add);

  // Declarations at any depth — a component defined inside another component
  // is still bound where it is used.
  for (const m of code.matchAll(/(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) add(m[1]);

  // Destructuring, including props and hook returns.
  for (const m of code.matchAll(/\{([^{}]*)\}\s*=/g)) m[1].split(',').forEach(add);
  for (const m of code.matchAll(/\[([^[\]]*)\]\s*=/g)) m[1].split(',').forEach(add);

  // Arrow and function parameters: (a, b) =>, a =>, function f(a, b)
  for (const m of code.matchAll(/\(([^()]*)\)\s*=>/g)) m[1].split(',').forEach(add);
  for (const m of code.matchAll(/(?:^|[^\w.$])([A-Za-z_$][\w$]*)\s*=>/g)) add(m[1]);
  for (const m of code.matchAll(/function\s*[A-Za-z_$\w]*\s*\(([^()]*)\)/g)) m[1].split(',').forEach(add);

  return bound;
}

/** Component identifiers used in JSX, including the `x` in `<x.y>`. */
function jsxReferences(code) {
  const used = new Set();

  for (const m of code.matchAll(/<([A-Z][A-Za-z0-9_$]*)/g)) used.add(m[1]);
  for (const m of code.matchAll(/<([a-z][A-Za-z0-9_$]*)\.[A-Za-z]/g)) used.add(m[1]);

  return used;
}

/**
 * Capitalised identifiers handed to a JSX attribute as a bare value —
 * `icon={Headphones}`, the way an icon component is passed to a tile.
 *
 * These are not JSX elements, so the scan above does not see them, and
 * `Headphones` sat unbound in Dashboard.jsx behind `Box`: fixing the first
 * ReferenceError only revealed the second.
 */
function attributeReferences(code) {
  const used = new Set();

  for (const m of code.matchAll(/[A-Za-z][\w-]*=\{\s*([A-Z][A-Za-z0-9_$]*)\s*\}/g)) {
    used.add(m[1]);
  }

  return used;
}

/** Every `from '<spec>'` in the file. */
function importSpecifiers(code) {
  return [...code.matchAll(/from\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

/** Resolves a relative specifier against the importing file, or null. */
function resolveRelative(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);

  for (const suffix of RESOLUTION_ORDER) {
    const candidate = base + suffix;
    if (existsSync(candidate) && (suffix !== '' || statSync(candidate).isFile())) {
      return candidate;
    }
  }

  return null;
}

/**
 * Files whose unresolvable imports belong to another open pull request.
 *
 * Temporary by construction: an assertion below fails on an entry whose file
 * no longer has an unresolvable import, so the list has to be emptied rather
 * than quietly outliving its reason.
 */
const unresolvedAllowlist = (() => {
  const raw = JSON.parse(readFileSync(join(SRC_DIR, 'reference-integrity-allowlist.json'), 'utf8'));
  return { raw, files: new Set(raw.unresolvedImports || []) };
})();

const declaredDependencies = (() => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));

  return new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ]);
})();

/** `@scope/name/sub` and `name/sub` both resolve to their package name. */
function packageNameOf(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

describe('reference integrity', () => {
  it('finds the source tree', () => {
    // A collector that silently returned nothing would make every assertion
    // below vacuously true.
    expect(sourceFiles.length).toBeGreaterThan(50);
  });

  it('renders no component it has not bound', () => {
    const offenders = [];

    for (const file of sourceFiles) {
      const bound = boundIdentifiers(stripComments(read(file)));
      const stripped = stripNonCode(read(file));
      const referenced = new Set([
        ...jsxReferences(stripped),
        ...attributeReferences(stripped),
      ]);
      const missing = [...referenced].filter((name) => !bound.has(name));

      if (missing.length) offenders.push(`${asRepoPath(file)}: ${missing.join(', ')}`);
    }

    expect(offenders).toEqual([]);
  });

  it('imports only relative modules that exist', () => {
    const offenders = [];

    for (const file of shippedFiles) {
      for (const specifier of importSpecifiers(stripComments(read(file)))) {
        if (!specifier.startsWith('.')) continue;
        if (NON_MODULE_IMPORT.test(specifier)) continue;
        if (!resolveRelative(file, specifier)) {
          if (unresolvedAllowlist.files.has(asRepoPath(file))) continue;
          offenders.push(`${asRepoPath(file)} imports ${specifier}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('imports only packages listed in package.json', () => {
    // @mui/material and react-helmet-async were both imported by pages that
    // shipped, and neither was ever a dependency. The first failed the
    // production build; the second only failed once its page was routed to.
    const offenders = [];

    for (const file of shippedFiles) {
      for (const specifier of importSpecifiers(stripComments(read(file)))) {
        if (specifier.startsWith('.') || specifier.startsWith('/')) continue;
        if (NON_MODULE_IMPORT.test(specifier)) continue;

        const name = packageNameOf(specifier);
        if (name.startsWith('node:')) continue;
        if (!declaredDependencies.has(name)) {
          if (unresolvedAllowlist.files.has(asRepoPath(file))) continue;
          offenders.push(`${asRepoPath(file)} imports ${name}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('imports only names a local module actually exports', () => {
    // The five helpers PomodoroWidget and TwoWayCalendarSyncManager import
    // from services/api.js did not exist, which is a build failure rather than
    // a runtime one — but only once the importing file is reachable.
    const offenders = [];

    for (const file of shippedFiles) {
      const code = stripComments(read(file));

      for (const match of code.matchAll(/\{([^{}]*)\}\s*from\s*['"](\.[^'"]+)['"]/g)) {
        if (NON_MODULE_IMPORT.test(match[2])) continue;

        const target = resolveRelative(file, match[2]);
        if (!target) continue; // Reported by the previous check.

        const targetCode = read(target);
        const names = match[1]
          .split(',')
          .map((part) => part.split(/\s+as\s+/)[0].trim())
          // `export { default as X } from './Y'` re-exports the default, which
          // is not a named export of the target and never needs one.
          .filter((name) => name !== 'default')
          .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));

        for (const name of names) {
          const exported =
            // export const X / export function X / export class X
            new RegExp(`export\\s+(?:const|let|var|function|class|async function)\\s+${name}\\b`).test(targetCode) ||
            // export { X } and Redux Toolkit's export const { X } = slice.actions
            new RegExp(`export\\s+(?:(?:const|let|var)\\s+)?\\{[^}]*\\b${name}\\b`).test(targetCode) ||
            // export { internal as X }
            new RegExp(`\\bas\\s+${name}\\b`).test(targetCode) ||
            /export\s+\*/.test(targetCode);

          if (!exported) {
            offenders.push(`${asRepoPath(file)} imports { ${name} } from ${match[2]}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('the unresolved-import allowlist', () => {
  const unresolvedIn = (file) => {
    const specifiers = importSpecifiers(stripComments(read(file)));

    return specifiers.filter((specifier) => {
      if (NON_MODULE_IMPORT.test(specifier)) return false;
      if (specifier.startsWith('.')) return !resolveRelative(file, specifier);
      if (specifier.startsWith('/')) return false;
      const name = packageNameOf(specifier);
      return !name.startsWith('node:') && !declaredDependencies.has(name);
    });
  };

  it('names a file that exists for every entry', () => {
    const missing = [...unresolvedAllowlist.files].filter(
      (repoPath) => !existsSync(join(SRC_DIR, repoPath.replace(/^src\//, '')))
    );

    expect(missing).toEqual([]);
  });

  it('holds no entry that has since been fixed', () => {
    // The whole point of the list is that it empties. An entry whose imports
    // now resolve has to be deleted, not left as a standing exemption.
    const stale = [...unresolvedAllowlist.files].filter((repoPath) => {
      const file = join(SRC_DIR, repoPath.replace(/^src\//, ''));
      return unresolvedIn(file).length === 0;
    });

    expect(stale).toEqual([]);
  });

  it('says why each entry is listed', () => {
    expect(Array.isArray(unresolvedAllowlist.raw._comment)).toBe(true);
    expect(unresolvedAllowlist.raw._comment.join(' ')).toMatch(/temporary/i);
  });

  it('is small — this is an exception, not a category', () => {
    expect(unresolvedAllowlist.files.size).toBeLessThanOrEqual(3);
  });
});

describe('the entry point and the router bind what they render', () => {
  // Called out separately because these two files break *everything*: an
  // unbound name in main.jsx is a white screen for the whole app, and one in
  // App.jsx is a white screen for a route.
  const entryPoints = ['main.jsx', 'App.jsx'];

  it.each(entryPoints)('%s renders no unbound component', (name) => {
    const source = read(join(SRC_DIR, name));
    const bound = boundIdentifiers(stripComments(source));
    const missing = [...jsxReferences(stripNonCode(source))].filter(
      (component) => !bound.has(component)
    );

    expect(missing).toEqual([]);
  });

  it('main.jsx binds both context providers it wraps the app in', () => {
    const code = read(join(SRC_DIR, 'main.jsx'));

    expect(code).toMatch(/import\s*\{[^}]*\bPomodoroProvider\b[^}]*\}\s*from/);
    expect(code).toMatch(/import\s*\{[^}]*\bSessionTimerProvider\b[^}]*\}\s*from/);
  });

  it('App.jsx binds every route element it renders', () => {
    const source = read(join(SRC_DIR, 'App.jsx'));
    const bound = boundIdentifiers(stripComments(source));

    const routeElements = [
      ...stripNonCode(source).matchAll(/element=\{<([A-Z][A-Za-z0-9_$]*)/g),
    ].map((m) => m[1]);

    // Most routes wrap their page in <ProtectedRoute>, so this captures the
    // wrapper for those; the general JSX check above covers what is inside.
    expect(routeElements.length).toBeGreaterThan(10);
    expect(routeElements.filter((name) => !bound.has(name))).toEqual([]);
  });
});

describe('the checks detect what they exist to catch', () => {
  // Without these the gate can rot into a regex that matches nothing and stays
  // green over a broken tree, which is how the originals survived.
  const bindingsOf = (code) => boundIdentifiers(stripComments(code));
  const unboundIn = (code) => {
    const bound = boundIdentifiers(stripComments(code));
    const stripped = stripNonCode(code);
    return [...jsxReferences(stripped), ...attributeReferences(stripped)].filter(
      (name) => !bound.has(name)
    );
  };

  it('reports a component rendered with no import', () => {
    expect(unboundIn('const A = () => <Missing />;')).toEqual(['Missing']);
  });

  it('reports an icon passed as an attribute value with no import', () => {
    // `icon={Headphones}` in Dashboard.jsx — not a JSX element, so the element
    // scan alone misses it.
    expect(unboundIn('const A = () => <Tile icon={Headphones} />;')).toContain('Headphones');
  });

  it('accepts an imported icon passed as an attribute value', () => {
    expect(
      unboundIn(
        "import { Headphones } from 'lucide-react';\nimport Tile from './Tile';\nconst A = () => <Tile icon={Headphones} />;"
      )
    ).toEqual([]);
  });

  it('reports a namespaced component with no import', () => {
    // `motion` in Register.jsx: <motion.div> with no framer-motion import.
    expect(unboundIn('const A = () => <motion.div />;')).toEqual(['motion']);
  });

  it('accepts a default import', () => {
    expect(unboundIn("import Thing from './Thing';\nconst A = () => <Thing />;")).toEqual([]);
  });

  it('accepts a named import', () => {
    expect(unboundIn("import { Thing } from './x';\nconst A = () => <Thing />;")).toEqual([]);
  });

  it('accepts a default and named import on one line', () => {
    // `import Card, { StarRating } from './ResourceCard'` — the shape that
    // makes a naive scan report a false positive.
    expect(
      unboundIn("import Card, { StarRating } from './x';\nconst A = () => <StarRating />;")
    ).toEqual([]);
  });

  it('accepts a component defined further down the same file', () => {
    expect(unboundIn('const A = () => <Later />;\nfunction Later() { return null; }')).toEqual([]);
  });

  it('accepts a lowercase name bound as a map parameter', () => {
    // `items.map((stat) => <stat.icon />)` is not an unbound namespace.
    expect(unboundIn('const A = () => items.map((stat) => <stat.icon />);')).toEqual([]);
  });

  it('accepts a lowercase name bound as a bare arrow parameter', () => {
    expect(unboundIn('const A = () => items.map(tab => <tab.icon />);')).toEqual([]);
  });

  it('accepts a destructured prop', () => {
    expect(unboundIn('const A = ({ Icon }) => <Icon />;')).toEqual([]);
  });

  it('ignores JSX-shaped text inside a comment', () => {
    // `{Array<Object>}` in a JSDoc @param, and `<Route` in prose.
    expect(unboundIn('/** @param {Array<Object>} data — see <Route> */\nconst A = () => null;')).toEqual([]);
  });

  it('ignores JSX-shaped text inside a regex literal', () => {
    expect(unboundIn('const p = /<Route\\b/g;\nconst A = () => null;')).toEqual([]);
  });

  it('ignores JSX-shaped text inside a string', () => {
    expect(unboundIn("const s = '<Widget />';\nconst A = () => null;")).toEqual([]);
  });

  it('keeps line numbers intact when it strips', () => {
    const stripped = stripNonCode('const a = 1;\n// <Missing />\nconst b = 2;');

    expect(stripped.split('\n')).toHaveLength(3);
  });

  it('resolves a relative import to a real file', () => {
    expect(resolveRelative(join(SRC_DIR, 'App.jsx'), './services/api')).not.toBeNull();
  });

  it('reports a relative import with nothing behind it', () => {
    // `../components/common/Navbar`, imported by two pages, never existed.
    expect(resolveRelative(join(SRC_DIR, 'App.jsx'), './components/common/Navbar')).toBeNull();
  });

  it('reduces a scoped package specifier to its package name', () => {
    expect(packageNameOf('@mui/material')).toBe('@mui/material');
    expect(packageNameOf('react-helmet-async')).toBe('react-helmet-async');
    expect(packageNameOf('lucide-react/icons/box')).toBe('lucide-react');
  });

  it('knows which packages are declared', () => {
    expect(declaredDependencies.has('react')).toBe(true);
    expect(declaredDependencies.has('lucide-react')).toBe(true);
    expect(declaredDependencies.has('@mui/material')).toBe(false);
    expect(declaredDependencies.has('react-helmet-async')).toBe(false);
  });

  it('collects a binding from every form it supports', () => {
    const bound = bindingsOf(
      [
        "import Default from './a';",
        "import { Named } from './b';",
        "import Both, { AlsoNamed } from './c';",
        "import * as Namespace from './d';",
        'const declared = 1;',
        'function fn() {}',
        'class Klass {}',
        'const { destructured } = obj;',
        'const [element] = arr;',
        'const arrow = (param) => param;',
      ].join('\n')
    );

    for (const name of [
      'Default',
      'Named',
      'Both',
      'AlsoNamed',
      'Namespace',
      'declared',
      'fn',
      'Klass',
      'destructured',
      'element',
      'arrow',
      'param',
    ]) {
      expect(bound.has(name), `${name} was not collected`).toBe(true);
    }
  });
});
