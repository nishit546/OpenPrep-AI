import { describe, it, expect } from 'vitest';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '..', '..');

/**
 * Catches a merge that was "resolved" by deleting the conflict markers instead
 * of choosing a side.
 *
 * `matchmakingService.js`, `matchmakerDaemon.js` and their two test files all
 * reached main this way. The `<<<<<<<`, `=======` and `>>>>>>>` lines were
 * removed, but the branch names those lines carried were left behind as bare
 * source lines, and both sides of every conflict were kept:
 *
 *    feat/real-time-matchmaker-1794
 *   const redis = require('../config/redis');
 *
 *   const redisService = require('./redisService');
 *   const logger = require('../utils/logger');
 *    main
 *
 * A plain `grep '<<<<<<<'` — which is what most conflict-marker gates check,
 * and what a reviewer scans for — finds nothing here. The residue is a bare
 * identifier line, which parses as an expression statement, so the file gets
 * some distance in before failing on whatever the duplicated side breaks: a
 * stranded JSDoc block, a redeclared binding, or in the daemon's case a second
 * `module.exports` with an entire implementation spliced in front of it.
 */
const SOURCE_DIRS = [
  'config',
  'controllers',
  'jobs',
  'middleware',
  'models',
  'routes',
  'services',
  'sockets',
  'tests',
  'utils',
  'workers',
];

const SKIP_DIRS = new Set(['node_modules', 'coverage', 'uploads', '.git']);

function walk(dir, collected = []) {
  const full = path.join(BACKEND_ROOT, dir);
  if (!fs.existsSync(full)) return collected;

  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;

    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(relative, collected);
    } else if (entry.name.endsWith('.js')) {
      collected.push(relative);
    }
  }

  return collected;
}

const SOURCE_FILES = SOURCE_DIRS.flatMap((dir) => walk(dir)).concat('server.js');

const read = (file) => fs.readFileSync(path.join(BACKEND_ROOT, file), 'utf8');

/** Conflict markers proper, at the start of a line as git writes them. */
const CONFLICT_MARKER = /^(?:<{7}|={7}|>{7})(?:\s|$)/;

/**
 * A branch label sitting alone on a line, indented by exactly the one space
 * that separated it from the marker that used to prefix it.
 *
 * Deliberately narrow: it wants `main`, `master`, or a `type/slug` branch name,
 * nothing else. A wider pattern would fire on ordinary indented identifiers.
 */
const STRIPPED_LABEL =
  /^ (?:main|master|HEAD|(?:feat|feature|fix|hotfix|chore|refactor|docs|test)\/[\w.\-/]+)\s*$/;

/** Lines of a file that are inside a block comment or a template literal. */
function quotedLineNumbers(source) {
  const quoted = new Set();
  const lines = source.split('\n');

  let inBlockComment = false;
  let inTemplate = false;

  lines.forEach((line, index) => {
    if (inBlockComment || inTemplate) quoted.add(index + 1);

    for (let i = 0; i < line.length; i += 1) {
      const pair = line.slice(i, i + 2);

      if (!inTemplate && !inBlockComment && pair === '/*') {
        inBlockComment = true;
        quoted.add(index + 1);
        i += 1;
      } else if (inBlockComment && pair === '*/') {
        inBlockComment = false;
        i += 1;
      } else if (!inBlockComment && line[i] === '`') {
        inTemplate = !inTemplate;
        quoted.add(index + 1);
      }
    }
  });

  return quoted;
}

/** Merge residue in one file, as `path:line: text` strings. */
function residueIn(file) {
  const source = read(file);
  const quoted = quotedLineNumbers(source);

  return source
    .split('\n')
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ number }) => !quoted.has(number))
    .filter(({ line }) => CONFLICT_MARKER.test(line) || STRIPPED_LABEL.test(line))
    .map(({ line, number }) => `${file}:${number}: ${line}`);
}

describe('the merge-residue scan covers the tree', () => {
  it('walks a substantial number of source files', () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(300);
  });

  it('includes the files this gate was written for', () => {
    expect(SOURCE_FILES).toContain(path.join('services', 'matchmakingService.js'));
    expect(SOURCE_FILES).toContain(path.join('workers', 'matchmakerDaemon.js'));
  });

  it('includes server.js', () => {
    expect(SOURCE_FILES).toContain('server.js');
  });
});

describe('the patterns match what git actually leaves behind', () => {
  it('matches every conflict marker git writes', () => {
    for (const marker of ['<<<<<<< HEAD', '=======', '>>>>>>> feat/thing', '<<<<<<<']) {
      expect(CONFLICT_MARKER.test(marker), marker).toBe(true);
    }
  });

  it('does not match ordinary source that starts with those characters', () => {
    for (const line of ['<div>', '  a === b', '>>> not a marker', 'const x = a >= b;']) {
      expect(CONFLICT_MARKER.test(line), line).toBe(false);
    }
  });

  it('matches the labels a stripped marker leaves', () => {
    for (const label of [' main', ' master', ' feat/real-time-matchmaker-1794', ' fix/2011-x']) {
      expect(STRIPPED_LABEL.test(label), label).toBe(true);
    }
  });

  it('does not match ordinary indented code', () => {
    for (const line of [' const main = 1;', '  main();', ' return main;', 'main', '   main']) {
      expect(STRIPPED_LABEL.test(line), line).toBe(false);
    }
  });
});

describe('no source file carries merge residue', () => {
  it('finds no conflict markers or stripped branch labels', () => {
    const residue = SOURCE_FILES.flatMap(residueIn);

    expect(residue).toEqual([]);
  });

  it.each(['services/matchmakingService.js', 'workers/matchmakerDaemon.js'])(
    '%s is clean',
    (file) => {
      expect(residueIn(file)).toEqual([]);
    }
  );

  it('leaves no file with two module.exports assignments', () => {
    // The daemon's merge spliced a whole implementation between two of them.
    const doubled = SOURCE_FILES.filter((file) => {
      const source = read(file);
      return [...source.matchAll(/^module\.exports\s*=/gm)].length > 1;
    });

    expect(doubled).toEqual([]);
  });
});

describe('the matchmaking queue has one writer and one reader', () => {
  it('defines the queue key once', () => {
    // Both sides of the merge declared `matchmaking:queue` independently and
    // then drifted onto incompatible member encodings — one a JSON blob
    // carrying joinTime, the other a bare userId with the timestamp in a
    // sibling key. The daemon was reading members the service never wrote.
    const declarations = SOURCE_FILES.filter((file) => !file.startsWith('tests')).filter((file) =>
      /const QUEUE_KEY = 'matchmaking:queue'/.test(read(file))
    );

    expect(declarations).toEqual([path.join('services', 'matchmakingService.js')]);
  });

  it('has no module hardcoding the queue key outside the service', () => {
    const hardcoded = SOURCE_FILES.filter(
      (file) => file !== path.join('services', 'matchmakingService.js')
    )
      .filter((file) => !file.startsWith('tests'))
      .filter((file) => /'matchmaking:queue'/.test(read(file)));

    expect(hardcoded).toEqual([]);
  });
});
