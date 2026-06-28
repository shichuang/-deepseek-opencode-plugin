/**
 * Token Cost Tracking
 *
 * Provides per-model token pricing and cost estimation.
 * Supports USD (default) and CNY currency display.
 * Source: CodeWhale crates/config/src/pricing, models.dev data.
 */

export type Currency = "usd" | "cny"

export interface TokenPricing {
  /** USD price per million input tokens. */
  inputPerMTokens: number
  /** USD price per million output tokens. */
  outputPerMTokens: number
  /** USD price per million cached input tokens. */
  cachedInputPerMTokens: number
  /** Human-readable label. */
  label: string
}

/**
 * Built-in pricing for common DeepSeek models.
 * Prices are approximate and should be verified against provider websites.
 */
export const BUILTIN_PRICING: Record<string, TokenPricing> = {
  // DeepSeek V4 Pro — official pricing
  "deepseek-v4-pro": {
    inputPerMTokens: 0.43,
    outputPerMTokens: 1.72,
    cachedInputPerMTokens: 0.043,
    label: "DeepSeek V4 Pro",
  },

  // DeepSeek V4 Flash — official pricing
  "deepseek-v4-flash": {
    inputPerMTokens: 0.14,
    outputPerMTokens: 0.56,
    cachedInputPerMTokens: 0.014,
    label: "DeepSeek V4 Flash",
  },

  // Aliases
  "deepseek-chat": {
    inputPerMTokens: 0.14,
    outputPerMTokens: 0.56,
    cachedInputPerMTokens: 0.014,
    label: "DeepSeek V4 Flash (chat alias)",
  },
  "deepseek-reasoner": {
    inputPerMTokens: 0.14,
    outputPerMTokens: 0.56,
    cachedInputPerMTokens: 0.014,
    label: "DeepSeek V4 Flash (reasoner alias)",
  },

  // GLM-5 series (Z.AI)
  "glm-5.2": {
    inputPerMTokens: 0.50,
    outputPerMTokens: 2.00,
    cachedInputPerMTokens: 0.05,
    label: "GLM-5.2 (Z.AI)",
  },
  "glm-5-turbo": {
    inputPerMTokens: 0.15,
    outputPerMTokens: 0.60,
    cachedInputPerMTokens: 0.015,
    label: "GLM-5 Turbo (Z.AI)",
  },

  // Kimi (Moonshot)
  "kimi-k2.7-code": {
    inputPerMTokens: 0.40,
    outputPerMTokens: 1.60,
    cachedInputPerMTokens: 0.04,
    label: "Kimi K2.7 Code (Moonshot)",
  },

  // StepFun
  "step-3.7-flash": {
    inputPerMTokens: 0.14,
    outputPerMTokens: 0.56,
    cachedInputPerMTokens: 0.014,
    label: "Step 3.7 Flash (StepFun)",
  },

  // MiniMax
  "minimax-m3": {
    inputPerMTokens: 0.50,
    outputPerMTokens: 2.00,
    cachedInputPerMTokens: 0.05,
    label: "MiniMax M3",
  },

  // MiMo (Xiaomi)
  "mimo-v2.5-pro": {
    inputPerMTokens: 0.45,
    outputPerMTokens: 1.80,
    cachedInputPerMTokens: 0.045,
    label: "MiMo V2.5 Pro (Xiaomi)",
  },
  // Provider-level pricing (via SiliconFlow, Volcengine, etc.)
  "deepseek-ai/deepseek-v4-pro": {
    inputPerMTokens: 0.43, outputPerMTokens: 1.72, cachedInputPerMTokens: 0.043, label: "DeepSeek V4 Pro (3rd-party)",
  },
  "deepseek-ai/deepseek-v4-flash": {
    inputPerMTokens: 0.14, outputPerMTokens: 0.56, cachedInputPerMTokens: 0.014, label: "DeepSeek V4 Flash (3rd-party)",
  },
  "deepseek/deepseek-v4-pro": {
    inputPerMTokens: 0.43, outputPerMTokens: 1.72, cachedInputPerMTokens: 0.043, label: "DeepSeek V4 Pro (OpenRouter/Novita)",
  },
  "deepseek/deepseek-v4-flash": {
    inputPerMTokens: 0.14, outputPerMTokens: 0.56, cachedInputPerMTokens: 0.014, label: "DeepSeek V4 Flash (OpenRouter/Novita)",
  },
  "accounts/fireworks/models/deepseek-v4-pro": {
    inputPerMTokens: 0.50, outputPerMTokens: 2.00, cachedInputPerMTokens: 0.05, label: "DeepSeek V4 Pro (Fireworks)",
  },
  "trinity-large-thinking": {
    inputPerMTokens: 0.45, outputPerMTokens: 1.80, cachedInputPerMTokens: 0.045, label: "Arcee Trinity Large Thinking",
  },
  "kimi-k2.6": {
    inputPerMTokens: 0.30, outputPerMTokens: 1.20, cachedInputPerMTokens: 0.03, label: "Kimi K2.6 (Moonshot)",
  },
  "minimax-m2.7": {
    inputPerMTokens: 0.25, outputPerMTokens: 1.00, cachedInputPerMTokens: 0.025, label: "MiniMax M2.7",
  },
  "glm-5.1": {
    inputPerMTokens: 0.40, outputPerMTokens: 1.60, cachedInputPerMTokens: 0.04, label: "GLM-5.1 (Z.AI)",
  },
  "mimo-v2.5": {
    inputPerMTokens: 0.20, outputPerMTokens: 0.80, cachedInputPerMTokens: 0.02, label: "MiMo V2.5 (Xiaomi)",
  },
}

