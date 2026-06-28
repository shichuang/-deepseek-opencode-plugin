/**
 * User Memory System
 *
 * Reads CodeWhale's memory.md file and injects its contents into the
 * system prompt as a <user_memory> block. This mirrors CodeWhale's
 * memory feature (#489).
 *
 * The model can use this for persistent context across sessions:
 * - User preferences
 * - Project conventions
 * - Frequently used patterns
 * - Explicit "remember this" notes
 *
 * Files read:
 * - ~/.codewhale/memory.md  (user-global)
 */

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

export interface MemoryData {
  /** Raw content of the memory file. */
  content: string | null
  /** Absolute path that was read. */
  path: string
  /** Whether the file exists. */
  found: boolean
}

/**
 * Resolve the memory file path.
 */
function resolveMemoryPath(): string {
  if (process.env.CODEWHALE_MEMORY_PATH) {
    return process.env.CODEWHALE_MEMORY_PATH
  }
  const home = process.env.USERPROFILE || process.env.HOME || homedir()
  const codeWhaleHome = process.env.CODEWHALE_HOME || join(home, ".codewhale")
  return join(codeWhaleHome, "memory.md")
}

/**
 * Read the user memory file.
 * Returns null if the file doesn't exist or can't be read.
 */
export function readUserMemory(): MemoryData {
  const path = resolveMemoryPath()

  try {
    if (!existsSync(path)) {
      return { content: null, path, found: false }
    }

    const content = readFileSync(path, "utf-8")
    if (content.trim().length === 0) {
      return { content: null, path, found: false }
    }

    return { content, path, found: true }
  } catch (_) {
    return { content: null, path, found: false }
  }
}

/**
 * Render the memory content as a system prompt block.
 * Uses the same <user_memory> wrapper that CodeWhale uses.
 */
export function renderMemoryBlock(memory: MemoryData): string | null {
  if (!memory.content) return null

  const lines = [
    "<user_memory>",
    "",
    memory.content.trim(),
    "",
    "</user_memory>",
    "",
    "The above is persistent user memory. It may contain preferences, conventions,",
    "or explicit notes the user has asked to be remembered across sessions.",
    "Treat it as durable context — reference it when relevant, but do not repeat",
    "its contents verbatim unless asked.",
  ]

  return lines.join("\n")
}

/**
 * Check if memory is enabled via environment variable.
 * CodeWhale uses DEEPSEEK_MEMORY=on or CODEWHALE_MEMORY=on.
 */
export function isMemoryEnabled(): boolean {
  const envVal = process.env.CODEWHALE_MEMORY || process.env.DEEPSEEK_MEMORY || ""
  const lower = envVal.toLowerCase()
  return lower === "on" || lower === "true" || lower === "1" || lower === "enabled"
}
