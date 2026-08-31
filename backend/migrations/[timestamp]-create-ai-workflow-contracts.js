module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('AIWorkflowContracts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      workflowType: {
        type: Sequelize.ENUM('quiz-generation', 'study-plan', 'document-analysis', 'flashcard-generation'),
        allowNull: false,
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      promptTemplate: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      expectedResponseSchema: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      modelConfig: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      parsingStrategy: {
        type: Sequelize.ENUM('json-strict', 'markdown-extraction', 'regex-pattern'),
        allowNull: false,
      },
      validationRules: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      changelog: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('AIWorkflowContracts', ['workflowType', 'version', 'isActive']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('AIWorkflowContracts');
  },
};