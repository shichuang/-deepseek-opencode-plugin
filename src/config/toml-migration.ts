/**
 * CodeWhale TOML Config Migration
 *
 * Reads CodeWhale's TOML configuration files and maps relevant settings
 * to the plugin's configuration schema. Provides a migration path
 * for users coming from CodeWhale.
 */

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import type { CodewhalePluginConfig } from "../config/schema.js"

export interface TomlConfigMigration {
  values: { providers?: Partial<CodewhalePluginConfig["providers"]> }
  loadedFiles: string[]
  missingFiles: string[]
  warnings: string[]
  envVars: Record<string, string>
}

// ── Minimal TOML parser ────────────────────────────────────────────

type TomlObject = Record<string, unknown>

function parseValue(raw: string): unknown {
  const trimmed = raw.trim()
  if (trimmed === "true") return true
  if (trimmed === "false") return false
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10)
  if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed)
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

interface KeyValue { key: string; value: unknown }

function parseKeyValue(line: string): KeyValue | null {
  const hashIdx = line.indexOf("#")
  const clean = hashIdx > -1 ? line.slice(0, hashIdx).trimRight() : line
  const eqIdx = clean.indexOf("=")
  if (eqIdx === -1) return null

  const key = clean.slice(0, eqIdx).trim()
  const valueStr = clean.slice(eqIdx + 1).trim()
  if (!key || !valueStr) return null

  const hashInVal = valueStr.indexOf("#")
  const valClean = hashInVal > -1 ? valueStr.slice(0, hashInVal).trim() : valueStr
  return { key, value: parseValue(valClean) }
}

function parseSection(line: string): string[] | null {
  const match = line.match(/^\[([^\]]+)\]$/)
  return match ? match[1].split(".") : null
}

function navigateSection(root: TomlObject, path: string[]): TomlObject {
  let current = root
  for (const segment of path) {
    if (!current[segment] || typeof current[segment] !== "object") {
      current[segment] = {}
    }
    current = current[segment] as TomlObject
  }
  return current
}

function parseSimpleToml(content: string): TomlObject {
  const result: TomlObject = {}
  let current = result
  let sectionPath: string[] = []

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim()
    if (line === "" || line.startsWith("#")) continue

    const section = parseSection(line)
    if (section) {
      sectionPath = section
      current = navigateSection(result, section)
      continue
    }

    const kv = parseKeyValue(line)
    if (kv) {
      current[kv.key] = kv.value
    }
  }

  return result
}

// ── Config file resolution ────────────────────────────────────────

function resolveCodeWhaleHome(): string {
  if (process.env.CODEWHALE_HOME) return process.env.CODEWHALE_HOME
  const home = process.env.USERPROFILE || process.env.HOME || homedir()
  return join(home, ".codewhale")
}

function collectConfigPaths(workspaceDir?: string): string[] {
  const paths: string[] = []

  if (process.env.CODEWHALE_CONFIG_PATH) paths.push(process.env.CODEWHALE_CONFIG_PATH)
  if (process.env.DEEPSEEK_CONFIG_PATH) paths.push(process.env.DEEPSEEK_CONFIG_PATH)

  paths.push(join(resolveCodeWhaleHome(), "config.toml"))

  if (workspaceDir) {
    paths.push(join(workspaceDir, ".codewhale", "config.toml"))
  }

  const legacyHome = join(process.env.USERPROFILE || process.env.HOME || homedir(), ".deepseek")
  paths.push(join(legacyHome, "config.toml"))

  return paths
}

function safeReadToml(path: string): TomlObject | null {
  try {
    if (!existsSync(path)) return null
    return parseSimpleToml(readFileSync(path, "utf-8"))
  } catch (err) {
    return null
  }
}

// ── Value extraction helpers ───────────────────────────────────────

type ProviderSection = Record<string, Record<string, unknown>> | undefined

function extractProviderString(parsed: TomlObject, key: string): string | undefined {
  const val = parsed[key]
  return typeof val === "string" ? val : undefined
}

function extractProviderBool(parsed: TomlObject, key: string): boolean | undefined {
  const val = parsed[key]
  return typeof val === "boolean" ? val : undefined
}

function extractProviders(parsed: TomlObject): ProviderSection {
  const providers = parsed.providers
  if (typeof providers !== "object" || providers === null) return undefined
  return providers as ProviderSection
}

function getProviders(migration: TomlConfigMigration): NonNullable<TomlConfigMigration["values"]["providers"]> {
  if (!migration.values.providers) migration.values.providers = {}
  return migration.values.providers
}

// ── Config application ─────────────────────────────────────────────

