/**
 * Type guard helpers for plugin hook inputs.
 *
 * Replaces `as` assertions with validated extraction functions.
 * Each guard checks the shape of the input and returns a typed
 * value or undefined if the shape doesn't match.
 */

// ── Model ID extraction ─────────────────────────────────────────────

export interface ModelRef {
  readonly id?: string
  readonly modelID?: string
  readonly providerID?: string
}

export function extractModelRef(input: unknown): ModelRef | undefined {
  if (typeof input === "string") return { id: input }
  if (typeof input !== "object" || input === null) return undefined
  const obj = input as Record<string, unknown>
  return {
    id: typeof obj.id === "string" ? obj.id : undefined,
    modelID: typeof obj.modelID === "string" ? obj.modelID : undefined,
    providerID: typeof obj.providerID === "string" ? obj.providerID : undefined,
  }
}

export function extractModelId(input: unknown): string | undefined {
  const ref = extractModelRef(input)
  return ref?.id ?? ref?.modelID
}

export function isDeepSeekModel(modelId: string | undefined): boolean {
  if (!modelId) return false
  return modelId.toLowerCase().includes("deepseek")
}

export function isDeepSeekV4(modelId: string | undefined): boolean {
  if (!modelId) return false
  const lower = modelId.toLowerCase()
  return lower.includes("deepseek") && lower.includes("v4")
}

// ── Message extraction ──────────────────────────────────────────────

export interface MessageContent {
  readonly role?: string
  readonly content?: string
  readonly variant?: string
}

export function extractMessage(input: unknown): MessageContent | undefined {
  if (typeof input !== "object" || input === null) return undefined
  const obj = input as Record<string, unknown>
  return {
    role: typeof obj.role === "string" ? obj.role : undefined,
    content: typeof obj.content === "string" ? obj.content : undefined,
    variant: typeof obj.variant === "string" ? obj.variant : undefined,
  }
}

// ── Options extraction ──────────────────────────────────────────────

export interface HookOptions {
  readonly reasoning_effort?: string
  readonly reasoningEffort?: string
  readonly [key: string]: unknown
}

export function extractOptions(input: unknown): HookOptions {
  if (typeof input !== "object" || input === null) return {}
  return input as HookOptions
}

export function extractReasoningEffort(input: unknown): string | undefined {
  const opts = extractOptions(input)
  return opts.reasoning_effort ?? opts.reasoningEffort
}

// ── Tools extraction ────────────────────────────────────────────────

export function extractTools(input: unknown): Record<string, unknown>[] {
  if (Array.isArray(input)) return input as Record<string, unknown>[]
  return []
}

export function extractBaseURL(input: unknown): string {
  return typeof input === "string" ? input : "https://api.deepseek.com/beta"
}

// ── Command extraction ──────────────────────────────────────────────

export function extractCommand(input: unknown): string {
  return typeof input === "string" ? input : ""
}

export function extractArgs(input: unknown): Record<string, string> {
  if (typeof input !== "object" || input === null) return {}
  return input as Record<string, string>
}

export function extractToolArgs(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null) return {}
  return input as Record<string, unknown>
}

// ── Client extraction ───────────────────────────────────────────────

export function extractPlugins(client: unknown): string[] {
  if (typeof client !== "object" || client === null) return []
  const obj = client as Record<string, unknown>
  if (Array.isArray(obj.plugins)) return obj.plugins as string[]
  return []
}

// ── Body extraction ─────────────────────────────────────────────────

export function extractBody(input: unknown): Record<string, unknown> | undefined {
  if (typeof input !== "object" || input === null) return undefined
  return input as Record<string, unknown>
}
