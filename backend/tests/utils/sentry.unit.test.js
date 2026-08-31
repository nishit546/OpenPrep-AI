const { requestHandler, errorHandler } = require('../../utils/sentry');
const sentryConfig = require('../../config/sentry');

describe('Sentry Middleware Utilities', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      user: { id: 'user_99', email: 'peer@example.com' },
    };
    res = {};
    next = vi.fn();
  });

  describe('requestHandler', () => {
    it('sets Sentry user and request context if Sentry is active', () => {
      const originalReady = sentryConfig.isSentryReady;
      sentryConfig.isSentryReady = true;

      const mockScope = {
        setUser: vi.fn(),
        setContext: vi.fn(),
      };

      const originalWithScope = sentryConfig.Sentry.withScope;
      sentryConfig.Sentry.withScope = vi.fn((cb) => cb(mockScope));

      requestHandler(req, res, next);

      expect(sentryConfig.Sentry.withScope).toHaveBeenCalled();
      expect(mockScope.setUser).toHaveBeenCalledWith({ id: 'user_99', email: 'peer@example.com' });
      expect(mockScope.setContext).toHaveBeenCalledWith('request_details', {
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
      });
      expect(next).toHaveBeenCalled();

      // Clean up mocks
      sentryConfig.isSentryReady = originalReady;
      sentryConfig.Sentry.withScope = originalWithScope;
    });

    it('passes immediately if Sentry is disabled', () => {
      const originalReady = sentryConfig.isSentryReady;
      sentryConfig.isSentryReady = false;

      requestHandler(req, res, next);

      expect(next).toHaveBeenCalled();

      sentryConfig.isSentryReady = originalReady;
    });
  });

  describe('errorHandler', () => {
    it('captures 500 exceptions via Sentry.captureException', () => {
      const originalReady = sentryConfig.isSentryReady;
      sentryConfig.isSentryReady = true;

      const originalCapture = sentryConfig.Sentry.captureException;
      sentryConfig.Sentry.captureException = vi.fn();

      const err = new Error('Database connection reset');
      err.statusCode = 503;

      errorHandler(err, req, res, next);

      expect(sentryConfig.Sentry.captureException).toHaveBeenCalledWith(err);
      expect(next).toHaveBeenCalledWith(err);

      sentryConfig.isSentryReady = originalReady;
      sentryConfig.Sentry.captureException = originalCapture;
    });

    it('ignores non-500 exceptions (e.g. 404, 400)', () => {
      const originalReady = sentryConfig.isSentryReady;
      sentryConfig.isSentryReady = true;

      const originalCapture = sentryConfig.Sentry.captureException;
      sentryConfig.Sentry.captureException = vi.fn();

      const err = new Error('Not found');
      err.statusCode = 404;

      errorHandler(err, req, res, next);

      expect(sentryConfig.Sentry.captureException).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(err);

      sentryConfig.isSentryReady = originalReady;
      sentryConfig.Sentry.captureException = originalCapture;
    });
  });
});
