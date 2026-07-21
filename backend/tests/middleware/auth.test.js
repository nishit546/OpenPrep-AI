const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { protect, authorize } = require('../../middleware/auth');
const User = require('../../models/User');

const createMockReqRes = (overrides = {}) => {
  const req = {
    headers: {},
    user: null,
    ...overrides,
  };
  const res = {
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
  const next = vi.fn();
  return { req, res, next };
};

describe('Auth Middleware - protect', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test_secret_key_for_jwt';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should return 401 if no token is provided', async () => {
    const { req, res, next } = createMockReqRes();
    req.headers.authorization = undefined;

    await protect(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: 'Not authorized to access this route',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', async () => {
    const { req, res, next } = createMockReqRes();
    req.headers.authorization = 'Bearer invalidtoken123';

    await protect(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: 'Not authorized to access this route',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token does not start with Bearer', async () => {
    const { req, res, next } = createMockReqRes();
    req.headers.authorization = 'Token sometoken';

    await protect(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: 'Not authorized to access this route',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if user does not exist in database', async () => {
    const token = jwt.sign({ id: uuidv4() }, process.env.JWT_SECRET);
    const { req, res, next } = createMockReqRes();
    req.headers.authorization = `Bearer ${token}`;

    await protect(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: 'User not found',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() if valid token and user exists', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'authtest@example.com',
      password: 'password123',
    });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    const { req, res, next } = createMockReqRes();
    req.headers.authorization = `Bearer ${token}`;

    await protect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id.toString()).toBe(user.id.toString());
    expect(req.user.email).toBe('authtest@example.com');
  });

  it('should reject tokens when JWT_SECRET is not configured', async () => {
    delete process.env.JWT_SECRET;
    const fakeId = uuidv4();
    const token = jwt.sign({ id: fakeId.toString() }, 'some_unknown_secret');
    const { req, res, next } = createMockReqRes();
    req.headers.authorization = `Bearer ${token}`;

    await protect(req, res, next);

    // jwt.verify fails because JWT_SECRET is undefined → catch block returns 401
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: 'Not authorized to access this route',
    });
  });
});

describe('Auth Middleware - authorize', () => {
  it('should return 403 if user role is not in allowed roles', () => {
    const middleware = authorize('admin');
    const { req, res, next } = createMockReqRes();
    req.user = { role: 'student' };

    middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      success: false,
      error: 'User role student is not authorized to access this route',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() if user role is in allowed roles', () => {
    const middleware = authorize('student', 'admin');
    const { req, res, next } = createMockReqRes();
    req.user = { role: 'student' };

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should call next() for admin role when admin is allowed', () => {
    const middleware = authorize('admin');
    const { req, res, next } = createMockReqRes();
    req.user = { role: 'admin' };

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
