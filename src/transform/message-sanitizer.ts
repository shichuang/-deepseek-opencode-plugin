/**
 * DeepSeek Protocol Adaptation Layer
 *
 * Handles DeepSeek-specific API requirements:
 * 1. Reasoning content sanitizer
 * 2. Strict tool mode
 * 3. Tool choice management
 *
 * Follows OmO engineering spec: no `any` types.
 */

import type { SanitizerMessage, FunctionToolDefinition } from "../types/index.js"

// ── Reasoning Content Sanitizer ─────────────────────────────────────

const REASONING_PLACEHOLDER = "(reasoning omitted)"

export interface ReasoningSanitizerInput {
  messages: readonly Record<string, unknown>[]
  model: string
  reasoningEffort?: string | null
  provider?: string
}

export interface ReasoningSanitizerResult {
  messages: Record<string, unknown>[]
  substitutions: number
  replayChars: number
  replayMessages: number
}

export function shouldSanitizeReasoning(
  model: string,
  reasoningEffort?: string | null,
  provider?: string,
): boolean {
  const isDs = model.toLowerCase().includes("deepseek") || (provider?.toLowerCase().includes("deepseek") ?? false)
  if (!isDs) return false
  if (!reasoningEffort) return false
  const effort = reasoningEffort.trim().toLowerCase()
  return effort !== "off" && effort !== "disabled" && effort !== "none"
}

export function sanitizeReasoningMessages(input: ReasoningSanitizerInput): ReasoningSanitizerResult {
  const { messages, model, reasoningEffort, provider } = input
  if (!shouldSanitizeReasoning(model, reasoningEffort, provider)) {
    return { messages: [...messages], substitutions: 0, replayChars: 0, replayMessages: 0 }
  }

  const result = messages.map((m) => ({ ...m })) as SanitizerMessage[]
  let substitutions = 0
  let replayChars = 0
  let replayMessages = 0

  for (const msg of result) {
    if (msg.role !== "assistant") continue

    const hasToolCalls = msg.tool_calls !== undefined && msg.tool_calls !== null
      && (Array.isArray(msg.tool_calls) ? msg.tool_calls.length > 0 : true)

    const reasoningEmpty = msg.reasoning_content === undefined || msg.reasoning_content === null
      || (typeof msg.reasoning_content === "string" && msg.reasoning_content.trim() === "")

    if (hasToolCalls && reasoningEmpty) {
      msg.reasoning_content = REASONING_PLACEHOLDER
      substitutions++
    }

    if (typeof msg.reasoning_content === "string" && msg.reasoning_content.length > 0) {
      replayChars += msg.reasoning_content.length
      replayMessages++
    }
  }

  return { messages: result, substitutions, replayChars, replayMessages }
}

export function logReasoningReplay(result: ReasoningSanitizerResult): void {
  if (result.substitutions > 0) {
    console.warn(
      `[deepseek] Sanitizer: ${result.substitutions} message(s) needed reasoning placeholder`,
    )
  }
  if (result.replayMessages > 0) {
    const approxTokens = Math.floor(result.replayChars / 4)
    console.debug(
      `[deepseek] Reasoning replay: ${result.replayMessages} message(s), ~${approxTokens} tokens re-sent`,
    )
  }
}

// ── Strict Tool Mode ─────────────────────────────────────────────────

export function supportsStrictTools(baseURL: string): boolean {
  const trimmed = baseURL.trim().toLowerCase().replace(/\/+$/, "")
  return trimmed === "https://api.deepseek.com/beta"
}

export function applyStrictToolMode(
  tool: FunctionToolDefinition,
  baseURL: string,
): FunctionToolDefinition {
  if (!supportsStrictTools(baseURL)) {
    if (tool.function.strict !== undefined) {
      const { strict: _, ...rest } = tool.function
      return { ...tool, function: rest }
    }
    return tool
  }

  const params = tool.function.parameters
  if (params && !(params as Record<string, unknown>).anyOf) {
    return { ...tool, function: { ...tool.function, strict: true } }
  }
  return tool
}


