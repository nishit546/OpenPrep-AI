const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/openprep',
  {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Connected successfully via Sequelize');
    
    // Sync models (dynamically imported to prevent circular reference at startup)
    if (process.env.NODE_ENV !== 'production') {
      require('../models'); // Registers all models and associations
      await sequelize.sync({ alter: true });
      console.log('Database schemas synced successfully');
    }
  } catch (error) {
    console.error(`Error connecting to PostgreSQL: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
