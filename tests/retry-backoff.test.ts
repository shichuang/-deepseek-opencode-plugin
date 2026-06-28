/**
 * Tests for retry-backoff.ts
 */

import { describe, it, expect } from "vitest"
import {
  isRetryableError,
  calculateBackoff,
  executeWithRetry,
} from "../src/transform/retry-backoff.js"

describe("isRetryableError", () => {
  it("classifies network errors as retryable", () => {
    expect(isRetryableError(new Error("ECONNREFUSED"))).toBe(true)
    expect(isRetryableError(new Error("socket hang up"))).toBe(true)
    expect(isRetryableError(new Error("fetch failed"))).toBe(true)
    expect(isRetryableError(new Error("ETIMEDOUT"))).toBe(true)
  })

  it("classifies 429/5xx as retryable", () => {
    expect(isRetryableError(new Error("status 429"))).toBe(true)
    expect(isRetryableError(new Error("status 503"))).toBe(true)
    expect(isRetryableError(new Error("502 Bad Gateway"))).toBe(true)
  })

  it("classifies non-network errors as non-retryable", () => {
    expect(isRetryableError(new Error("Invalid API key"))).toBe(false)
    expect(isRetryableError(new Error("status 400"))).toBe(false)
    expect(isRetryableError("string error")).toBe(false)
    expect(isRetryableError(null)).toBe(false)
  })
})

describe("calculateBackoff", () => {
  it("grows exponentially", () => {
    const b0 = calculateBackoff(0)
    const b2 = calculateBackoff(2)
    const b4 = calculateBackoff(4)
    expect(b0).toBeLessThan(b2)
    expect(b2).toBeLessThan(b4)
  })

  it("caps at maxBackoffMs", () => {
    const b = calculateBackoff(20, { maxRetries: 10, maxBackoffMs: 5000, maxAuthRetries: 2 })
    expect(b).toBeLessThanOrEqual(6000) // 5000 + 20% jitter
  })

  it("never returns negative", () => {
    for (let i = 0; i < 20; i++) {
      expect(calculateBackoff(i)).toBeGreaterThanOrEqual(0)
    }
  })
})

describe("executeWithRetry", () => {
  it("returns result on first success", async () => {
    const result = await executeWithRetry(async () => "ok")
    expect(result).toBe("ok")
  })

  it("retries on transient errors", async () => {
    let attempts = 0
    const fn = async () => {
      attempts++
      if (attempts < 3) throw new Error("ECONNREFUSED")
      return "recovered"
    }
    const result = await executeWithRetry(fn, { maxRetries: 5 })
    expect(result).toBe("recovered")
    expect(attempts).toBe(3)
  })

  it("throws after exhausting retries", async () => {
    let attempts = 0
    const fn = async () => {
      attempts++
      throw new Error("ECONNREFUSED")
    }
    await expect(
      executeWithRetry(fn, { maxRetries: 2 }),
    ).rejects.toThrow("ECONNREFUSED")
    expect(attempts).toBe(3) // initial + 2 retries
  })

  it("does not retry non-retryable errors", async () => {
    let attempts = 0
    const fn = async () => {
      attempts++
      throw new Error("Invalid API key")
    }
    await expect(
      executeWithRetry(fn, { maxRetries: 5 }),
    ).rejects.toThrow("Invalid API key")
    expect(attempts).toBe(1)
  })
})
