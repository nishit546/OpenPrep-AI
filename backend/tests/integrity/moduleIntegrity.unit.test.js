import { describe, it, expect } from 'vitest';

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  BACKEND_ROOT,
  SOURCE_DIRS,
  collectSourceFiles,
  parseFile,
  findUnparseableFiles,
  findDuplicateDeclarations,
  findUnboundRouterIdentifiers,
  findUnmountableRouters,
  boundIdentifiers,
  requiredSpecifiers,
  isBuiltinModule,
  findUnresolvableRequires,
  collectBootReachableFiles,
  findBrokenRelativeRequires,
  findForbiddenBootPackages,
  guardedSpecifiers,
} = require('./moduleParser');

const BOOT_REACHABLE = collectBootReachableFiles();

const SOURCE_FILES = collectSourceFiles();

/** Writes a throwaway module and hands back its root and relative path. */
function withFixture(relativePath, source, assertion) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'openprep-integrity-'));
  const absolute = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, source);

  try {
    assertion(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe('backend module discovery', () => {
  it('finds modules to check', () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(100);
  });

  it('covers every boot-path source directory', () => {
    for (const dir of SOURCE_DIRS) {
      const covered = SOURCE_FILES.some((file) => file.startsWith(`${dir}/`));
      expect(covered, `no modules discovered under ${dir}/`).toBe(true);
    }
  });


  it('excludes test files from the boot-path sweep', () => {
    expect(SOURCE_FILES.filter((file) => /\.(test|spec)\.js$/.test(file))).toEqual([]);
  });

  it('includes the boot entrypoint itself', () => {
    // server.js sits outside every source directory but is the one module that
    // definitely runs at boot, and it hand-mounts around eighty routers.
    expect(SOURCE_FILES).toContain('server.js');
  });
});

describe('every router server.js mounts is bound', () => {
  it('reports no unmountable routers', () => {
    expect(findUnmountableRouters('server.js')).toEqual([]);
  });
});

describe('every backend module parses', () => {
  // The single check that would have caught four separate boot failures on
  // main at once. It runs without a database, Redis or a network, so it can
  // gate a pull request on its own.
  it('reports no unparseable modules', () => {
    const broken = findUnparseableFiles(SOURCE_FILES);
    const report = broken.map((entry) => `${entry.file}: ${entry.error}`).join('\n');

    expect(report).toBe('');
  });
});

describe('no module declares the same top-level name twice', () => {
  it('reports no duplicate declarations', () => {
    const offenders = SOURCE_FILES.map((file) => ({
      file,
      duplicates: findDuplicateDeclarations(file),
    })).filter((entry) => entry.duplicates.length > 0);

    const report = offenders
      .map((entry) => `${entry.file}: ${entry.duplicates.join(', ')}`)
      .join('\n');

    expect(report).toBe('');
  });
});

describe('router modules bind what they use', () => {
  it('reports no unbound express or router identifiers', () => {
    const offenders = SOURCE_FILES.map((file) => ({
      file,
      unbound: findUnboundRouterIdentifiers(file),
    })).filter((entry) => entry.unbound.length > 0);

    const report = offenders
      .map((entry) => `${entry.file}: ${entry.unbound.join(', ')}`)
      .join('\n');

    expect(report).toBe('');
  });
});

describe('the guard itself', () => {
  // A checker that cannot fail is worse than no checker, because it reads as
  // coverage. These pin that each check rejects the exact shape it exists for.

  it('rejects a module with an unterminated function', () => {
    withFixture(
      'controllers/broken.js',
      'exports.handler = async (req, res) => {\n  try {\n    res.json({});\n',
      (root) => {
        const result = parseFile('controllers/broken.js', root);
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/Unexpected end of input/);
      }
    );
  });

  it('rejects a module with a stray token after a comment block', () => {
    withFixture('services/broken.js', '/**\n * Doc.\n */.\nexports.value = 1;\n', (root) => {
      const result = parseFile('services/broken.js', root);
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Unexpected token/);
    });
  });

  it('rejects two router modules concatenated together', () => {
    const doubled = [
      "const express = require('express');",
      'const router = express.Router();',
      'module.exports = router;',
      '',
      "const express = require('express');",
      'const router = express.Router();',
      'module.exports = router;',
      '',
    ].join('\n');

    withFixture('routes/broken.js', doubled, (root) => {
      expect(parseFile('routes/broken.js', root).ok).toBe(false);
      expect(findDuplicateDeclarations('routes/broken.js', root)).toEqual(['express', 'router']);
    });
  });

  it('rejects a router that calls express.Router() without importing express', () => {
    const missingImport = [
      "const { protect } = require('../middleware/auth');",
      'const router = express.Router();',
      "router.get('/', protect, (req, res) => res.json({}));",
      'module.exports = router;',
      '',
    ].join('\n');

    withFixture('routes/broken.js', missingImport, (root) => {
      // This one is valid syntax; only the binding check catches it.
      expect(parseFile('routes/broken.js', root).ok).toBe(true);
      expect(findUnboundRouterIdentifiers('routes/broken.js', root)).toEqual(['express']);
    });
  });

  it('rejects a module that calls router methods without a router', () => {
    const missingRouter = [
      "const express = require('express');",
      "router.post('/thing', (req, res) => res.json({}));",
      '',
    ].join('\n');

    withFixture('routes/broken.js', missingRouter, (root) => {
      expect(findUnboundRouterIdentifiers('routes/broken.js', root)).toContain('router');
    });
  });

  it('accepts a well-formed router', () => {
    const healthy = [
      "const express = require('express');",
      "const { protect } = require('../middleware/auth');",
      'const router = express.Router();',
      'router.use(protect);',
      "router.get('/', (req, res) => res.json({}));",
      'module.exports = router;',
      '',
    ].join('\n');

    withFixture('routes/healthy.js', healthy, (root) => {
      expect(parseFile('routes/healthy.js', root).ok).toBe(true);
      expect(findDuplicateDeclarations('routes/healthy.js', root)).toEqual([]);
      expect(findUnboundRouterIdentifiers('routes/healthy.js', root)).toEqual([]);
    });
  });

  it('rejects a router mounted in server.js that was never required', () => {
    const missingRequire = [
      "const express = require('express');",
      "const authRoutes = require('./routes/authRoutes');",
      'const app = express();',
      "app.use('/api/auth', authRoutes);",
      "app.use('/api/session', sessionRoutes);",
      '',
    ].join('\n');

    withFixture('server.js', missingRequire, (root) => {
      // Valid syntax; it only fails when the process actually boots.
      expect(parseFile('server.js', root).ok).toBe(true);
      expect(findUnmountableRouters('server.js', root)).toEqual(['sessionRoutes']);
    });
  });

  it('counts destructured requires as bound', () => {
    const bound = boundIdentifiers(
      [
        "const express = require('express');",
        "const { protect, requireAdmin } = require('./middleware/auth');",
        "const { getSummary: summary } = require('./controllers/thing');",
        'function helper() {}',
      ].join('\n')
    );

    // A destructured import is a binding; treating it otherwise would make the
    // mount and router checks fire on healthy files.
    expect([...bound].sort()).toEqual(
      ['express', 'helper', 'protect', 'requireAdmin', 'summary'].sort()
    );
  });

  it('accepts a module written with ESM syntax', () => {
    // A few modules here use `export function`; vm.Script cannot compile those,
    // so the checker falls through to `node --check`. Without that fallback
    // every ESM module would be reported as broken.
    withFixture('utils/esm.js', 'export function value() {\n  return 1;\n}\n', (root) => {
      expect(parseFile('utils/esm.js', root).ok).toBe(true);
    });
  });
});

