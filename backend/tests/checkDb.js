const { sequelize } = require('../models');

async function checkDb() {
  try {
    const authPromise = sequelize.authenticate();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout')), 3000)
    );
    await Promise.race([authPromise, timeoutPromise]);
    // Close the connection so the script can exit cleanly
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.warn(`\n[WARN] Skipping integration tests: PostgreSQL database is unreachable (${err.message}).\n`);
    process.exit(1);
  }
}

checkDb();
