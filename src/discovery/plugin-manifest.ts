/**
 * Plugin Discovery Conventions
 *
 * Metadata files that help OpenCode discover and manage this plugin.
 * Mirrors conventions from both OmO and deepseek ecosystems.
 *
 * Files:
 * - .opencode/plugin/plugin.json  �?OpenCode plugin manifest
 * - .opencode/command/*.md         �?Slash command documentation
 * - .opencode/skills/*.md          �?Skill definitions
 */

// ── Plugin manifest for .opencode/plugin/plugin.json ────────────────

export const PLUGIN_MANIFEST = {
  id: "deepseek",
  name: "deepseek DeepSeek Adaptation",
  version: "0.1.0",
  description: "First-class DeepSeek V4 support with Constitution system prompt, extended provider registry, bilingual language policy, and prefix-cache-optimized prompt layering �?transplanted from deepseek to OpenCode.",
  author: "deepseek Contributors",
  license: "MIT",
  homepage: "https://github.com/Hmbown/deepseek",
  repository: "https://github.com/Hmbown/deepseek",
  keywords: ["deepseek", "deepseek", "v4", "reasoning", "chinese", "constitution"],
  categories: ["provider", "prompt", "agent-behavior"],
  requires: {
    opencode: ">=1.17.0",
  },
  provides: {
    providers: ["deepseek-enhanced", "ds:siliconflow", "ds:volcengine", "ds:nvidia-nim", "ds:novita", "ds:moonshot", "ds:deepinfra", "ds:huggingface", "ds:together", "ds:arcee", "ds:zai", "ds:stepfun", "ds:minimax", "ds:wanjie-ark", "ds:xiaomi-mimo"],
    commands: ["ds:status", "ds:providers", "ds:config", "ds:cache-info", "ds:cost", "ds:strict-tools", "ds:language", "ds:remember", "ds:recall"],
    skills: ["deepseek"],
    tools: ["ds:remember", "ds:recall"],
    hooks: [
      "experimental.chat.system.transform",
      "experimental.chat.messages.transform",
      "tool.definition",
      "chat.params",
      "chat.message",
      "command.execute.before",
      "tool.execute.before",
      "config",
      "event",
      "dispose",
    ],
  },
  config: {
    schema: "./schema.json",
  },
}

// ── Command documentation (for .opencode/command/*.md) ──────────────

export const COMMAND_DOCS: Record<string, string> = {
  "ds:status": `# ds:status
Show the current status of the deepseek DeepSeek Adaptation plugin.

Displays:
- Plugin version and active hooks
- Constitution status (active/inactive)
- V4 characteristics mode
- Language policy setting
- Extended providers count
- Strict tool mode and reasoning sanitizer status`,
  "ds:providers": `# ds:providers
List all registered extended providers with their endpoints and default models.

Usage:
- \`ds:providers\` �?list all 15 providers
- \`ds:providers siliconflow\` �?show details for a specific provider`,
  "ds:cost": `# ds:cost
Show estimated token costs for DeepSeek models.

Usage:
- \`ds:cost\` �?show pricing for deepseek-v4-pro
- \`ds:cost deepseek-v4-flash\` �?show pricing for flash model`,
  "ds:remember": `# ds:remember
Save a durable note to user memory. The model can call this tool when the user explicitly asks to remember something, or when it discovers a preference worth persisting.

The note is appended with a timestamp to ~/.deepseek/memory.md.`,
  "ds:recall": `# ds:recall
Read back user memory entries. Returns previously saved preferences, conventions, or patterns.

Usage:
- \`ds:recall\` �?read all entries
- \`ds:recall python\` �?filter entries containing "python"`,
}
