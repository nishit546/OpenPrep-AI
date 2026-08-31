module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('AIArtifactVersions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      artifactId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      artifactType: {
        type: Sequelize.ENUM('quiz', 'study-plan', 'flashcards', 'analysis'),
        allowNull: false,
      },
      contractId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'AIWorkflowContracts', key: 'id' },
      },
      contractVersion: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      promptInput: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      rawResponse: {
        type: Sequelize.LONGTEXT,
        allowNull: false,
      },
      parsedOutput: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      validationStatus: {
        type: Sequelize.ENUM('valid', 'invalid', 'partially-valid', 'incompatible'),
        allowNull: false,
        defaultValue: 'valid',
      },
      validationErrors: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      generatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('AIArtifactVersions', ['artifactId', 'contractVersion']);
    await queryInterface.addIndex('AIArtifactVersions', ['contractId', 'validationStatus']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('AIArtifactVersions');
  },
};