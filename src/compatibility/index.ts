/**
 * Compatibility layer â€?detects conflicts with other plugins.
 */

const KNOWN_DEEPSEEK_PLUGINS = [
  "deepseek-extended",
  "opencode-deepseek",
  "deepseek-ai-plugin",
]

export interface DuplicateCheckResult {
  detected: boolean
  plugins: string[]
}

export function detectDuplicatedeepseekPlugin(loadedPluginIds: string[]): DuplicateCheckResult {
  const dupes = loadedPluginIds.filter(
    (id) => id === "deepseek" || id === "@deepseek/opencode-plugin",
  )
  return { detected: dupes.length > 0, plugins: dupes }
}

export function detectConflictingDeepSeekPlugins(loadedPluginIds: string[]): DuplicateCheckResult {
  const conflicts = loadedPluginIds.filter((id) =>
    KNOWN_DEEPSEEK_PLUGINS.some((known) => id.includes(known)),
  )
  return { detected: conflicts.length > 0, plugins: conflicts }
}

export function getDuplicateWarning(plugins: string[]): string {
  return `[deepseek] WARNING: Another instance of this plugin already loaded: ${plugins.join(", ")}. Skipping.`
}

export function getConflictWarning(plugins: string[]): string {
  return `[deepseek] INFO: Detected other DeepSeek plugins: ${plugins.join(", ")}. Enhancing rather than overriding.`
}
