const fs = require('fs');
const path = require('path');
const { sequelize } = require('../models');

async function verifyMigrations() {
  try {
    let executedMigrations = new Set();
    try {
      const [records] = await sequelize.query('SELECT name FROM "SequelizeMeta"', { type: sequelize.QueryTypes.SELECT });
      if (Array.isArray(records)) {
        records.forEach(r => {
          if (r.name) executedMigrations.add(r.name);
        });
      }
    } catch (dbErr) {
      // Table SequelizeMeta might not exist yet if uninitialized
    }

    const migrationsDir = path.join(__dirname, '../migrations');
    if (!fs.existsSync(migrationsDir)) {
      return { status: 'SYNCED', pending: [] };
    }

    const localFiles = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.js') || file.endsWith('.sql'));
    const pendingMigrations = localFiles.filter(file => !executedMigrations.has(file));

    if (pendingMigrations.length > 0) {
      console.warn(`[DB WARNING] ${pendingMigrations.length} pending migrations found! System out of sync.`);
      return { status: 'OUT_OF_SYNC', pending: pendingMigrations };
    }

    console.log('[DB HEALTH] Database schema migration verification passed. 0 pending migrations.');
    return { status: 'SYNCED', pending: [] };
  } catch (error) {
    console.error('[DB ERROR] Failed to verify database migration alignment:', error);
    return { status: 'ERROR', error: error.message };
  }
}

module.exports = { verifyMigrations };
