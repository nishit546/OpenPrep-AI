'use strict';

/**
 * Migration to add FSRS v4 (Free Spaced Repetition Scheduler) columns
 * and convert legacy SM-2 card records to DSR (Difficulty, Stability, Retrievability).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add FSRS v4 columns to Flashcards table
    const flashcardTable = await queryInterface.describeTable('Flashcards');

    if (!flashcardTable.stability) {
      await queryInterface.addColumn('Flashcards', 'stability', {
        type: Sequelize.FLOAT,
        defaultValue: 2.4,
        allowNull: true,
        comment: 'FSRS memory stability in days',
      });
    }

    if (!flashcardTable.fsrsDifficulty) {
      await queryInterface.addColumn('Flashcards', 'fsrsDifficulty', {
        type: Sequelize.FLOAT,
        defaultValue: 4.93,
        allowNull: true,
        comment: 'FSRS card difficulty between 1.0 and 10.0',
      });
    }

    if (!flashcardTable.elapsedDays) {
      await queryInterface.addColumn('Flashcards', 'elapsedDays', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
      });
    }

    if (!flashcardTable.scheduledDays) {
      await queryInterface.addColumn('Flashcards', 'scheduledDays', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
      });
    }

    if (!flashcardTable.reps) {
      await queryInterface.addColumn('Flashcards', 'reps', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
      });
    }

    if (!flashcardTable.lapses) {
      await queryInterface.addColumn('Flashcards', 'lapses', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
      });
    }

    if (!flashcardTable.state) {
      await queryInterface.addColumn('Flashcards', 'state', {
        type: Sequelize.STRING,
        defaultValue: 'new',
        allowNull: true,
      });
    }

    // 2. Add FSRS v4 columns to FlashcardSchedulingStates if table exists
    try {
      const fssTable = await queryInterface.describeTable('FlashcardSchedulingStates');

      if (!fssTable.stability) {
        await queryInterface.addColumn('FlashcardSchedulingStates', 'stability', {
          type: Sequelize.FLOAT,
          defaultValue: 2.4,
          allowNull: true,
        });
      }

      if (!fssTable.difficulty) {
        await queryInterface.addColumn('FlashcardSchedulingStates', 'difficulty', {
          type: Sequelize.FLOAT,
          defaultValue: 4.93,
          allowNull: true,
        });
      }

      if (!fssTable.elapsedDays) {
        await queryInterface.addColumn('FlashcardSchedulingStates', 'elapsedDays', {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: true,
        });
      }

      if (!fssTable.scheduledDays) {
        await queryInterface.addColumn('FlashcardSchedulingStates', 'scheduledDays', {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: true,
        });
      }

      if (!fssTable.reps) {
        await queryInterface.addColumn('FlashcardSchedulingStates', 'reps', {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: true,
        });
      }

      if (!fssTable.lapses) {
        await queryInterface.addColumn('FlashcardSchedulingStates', 'lapses', {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: true,
        });
      }

      if (!fssTable.retrievability) {
        await queryInterface.addColumn('FlashcardSchedulingStates', 'retrievability', {
          type: Sequelize.FLOAT,
          defaultValue: 1.0,
          allowNull: true,
        });
      }
    } catch (e) {
      // Table may not exist yet in fresh installations
    }

    // 3. Register FSRS v4 algorithm in SchedulerVersions
    try {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM "SchedulerVersions" WHERE "algorithmName" = 'FSRS-v4' LIMIT 1;`
      );
      if (!existing || existing.length === 0) {
        await queryInterface.bulkInsert('SchedulerVersions', [
          {
            id: Sequelize.literal('gen_random_uuid()'),
            versionNumber: 2,
            algorithmName: 'FSRS-v4',
            description: 'Free Spaced Repetition Scheduler v4 (DSR model)',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
        // Set old version active flag to false
        await queryInterface.sequelize.query(
          `UPDATE "SchedulerVersions" SET "isActive" = false WHERE "algorithmName" = 'SM-2';`
        );
      }
    } catch (e) {
      // Non-fatal if SchedulerVersions is absent
    }

    // 4. Data Migration: convert existing SM-2 efactor and interval into initial FSRS stability & difficulty
    try {
      await queryInterface.sequelize.query(`
        UPDATE "Flashcards"
        SET 
          "stability" = GREATEST(0.1, COALESCE("interval", 1)),
          "fsrsDifficulty" = GREATEST(1.0, LEAST(10.0, 11.0 - (COALESCE("efactor", 2.5) * 3.0))),
          "reps" = COALESCE("repetitions", 0),
          "scheduledDays" = COALESCE("interval", 1),
          "elapsedDays" = COALESCE("interval", 1),
          "state" = CASE 
            WHEN COALESCE("repetitions", 0) = 0 THEN 'new'
            ELSE 'review'
          END
        WHERE "stability" IS NULL OR "fsrsDifficulty" IS NULL;
      `);
    } catch (e) {
      // Safe fallback if table is empty
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('Flashcards', 'stability');
      await queryInterface.removeColumn('Flashcards', 'fsrsDifficulty');
      await queryInterface.removeColumn('Flashcards', 'elapsedDays');
      await queryInterface.removeColumn('Flashcards', 'scheduledDays');
      await queryInterface.removeColumn('Flashcards', 'reps');
      await queryInterface.removeColumn('Flashcards', 'lapses');
      await queryInterface.removeColumn('Flashcards', 'state');

      await queryInterface.removeColumn('FlashcardSchedulingStates', 'stability');
      await queryInterface.removeColumn('FlashcardSchedulingStates', 'difficulty');
      await queryInterface.removeColumn('FlashcardSchedulingStates', 'elapsedDays');
      await queryInterface.removeColumn('FlashcardSchedulingStates', 'scheduledDays');
      await queryInterface.removeColumn('FlashcardSchedulingStates', 'reps');
      await queryInterface.removeColumn('FlashcardSchedulingStates', 'lapses');
      await queryInterface.removeColumn('FlashcardSchedulingStates', 'retrievability');
    } catch (e) {
      // Ignore cleanup errors
    }
  },
};
