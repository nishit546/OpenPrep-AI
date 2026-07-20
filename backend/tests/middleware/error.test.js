const errorHandler = require('../../middleware/error');

describe('Error Handler Middleware', () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      statusCode: null,
      body: null,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.body = data;
        return this;
      },
    };
  });

  it('should return 500 for a generic error', () => {
    const err = new Error('Something went wrong');
    errorHandler(err, req, res, vi.fn());

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: 'Something went wrong',
    });
  });

  it('should return 400 for a SequelizeValidationError', () => {
    const err = new Error('Validation failed');
    err.name = 'SequelizeValidationError';
    err.errors = [
      { message: 'Email is required' },
      { message: 'Password must be at least 8 characters' },
    ];
    errorHandler(err, req, res, vi.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: 'Email is required, Password must be at least 8 characters',
    });
  });

  it('should return 400 for a SequelizeUniqueConstraintError', () => {
    const err = new Error('unique constraint violated');
    err.name = 'SequelizeUniqueConstraintError';
    err.errors = [
      { path: 'email', message: 'email must be unique' },
    ];
    errorHandler(err, req, res, vi.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: 'Duplicate value for field: email',
    });
  });

  it('should return 404 for a SequelizeForeignKeyConstraintError', () => {
    const err = new Error('foreign key constraint fails');
    err.name = 'SequelizeForeignKeyConstraintError';
    errorHandler(err, req, res, vi.fn());

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: 'Referenced resource not found',
    });
  });

  it('should return 400 for a SequelizeDatabaseError', () => {
    const err = new Error('invalid input syntax for type uuid');
    err.name = 'SequelizeDatabaseError';
    errorHandler(err, req, res, vi.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: 'Invalid request',
    });
  });

  it('should return 400 for a SequelizeEagerLoadingError', () => {
    const err = new Error('include not found');
    err.name = 'SequelizeEagerLoadingError';
    errorHandler(err, req, res, vi.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: 'Invalid query configuration',
    });
  });

  it('should preserve an existing statusCode if set on the error', () => {
    const err = new Error('Custom error');
    err.statusCode = 429;
    errorHandler(err, req, res, vi.fn());

    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({
      success: false,
      error: 'Custom error',
    });
  });

  it('should return 500 if error has no message', () => {
    const err = new Error();
    errorHandler(err, req, res, vi.fn());

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: 'Server Error',
    });
  });
});
