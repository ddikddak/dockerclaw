// ============================================
// Retry Logic - Exponential backoff for resilient operations
// ============================================

import { logger } from './logger';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryableErrors?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableErrors: () => true,
  onRetry: () => {},
};

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { maxAttempts, baseDelay, maxDelay, retryableErrors, onRetry } = opts;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry this error
      if (attempt === maxAttempts || !retryableErrors(lastError)) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1000;
      const delay = Math.min(exponentialDelay + jitter, maxDelay);
      
      logger.log('warn', 'Retry', `Attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(delay)}ms`, {
        error: lastError.message,
        attempt,
      });
      
      onRetry(attempt, lastError, delay);
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is a network error (retryable)
 */
export function isNetworkError(error: Error): boolean {
  const networkErrorMessages = [
    'network error',
    'failed to fetch',
    'network request failed',
    'timeout',
    'abort',
    'offline',
  ];
  
  const message = error.message.toLowerCase();
  return networkErrorMessages.some(pattern => message.includes(pattern));
}

/**
 * Check if an error is a server error (5xx - retryable)
 */
export function isServerError(error: Error): boolean {
  // Check for HTTP status codes in error message
  const serverErrorPattern = /5\d{2}/;
  return serverErrorPattern.test(error.message);
}

/**
 * Check if an error is a client error (4xx - not retryable except 429)
 */
export function isClientError(error: Error): boolean {
  const clientErrorPattern = /4\d{2}/;
  return clientErrorPattern.test(error.message);
}

/**
 * Check if an error is rate limited (429 - retryable with delay)
 */
export function isRateLimited(error: Error): boolean {
  return error.message.includes('429') || error.message.toLowerCase().includes('rate limit');
}

/**
 * Default retryable error checker
 */
export function isRetryableError(error: Error): boolean {
  // Always retry network errors
  if (isNetworkError(error)) return true;
  
  // Retry server errors (5xx)
  if (isServerError(error)) return true;
  
  // Retry rate limits (429)
  if (isRateLimited(error)) return true;
  
  // Don't retry client errors (4xx except 429)
  if (isClientError(error)) return false;
  
  // Default to retrying unknown errors
  return true;
}

/**
 * Retry configuration for different operation types
 */
export const retryConfigs = {
  // Database operations - quick retries
  db: {
    maxAttempts: 3,
    baseDelay: 100,
    maxDelay: 5000,
    retryableErrors: isRetryableError,
  },
  
  // Network operations - standard retries
  network: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    retryableErrors: isRetryableError,
  },
  
  // Supabase operations - longer delays for rate limits
  supabase: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 60000,
    retryableErrors: (error: Error) => {
      if (isRateLimited(error)) return true;
      return isRetryableError(error);
    },
  },
  
  // Critical operations - many retries
  critical: {
    maxAttempts: 10,
    baseDelay: 500,
    maxDelay: 60000,
    retryableErrors: () => true,
  },
};

/**
 * Wrap a function to always retry with a specific config
 */
export function withRetryConfig<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  config: RetryOptions
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return withRetry(() => fn(...args) as Promise<ReturnType<T>>, config);
  };
}
