module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('AIGenerationCaches', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      fingerprint: {
        type: Sequelize.STRING(128),
        allowNull: false,
        unique: true,
      },
      workflowType: {
        type: Sequelize.ENUM('quiz-generation', 'study-plan', 'document-analysis', 'flashcard-generation'),
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      contractVersion: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      inputHash: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      generatedResult: {
        type: Sequelize.LONGTEXT,
        allowNull: false,
      },
      resultMetadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      accessCount: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      lastAccessedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('AIGenerationCaches', ['fingerprint']);
    await queryInterface.addIndex('AIGenerationCaches', ['fingerprint', 'userId']);
    await queryInterface.addIndex('AIGenerationCaches', ['workflowType', 'contractVersion', 'expiresAt']);
    await queryInterface.addIndex('AIGenerationCaches', ['expiresAt']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('AIGenerationCaches');
  },
};