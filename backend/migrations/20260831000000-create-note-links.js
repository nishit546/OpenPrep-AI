'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('NoteLinks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      sourceNoteId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Notes',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      targetNoteId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Notes',
          key: 'id',
        },
        onDelete: 'CASCADE',
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

    await queryInterface.addIndex('NoteLinks', ['sourceNoteId'], {
      name: 'idx_notelink_source',
    });
    await queryInterface.addIndex('NoteLinks', ['targetNoteId'], {
      name: 'idx_notelink_target',
    });
    await queryInterface.addIndex('NoteLinks', ['sourceNoteId', 'targetNoteId'], {
      name: 'idx_notelink_unique_pair',
      unique: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('NoteLinks', 'idx_notelink_source');
    await queryInterface.removeIndex('NoteLinks', 'idx_notelink_target');
    await queryInterface.removeIndex('NoteLinks', 'idx_notelink_unique_pair');
    await queryInterface.dropTable('NoteLinks');
  },
};
