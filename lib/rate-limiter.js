/**
 * Simple in-memory rate limiter for OpenAI API calls
 * Implements token bucket algorithm
 */

class RateLimiter {
  constructor() {
    // Token buckets for different limits
    this.buckets = {
      rpm: { tokens: 10, maxTokens: 15, lastRefill: Date.now() }, // 15 requests per minute (más generoso)
      rpd: { tokens: 180, maxTokens: 200, lastRefill: Date.now() } // 200 requests per day (leaving margin)
    };
    
    // Circuit breaker
    this.circuitOpen = false;
    this.circuitOpenUntil = null;
    this.consecutiveFailures = 0;
    this.maxFailures = 3;
    this.circuitTimeout = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Check if we can make a request
   */
  canMakeRequest() {
    // Check circuit breaker
    if (this.circuitOpen && Date.now() < this.circuitOpenUntil) {
      return { allowed: false, reason: 'circuit_breaker_open', retryAfter: this.circuitOpenUntil - Date.now() };
    }

    // Reset circuit breaker if timeout passed
    if (this.circuitOpen && Date.now() >= this.circuitOpenUntil) {
      this.circuitOpen = false;
      this.consecutiveFailures = 0;
    }

    this.refillBuckets();

    // Check RPM limit
    if (this.buckets.rpm.tokens <= 0) {
      const nextRefill = 60 * 1000; // 1 minute
      return { allowed: false, reason: 'rpm_limit', retryAfter: nextRefill };
    }

    // Check RPD limit
    if (this.buckets.rpd.tokens <= 0) {
      const nextRefill = 24 * 60 * 60 * 1000; // 24 hours
      return { allowed: false, reason: 'rpd_limit', retryAfter: nextRefill };
    }

    return { allowed: true };
  }

  /**
   * Consume tokens for a request
   */
  consumeTokens() {
    this.buckets.rpm.tokens -= 1;
    this.buckets.rpd.tokens -= 1;
  }

  /**
   * Record successful request
   */
  recordSuccess() {
    this.consecutiveFailures = 0;
    if (this.circuitOpen) {
      this.circuitOpen = false;
    }
  }

  /**
   * Record failed request
   */
  recordFailure() {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.maxFailures) {
      this.circuitOpen = true;
      this.circuitOpenUntil = Date.now() + this.circuitTimeout;
      console.log(`[RATE-LIMITER] Circuit breaker opened for ${this.circuitTimeout / 60000} minutes`);
    }
  }

  /**
   * Refill token buckets based on time elapsed
   */
  refillBuckets() {
    const now = Date.now();

    // Refill RPM bucket (15 tokens per minute)
    const rpmElapsed = now - this.buckets.rpm.lastRefill;
    const rpmTokensToAdd = Math.floor(rpmElapsed / (60 * 1000)) * 15;
    if (rpmTokensToAdd > 0) {
      this.buckets.rpm.tokens = Math.min(this.buckets.rpm.maxTokens, this.buckets.rpm.tokens + rpmTokensToAdd);
      this.buckets.rpm.lastRefill = now;
    }

    // Refill RPD bucket (200 tokens per day)
    const rpdElapsed = now - this.buckets.rpd.lastRefill;
    const rpdTokensToAdd = Math.floor(rpdElapsed / (24 * 60 * 60 * 1000)) * 200;
    if (rpdTokensToAdd > 0) {
      this.buckets.rpd.tokens = Math.min(this.buckets.rpd.maxTokens, this.buckets.rpd.tokens + rpdTokensToAdd);
      this.buckets.rpd.lastRefill = now;
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    this.refillBuckets();
    return {
      rpm: {
        tokens: this.buckets.rpm.tokens,
        maxTokens: this.buckets.rpm.maxTokens,
        percentage: (this.buckets.rpm.tokens / this.buckets.rpm.maxTokens) * 100
      },
      rpd: {
        tokens: this.buckets.rpd.tokens,
        maxTokens: this.buckets.rpd.maxTokens,
        percentage: (this.buckets.rpd.tokens / this.buckets.rpd.maxTokens) * 100
      },
      circuitBreaker: {
        open: this.circuitOpen,
        openUntil: this.circuitOpenUntil,
        consecutiveFailures: this.consecutiveFailures
      }
    };
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

export { rateLimiter };
