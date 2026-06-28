/**
 * Commands registered with the `ds:` namespace.
 *
 * Each command is a slash command that appears in OpenCode's command palette.
 * Namespacing prevents ID conflicts with other plugins.
 */

import { runDoctor, renderDoctorReport } from "./doctor.js"

export interface CommandDefinition {
  /** Command name (without namespace prefix). */
  name: string
  /** Human-readable description shown in palette. */
  description: string
  /** Optional arguments the command accepts. */
  args?: { name: string; description: string; required?: boolean; choices?: string[] }[]
  /** Handler function. Receives args as key-value pairs. */
  handler: (args: Record<string, string>) => Promise<string>
}

/**
 * All registered commands, prefixed with `ds:`.
 * These mirror deepseek's TUI commands that are relevant to OpenCode.
 */
export const COMMANDS: CommandDefinition[] = [
  {
    name: "status",
    description: "Show deepseek DeepSeek adaptation status",
    handler: async () => {
      return [
        "## deepseek DeepSeek Adaptation Status",
        "",
        "- **Plugin**: @deepseek/opencode-plugin v0.1.0",
        "- **Constitution**: Active (8 articles + statutes + regulations)",
        "- **V4 Characteristics**: Auto-detecting DeepSeek V4 models",
        "- **Language Policy**: Auto (bilingual Chinese/English)",
        "- **Extended Providers**: 15 registered",
        "- **Strict Tool Mode**: Enabled on beta endpoint",
        "- **Reasoning Sanitizer**: Active",
        "",
        "Use `ds:providers` to list extended providers.",
        "Use `ds:config` to see current configuration.",
      ].join("\n")
    },
  },
  {
    name: "providers",
    description: "List registered extended providers with endpoints",
    handler: async () => {
      const providers = [
        ["SiliconFlow", "api.siliconflow.cn", "deepseek-ai/DeepSeek-V4-Pro"],
        ["Volcengine Ark", "ark.cn-beijing.volces.com", "DeepSeek-V4-Pro"],
        ["NVIDIA NIM", "integrate.api.nvidia.com", "deepseek-ai/deepseek-v4-pro"],
        ["Novita AI", "api.novita.ai", "deepseek/deepseek-v4-pro"],
        ["Fireworks AI", "api.fireworks.ai", "accounts/fireworks/models/deepseek-v4-pro"],
        ["Moonshot AI", "api.moonshot.ai", "kimi-k2.7-code"],
        ["DeepInfra", "api.deepinfra.com", "deepseek-ai/DeepSeek-V4-Pro"],
        ["Hugging Face", "router.huggingface.co", "deepseek-ai/DeepSeek-V4-Pro"],
        ["Together AI", "api.together.xyz", "deepseek-ai/DeepSeek-V4-Pro"],
        ["Arcee AI", "api.arcee.ai", "trinity-large-thinking"],
        ["Z.AI (GLM)", "api.z.ai", "GLM-5.2"],
        ["StepFun", "api.stepfun.ai", "step-3.7-flash"],
        ["MiniMax", "api.minimax.io", "MiniMax-M3"],
        ["Wanjie Ark", "maas-openapi.wanjiedata.com", "deepseek-reasoner"],
        ["Xiaomi MiMo", "token-plan-sgp.xiaomimimo.com", "mimo-v2.5-pro"],
      ]

      const lines = [
        "## Extended DeepSeek Providers",
        "",
        "| Provider | Endpoint | Default Model |",
        "|----------|----------|--------------|",
        ...providers.map(([name, url, model]) => `| ${name} | ${url} | ${model} |`),
        "",
        `Total: ${providers.length} providers registered.`,
        "",
        "Set the corresponding API key environment variable to use each provider.",
        "Use `ds:provider <name>` for provider-specific configuration help.",
      ]
      return lines.join("\n")
    },
    args: [
      {
        name: "provider",
        description: "Show details for a specific provider",
        required: false,
        choices: [
          "siliconflow", "volcengine", "nvidia-nim", "novita", "fireworks",
          "moonshot", "deepinfra", "huggingface", "together", "arcee",
          "zai", "stepfun", "minimax", "wanjie-ark", "xiaomi-mimo",
        ],
      },
    ],
  },
  {
    name: "config",
    description: "Show or modify deepseek DeepSeek plugin configuration",
    handler: async (args) => {
      if (args.key) {
        return `Configuration key \`${args.key}\` â€?edit in opencode.json under \`@deepseek/opencode-plugin\``
      }
      return [
        "## deepseek Plugin Configuration",
        "",
        "Edit in `opencode.json`:",
        "```jsonc",
        `{ "plugin": [ ["@deepseek/opencode-plugin", {`,
        `    "prompts": { "constitution": true, "v4Characteristics": "auto" },`,
        `    "providers": { "enhanceDeepSeek": true, "extendedProviders": true }`,
        `  }] ] }`,
        "```",
        "",
        "See README.md for full configuration reference.",
      ].join("\n")
    },
    args: [{ name: "key", description: "Specific config key to show", required: false }],
  },
  {
    name: "cache-info",
    description: "Show DeepSeek prefix cache information",
    handler: async () => {
      return [
        "## DeepSeek Prefix Cache",
        "",
        "**How it works:**",
        "- DeepSeek V4 caches the longest byte-stable prefix of every request",
        "- Cache granularity: 128 tokens",
        "- Cache-hit cost discount: ~90% (roughly 10Ã— cheaper)",
        "- First turn: full price (cache miss on system prompt)",
        "- Subsequent turns: heavily discounted (system prompt is byte-stable prefix)",
        "",
        "**Best practices:**",
        "- Append new messages; never reorder or mutate old ones",
        "- The system prompt is layered most-static-first for cache stability",
        "- Paraphrasing cached content invalidates the cache â†?avoid it",
        "- The cache hit % indicator turns:",
        "  - Yellow below 80% â€?consider consolidating",
        "  - Red below 40% â€?needs compaction",
        "",
        "**Cache-unfriendly patterns to avoid:**",
        "- Re-reading files you already read (scroll back instead)",
        "- Re-quoting content with different formatting",
        "- Inserting messages in the middle of conversation history",
        "- Editing system prompt mid-session",
      ].join("\n")
    },
  },
  {
    name: "cost",
    description: "Show estimated token costs for DeepSeek models",
    handler: async (args) => {
      const pricing: Record<string, { input: string; output: string; cached: string }> = {
        "deepseek-v4-pro": { input: "$0.43/M", output: "$1.72/M", cached: "~$0.043/M" },
        "deepseek-v4-flash": { input: "$0.14/M", output: "$0.56/M", cached: "~$0.014/M" },
        default: { input: "varies", output: "varies", cached: "~90% discount" },
      }

      const model = args.model || "deepseek-v4-pro"
      const p = pricing[model] || pricing.default

      return [
        `## Token Cost Estimate â€?${model}`,
        "",
        `| Metric | Price |`,
        `|--------|-------|`,
        `| Input tokens | ${p.input} tokens |`,
        `| Output tokens | ${p.output} tokens |`,
        `| Cached input (hit) | ${p.cached} tokens |`,
        `| Cache discount | ~90% |`,
        "",
        "Prices are approximate. Check [DeepSeek Platform](https://platform.deepseek.com) for current pricing.",
        "",
        "**Tip:** With effective caching, a typical coding session sees 60-80% of input tokens served from cache.",
      ].join("\n")
    },
    args: [
      {
        name: "model",
        description: "Model to show pricing for",
        required: false,
        choices: ["deepseek-v4-pro", "deepseek-v4-flash"],
      },
    ],
  },
  {
    name: "strict-tools",
    description: "Toggle DeepSeek strict tool mode (beta endpoint only)",
    handler: async (args) => {
      const state = args.state || "status"
      if (state === "on") {
        return "Strict tool mode: **ON** â€?function schemas will include `strict: true` on beta endpoint. Requires `https://api.deepseek.com/beta`."
      }
      if (state === "off") {
        return "Strict tool mode: **OFF** â€?standard function schemas without strict enforcement."
      }
      return "Strict tool mode: **AUTO** â€?enabled when using `https://api.deepseek.com/beta`, disabled otherwise. Use `ds:strict-tools on|off` to override."
    },
    args: [
      {
        name: "state",
        description: "Enable/disable/status",
        required: false,
        choices: ["on", "off", "status"],
      },
    ],
  },
  {
    name: "language",
    description: "Toggle language policy for bilingual reasoning",
    handler: async (args) => {
      const state = args.mode || "auto"
      const descriptions: Record<string, string> = {
        auto: "**Auto** â€?defaults to bilingual policy (zh-CN primary, English aware). The model matches the user's language in reasoning_content and final output.",
        "zh-CN": "**ç®€ä½“ä¸­æ–?* â€?the model must think and reply in Simplified Chinese regardless of code/context language.",
        en: "**English** â€?the model must think and reply in English.",
        off: "**Off** â€?no language policy injected.",
      }
      return `Language policy: ${descriptions[state] || descriptions.auto}\n\nUse \`ds:language auto|zh-CN|en|off\` to change.`
    },
    args: [
      {
        name: "mode",
        description: "Language mode",
        required: false,
        choices: ["auto", "zh-CN", "en", "off"],
      },
    ],
  },
  {
    name: "doctor",
    description: "Run DeepSeek diagnostics: check API key, network, config, hooks",
    handler: async () => {
      const report = await runDoctor(process.cwd())
      return renderDoctorReport(report)
    },
  },
]

/**
 * Map command definitions to namespaced keys for OpenCode registration.
 * Returns `{ "ds:name": definition }` records.
 */
export function getNamespacedCommands(): Record<string, CommandDefinition> {
  const result: Record<string, CommandDefinition> = {}
  for (const cmd of COMMANDS) {
    result[`ds:${cmd.name}`] = cmd
  }
  return result
}
