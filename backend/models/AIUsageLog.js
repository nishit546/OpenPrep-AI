module.exports = (sequelize, DataTypes) => {
  const AIUsageLog = sequelize.define('AIUsageLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      index: true,
    },
    feature: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Feature that used AI (e.g., quiz-generation, study-planning)',
      index: true,
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'gemini',
      comment: 'AI provider used',
    },
    requestType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of request (text, embedding, etc.)',
    },
    requestCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    estimatedTokens: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Estimated token usage',
    },
    promptTokens: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Prompt token count',
    },
    completionTokens: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Completion token count',
    },
    costEstimated: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      comment: 'Estimated cost in USD',
    },
    status: {
      type: DataTypes.ENUM('success', 'quota_exceeded', 'timeout', 'provider_error', 'retry_exhausted'),
      allowNull: false,
      defaultValue: 'success',
    },
    responseTime: {
      type: DataTypes.INTEGER,
      comment: 'Response time in milliseconds',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      comment: 'Error details if request failed',
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    tableName: 'ai_usage_logs',
    timestamps: true,
    indexes: [
      { fields: ['userId', 'createdAt'] },
      { fields: ['feature', 'createdAt'] },
      { fields: ['status', 'createdAt'] },
    ],
  });

  return AIUsageLog;
};