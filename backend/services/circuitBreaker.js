/**
 * A basic Circuit Breaker implementation for external API calls.
 * Protects the application from hanging or spamming an API that is down.
 */
class CircuitBreaker {
  constructor(failureThreshold = 5, recoveryTimeoutMs = 60000) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeoutMs = recoveryTimeoutMs;
    this.state = 'CLOSED'; // 'CLOSED' (normal), 'OPEN' (failing), 'HALF_OPEN' (testing recovery)
    this.failureCount = 0;
    this.nextAttemptTime = Date.now();
  }

  async fire(action) {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttemptTime) {
        this.state = 'HALF_OPEN';
      } else {
        const error = new Error('Circuit Breaker is OPEN. External service is currently unavailable.');
        error.status = 503;
        error.isCircuitBreaker = true;
        throw error;
      }
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure(error) {
    // We only want to count 5xx errors or timeouts as circuit breaker failures, not 400s
    const status = error.status || error.response?.status;
    if (status >= 500 || status === 429 || error.message.includes('timeout')) {
      this.failureCount += 1;
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        this.nextAttemptTime = Date.now() + this.recoveryTimeoutMs;
        console.warn(`[CircuitBreaker] Circuit opened! Tripped after ${this.failureCount} failures. Waiting ${this.recoveryTimeoutMs}ms before half-open.`);
      }
    }
  }
}

module.exports = CircuitBreaker;