describe('every require in a boot-path module resolves', () => {
  // The check that was missing when models/DoubtSessionModel.js reached main
  // naming `mongoose` - a package listed in package.json, never installed, and
  // with no mongoose.connect() anywhere in a Postgres-only stack. The file
  // parsed, the router it fed was bound in server.js, and both existing
  // integrity checks passed. It failed only when the process booted.
  it('reaches the modules server.js actually loads', () => {
    expect(BOOT_REACHABLE).toContain('server.js');
    expect(BOOT_REACHABLE).toContain('models/index.js');
    expect(BOOT_REACHABLE).toContain('routes/doubtSessionRoutes.js');
    expect(BOOT_REACHABLE.length).toBeGreaterThan(100);
  });

  it('reports no broken relative requires on the boot path', () => {
    const offenders = findBrokenRelativeRequires(BOOT_REACHABLE);
    const report = offenders
      .map((entry) => `${entry.file}: ${entry.unresolvable.map((item) => item.specifier).join(', ')}`)
      .join('\n');

    expect(report).toBe('');
  });

  it('reports no boot-path module requiring a package this stack cannot serve', () => {
    // models/DoubtSessionModel.js required mongoose. There is no
    // mongoose.connect() anywhere and config/db.js is Sequelize over Postgres,
    // so server.js could not complete a single require pass.
    const offenders = findForbiddenBootPackages(BOOT_REACHABLE);
    const report = offenders
      .map((entry) => `${entry.file} requires ${entry.package} - ${entry.reason}`)
      .join('\n');

    expect(report).toBe('');
  });

  it('flags a boot-path module that reaches for mongoose', () => {
    withFixture('models/Legacy.js', "const mongoose = require('mongoose');\nmodule.exports = mongoose;\n", (root) => {
      const offenders = findForbiddenBootPackages(['models/Legacy.js'], root);
      expect(offenders).toHaveLength(1);
      expect(offenders[0].package).toBe('mongoose');
    });
  });

  it('flags a module that requires a package which is not installed', () => {
    withFixture('models/Ghost.js', "const ghost = require('definitely-not-installed-pkg');\nmodule.exports = ghost;\n", (root) => {
      // Parses cleanly - which is exactly why the syntax check missed it.
      expect(parseFile('models/Ghost.js', root).ok).toBe(true);

      const unresolvable = findUnresolvableRequires('models/Ghost.js', root);
      expect(unresolvable).toHaveLength(1);
      expect(unresolvable[0].specifier).toBe('definitely-not-installed-pkg');
      expect(unresolvable[0].reason).toBe('MODULE_NOT_FOUND');
    });
  });

  it('flags a relative require pointing at a file that does not exist', () => {
    withFixture('controllers/orphan.js', "const gone = require('../services/deletedService');\n", (root) => {
      const unresolvable = findUnresolvableRequires('controllers/orphan.js', root);
      expect(unresolvable.map((item) => item.specifier)).toEqual(['../services/deletedService']);
    });
  });

  it('resolves a relative require that does exist', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'openprep-integrity-'));
    try {
      fs.mkdirSync(path.join(root, 'controllers'), { recursive: true });
      fs.mkdirSync(path.join(root, 'services'), { recursive: true });
      fs.writeFileSync(path.join(root, 'services', 'realService.js'), 'module.exports = {};\n');
      fs.writeFileSync(
        path.join(root, 'controllers', 'ok.js'),
        "const real = require('../services/realService');\nmodule.exports = real;\n"
      );

      expect(findUnresolvableRequires('controllers/ok.js', root)).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not flag node builtins, with or without the node: prefix', () => {
    withFixture('utils/builtins.js', "const fs = require('fs');\nconst path = require('node:path');\nmodule.exports = { fs, path };\n", (root) => {
      expect(findUnresolvableRequires('utils/builtins.js', root)).toEqual([]);
    });

    expect(isBuiltinModule('crypto')).toBe(true);
    expect(isBuiltinModule('node:crypto')).toBe(true);
    expect(isBuiltinModule('mongoose')).toBe(false);
  });

  it('collects each literal require specifier once and skips computed ones', () => {
    const source = [
      "const a = require('express');",
      "const b = require('express');",
      "const c = require(\"../models\");",
      'const d = require(dynamicName);',
      'const e = require(`./${folder}/thing`);',
    ].join('\n');

    expect(requiredSpecifiers(source)).toEqual(['express', '../models']);
  });

  it('resolves the doubt session boot chain end to end', () => {
    // The specific regression: server.js mounts this router, so any
    // unresolvable require along the chain stops the process from booting.
    const chain = [
      'routes/doubtSessionRoutes.js',
      'controllers/doubtSolverController.js',
      'services/doubtSessionService.js',
      'models/DoubtSession.js',
      'models/DoubtSessionMessage.js',
    ];

    for (const file of chain) {
      expect(findUnresolvableRequires(file), `${file} has an unresolvable require`).toEqual([]);
    }
  });
});

