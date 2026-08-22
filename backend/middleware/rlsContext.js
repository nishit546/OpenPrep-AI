const { AsyncLocalStorage } = require('async_hooks');
const rlsStorage = new AsyncLocalStorage();

const rlsMiddleware = (req, res, next) => {
  if (req.user && req.user.id) {
    const context = {
      userId: req.user.id,
      isAdmin: req.user.role === 'admin'
    };
    rlsStorage.run(context, () => {
      next();
    });
  } else {
    // Default system/guest context if user not yet populated (e.g. public pages)
    rlsStorage.run({ userId: 'guest', isAdmin: false }, () => {
      next();
    });
  }
};

module.exports = {
  rlsStorage,
  rlsMiddleware
};
