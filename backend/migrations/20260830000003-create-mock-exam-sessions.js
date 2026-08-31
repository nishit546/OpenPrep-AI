'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('MockExamSessions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      examId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      startTime: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      endTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('started', 'submitted', 'expired'),
        defaultValue: 'started',
        allowNull: false,
      },
      answers: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false,
      },
      violationsCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      score: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('MockExamSessions', ['userId'], {
      name: 'idx_mock_exam_user',
    });
    await queryInterface.addIndex('MockExamSessions', ['examId'], {
      name: 'idx_mock_exam_exam',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('MockExamSessions', 'idx_mock_exam_user');
    await queryInterface.removeIndex('MockExamSessions', 'idx_mock_exam_exam');
    await queryInterface.dropTable('MockExamSessions');
  },
};
