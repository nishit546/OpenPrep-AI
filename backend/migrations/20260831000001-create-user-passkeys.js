'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_passkeys', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      credential_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      public_key: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      counter: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
      },
      device_name: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'Passkey Device',
      },
      transports: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      aaguid: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('user_passkeys', ['user_id'], {
      name: 'idx_user_passkeys_user_id',
    });
    await queryInterface.addIndex('user_passkeys', ['credential_id'], {
      name: 'idx_user_passkeys_credential_id',
      unique: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('user_passkeys', 'idx_user_passkeys_user_id');
    await queryInterface.removeIndex('user_passkeys', 'idx_user_passkeys_credential_id');
    await queryInterface.dropTable('user_passkeys');
  },
};
