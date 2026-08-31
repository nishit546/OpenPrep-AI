module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('DocumentProcessingStages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      documentId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      stageName: {
        type: Sequelize.ENUM(
          'file-validation',
          'text-extraction',
          'content-normalization',
          'ai-analysis',
          'result-persistence'
        ),
        allowNull: false,
      },
      stageOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'in-progress', 'completed', 'failed', 'skipped'),
        allowNull: false,
        defaultValue: 'pending',
      },
      attemptCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      maxAttempts: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
      },
      input: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      output: {
        type: Sequelize.LONGTEXT,
        allowNull: true,
      },
      error: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      retryScheduledFor: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('DocumentProcessingStages', ['documentId', 'stageName']);
    await queryInterface.addIndex('DocumentProcessingStages', ['userId', 'status']);
    await queryInterface.addIndex('DocumentProcessingStages', ['retryScheduledFor', 'status']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('DocumentProcessingStages');
  },
};