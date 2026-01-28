/**
 * Centralized timeout and retry configuration
 * Following 2026 best practices for configurable application settings
 */

export const TIMEOUTS = {
  ARIA2_VERSION_CHECK: 3000,
  ARIA2_LAUNCH: 15000,
  GITHUB_ENDPOINT: 15000,
  ARIA2_INITIAL_WAIT: 200,
} as const;

export const RETRIES = {
  ARIA2_CONNECTION: 10, // Reduced from 30 for better exponential backoff
  GITHUB_ENDPOINT: 3,
} as const;

export const BACKOFF = {
  BASE_DELAY: 100,
  MAX_DELAY: 5000,
  JITTER_FACTOR: 0.3,
} as const;

/**
 * Get timeout value with optional environment variable override
 */
export function getTimeout(key: keyof typeof TIMEOUTS): number {
  if (typeof process !== "undefined" && process.env) {
    const envKey = `YAAGL_TIMEOUT_${key}`;
    const envValue = process.env[envKey];
    if (envValue) {
      const parsed = parseInt(envValue, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }
  return TIMEOUTS[key];
}

/**
 * Get retry count with optional environment variable override
 */
export function getRetryCount(key: keyof typeof RETRIES): number {
  if (typeof process !== "undefined" && process.env) {
    const envKey = `YAAGL_RETRY_${key}`;
    const envValue = process.env[envKey];
    if (envValue) {
      const parsed = parseInt(envValue, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }
  return RETRIES[key];
}

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateBackoff(
  attempt: number,
  baseDelay = BACKOFF.BASE_DELAY
): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, BACKOFF.MAX_DELAY);
  const jitter = cappedDelay * BACKOFF.JITTER_FACTOR * Math.random();
  return Math.floor(cappedDelay + jitter);
}
