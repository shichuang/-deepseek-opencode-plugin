/**
 * Reasoning Content Round-Trip Enhancer
 *
 * Ported from DeepSeek-Reasonix internal/provider/provider.go
 *
 * DeepSeek V4 thinking mode requires reasoning_content to be
 * preserved across multi-turn conversations. Messages with tool_calls
 * must carry reasoning_content (even if empty) or the API returns 400.
 *
 * This goes beyond the basic placeholder injection:
 * 1. Reasoning signature tracking (for Anthropic-style signed reasoning)
 * 2. Reasoning content passthrough validation
 * 3. Message-to-message reasoning chain integrity
 *
 * The `reasoning_signature` field is an opaque provider-issued proof
 * that the reasoning content is genuine model output. DeepSeek's
 * openai-compatible endpoint doesn't currently use signatures, but
 * this module preserves the field for forward compatibility.
 */

export interface ReasoningMeta {
  /** The reasoning content string (may be empty). */
  content: string
  /** Opaque signature from the provider, if any. */
  signature?: string
  /** Whether the content was injected as a placeholder. */
  injected: boolean
}

/**
 * Extract reasoning metadata from an assistant message.
 */
export function extractReasoning(msg: Record<string, unknown>): ReasoningMeta {
  return {
    content: typeof msg.reasoning_content === "string" ? msg.reasoning_content : "",
    signature: typeof msg.reasoning_signature === "string" ? msg.reasoning_signature : undefined,
    injected: msg._reasoning_injected === true,
  }
}

/**
 * Check if an assistant message needs reasoning_content injection.
 * DeepSeek requires reasoning_content on assistant messages with tool_calls.
 */
export function needsReasoningInjection(msg: Record<string, unknown>): boolean {
  if (msg.role !== "assistant") return false

  const hasToolCalls = msg.tool_calls !== undefined && msg.tool_calls !== null
    && (!Array.isArray(msg.tool_calls) || msg.tool_calls.length > 0)

  if (!hasToolCalls) return false

  const reasoning = msg.reasoning_content
  return reasoning === undefined || reasoning === null
    || (typeof reasoning === "string" && reasoning.trim() === "")
}

/**
 * Prepare an assistant message for transmission to DeepSeek.
 * Ensures reasoning_content is present if tool_calls exist.
 * Preserves reasoning_signature if present.
 *
 * Returns: the modified message and whether injection occurred.
 */
export function prepareReasoning(
  msg: Record<string, unknown>,
): { message: Record<string, unknown>; injected: boolean } {
  if (!needsReasoningInjection(msg)) {
    return { message: msg, injected: false }
  }

  const result = { ...msg }
  const existing = extractReasoning(msg)

  if (existing.signature) {
    // Preserve signature even when injecting placeholder content
    result.reasoning_signature = existing.signature
  }

  result.reasoning_content = "(reasoning omitted)"
  result._reasoning_injected = true

  return { message: result, injected: true }
}

/**
 * Prepare all messages in a conversation for DeepSeek transmission.
 * Handles the full reasoning chain: ensures every assistant message
 * with tool_calls has reasoning_content.
 */
export function prepareReasoningChain(
  messages: Record<string, unknown>[],
): { messages: Record<string, unknown>[]; injections: number } {
  let injections = 0
  const result = messages.map((msg) => {
    if (msg.role !== "assistant") return msg
    const prepared = prepareReasoning(msg)
    if (prepared.injected) injections++
    return prepared.message
  })
  return { messages: result, injections }
}

/**
 * Validate reasoning chain integrity after receiving a model response.
 * Checks that reasoning_content flows correctly across tool-call boundaries.
 */
export function validateReasoningChain(
  messages: readonly Record<string, unknown>[],
): { valid: boolean; violations: string[] } {
  const violations: string[] = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (msg.role !== "assistant") continue

    const hasToolCalls = msg.tool_calls !== undefined && msg.tool_calls !== null
      && (!Array.isArray(msg.tool_calls) || (msg.tool_calls as unknown[]).length > 0)

    if (!hasToolCalls) continue

    const reasoning = extractReasoning(msg)
    if (reasoning.content === "" && !reasoning.injected) {
      violations.push(`Message[${i}]: assistant has tool_calls but no reasoning_content`)
    }
  }

  return { valid: violations.length === 0, violations }
}

/**
 * Strip injected markers before persisting to conversation history.
 * Internal injection markers (_reasoning_injected) should not leak.
 */
export function stripInjectionMarkers(
  messages: Record<string, unknown>[],
): Record<string, unknown>[] {
  return messages.map((msg) => {
    if (msg._reasoning_injected !== undefined) {
      const { _reasoning_injected, ...rest } = msg as Record<string, unknown>
      return rest
    }
    return msg
  })
}
