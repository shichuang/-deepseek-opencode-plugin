/**
 * Tests for type-guards.ts
 */

import { describe, it, expect } from "vitest"
import {
  extractModelRef,
  extractModelId,
  isDeepSeekModel,
  isDeepSeekV4,
  extractMessage,
  extractReasoningEffort,
  extractTools,
  extractBaseURL,
  extractCommand,
  extractArgs,
  extractPlugins,
} from "../src/types/type-guards.js"

describe("extractModelRef", () => {
  it("extracts from string", () => {
    expect(extractModelRef("deepseek-v4-pro")).toEqual({ id: "deepseek-v4-pro" })
  })

  it("extracts from object", () => {
    expect(extractModelRef({ id: "ds", providerID: "deepseek" }))
      .toEqual({ id: "ds", modelID: undefined, providerID: "deepseek" })
  })

  it("returns undefined for null/primitive", () => {
    expect(extractModelRef(null)).toBeUndefined()
    expect(extractModelRef(42)).toBeUndefined()
  })
})

describe("extractModelId", () => {
  it("prefers id over modelID", () => {
    expect(extractModelId({ id: "foo", modelID: "bar" })).toBe("foo")
  })

  it("falls back to modelID", () => {
    expect(extractModelId({ modelID: "bar" })).toBe("bar")
  })
})

describe("isDeepSeekModel", () => {
  it("matches deepseek models", () => {
    expect(isDeepSeekModel("deepseek-v4-pro")).toBe(true)
    expect(isDeepSeekModel("DEEPSEEK-CHAT")).toBe(true)
    expect(isDeepSeekModel("gpt-4")).toBe(false)
    expect(isDeepSeekModel(undefined)).toBe(false)
  })
})

describe("isDeepSeekV4", () => {
  it("matches only V4 models", () => {
    expect(isDeepSeekV4("deepseek-v4-pro")).toBe(true)
    expect(isDeepSeekV4("deepseek-v3")).toBe(false)
    expect(isDeepSeekV4("deepseek-chat")).toBe(false)
  })
})

describe("extractMessage", () => {
  it("extracts message fields", () => {
    expect(extractMessage({ role: "user", content: "hi" }))
      .toEqual({ role: "user", content: "hi", variant: undefined })
  })

  it("returns undefined for non-objects", () => {
    expect(extractMessage(null)).toBeUndefined()
    expect(extractMessage("string")).toBeUndefined()
  })
})

describe("extractReasoningEffort", () => {
  it("prefers reasoning_effort over reasoningEffort", () => {
    expect(extractReasoningEffort({ reasoning_effort: "medium", reasoningEffort: "low" }))
      .toBe("medium")
  })

  it("returns undefined for missing", () => {
    expect(extractReasoningEffort({})).toBeUndefined()
    expect(extractReasoningEffort(null)).toBeUndefined()
  })
})

describe("extractTools", () => {
  it("returns array", () => {
    expect(extractTools([{ name: "t1" }])).toEqual([{ name: "t1" }])
  })

  it("returns empty array for non-arrays", () => {
    expect(extractTools(null)).toEqual([])
    expect(extractTools({})).toEqual([])
  })
})

describe("extractBaseURL", () => {
  it("returns string or default", () => {
    expect(extractBaseURL("https://api.deepseek.com/v1")).toBe("https://api.deepseek.com/v1")
    expect(extractBaseURL(null)).toBe("https://api.deepseek.com/beta")
  })
})

describe("extractCommand", () => {
  it("returns string or empty", () => {
    expect(extractCommand("codewhale:doctor")).toBe("codewhale:doctor")
    expect(extractCommand(null)).toBe("")
  })
})

describe("extractArgs", () => {
  it("returns object or empty", () => {
    expect(extractArgs({ key: "val" })).toEqual({ key: "val" })
    expect(extractArgs(null)).toEqual({})
  })
})

describe("extractPlugins", () => {
  it("returns array or empty", () => {
    expect(extractPlugins({ plugins: ["a", "b"] })).toEqual(["a", "b"])
    expect(extractPlugins(null)).toEqual([])
    expect(extractPlugins({})).toEqual([])
  })
})
