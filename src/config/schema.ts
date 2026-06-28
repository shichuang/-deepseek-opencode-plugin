/**
 * Plugin configuration schema and defaults.
 *
 * All configuration fields can be set via opencode.json under the
 * `@deepseek/opencode-plugin` key, or via `.deepseek/config.toml`
 * (legacy deepseek format, read for migration).
 */

export interface CodewhalePluginConfig {
  /** Master enable/disable switch. */
  enabled: boolean

  /** Prompt injection control. */
  prompts: {
    /** Constitution â€?8 articles of the deepseek framework. */
    constitution: boolean
    /** Statutes â€?Tier 2 regulations (language, output, verification). */
    statutes: boolean
    /** Regulations â€?Tier 3 rules (composition, orchestration). */
    regulations: boolean
    /** V4 model characteristics. "auto" detects from model id. */
    v4Characteristics: "auto" | "on" | "off"
    /** Language policy for bilingual reasoning. */
    languagePolicy: "auto" | "zh-CN" | "en" | "off"
    /** Prefix cache strategy guidance. */
    cacheStrategy: boolean
    /** Thinking budget table. */
    thinkingBudget: boolean
  }

  /** Provider configuration. */
  providers: {
    /** Enhance the existing `deepseek` OpenCode provider. */
    enhanceDeepSeek: boolean
    /** Register extended provider endpoints. */
    extendedProviders: boolean
    /** Enable strict tool mode on DeepSeek beta endpoint. */
    strictToolMode: boolean
    /** Inject reasoning_content placeholder for DeepSeek thinking mode. */
    reasoningSanitizer: boolean
  }

  /** Skill bridge configuration. */
  skills: {
    /** Bridge deepseek skill directories. */
    bridgeCodewhaleSkills: boolean
    /** Paths to scan for SKILL.md files. */
    scanPaths: string[]
  }

  /** Agent (sub-agent) configuration. */
  agents: {
    /** Inject role taxonomy guidance. */
    roleTaxonomy: boolean
  }

  /** Display / UX configuration. */
  display: {
    /** Cost currency display. */
    currency: "usd" | "cny" | "auto"
    /** Show prefix cache hit rate. */
    showCacheHitRate: boolean
  }

  /** Selectively disable individual hooks. */
  disabledHooks: string[]
}

export const DEFAULT_CONFIG: CodewhalePluginConfig = {
  enabled: true,
  prompts: {
    constitution: true,
    statutes: true,
    regulations: true,
    v4Characteristics: "auto",
    languagePolicy: "auto",
    cacheStrategy: true,
    thinkingBudget: true,
  },
  providers: {
    enhanceDeepSeek: true,
    extendedProviders: true,
    strictToolMode: true,
    reasoningSanitizer: true,
  },
  skills: {
    bridgeCodewhaleSkills: true,
    scanPaths: ["~/.deepseek/skills", ".deepseek/skills"],
  },
  agents: {
    roleTaxonomy: true,
  },
  display: {
    currency: "auto",
    showCacheHitRate: true,
  },
  disabledHooks: [],
}

/**
 * Merge user-provided partial config with defaults.
 * Shallow merge for top-level sections, deep merge for nested objects.
 */
export function mergeConfig(
  base: CodewhalePluginConfig,
  overrides: Partial<CodewhalePluginConfig> | undefined,
): CodewhalePluginConfig {
  if (!overrides) return base
  return {
    ...base,
    ...overrides,
    prompts: { ...base.prompts, ...overrides.prompts },
    providers: { ...base.providers, ...overrides.providers },
    skills: { ...base.skills, ...overrides.skills },
    agents: { ...base.agents, ...overrides.agents },
    display: { ...base.display, ...overrides.display },
    disabledHooks: overrides.disabledHooks ?? base.disabledHooks,
  }
}
