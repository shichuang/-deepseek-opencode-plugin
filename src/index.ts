import type { PluginModule } from "@opencode-ai/plugin"
import { DEFAULT_CONFIG, mergeConfig } from "./config/index.js"
import type { CodewhalePluginConfig } from "./config/index.js"
import {
  CONSTITUTION_PREAMBLE, STATUTES, REGULATIONS,
  V4_MODEL_CHARACTERISTICS, GENERIC_MODEL_CHARACTERISTICS,
  THINKING_BUDGET_TABLE, CACHE_STRATEGY,
  resolveLanguagePolicy, renderContextWindowNote, buildContextManagementSection,
} from "./prompts/index.js"
import {
  sanitizeReasoningMessages, logReasoningReplay,
  shouldSanitizeReasoning, applyStrictToolMode, supportsStrictTools,
} from "./transform/message-sanitizer.js"
import { prepareReasoningChain } from "./transform/reasoning-chain.js"
import { canonicalizeSchema } from "./transform/schema-canonicalize.js"
import type { FunctionToolDefinition } from "./types/index.js"
import type { PluginServerInput } from "./types/index.js"
import {
  extractModelRef, extractModelId,
  extractReasoningEffort, extractTools, extractBaseURL,
  extractCommand, extractArgs, extractToolArgs,
  extractPlugins, extractBody,
} from "./types/type-guards.js"
import { COMMANDS } from "./commands/index.js"
import { ROLE_TAXONOMY_PROMPT } from "./agents/role-taxonomy.js"
import { discoverCodewhaleSkills, renderSkillsPrompt } from "./skills/bridge.js"
import { readProjectInstructions, renderInstructionsBlock } from "./instructions/project-context.js"
import { findPricing, formatPrice } from "./pricing/cost-tracker.js"
import { readUserMemory, renderMemoryBlock, isMemoryEnabled } from "./memory/user-memory.js"
import { FLASH_FIRST_NOTE } from "./pricing/flash-router.js"
import { migrateCodewhaleConfig } from "./config/toml-migration.js"
import { REMEMBER_TOOL_DEFINITION, RECALL_TOOL_DEFINITION, executeRememberTool } from "./tools/remember-tool.js"
import {
  detectDuplicatedeepseekPlugin, detectConflictingDeepSeekPlugins,
  getDuplicateWarning, getConflictWarning,
} from "./compatibility/index.js"

const PLUGIN_ID = "deepseek"
const PLUGIN_DISPLAY = "deepseek DeepSeek Adaptation"
const PLUGIN_VERSION = "0.1.0"

function isDsV4(id?: string) { return id ? id.toLowerCase().includes("deepseek") && id.toLowerCase().includes("v4") : false }
function isDs(id?: string) { return id ? id.toLowerCase().includes("deepseek") : false }

function pushStatic(config: CodewhalePluginConfig, parts: string[]): void {
  if (config.prompts.constitution) parts.push(CONSTITUTION_PREAMBLE)
  if (config.prompts.statutes) parts.push(STATUTES)
  if (config.prompts.regulations) parts.push(REGULATIONS)
  if (config.prompts.thinkingBudget) parts.push(THINKING_BUDGET_TABLE)
  if (config.prompts.cacheStrategy) parts.push(CACHE_STRATEGY)
  const lp = resolveLanguagePolicy(config.prompts.languagePolicy)
  if (lp) parts.push(lp)
  if (config.agents.roleTaxonomy) parts.push(ROLE_TAXONOMY_PROMPT)
  if (config.prompts.v4Characteristics !== "off") parts.push(FLASH_FIRST_NOTE)
}

function pushDynamic(parts: string[], modelId?: string): void {
  parts.push(renderContextWindowNote(modelId))
  if (isMemoryEnabled()) { const m = readUserMemory(); const b = renderMemoryBlock(m); if (b) parts.push(b) }
}

function pushProject(parts: string[], workspaceDir?: string): void {
  if (!workspaceDir) return
  try { const ins = readProjectInstructions(workspaceDir); const b = renderInstructionsBlock(ins); if (b) parts.push(b) } catch { /* */ }
}

function pushSkills(parts: string[], config: CodewhalePluginConfig): void {
  if (!config.skills.bridgeCodewhaleSkills) return
  try { const d = discoverCodewhaleSkills(config.skills.scanPaths); for (const e of d.errors) console.warn(`[${PLUGIN_ID}] Skill: ${e}`); const b = renderSkillsPrompt(d.skills); if (b) parts.push(b) } catch { /* */ }
}

function buildSystemPromptParts(config: CodewhalePluginConfig, modelId?: string, workspaceDir?: string): string[] {
  const parts: string[] = []
  pushStatic(config, parts)
  const vm = config.prompts.v4Characteristics
  if (vm === "on" || (vm === "auto" && isDsV4(modelId))) parts.push(V4_MODEL_CHARACTERISTICS)
  else if (vm !== "off" && isDs(modelId)) parts.push(GENERIC_MODEL_CHARACTERISTICS)
  pushDynamic(parts, modelId)
  pushProject(parts, workspaceDir)
  pushSkills(parts, config)
  parts.push(buildContextManagementSection())
  return parts
}