/** CNY exchange rate (approximate). */
const USD_TO_CNY = 7.2

/**
 * Look up pricing for a model. Falls back through aliases and partial matches.
 */
export function findPricing(modelId: string): TokenPricing | null {
  // Exact match
  if (BUILTIN_PRICING[modelId]) return BUILTIN_PRICING[modelId]

  // Lowercase match
  const lower = modelId.toLowerCase()
  if (BUILTIN_PRICING[lower]) return BUILTIN_PRICING[lower]

  // Partial match (e.g. "deepseek-ai/deepseek-v4-pro" → "deepseek-v4-pro")
  for (const [key, pricing] of Object.entries(BUILTIN_PRICING)) {
    if (lower.includes(key)) return pricing
  }

  return null
}

/**
 * Format price in the requested currency. With optional /M suffix.
 */
export function formatPrice(usd: number, currency: Currency, perM = false): string {
  const suffix = perM ? "/M" : ""
  if (currency === "cny") {
    const cny = usd * USD_TO_CNY
    return `¥${cny.toFixed(2)}/M`
  }
  return `$${usd.toFixed(2)}/M`
}

/**
 * Calculate estimated turn cost from token usage.
 *
 * @param pricing Model pricing
 * @param inputTokens Non-cached input tokens
 * @param outputTokens Output tokens
 * @param cachedInputTokens Cached input tokens
 * @returns Estimated cost in USD
 */
export function calculateTurnCost(
  pricing: TokenPricing,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number = 0,
): number {
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMTokens
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMTokens
  const cachedCost = (cachedInputTokens / 1_000_000) * pricing.cachedInputPerMTokens
  return inputCost + outputCost + cachedCost
}

/**
 * Render cost summary for display.
 */
export function renderCostSummary(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number,
  currency: Currency = "usd",
): string {
  const pricing = findPricing(modelId)
  const pLabel = pricing?.label || modelId

  const lines = [
    `## Cost Summary — ${pLabel}`,
    "",
    `| Metric | Tokens | Cost |`,
    `|--------|--------|------|`,
  ]

  if (pricing) {
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMTokens
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMTokens
    const cachedCost = (cachedInputTokens / 1_000_000) * pricing.cachedInputPerMTokens
    const total = inputCost + outputCost + cachedCost

    lines.push(`| Input (non-cached) | ${inputTokens.toLocaleString()} | ${formatPrice(inputCost, currency)} |`)
    lines.push(`| Input (cached) | ${cachedInputTokens.toLocaleString()} | ${formatPrice(cachedCost, currency)} |`)
    lines.push(`| Output | ${outputTokens.toLocaleString()} | ${formatPrice(outputCost, currency)} |`)
    lines.push(`| **Total** | **${(inputTokens + cachedInputTokens + outputTokens).toLocaleString()}** | **${formatPrice(total, currency)}** |`)
    lines.push("")
    lines.push(`Cache savings: ~${Math.round((cachedInputTokens / Math.max(1, inputTokens + cachedInputTokens)) * 100)}% of input served from cache`)
  } else {
    lines.push(`| All tokens | ${(inputTokens + cachedInputTokens + outputTokens).toLocaleString()} | Unknown pricing |`)
    lines.push("")
    lines.push("No pricing data available for this model.")
  }

  return lines.join("\n")
}