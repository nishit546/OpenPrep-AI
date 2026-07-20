const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for developer
  console.error(err);

  // Sequelize validation error — model-level validation failures
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map((val) => val.message).join(', ');
    error = new Error(message);
    error.statusCode = 400;
  }

  // Sequelize unique constraint violation — duplicate field value
  if (err.name === 'SequelizeUniqueConstraintError') {
    const fields = err.errors.map((e) => e.path).join(', ');
    error = new Error(`Duplicate value for field: ${fields}`);
    error.statusCode = 400;
  }

  // Sequelize foreign key constraint — referenced resource does not exist
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    error = new Error('Referenced resource not found');
    error.statusCode = 404;
  }

  // Sequelize database error — invalid UUIDs, bad SQL, type mismatches
  if (err.name === 'SequelizeDatabaseError') {
    error = new Error('Invalid request');
    error.statusCode = 400;
  }

  // Sequelize eager loading error — invalid include options
  if (err.name === 'SequelizeEagerLoadingError') {
    error = new Error('Invalid query configuration');
    error.statusCode = 400;
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
  });
};

module.exports = errorHandler;
