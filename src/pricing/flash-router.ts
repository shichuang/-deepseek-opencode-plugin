/**
 * Flash-First Cost Control
 *
 * Reasonix-style automatic routing: detects lightweight operations
 * and recommends deepseek-v4-flash over deepseek-v4-pro to save cost.
 *
 * Ported concept from Reasonix controlsemantics/semantic_router.
 *
 * Rules:
 * - Simple lookups (read, search, list, status) → suggest flash
 * - Multi-file refactors, architecture, debugging → keep pro
 * - Tool output interpretation, single-function codegen → either (flash OK)
 *
 * Injected via chat.params hook: adds a model hint to the system prompt
 * or body options so the agent can choose cost-optimal routing.
 */

export type TaskCategory = "lookup" | "generation" | "refactor" | "debug" | "unknown"

/**
 * Heuristic classifier: estimate task complexity from user message content.
 * This is intentionally simple and non-ML — just keyword/pattern matching.
 */
export function classifyTask(content: string): TaskCategory {
  const lower = content.toLowerCase()

  // Debug keywords
  if (/debug|fix.*bug|crash|error|broken|not working|failing/.test(lower)) return "debug"

  // Refactor keywords
  if (/refactor|rewrite|migrate|restructure|split.*file|extract.*module|multi.*file/.test(lower)) return "refactor"

  // Generation keywords
  if (/create|build|write|implement|add.*feature|new.*file|generate|scaffold/.test(lower)) return "generation"

  // Lookup keywords
  if (/find|search|read|show|list|check|look|where|what|how|explain|describe|locate/.test(lower)) return "lookup"

  return "unknown"
}

/**
 * Cost-optimal model recommendation.
 * Returns the recommended model ID, or null if current model is fine.
 */
export function recommendCostOptimal(
  currentModel: string | undefined,
  taskCategory: TaskCategory,
): string | null {
  if (!currentModel) return null

  const isPro = currentModel.toLowerCase().includes("v4-pro") || currentModel === "deepseek-v4-pro"
  const isFlash = currentModel.toLowerCase().includes("v4-flash") || currentModel === "deepseek-v4-flash" || currentModel === "deepseek-chat"

  // Already on flash → always fine (cheapest)
  if (isFlash) return null

  // On pro for lookup → suggest downgrade
  if (isPro && (taskCategory === "lookup")) {
    return "deepseek-v4-flash"
  }

  // On pro for simple generation → either is fine, but flash saves money
  if (isPro && taskCategory === "generation") {
    return "deepseek-v4-flash"
  }

  // Refactor/debug → keep pro for quality
  return null
}

/**
 * Format a cost-savings estimate for display.
 */
export function estimateSavings(taskCategory: TaskCategory): string {
  switch (taskCategory) {
    case "lookup":
      return "flash saves ~67% vs pro on simple lookups"
    case "generation":
      return "flash saves ~67% vs pro on generation tasks"
    case "refactor":
      return "pro recommended for multi-file refactors"
    case "debug":
      return "pro recommended for debugging"
    default:
      return ""
  }
}

/**
 * Flash-first cost note — injected when the model is on pro but
 * doing lightweight work. The system prompt tells the agent to
 * prefer flash for cheap operations.
 */
export const FLASH_FIRST_NOTE = `## Cost-Optimal Model Routing

For simple lookups (read, search, list, status) and straightforward code
generation, prefer deepseek-v4-flash — it's ~3× cheaper than v4-pro with
the same 1M context window and full tool support.

Use v4-pro for: debugging, architecture design, security review, and
multi-file refactors where reasoning depth matters.

Think: "Can flash do this?" before defaulting to pro.`
