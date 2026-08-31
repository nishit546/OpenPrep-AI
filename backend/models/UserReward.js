/**
 * @fileoverview Sequelize model for tracking user virtual currency, inventory, and active rewards.
 */
module.exports = (sequelize, DataTypes) => {
    const UserReward = sequelize.define('UserReward', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
        },
        coinBalance: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Virtual currency earned through study habits',
        },
        inventory: {
            type: DataTypes.JSONB,
            defaultValue: {
                streakFreezes: 0,
                themes: [],
                aiBoosts: 0
            },
            comment: 'JSON object tracking purchased items',
        },
        activeStreakFreeze: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'If true, intercepts daily streak reset logic',
        },
    }, {
        tableName: 'user_rewards',
        timestamps: true,
        indexes: [
            { fields: ['userId'] },
            { fields: ['coinBalance'] }
        ]
    });

    return UserReward;
};
