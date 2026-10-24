'use strict';

/**
 * Adds Socratic engine state to VivaSessions: topic, depth (1-5), a text
 * transcript and per-answer rubric scores. No audio is stored.
 *
 * The VivaSessions table has historically been created by model sync rather
 * than a migration, so every step checks the live schema first and the
 * migration is a no-op on databases where the table does not exist yet (the
 * model already defines these columns for a fresh sync).
 */
const TABLE = 'VivaSessions';

module.exports = {
  async up(queryInterface, Sequelize) {
    let columns;
    try {
      columns = await queryInterface.describeTable(TABLE);
    } catch (e) {
      return;
    }

    const additions = {
      topic: { type: Sequelize.STRING(120), allowNull: true },
      depth: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 2 },
      transcript: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      rubric: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
    };

    for (const [name, definition] of Object.entries(additions)) {
      if (!columns[name]) {
        await queryInterface.addColumn(TABLE, name, definition);
      }
    }
  },

  async down(queryInterface) {
    let columns;
    try {
      columns = await queryInterface.describeTable(TABLE);
    } catch (e) {
      return;
    }
    for (const name of ['rubric', 'transcript', 'depth', 'topic']) {
      if (columns[name]) {
        await queryInterface.removeColumn(TABLE, name);
      }
    }
  },
};
