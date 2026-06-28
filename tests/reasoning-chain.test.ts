/**
 * Tests for reasoning-chain.ts
 */

import { describe, it, expect } from "vitest"
import {
  extractReasoning,
  needsReasoningInjection,
  prepareReasoning,
  prepareReasoningChain,
  validateReasoningChain,
  stripInjectionMarkers,
} from "../src/transform/reasoning-chain.js"

describe("extractReasoning", () => {
  it("extracts reasoning_content from message", () => {
    const msg = { role: "assistant", reasoning_content: "thinking..." }
    expect(extractReasoning(msg)).toEqual({
      content: "thinking...",
      signature: undefined,
      injected: false,
    })
  })

  it("detects injected marker", () => {
    const msg = {
      role: "assistant",
      reasoning_content: "(reasoning omitted)",
      _reasoning_injected: true,
    }
    expect(extractReasoning(msg).injected).toBe(true)
  })

  it("handles missing reasoning_content", () => {
    expect(extractReasoning({ role: "assistant" })).toEqual({
      content: "",
      signature: undefined,
      injected: false,
    })
  })
})

describe("needsReasoningInjection", () => {
  it("returns true for assistant with tool_calls and no reasoning", () => {
    expect(needsReasoningInjection({
      role: "assistant",
      tool_calls: [{ id: "1", name: "read", arguments: "{}" }],
    })).toBe(true)
  })

  it("returns false for assistant with reasoning_content present", () => {
    expect(needsReasoningInjection({
      role: "assistant",
      tool_calls: [{ id: "1", name: "read", arguments: "{}" }],
      reasoning_content: "thinking...",
    })).toBe(false)
  })

  it("returns false for non-assistant messages", () => {
    expect(needsReasoningInjection({ role: "user", content: "hi" })).toBe(false)
  })

  it("returns false for assistant without tool_calls", () => {
    expect(needsReasoningInjection({
      role: "assistant",
      content: "Hello!",
    })).toBe(false)
  })
})

describe("prepareReasoning", () => {
  it("injects placeholder when reasoning is missing", () => {
    const { message, injected } = prepareReasoning({
      role: "assistant",
      tool_calls: [{ id: "1", name: "read", arguments: "{}" }],
    })
    expect(injected).toBe(true)
    expect(message.reasoning_content).toBe("(reasoning omitted)")
    expect(message._reasoning_injected).toBe(true)
  })

  it("preserves existing reasoning_signature", () => {
    const { message, injected } = prepareReasoning({
      role: "assistant",
      tool_calls: [{ id: "1", name: "read", arguments: "{}" }],
      reasoning_signature: "sig123",
    })
    expect(injected).toBe(true)
    expect(message.reasoning_signature).toBe("sig123")
    expect(message.reasoning_content).toBe("(reasoning omitted)")
  })

  it("does not inject when reasoning already present", () => {
    const { message, injected } = prepareReasoning({
      role: "assistant",
      tool_calls: [{ id: "1", name: "read", arguments: "{}" }],
      reasoning_content: "existing reasoning",
    })
    expect(injected).toBe(false)
    expect(message.reasoning_content).toBe("existing reasoning")
  })
})

describe("prepareReasoningChain", () => {
  it("prepares all assistant messages with tool_calls", () => {
    const { messages, injections } = prepareReasoningChain([
      { role: "system", content: "You are helpful." },
      { role: "user", content: "read file" },
      { role: "assistant", tool_calls: [{ id: "1", name: "read", arguments: "{}" }] },
      { role: "tool", tool_call_id: "1", content: "file content" },
      { role: "assistant", content: "done", tool_calls: [] },
    ])
    expect(injections).toBe(1)
    expect(messages[2].reasoning_content).toBe("(reasoning omitted)")
  })
})

describe("validateReasoningChain", () => {
  it("flags assistant messages with tool_calls but no reasoning", () => {
    const { valid, violations } = validateReasoningChain([
      { role: "assistant", tool_calls: [{ id: "1", name: "read", arguments: "{}" }] },
    ])
    expect(valid).toBe(false)
    expect(violations.length).toBe(1)
  })

  it("passes valid chain", () => {
    const { valid, violations } = validateReasoningChain([
      {
        role: "assistant",
        tool_calls: [{ id: "1", name: "read", arguments: "{}" }],
        reasoning_content: "thinking...",
      },
    ])
    expect(valid).toBe(true)
    expect(violations.length).toBe(0)
  })
})

describe("stripInjectionMarkers", () => {
  it("removes _reasoning_injected from messages", () => {
    const result = stripInjectionMarkers([
      { role: "assistant", reasoning_content: "x", _reasoning_injected: true },
      { role: "user", content: "hi" },
    ])
    expect(result[0]).not.toHaveProperty("_reasoning_injected")
    expect(result[0]).toHaveProperty("reasoning_content")
    expect(result[1]).toEqual({ role: "user", content: "hi" })
  })
})