describe('optional dependencies are told apart from broken ones', () => {
  const OPTIONAL_DEPENDENCY = [
    'let uploadFileToFirebase = null;',
    'try {',
    "  const firebaseService = require('../services/firebaseStorageService');",
    '  uploadFileToFirebase = firebaseService.uploadFileToFirebase;',
    '} catch (e) {',
    '  // Graceful fallback if firebase storage service is omitted or missing',
    '}',
    "const fs = require('fs');",
  ].join('\n');

  it('treats a require inside a try block as guarded', () => {
    const guarded = guardedSpecifiers(OPTIONAL_DEPENDENCY);

    expect(guarded.has('../services/firebaseStorageService')).toBe(true);
    expect(guarded.has('fs')).toBe(false);
  });

  it('does not report a guarded require as broken', () => {
    withFixture('controllers/optional.js', OPTIONAL_DEPENDENCY, (root) => {
      // The module it names really is absent, and the controller copes.
      expect(findUnresolvableRequires('controllers/optional.js', root).length).toBeGreaterThan(0);
      expect(findBrokenRelativeRequires(['controllers/optional.js'], root)).toEqual([]);
    });
  });

  it('still reports an unguarded require after a closed try block', () => {
    const source = [
      'try {',
      "  const optional = require('./optionalThing');",
      '} catch (e) {}',
      "const required = require('./missingThing');",
    ].join('\n');

    withFixture('controllers/mixed.js', source, (root) => {
      const broken = findBrokenRelativeRequires(['controllers/mixed.js'], root);
      expect(broken).toHaveLength(1);
      expect(broken[0].unresolvable.map((entry) => entry.specifier)).toEqual(['./missingThing']);
    });
  });

  it('handles nested try blocks without losing track of the depth', () => {
    const source = [
      'function boot() {',
      '  try {',
      '    try {',
      "      const inner = require('./inner');",
      '    } catch (e) {}',
      '  } catch (e) {}',
      '}',
      "const outer = require('./outer');",
    ].join('\n');

    const guarded = guardedSpecifiers(source);
    expect(guarded.has('./inner')).toBe(true);
    expect(guarded.has('./outer')).toBe(false);
  });
});
