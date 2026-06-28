/**
 * Provider-level retry with backoff
 *
 * Ported from DeepSeek-Reasonix internal/provider/retry.go
 *
 * Transient DeepSeek API failures (429 rate limits, 503 gateway errors,
 * connection resets) should be retried with exponential backoff rather
 * than failing the entire turn.
 *
 * Configuration:
 * - MaxRetries: 10 (mirrors Reasonix)
 * - MaxBackoff: 15 seconds
 * - MaxAuthRetries: 2 (for keys that previously authenticated)
 */

export interface RetryConfig {
  maxRetries: number
  maxBackoffMs: number
  maxAuthRetries: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 10,
  maxBackoffMs: 15_000,
  maxAuthRetries: 2,
}

export interface RetryInfo {
  attempt: number
  max: number
  delayMs: number
  error: string
}

export type RetryNotify = (info: RetryInfo) => void

/**
 * Classify whether an error is retryable.
 * Mirrors Reasonix's classification: network errors, 429, 5xx.
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const msg = error.message.toLowerCase()

  // Network-level errors
  if (
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("eof") ||
    msg.includes("socket hang up") ||
    msg.includes("network error") ||
    msg.includes("fetch failed")
  ) {
    return true
  }

  // HTTP status codes
  if (msg.includes("status 429") || msg.includes("429")) return true
  if (msg.includes("status 502") || msg.includes("502")) return true
  if (msg.includes("status 503") || msg.includes("503")) return true
  if (msg.includes("status 504") || msg.includes("504")) return true

  return false
}

/**
 * Classify whether a 401/403 is worth retrying.
 * Only retry if the key previously authenticated successfully.
 */
export function isRetryableAuthError(error: unknown, previouslyAuthenticated: boolean): boolean {
  if (!previouslyAuthenticated) return false
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return msg.includes("status 401") || msg.includes("401") ||
    msg.includes("status 403") || msg.includes("403")
}

/**
 * Calculate backoff delay with jitter.
 * Exponential: base * 2^attempt, capped at maxBackoffMs.
 * 20% jitter to avoid thundering herd.
 */
export function calculateBackoff(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const base = Math.min(1000 * Math.pow(2, attempt), config.maxBackoffMs)
  const jitter = base * 0.2 * (Math.random() * 2 - 1) // -20% to +20%
  return Math.max(0, Math.floor(base + jitter))
}

/**
 * Execute a function with retry on transient errors.
 * Calls notify before each retry so the caller can surface status.
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> & { notify?: RetryNotify } = {},
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: unknown

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err

      if (attempt === cfg.maxRetries) break

      if (!isRetryableError(err)) {
        // Non-retryable error — rethrow immediately
        throw err
      }

      const delay = calculateBackoff(attempt, cfg)
      const info: RetryInfo = {
        attempt: attempt + 1,
        max: cfg.maxRetries,
        delayMs: delay,
        error: err instanceof Error ? err.message : String(err),
      }

      cfg.notify?.(info)

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Sleep helper (for non-retry delays).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
