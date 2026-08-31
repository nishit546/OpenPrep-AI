'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('learning_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      subject: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      topic: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      eventType: {
        type: Sequelize.ENUM('quiz_attempt', 'flashcard_review'),
        allowNull: false,
      },
      sourceId: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('learning_events', ['eventType', 'sourceId'], {
      name: 'learning_events_event_source_unique',
      unique: true,
    });

    await queryInterface.addIndex('learning_events', ['user', 'subject', 'topic'], {
      name: 'learning_events_user_subject_topic_idx',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('learning_events');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_learning_events_eventType";');
  },
};