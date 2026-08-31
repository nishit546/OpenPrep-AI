/**
 * Quota and rate limiting configuration tiers.
 * Capacity is the burst size (maximum tokens in the bucket).
 * RefillRate is in tokens per millisecond.
 */
module.exports = {
  guest: {
    general: {
      capacity: 10,
      refillRate: 10 / 60000, // 10 tokens per 60 seconds (1 token per 6s)
      windowSeconds: 60,
    },
    aiLocked: true,
  },
  student: {
    general: {
      capacity: 60,
      refillRate: 60 / 60000, // 60 tokens per 60 seconds (1 token per 1s)
      windowSeconds: 60,
    },
    ai: {
      capacity: 30,
      refillRate: 30 / 3600000, // 30 tokens per 3600 seconds (1 token per 120s)
      windowSeconds: 3600,
    },
  },
  moderator_admin: {
    general: {
      capacity: 120,
      refillRate: 120 / 60000, // 120 tokens per 60 seconds (2 tokens per 1s)
      windowSeconds: 60,
    },
    ai: {
      capacity: 100,
      refillRate: 100 / 3600000, // 100 tokens per 3600 seconds (1 token per 36s)
      windowSeconds: 3600,
    },
  },
};
