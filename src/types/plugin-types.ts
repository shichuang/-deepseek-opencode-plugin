/**
 * Plugin type definitions — no `any` types, strict interfaces.
 * Follows OmO engineering spec: strict mode, no enums, no non-null assertions.
 */

// ── Plugin input (from OpenCode runtime) ───────────────────────────

export interface PluginServerInput {
  readonly client: object
  readonly directory: string
  readonly worktree: string
  readonly serverUrl: URL
}

// ── Hook input/output types ────────────────────────────────────────

export interface SystemTransformInput {
  readonly sessionID?: string
  readonly model?: { readonly id?: string; readonly providerID?: string }
}

export interface SystemTransformOutput {
  system: string[]
}

export interface MessagesTransformInput {
  readonly messages: readonly Record<string, unknown>[]
  readonly model?: { readonly id?: string; readonly providerID?: string }
  readonly options?: Record<string, unknown>
}

export interface MessagesTransformOutput {
  messages: Record<string, unknown>[]
}

export interface ToolDefinitionInput {
  readonly tools: readonly Record<string, unknown>[]
  readonly model?: { readonly id?: string; readonly providerID?: string }
  readonly baseURL?: string
}

export interface ToolDefinitionOutput {
  tools: Record<string, unknown>[]
}

export interface ChatParamsInput {
  readonly model?: { readonly id?: string; readonly providerID?: string }
  readonly body?: Record<string, unknown>
  readonly agent?: string | { readonly name?: string }
}

export interface ChatParamsOutput {
  body?: Record<string, unknown>
}

export interface ChatMessageInput {
  readonly message?: { readonly role?: string; readonly content?: string; readonly variant?: string }
  readonly sessionID?: string
  readonly model?: { readonly id?: string; readonly providerID?: string }
}

export interface ChatMessageOutput {
  readonly [key: string]: unknown
}

export interface CommandInput {
  readonly command?: string
  readonly args?: Record<string, string>
}

export interface CommandOutput {
  result?: string
}

export interface ToolExecuteInput {
  readonly tool?: string
  readonly args?: Record<string, unknown>
}

export interface ToolExecuteOutput {
  result?: string
}

export interface SessionEvent {
  readonly type?: string
  readonly sessionID?: string
  readonly [key: string]: unknown
}

// ── Message types for sanitizer ────────────────────────────────────

export interface AssistantMessage {
  role: "assistant"
  content?: string | null
  tool_calls?: readonly Record<string, unknown>[]
  reasoning_content?: string | null
  readonly [key: string]: unknown
}

export interface SanitizerMessage {
  role: string
  content?: string | null
  tool_calls?: readonly Record<string, unknown>[]
  reasoning_content?: string | null
  readonly [key: string]: unknown
}

// ── Tool types for strict mode ─────────────────────────────────────

export interface FunctionToolDefinition {
  type: "function"
  function: {
    name: string
    description?: string
    parameters: Record<string, unknown>
    strict?: boolean
  }
}

// ── Hook map ───────────────────────────────────────────────────────

export interface PluginHooks {
  "experimental.chat.system.transform"?: (input: SystemTransformInput, output: SystemTransformOutput) => Promise<void>
  "experimental.chat.messages.transform"?: (input: MessagesTransformInput, output: MessagesTransformOutput) => Promise<void>
  "tool.definition"?: (input: ToolDefinitionInput, output: ToolDefinitionOutput) => Promise<void>
  "chat.params"?: (input: ChatParamsInput, output: ChatParamsOutput) => Promise<void>
  "chat.message"?: (input: ChatMessageInput, output: ChatMessageOutput) => Promise<void>
  "command.execute.before"?: (input: CommandInput, output: CommandOutput) => Promise<void>
  "tool.execute.before"?: (input: ToolExecuteInput, output: ToolExecuteOutput) => Promise<void>
  "event"?: (event: SessionEvent) => Promise<void>
  "config"?: (input: Record<string, unknown>) => Promise<void>
  "dispose"?: () => Promise<void>
}