function applyTopLevelConfig(migration: TomlConfigMigration, parsed: TomlObject): void {
  const provider = extractProviderString(parsed, "provider")
  if (provider) {
    getProviders(migration).enhanceDeepSeek =
      provider === "deepseek" || provider.includes("deepseek")
  }
}

function applyProviderConfig(migration: TomlConfigMigration, providers: ProviderSection): void {
  if (!providers) return

  const ds = providers.deepseek
  if (ds) {
    const baseUrl = extractProviderString(ds, "base_url")
    if (baseUrl?.includes("/beta")) {
      getProviders(migration).strictToolMode = true
    }
    const model = extractProviderString(ds, "model")
    if (model) {
      migration.warnings.push(
        `CodeWhale model "${model}" configured — set this as default in OpenCode's model settings`,
      )
    }
  }

  for (const [key, cfg] of Object.entries(providers)) {
    if (cfg && typeof cfg === "object" && cfg.api_key) {
      migration.warnings.push(
        `Provider "${key}" has API key in CodeWhale config — set ${getEnvVar(key)} in your environment`,
      )
    }
  }
}

function applyStrictToolMode(migration: TomlConfigMigration, parsed: TomlObject): void {
  const enabled = extractProviderBool(parsed, "strict_tool_mode")
  if (enabled !== undefined) {
    getProviders(migration).strictToolMode = enabled
  }

  if (extractProviderBool(parsed, "allow_shell") !== undefined) {
    migration.warnings.push(
      "allow_shell detected in CodeWhale config — configure this in OpenCode's settings instead",
    )
  }
}

const PROVIDER_ENV_MAP: Record<string, string> = {
  deepseek: "DEEPSEEK_API_KEY", openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY",
  siliconflow: "SILICONFLOW_API_KEY", volcengine: "VOLCENGINE_API_KEY",
  nvidia_nim: "NVIDIA_API_KEY", novita: "NOVITA_API_KEY", fireworks: "FIREWORKS_API_KEY",
  moonshot: "MOONSHOT_API_KEY", together: "TOGETHER_API_KEY", huggingface: "HF_TOKEN",
  deepinfra: "DEEPINFRA_API_KEY", arcee: "ARCEE_API_KEY", zai: "ZAI_API_KEY",
  stepfun: "STEPFUN_API_KEY", minimax: "MINIMAX_API_KEY",
  wanjie_ark: "WANJIE_ARK_API_KEY", xiaomi_mimo: "MIMO_API_KEY",
}

function getEnvVar(key: string): string {
  return PROVIDER_ENV_MAP[key] ?? `${key.toUpperCase()}_API_KEY`
}

// ── Public API ─────────────────────────────────────────────────────

export function migrateCodewhaleConfig(workspaceDir?: string): TomlConfigMigration {
  const result: TomlConfigMigration = {
    values: {}, loadedFiles: [], missingFiles: [], warnings: [], envVars: {},
  }

  for (const path of collectConfigPaths(workspaceDir)) {
    const parsed = safeReadToml(path)
    if (parsed) {
      result.loadedFiles.push(path)
      applyTopLevelConfig(result, parsed)
      applyProviderConfig(result, extractProviders(parsed))
      applyStrictToolMode(result, parsed)
    } else {
      result.missingFiles.push(path)
    }
  }

  const envMappings: [string, string][] = [
    ["DEEPSEEK_API_KEY", "api_key"], ["CODEWHALE_PROVIDER", "provider"],
    ["CODEWHALE_BASE_URL", "base_url"], ["CODEWHALE_MODEL", "model"],
    ["DEEPSEEK_REASONING_EFFORT", "reasoning_effort"],
  ]
  for (const [envKey, configKey] of envMappings) {
    if (process.env[envKey]) result.envVars[configKey] = process.env[envKey]!
  }

  return result
}

export function renderMigrationSummary(migration: TomlConfigMigration): string {
  const lines = ["## CodeWhale Config Migration", ""]

  if (migration.loadedFiles.length > 0) {
    lines.push("**Files read:**")
    for (const f of migration.loadedFiles) lines.push(`- ${f}`)
    lines.push("")
  }

  if (Object.keys(migration.envVars).length > 0) {
    lines.push("**Environment variables detected:**")
    for (const [k, v] of Object.entries(migration.envVars)) {
      lines.push(`- ${k}: ${v.slice(0, 4)}... (${v.length} chars)`)
    }
    lines.push("")
  }

  if (migration.warnings.length > 0) {
    lines.push("**Warnings:**")
    for (const w of migration.warnings) lines.push(`- WARN: ${w}`)
    lines.push("")
  }

  if (migration.loadedFiles.length === 0 && Object.keys(migration.envVars).length === 0) {
    lines.push("No CodeWhale configuration found. Set `DEEPSEEK_API_KEY` and add this plugin to opencode.json.")
  }

  return lines.join("\n")
}
