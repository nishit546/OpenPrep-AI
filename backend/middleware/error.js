const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for developer
  console.error(err);

  // Sequelize database error (e.g., invalid UUIDs or bad queries)
  if (err.name === 'SequelizeDatabaseError') {
    const message = 'Database error or invalid query';
    error = new Error(message);
    error.statusCode = 400;
  }

  // Sequelize duplicate key (Unique Constraint)
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = 'Duplicate field value entered';
    error = new Error(message);
    error.statusCode = 400;
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map((val) => val.message).join(', ');
    error = new Error(message);
    error.statusCode = 400;
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
  });
};

module.exports = errorHandler;
