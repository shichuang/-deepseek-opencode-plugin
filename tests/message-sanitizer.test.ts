/**
 * Tests for message-sanitizer.ts (DeepSeek protocol adaptation)
 */

import { describe, it, expect } from "vitest"
import {
  shouldSanitizeReasoning,
  sanitizeReasoningMessages,
  supportsStrictTools,
  applyStrictToolMode,
} from "../src/transform/message-sanitizer.js"

describe("shouldSanitizeReasoning", () => {
  it("returns true for DeepSeek model with reasoning effort", () => {
    expect(shouldSanitizeReasoning("deepseek-v4-pro", "medium")).toBe(true)
    expect(shouldSanitizeReasoning("deepseek-v4-flash", "high")).toBe(true)
  })

  it("returns false when reasoning_effort is off", () => {
    expect(shouldSanitizeReasoning("deepseek-v4-pro", "off")).toBe(false)
    expect(shouldSanitizeReasoning("deepseek-v4-pro", "disabled")).toBe(false)
    expect(shouldSanitizeReasoning("deepseek-v4-pro", "none")).toBe(false)
  })

  it("returns false for non-DeepSeek models", () => {
    expect(shouldSanitizeReasoning("gpt-4", "medium")).toBe(false)
    expect(shouldSanitizeReasoning("claude-sonnet", "high")).toBe(false)
  })

  it("returns false when reasoning_effort is null", () => {
    expect(shouldSanitizeReasoning("deepseek-v4-pro", null)).toBe(false)
    expect(shouldSanitizeReasoning("deepseek-v4-pro", undefined)).toBe(false)
  })

  it("detects DeepSeek by provider name", () => {
    expect(shouldSanitizeReasoning("custom-model", "medium", "deepseek")).toBe(true)
  })
})

describe("sanitizeReasoningMessages", () => {
  it("injects placeholder on assistant with tool_calls", () => {
    const result = sanitizeReasoningMessages({
      messages: [
        { role: "assistant", tool_calls: [{ id: "1", name: "read", arguments: "{}" }] },
      ],
      model: "deepseek-v4-pro",
      reasoningEffort: "medium",
    })
    expect(result.substitutions).toBe(1)
    expect(result.messages[0].reasoning_content).toBe("(reasoning omitted)")
  })

  it("does not inject on messages with existing reasoning_content", () => {
    const result = sanitizeReasoningMessages({
      messages: [
        {
          role: "assistant",
          tool_calls: [{ id: "1", name: "read", arguments: "{}" }],
          reasoning_content: "existing thinking",
        },
      ],
      model: "deepseek-v4-pro",
      reasoningEffort: "medium",
    })
    expect(result.substitutions).toBe(0)
    expect(result.messages[0].reasoning_content).toBe("existing thinking")
  })

  it("skips non-DeepSeek models entirely", () => {
    const result = sanitizeReasoningMessages({
      messages: [
        { role: "assistant", tool_calls: [{ id: "1", name: "read", arguments: "{}" }] },
      ],
      model: "gpt-4",
      reasoningEffort: "medium",
    })
    expect(result.substitutions).toBe(0)
  })

  it("counts reasoning replay characters", () => {
    const result = sanitizeReasoningMessages({
      messages: [
        {
          role: "assistant",
          tool_calls: [{ id: "1", name: "read", arguments: "{}" }],
          reasoning_content: "this is some thinking content",
        },
      ],
      model: "deepseek-v4-pro",
      reasoningEffort: "medium",
    })
    expect(result.replayMessages).toBe(1)
    expect(result.replayChars).toBe(29)
  })
})

describe("supportsStrictTools", () => {
  it("returns true for beta endpoint", () => {
    expect(supportsStrictTools("https://api.deepseek.com/beta")).toBe(true)
    expect(supportsStrictTools("https://api.deepseek.com/beta/")).toBe(true)
  })

  it("returns false for non-beta endpoints", () => {
    expect(supportsStrictTools("https://api.deepseek.com/v1")).toBe(false)
    expect(supportsStrictTools("https://api.deepseek.com")).toBe(false)
    expect(supportsStrictTools("https://api.openai.com/v1")).toBe(false)
  })
})

describe("applyStrictToolMode", () => {
  it("adds strict:true on beta endpoint", () => {
    const result = applyStrictToolMode(
      {
        type: "function",
        function: { name: "test", parameters: { type: "object", properties: {} } },
      },
      "https://api.deepseek.com/beta",
    )
    expect(result.function.strict).toBe(true)
  })

  it("strips strict on non-beta endpoint", () => {
    const result = applyStrictToolMode(
      {
        type: "function",
        function: { name: "test", parameters: {}, strict: true },
      },
      "https://api.deepseek.com/v1",
    )
    expect(result.function.strict).toBeUndefined()
  })

  it("does not add strict when schema has anyOf", () => {
    const result = applyStrictToolMode(
      {
        type: "function",
        function: {
          name: "test",
          parameters: { anyOf: [{ type: "string" }, { type: "number" }] },
        },
      },
      "https://api.deepseek.com/beta",
    )
    expect(result.function.strict).toBeUndefined()
  })
})