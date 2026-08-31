# The model registry

`backend/models/index.js` is the single place where every Sequelize model is
imported, associated and re-exported. Everything else in the backend reaches
models through it:

```js
const db = require('../models');          // namespace
const { Quiz, User } = require('../models'); // destructured
```

Both forms resolve to the same objects, defined against the one Sequelize
instance exported from `backend/config/db.js`.

## Why this file needs its own rules

A mistake in the registry does not fail where it is written. It fails at load,
or much later, from a stack that points somewhere else entirely:

| Mistake | What you actually see |
| --- | --- |
| Invoking a model that is already defined | `TypeError: Class constructor model cannot be invoked without 'new'` thrown from `models/index.js` while it loads. `require('../models')` throws, so **every** vitest file in the backend collects zero tests and the run reports "no tests" instead of a failure. |
| Not invoking a factory | A bare function sits in the registry. The first query throws `findAll is not a function` from inside whichever controller touched it first. |
| Importing a `{ Model, initModel }` pair without calling `initModel` | An uninitialised `Model` subclass with no attributes. Sequelize only complains on the first query. |
| Associating or exporting a name with no `require` | `ReferenceError: X is not defined` while the file is still loading, which takes the backend down at boot. |

All four were live in this file at the same time, which is what
`scripts/check-model-registry.js` and
`tests/integrity/modelRegistryShapes.unit.test.js` now guard against.

## The three export shapes

Model files under `backend/models` do not all export the same thing. Each shape
has exactly one correct import.

### instance

The file calls `sequelize.define(...)` at load and exports the model.

```js
// models/Folder.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Folder = sequelize.define('Folder', { /* ... */ });

module.exports = Folder;
```

Import it **without** invoking it:

```js
const Folder = require('./Folder');
```

### factory

The file exports a function that takes the instance and returns the model.

```js
// models/AIUsageLog.js
module.exports = (sequelize, DataTypes) => {
  const AIUsageLog = sequelize.define('AIUsageLog', { /* ... */ });
  return AIUsageLog;
};
```

Import it **with** the instance and `DataTypes`:

```js
const AIUsageLog = require('./AIUsageLog')(sequelize, DataTypes);
```

### pair

The file defines a `Model` subclass and exports it alongside an `init`
function. The class is not usable until `init` has run.

```js
// models/Bounty.js
const { DataTypes, Model } = require('sequelize');

class Bounty extends Model {}

function initBounty(sequelize) {
  Bounty.init({ /* ... */ }, { sequelize, modelName: 'Bounty' });
}

module.exports = { Bounty, initBounty };
```

Destructure it, then call the init in the block below the imports:

```js
const { Bounty, initBounty } = require('./Bounty');
// ...
initBounty(sequelize);
```

Nothing else in the tree calls these init functions, so if the registry does
not, no one does.

## Adding a model

1. Write the model file in whichever shape fits. Prefer **instance** for a new
   model — it needs no wiring beyond the import.
2. Add the import to the matching group in `models/index.js`. The groups are
   alphabetical; keep them that way.
3. If it is a pair, add `initYourModel(sequelize);` to the init block.
4. Wire any associations in the association block below.
5. Add the name to the `module.exports` object, **one per line**. The gates
   parse that block line by line, so a name folded onto a shared line is not
   seen as exported.
6. Run the checker:

   ```bash
   cd backend && npm run check:models
   ```

A model file that is not in the registry is not an error. Sixty-odd exist today
and are imported directly by the one service that uses them. It only becomes a
problem when something reads the model off the registry instead — which the
consumer check below catches.

## What the checker verifies

`backend/scripts/check-model-registry.js` reads `models/index.js` as text. It
needs no database and does not load the models, so it can gate a pull request
before anything tries to boot:

- every import matches the shape of the file it names;
- every `{ Model, initModel }` pair is destructured and its init is called;
- every init called is one that was imported;
- every model used in an association is bound;
- every name in `module.exports` is bound;
- every model imported is also exported;
- no model file is required twice;
- every model a consumer dereferences off the registry is exported by it;
- the instance and the `Sequelize` namespace are both exported, and are
  distinct — `db.Sequelize.Op` is how several services build operators.

Run it directly for a report:

```bash
cd backend
node scripts/check-model-registry.js
```

The same audit runs as a test, so it fails a normal `npm test`:

```bash
cd backend && npm run test:integrity
```

`tests/integrity/modelRegistryShapes.unit.test.js` additionally seeds each
defect into a temporary copy of the registry and asserts the audit reports it,
so the gate cannot quietly rot into a check that matches nothing.

## Related gates

These predate this document and cover neighbouring ground:

- `tests/integrity/modelFactoryShape.unit.test.js` — registry is a registry, not
  a generated scaffold.
- `tests/integrity/modelRegistryRefs.unit.test.js` — bound, associated and
  exported names line up.
- `tests/integrity/registryConsumers.unit.test.js` — the ~60 modules that read
  models off the registry all resolve.
- `tests/integrity/modelWiring.unit.test.js` — every model file loads, and none
  imports `config/database` (the sequelize-cli config) in place of the
  instance.
