const RATE_LIMIT = {
  WINDOWS: {
    FIFTEEN_MINUTES: 15 * 60 * 1000,
    ONE_HOUR: 60 * 60 * 1000,
  },
  MAX_REQUESTS: {
    LOGIN: 5,
    REGISTER: 5,
    FORGOT_PASSWORD: 5,
    REFRESH_TOKEN: 10,
  },
};

module.exports = {
  RATE_LIMIT,
};