const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * A searchable passage of an uploaded study document.
 *
 * `embedding vector(768)` and the generated `tsv tsvector` column are created
 * by migrations/20260903000000-create-document-chunks.js and are deliberately
 * not declared here: they need the pgvector extension, and tests build the
 * schema with sequelize.sync() on plain PostgreSQL. Queries that use them live
 * in services/hybridSearchService.js as raw SQL.
 */
const DocumentChunk = sequelize.define(
  'DocumentChunk',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE',
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    chunkIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    chunkText: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    pageNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: 'document_chunks',
    timestamps: true,
    indexes: [
      { name: 'idx_document_chunks_user_document', fields: ['userId', 'documentId'] },
    ],
  }
);

module.exports = DocumentChunk;
