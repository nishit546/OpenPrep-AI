/**
 * @fileoverview Schema definitions for Community Flashcard Deck Marketplace,
 * tracking public flashcard decks, ratings, reviews, and forking lineage.
 */

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Deck Marketplace Model
 * Represents public flashcard decks listed on the marketplace.
 */
class DeckMarketplace extends Model {}

DeckMarketplace.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    author_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    forked_from_deck_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'deck_marketplaces',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    downloads_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    fork_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    average_rating: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      allowNull: false,
      validate: {
        min: 0.0,
        max: 5.0,
      },
    },
    rating_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    exam_tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    card_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'DeckMarketplace',
    tableName: 'deck_marketplaces',
    timestamps: true,
    indexes: [
      { fields: ['is_public'] },
      { fields: ['author_id'] },
      { fields: ['forked_from_deck_id'] },
      { fields: ['average_rating'] },
      { fields: ['downloads_count'] },
    ],
  }
);

/**
 * Deck Review Model
 * Stores user ratings (1–5) and feedback for marketplace decks.
 */
class DeckReview extends Model {}

DeckReview.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    deck_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'deck_marketplaces',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    review_text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'DeckReview',
    tableName: 'deck_reviews',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['deck_id', 'user_id'] },
      { fields: ['deck_id'] },
      { fields: ['user_id'] },
    ],
  }
);

// Define Model Associations
DeckMarketplace.hasMany(DeckReview, { foreignKey: 'deck_id', as: 'reviews' });
DeckReview.belongsTo(DeckMarketplace, { foreignKey: 'deck_id', as: 'deck' });

DeckMarketplace.belongsTo(DeckMarketplace, {
  foreignKey: 'forked_from_deck_id',
  as: 'originalDeck',
});
DeckMarketplace.hasMany(DeckMarketplace, {
  foreignKey: 'forked_from_deck_id',
  as: 'forks',
});

module.exports = {
  DeckMarketplace,
  DeckReview,
};