const server = async (rawInput: PluginServerInput, options?: Record<string, unknown>) => {
  const config = mergeConfig(DEFAULT_CONFIG, options as Partial<CodewhalePluginConfig> | undefined)
  if (!config.enabled) { console.log(`[${PLUGIN_ID}] Disabled`); return {} }

  const loadedPlugins = extractPlugins(rawInput.client)
  const dupCheck = detectDuplicatedeepseekPlugin(loadedPlugins)
  if (dupCheck.detected) { console.warn(getDuplicateWarning(dupCheck.plugins)); return {} }
  const conflictCheck = detectConflictingDeepSeekPlugins(loadedPlugins)
  if (conflictCheck.detected) console.info(getConflictWarning(conflictCheck.plugins))

  console.log(`[${PLUGIN_ID}] ${PLUGIN_DISPLAY} v${PLUGIN_VERSION}`)
  const workspaceDir = rawInput.directory || rawInput.worktree || process.cwd()

  try {
    const migration = migrateCodewhaleConfig(workspaceDir)
    if (migration.loadedFiles.length > 0) console.log(`[${PLUGIN_ID}] Config: ${migration.loadedFiles.join(", ")}`)
    for (const w of migration.warnings) console.warn(`[${PLUGIN_ID}] ${w}`)
  } catch { /* */ }

  const hooks: Record<string, unknown> = {}

  hooks["experimental.chat.system.transform"] = async (hookInput: Record<string, unknown>, output: Record<string, unknown>) => {
    const modelId = extractModelRef(hookInput.model)?.id
    const parts = buildSystemPromptParts(config, modelId, workspaceDir)
    let sys = (output.system as string[]) ?? []
    if (sys.some((s) => s.includes("## CONSTITUTION OF deepseek"))) return
    for (const p of parts) sys.push(p)
    output.system = sys
  }

  if (config.providers.reasoningSanitizer) {
    hooks["experimental.chat.messages.transform"] = async (hookInput: Record<string, unknown>, output: Record<string, unknown>) => {
      const model = extractModelRef(hookInput.model)
      const effort = extractReasoningEffort(hookInput.options)
      if (shouldSanitizeReasoning(model?.id ?? "", effort, model?.providerID)) {
        const prepared = prepareReasoningChain(output.messages as Record<string, unknown>[])
        const sanitized = sanitizeReasoningMessages({
          messages: prepared.messages,
          model: model?.id ?? "", reasoningEffort: effort, provider: model?.providerID,
        })
        output.messages = sanitized.messages
        logReasoningReplay(sanitized)
      }
    }
  }

  hooks["tool.definition"] = async (hookInput: Record<string, unknown>, output: Record<string, unknown>) => {
    const tools = extractTools(output.tools)
    if (isMemoryEnabled()) {
      if (!tools.some((t) => t.name === "ds:remember")) tools.push(REMEMBER_TOOL_DEFINITION)
      if (!tools.some((t) => t.name === "ds:recall")) tools.push(RECALL_TOOL_DEFINITION)
    }
    const modelId = extractModelId(hookInput.model)
    if (isDs(modelId)) {
      for (let i = 0; i < tools.length; i++) {
        const tool = tools[i] as Record<string, unknown>
        const fn = tool.function as Record<string, unknown> | undefined
        if (tool.type === "function" && fn?.parameters) fn.parameters = canonicalizeSchema(fn.parameters)
      }
      if (config.providers.strictToolMode && supportsStrictTools(extractBaseURL(hookInput.baseURL))) {
        for (let i = 0; i < tools.length; i++) {
          const tool = tools[i] as unknown as FunctionToolDefinition
          if (tool.type === "function") tools[i] = applyStrictToolMode(tool, extractBaseURL(hookInput.baseURL)) as unknown as Record<string, unknown>
        }
      }
    }
    output.tools = tools
  }

  if (isMemoryEnabled()) {
    hooks["tool.execute.before"] = async (hookInput: Record<string, unknown>, output: Record<string, unknown>) => {
      const toolName = extractCommand(hookInput.tool)
      if (toolName === "ds:remember" || toolName === "ds:recall") {
        output.result = executeRememberTool(toolName, extractToolArgs(hookInput.args))
      }
    }
  }

  hooks["chat.params"] = async (hookInput: Record<string, unknown>, output: Record<string, unknown>) => {
    const modelId = extractModelId(hookInput.model)
    if (!isDs(modelId)) return
    const body = extractBody(output.body)
    if (body && !body.model && modelId) body.model = modelId
  }

  hooks["chat.message"] = async (hookInput: Record<string, unknown>) => {
    const modelId = extractModelId(hookInput.model)
    if (modelId && isDs(modelId)) {
      const pricing = findPricing(modelId)
      if (pricing) {
        const cur = config.display.currency === "cny" ? "cny" : "usd"
        console.debug(`[${PLUGIN_ID}] ${pricing.label}: ${formatPrice(pricing.inputPerMTokens, cur)}/M`)
      }
    }
  }

  hooks["command.execute.before"] = async (hookInput: Record<string, unknown>, output: Record<string, unknown>) => {
    const cmd = extractCommand(hookInput.command)
    if (!cmd.startsWith("ds:")) return
    const local = cmd.slice("ds:".length)
    const def = COMMANDS.find((c) => c.name === local)
    if (def) output.result = await def.handler(extractArgs(hookInput.args))
  }

  hooks.config = async () => { /* */ }
  hooks.event = async (event: Record<string, unknown>) => { if (event.type === "session.created") console.debug(`[${PLUGIN_ID}] Session: ${String(event.sessionID ?? "")}`) }
  hooks.dispose = async () => { console.log(`[${PLUGIN_ID}] Disposed`) }

  return hooks
}

const pluginModule: PluginModule = { id: PLUGIN_ID, server }
export default pluginModule
export { PLUGIN_ID, PLUGIN_DISPLAY, PLUGIN_VERSION }
export type { CodewhalePluginConfig }