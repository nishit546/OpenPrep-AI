module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('DocumentProcessingLogs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      documentId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      stageId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'DocumentProcessingStages', key: 'id' },
        onDelete: 'CASCADE',
      },
      eventType: {
        type: Sequelize.ENUM('started', 'completed', 'failed', 'retried', 'skipped'),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      details: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      timestamp: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('DocumentProcessingLogs', ['documentId', 'timestamp']);
    await queryInterface.addIndex('DocumentProcessingLogs', ['stageId', 'eventType']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('DocumentProcessingLogs');
  },
};