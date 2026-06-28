/**
 * Context Window Detection
 *
 * Provides model-specific context window size information that gets
 * injected into the system prompt. This mirrors CodeWhale's
 * `{context_window_note}` template substitution.
 *
 * Knowing the context window size helps the model self-manage:
 * - When to suggest /compact
 * - How much context is "a lot"
 * - Whether paraphrasing is worth the cache break
 */

export interface ContextWindowInfo {
  /** Model ID pattern (lowercase partial match). */
  pattern: string
  /** Context window size in tokens. */
  windowTokens: number
  /** Human-readable description. */
  label: string
  /** Provider, if specific. */
  provider?: string
}

/**
 * Known context window sizes for common models.
 * These are approximate; providers may change them.
 */
export const KNOWN_CONTEXT_WINDOWS: ContextWindowInfo[] = [
  // DeepSeek V4 family
  { pattern: "deepseek-v4-pro", windowTokens: 1_000_000, label: "DeepSeek V4 Pro (1M tokens)" },
  { pattern: "deepseek-v4-flash", windowTokens: 1_000_000, label: "DeepSeek V4 Flash (1M tokens)" },
  { pattern: "deepseek-chat", windowTokens: 1_000_000, label: "DeepSeek Chat/V4 Flash (1M tokens)" },
  { pattern: "deepseek-reasoner", windowTokens: 1_000_000, label: "DeepSeek Reasoner (1M tokens)" },
  { pattern: "deepseek-v3", windowTokens: 128_000, label: "DeepSeek V3 (128K tokens)" },
  { pattern: "deepseek-r1", windowTokens: 128_000, label: "DeepSeek R1 (128K tokens)" },

  // GLM family
  { pattern: "glm-5", windowTokens: 1_000_000, label: "GLM-5 (1M tokens)" },

  // Kimi
  { pattern: "kimi-k2", windowTokens: 128_000, label: "Kimi K2 (128K tokens)" },

  // OpenAI
  { pattern: "gpt-5", windowTokens: 256_000, label: "GPT-5 (256K tokens)" },
  { pattern: "gpt-4", windowTokens: 128_000, label: "GPT-4 (128K tokens)" },

  // Anthropic
  { pattern: "claude-sonnet-4", windowTokens: 200_000, label: "Claude Sonnet 4 (200K tokens)" },
  { pattern: "claude-opus-4", windowTokens: 200_000, label: "Claude Opus 4 (200K tokens)" },

  // MiniMax
  { pattern: "minimax-m3", windowTokens: 1_000_000, label: "MiniMax M3 (1M tokens)" },
  { pattern: "minimax-m2", windowTokens: 256_000, label: "MiniMax M2 (256K tokens)" },

  // StepFun
  { pattern: "step-3", windowTokens: 256_000, label: "Step 3 (256K tokens)" },

  // MiMo
  { pattern: "mimo-v2.5-pro", windowTokens: 1_000_000, label: "MiMo V2.5 Pro (1M tokens)" },
  { pattern: "mimo-v2.5", windowTokens: 256_000, label: "MiMo V2.5 (256K tokens)" },
]

/**
 * Detect the context window size for a given model.
 * Returns the best match, or null if unknown.
 */
export function detectContextWindow(modelId?: string, providerId?: string): ContextWindowInfo | null {
  if (!modelId) return null
  const lower = modelId.toLowerCase()

  // Exact match first
  for (const info of KNOWN_CONTEXT_WINDOWS) {
    if (lower === info.pattern && (!info.provider || info.provider === providerId)) {
      return info
    }
  }

  // Partial match
  for (const info of KNOWN_CONTEXT_WINDOWS) {
    if (lower.includes(info.pattern) && (!info.provider || info.provider === providerId)) {
      return info
    }
  }

  return null
}

/**
 * Render context window guidance for system prompt injection.
 * Mirrors CodeWhale's `{context_window_note}` behavior.
 */
export function renderContextWindowNote(modelId?: string, providerId?: string): string {
  const info = detectContextWindow(modelId, providerId)

  if (info) {
    if (info.windowTokens >= 1_000_000) {
      return `You have a one-million-token context window. Do not summarize or delete earlier turns just because the transcript has crossed an older threshold. During long sessions, suggest /compact only when the context-pressure indicator reports high pressure.`
    }
    return `You have a ${info.windowTokens.toLocaleString()}-token context window. Treat the context-pressure indicator as authoritative and suggest /compact when it reports high pressure.`
  }

  // Generic fallback
  return `Your context window is provider-dependent. Treat the context-pressure indicator as authoritative and suggest /compact when it reports high pressure.`
}