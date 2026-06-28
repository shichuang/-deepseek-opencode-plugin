/**
 * Functional integration test â€?simulates OpenCode loading the plugin
 * and verifies each hook transforms input/output correctly.
 *
 * This test proves the plugin WORKS, not just that it compiles.
 */

import { describe, it, expect, beforeAll } from "vitest"

// We import the compiled JS to simulate real runtime loading
let pluginModule: any
let server: any

beforeAll(async () => {
  // This imports the same module OpenCode loads at runtime
  const mod = await import("../dist/index.js")
  pluginModule = mod.default
  server = pluginModule.server

  // Verify plugin module shape matches OpenCode's PluginModule type
  expect(pluginModule).toHaveProperty("id")
  expect(pluginModule).toHaveProperty("server")
  expect(typeof server).toBe("function")
})

describe("plugin loading", () => {
  it("has correct plugin ID", () => {
    expect(pluginModule.id).toBe("deepseek")
  })

  it("returns empty hooks when disabled", async () => {
    const hooks = await server(
      { client: {}, directory: "/tmp/test", worktree: "/tmp/test" },
      { enabled: false },
    )
    expect(hooks).toEqual({})
  })
})

describe("hook registration", () => {
  let hooks: Record<string, unknown>

  beforeAll(async () => {
    hooks = await server(
      { client: { plugins: [] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {
        providers: { enhanceDeepSeek: true, extendedProviders: false, strictToolMode: false, reasoningSanitizer: false },
        prompts: { constitution: false, statutes: false, regulations: false, v4Characteristics: "off", languagePolicy: "off", cacheStrategy: false, thinkingBudget: false },
        agents: { roleTaxonomy: false },
        skills: { bridgeCodewhaleSkills: false },
      },
    )
  })

  it("registers system.transform hook", () => {
    expect(hooks).toHaveProperty("experimental.chat.system.transform")
    expect(typeof hooks["experimental.chat.system.transform"]).toBe("function")
  })

  it("registers chat.params hook", () => {
    expect(hooks).toHaveProperty("chat.params")
    expect(typeof hooks["chat.params"]).toBe("function")
  })

  it("registers chat.message hook", () => {
    expect(hooks).toHaveProperty("chat.message")
    expect(typeof hooks["chat.message"]).toBe("function")
  })

  it("registers command.execute.before hook", () => {
    expect(hooks).toHaveProperty("command.execute.before")
    expect(typeof hooks["command.execute.before"]).toBe("function")
  })

  it("registers tool.definition hook", () => {
    expect(hooks).toHaveProperty("tool.definition")
    expect(typeof hooks["tool.definition"]).toBe("function")
  })

  it("registers config hook", () => {
    expect(hooks).toHaveProperty("config")
    expect(typeof hooks.config).toBe("function")
  })

  it("registers event hook", () => {
    expect(hooks).toHaveProperty("event")
    expect(typeof hooks.event).toBe("function")
  })

  it("registers dispose hook", () => {
    expect(hooks).toHaveProperty("dispose")
    expect(typeof hooks.dispose).toBe("function")
  })
})

describe("system.transform hook behavior", () => {
  it("injects context management section when prompts are off", async () => {
    const pluginHooks = await server(
      { client: { plugins: [] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {
        prompts: { constitution: false, statutes: false, regulations: false, v4Characteristics: "off", languagePolicy: "off", cacheStrategy: false, thinkingBudget: false },
        agents: { roleTaxonomy: false },
        skills: { bridgeCodewhaleSkills: false },
        providers: { enhanceDeepSeek: true, extendedProviders: false, strictToolMode: false, reasoningSanitizer: false },
      },
    )

    const systemParts: string[] = []
    const hook = pluginHooks["experimental.chat.system.transform"] as Function
    await hook({ model: { id: "deepseek-v4-pro" } }, { system: systemParts })

    // Should contain context management section even with all prompts off
    const hasContextMgmt = systemParts.some((s: string) => s.includes("Context Management"))
    expect(hasContextMgmt).toBe(true)
  })

  it("injects Constitution when enabled", async () => {
    const pluginHooks = await server(
      { client: { plugins: [] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {
        prompts: { constitution: true, statutes: true, regulations: false, v4Characteristics: "off", languagePolicy: "off", cacheStrategy: false, thinkingBudget: false },
        agents: { roleTaxonomy: false },
        skills: { bridgeCodewhaleSkills: false },
        providers: { enhanceDeepSeek: true, extendedProviders: false, strictToolMode: false, reasoningSanitizer: false },
      },
    )

    const systemParts: string[] = []
    const hook = pluginHooks["experimental.chat.system.transform"] as Function
    await hook({ model: { id: "deepseek-v4-pro" } }, { system: systemParts })

    const hasConstitution = systemParts.some((s: string) => s.includes("CONSTITUTION OF deepseek"))
    expect(hasConstitution).toBe(true)

    const hasStatutes = systemParts.some((s: string) => s.includes("STATUTES (Tier 2)"))
    expect(hasStatutes).toBe(true)
  })

  it("injects V4 characteristics for DeepSeek V4 model", async () => {
    const pluginHooks = await server(
      { client: { plugins: [] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {
        prompts: { constitution: false, statutes: false, regulations: false, v4Characteristics: "auto", languagePolicy: "off", cacheStrategy: false, thinkingBudget: false },
        agents: { roleTaxonomy: false },
        skills: { bridgeCodewhaleSkills: false },
        providers: { enhanceDeepSeek: true, extendedProviders: false, strictToolMode: false, reasoningSanitizer: false },
      },
    )

    const systemParts: string[] = []
    const hook = pluginHooks["experimental.chat.system.transform"] as Function
    await hook({ model: { id: "deepseek-v4-pro" } }, { system: systemParts })

    const hasV4 = systemParts.some((s: string) => s.includes("V4 Characteristics"))
    expect(hasV4).toBe(true)
  })

  it("does not inject V4 for non-V4 model", async () => {
    const pluginHooks = await server(
      { client: { plugins: [] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {
        prompts: { constitution: false, statutes: false, regulations: false, v4Characteristics: "auto", languagePolicy: "off", cacheStrategy: false, thinkingBudget: false },
        agents: { roleTaxonomy: false },
        skills: { bridgeCodewhaleSkills: false },
        providers: { enhanceDeepSeek: true, extendedProviders: false, strictToolMode: false, reasoningSanitizer: false },
      },
    )

    const systemParts: string[] = []
    const hook = pluginHooks["experimental.chat.system.transform"] as Function
    await hook({ model: { id: "gpt-4" } }, { system: systemParts })

    const hasV4 = systemParts.some((s: string) => s.includes("V4 Characteristics"))
    expect(hasV4).toBe(false)
  })

  it("is idempotent â€?does not re-inject when already present", async () => {
    const pluginHooks = await server(
      { client: { plugins: [] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {
        prompts: { constitution: true, statutes: false, regulations: false, v4Characteristics: "off", languagePolicy: "off", cacheStrategy: false, thinkingBudget: false },
        agents: { roleTaxonomy: false },
        skills: { bridgeCodewhaleSkills: false },
        providers: { enhanceDeepSeek: true, extendedProviders: false, strictToolMode: false, reasoningSanitizer: false },
      },
    )

    const output = { system: [] as string[] }
    const hook = pluginHooks["experimental.chat.system.transform"] as Function

    // First call
    await hook({ model: { id: "deepseek-v4-pro" } }, output)
    const count1 = output.system.length

    // Second call (with marker already present)
    await hook({ model: { id: "deepseek-v4-pro" } }, output)
    const count2 = output.system.length

    expect(count2).toBe(count1)
  })
})

describe("tool.definition hook behavior", () => {
  it("adds remember/recall tools when memory is enabled", async () => {
    process.env.deepseek_MEMORY = "on"

    const pluginHooks = await server(
      { client: { plugins: [] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {
        providers: { enhanceDeepSeek: true, extendedProviders: false, strictToolMode: false, reasoningSanitizer: false },
        prompts: { constitution: false, statutes: false, regulations: false, v4Characteristics: "off", languagePolicy: "off", cacheStrategy: false, thinkingBudget: false },
        agents: { roleTaxonomy: false },
        skills: { bridgeCodewhaleSkills: false },
      },
    )

    const output = { tools: [] as Record<string, unknown>[] }
    const hook = pluginHooks["tool.definition"] as Function
    await hook({ model: { id: "deepseek-v4-pro" } }, output)

    expect(output.tools.some((t) => t.name === "ds:remember")).toBe(true)
    expect(output.tools.some((t) => t.name === "ds:recall")).toBe(true)

    delete process.env.deepseek_MEMORY
  })

  it("canonicalizes DeepSeek tool schemas", async () => {
    const pluginHooks = await server(
      { client: { plugins: [] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {
        providers: { enhanceDeepSeek: true, extendedProviders: false, strictToolMode: true, reasoningSanitizer: false },
        prompts: { constitution: false, statutes: false, regulations: false, v4Characteristics: "off", languagePolicy: "off", cacheStrategy: false, thinkingBudget: false },
        agents: { roleTaxonomy: false },
        skills: { bridgeCodewhaleSkills: false },
      },
    )

    const output = {
      tools: [{
        type: "function",
        function: {
          name: "test",
          parameters: {
            type: "object",
            properties: { b: { type: "string" }, a: { type: "string" } },
            required: ["b", "a"],
          },
        },
      }],
    }

    const hook = pluginHooks["tool.definition"] as Function
    await hook({ model: { id: "deepseek-v4-pro" }, baseURL: "https://api.deepseek.com/beta" }, output)

    const tool = output.tools[0] as any
    // Require array should be sorted
    expect(tool.function.parameters.required).toEqual(["a", "b"])
    // Strict should be set
    expect(tool.function.strict).toBe(true)
  })
})

describe("command.execute.before hook behavior", () => {
  it("handles ds:status command", async () => {
    const pluginHooks = await server(
      { client: { plugins: [] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {
        prompts: { constitution: false, statutes: false, regulations: false, v4Characteristics: "off", languagePolicy: "off", cacheStrategy: false, thinkingBudget: false },
        agents: { roleTaxonomy: false },
        skills: { bridgeCodewhaleSkills: false },
        providers: { enhanceDeepSeek: true, extendedProviders: false, strictToolMode: false, reasoningSanitizer: false },
      },
    )

    const output = { result: "" as string | undefined }
    const hook = pluginHooks["command.execute.before"] as Function
    await hook({ command: "ds:status", args: {} }, output)

    expect(output.result).toBeTruthy()
    expect(output.result).toContain("deepseek DeepSeek Adaptation")
  })

  it("handles ds:providers command", async () => {
    const pluginHooks = await server(
      { client: { plugins: [] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {
        prompts: { constitution: false, statutes: false, regulations: false, v4Characteristics: "off", languagePolicy: "off", cacheStrategy: false, thinkingBudget: false },
        agents: { roleTaxonomy: false },
        skills: { bridgeCodewhaleSkills: false },
        providers: { enhanceDeepSeek: true, extendedProviders: false, strictToolMode: false, reasoningSanitizer: false },
      },
    )

    const output = { result: "" as string | undefined }
    const hook = pluginHooks["command.execute.before"] as Function
    await hook({ command: "ds:providers", args: {} }, output)

    expect(output.result).toBeTruthy()
    expect(output.result).toContain("SiliconFlow")
    expect(output.result).toContain("Moonshot")
  })

  it("ignores non-deepseek commands", async () => {
    const pluginHooks = await server(
      { client: { plugins: [] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {
        prompts: { constitution: false, statutes: false, regulations: false, v4Characteristics: "off", languagePolicy: "off", cacheStrategy: false, thinkingBudget: false },
        agents: { roleTaxonomy: false },
        skills: { bridgeCodewhaleSkills: false },
        providers: { enhanceDeepSeek: true, extendedProviders: false, strictToolMode: false, reasoningSanitizer: false },
      },
    )

    const output = { result: "untouched" as string | undefined }
    const hook = pluginHooks["command.execute.before"] as Function
    await hook({ command: "/help", args: {} }, output)

    expect(output.result).toBe("untouched")
  })
})

describe("message sanitizer hook behavior", () => {
  it("injects reasoning placeholder for DeepSeek messages with tool_calls", async () => {
    const pluginHooks = await server(
      { client: { plugins: [] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {
        providers: { enhanceDeepSeek: true, extendedProviders: false, strictToolMode: false, reasoningSanitizer: true },
        prompts: { constitution: false, statutes: false, regulations: false, v4Characteristics: "off", languagePolicy: "off", cacheStrategy: false, thinkingBudget: false },
        agents: { roleTaxonomy: false },
        skills: { bridgeCodewhaleSkills: false },
      },
    )

    const output = {
      messages: [{
        role: "assistant",
        tool_calls: [{ id: "call_1", name: "read_file", arguments: "{}" }],
      }],
    }

    const hook = pluginHooks["experimental.chat.messages.transform"] as Function
    await hook(
      { model: { id: "deepseek-v4-pro", providerID: "deepseek" }, options: { reasoning_effort: "medium" } },
      output,
    )

    expect(output.messages[0]).toHaveProperty("reasoning_content")
    expect(output.messages[0].reasoning_content).toBe("(reasoning omitted)")
    expect(output.messages[0]).toHaveProperty("_reasoning_injected", true)
  })

  it("does not inject for non-DeepSeek models", async () => {
    const pluginHooks = await server(
      { client: { plugins: [] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {
        providers: { enhanceDeepSeek: true, extendedProviders: false, strictToolMode: false, reasoningSanitizer: true },
        prompts: { constitution: false, statutes: false, regulations: false, v4Characteristics: "off", languagePolicy: "off", cacheStrategy: false, thinkingBudget: false },
        agents: { roleTaxonomy: false },
        skills: { bridgeCodewhaleSkills: false },
      },
    )

    const output = {
      messages: [{
        role: "assistant",
        tool_calls: [{ id: "call_1", name: "read_file", arguments: "{}" }],
      }],
    }

    const hook = pluginHooks["experimental.chat.messages.transform"] as Function
    await hook(
      { model: { id: "gpt-4", providerID: "openai" }, options: { reasoning_effort: "medium" } },
      output,
    )

    // Should NOT have injected reasoning for non-DeepSeek model
    expect(output.messages[0]).not.toHaveProperty("reasoning_content")
  })
})

describe("duplicate plugin detection", () => {
  it("returns empty hooks when duplicate detected", async () => {
    const hooks = await server(
      { client: { plugins: ["deepseek"] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {},
    )
    expect(hooks).toEqual({})
  })
})

describe("config hook", () => {
  it("is callable (noop)", async () => {
    const pluginHooks = await server(
      { client: { plugins: [] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {
        prompts: { constitution: false, statutes: false, regulations: false, v4Characteristics: "off", languagePolicy: "off", cacheStrategy: false, thinkingBudget: false },
        agents: { roleTaxonomy: false },
        skills: { bridgeCodewhaleSkills: false },
        providers: { enhanceDeepSeek: true, extendedProviders: false, strictToolMode: false, reasoningSanitizer: false },
      },
    )

    const configFn = pluginHooks.config as Function
    await expect(configFn({})).resolves.toBeUndefined()
  })
})

describe("event/dispose lifecycle", () => {
  it("event hook handles session.created", async () => {
    const pluginHooks = await server(
      { client: { plugins: [] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {
        prompts: { constitution: false, statutes: false, regulations: false, v4Characteristics: "off", languagePolicy: "off", cacheStrategy: false, thinkingBudget: false },
        agents: { roleTaxonomy: false },
        skills: { bridgeCodewhaleSkills: false },
        providers: { enhanceDeepSeek: true, extendedProviders: false, strictToolMode: false, reasoningSanitizer: false },
      },
    )

    const eventFn = pluginHooks.event as Function
    await expect(eventFn({ type: "session.created", sessionID: "test-123" })).resolves.toBeUndefined()
    await expect(eventFn({ type: "unknown" })).resolves.toBeUndefined()
  })

  it("dispose hook is callable", async () => {
    const pluginHooks = await server(
      { client: { plugins: [] }, directory: "/tmp/test", worktree: "/tmp/test" },
      {
        prompts: { constitution: false, statutes: false, regulations: false, v4Characteristics: "off", languagePolicy: "off", cacheStrategy: false, thinkingBudget: false },
        agents: { roleTaxonomy: false },
        skills: { bridgeCodewhaleSkills: false },
        providers: { enhanceDeepSeek: true, extendedProviders: false, strictToolMode: false, reasoningSanitizer: false },
      },
    )

    const disposeFn = pluginHooks.dispose as Function
    await expect(disposeFn()).resolves.toBeUndefined()
  })
})
