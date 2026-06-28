/**
 * Tool: codewhale:remember
 *
 * Allows the model to explicitly save durable notes to the user's memory file.
 * Mirrors CodeWhale's `remember` tool. The model calls this tool with
 * text content, and it appends a timestamped bullet to memory.md.
 *
 * Also registers codewhale:recall �?reads back memory content for the model.
 */

import { appendFileSync, readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { homedir } from "node:os"

// ── Path resolution ─────────────────────────────────────────────────

function resolveMemoryDir(): string {
  if (process.env.CODEWHALE_HOME) return process.env.CODEWHALE_HOME
  const home = process.env.USERPROFILE || process.env.HOME || homedir()
  return join(home, ".codewhale")
}

function resolveMemoryPath(): string {
  if (process.env.CODEWHALE_MEMORY_PATH) return process.env.CODEWHALE_MEMORY_PATH
  return join(resolveMemoryDir(), "memory.md")
}

// ── Remember tool ───────────────────────────────────────────────────

export interface RememberInput {
  content: string
  tag?: string
}

export interface RememberOutput {
  status: "saved" | "error"
  message: string
  path: string
}

export function rememberNote(input: RememberInput): RememberOutput {
  const path = resolveMemoryPath()
  try {
    const dir = dirname(path)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    const now = new Date()
    const timestamp = now.toISOString().replace("T", " ").slice(0, 19)
    const tag = input.tag ? ` [${input.tag}]` : ""
    const entry = `- **${timestamp}**${tag}: ${input.content.trim()}\n`

    if (existsSync(path)) {
      appendFileSync(path, entry, "utf-8")
    } else {
      writeFileSync(path, `# User Memory\n\n${entry}`, "utf-8")
    }

    const preview = input.content.trim().slice(0, 80)
    const suffix = input.content.trim().length > 80 ? "..." : ""
    return {
      status: "saved",
      message: `Saved to memory${tag}: "${preview}${suffix}"`,
      path,
    }
  } catch (err) {
    return {
      status: "error",
      message: `Failed to save: ${(err as Error).message}`,
      path,
    }
  }
}

// ── Recall tool ─────────────────────────────────────────────────────

export interface RecallInput {
  query?: string
  limit?: number
}

export interface RecallOutput {
  content: string
  entryCount: number
  found: boolean
  path: string
}

export function recallMemory(input: RecallInput = {}): RecallOutput {
  const path = resolveMemoryPath()
  const limit = input.limit || 50

  try {
    if (!existsSync(path)) {
      return { content: "", entryCount: 0, found: false, path }
    }

    let content = readFileSync(path, "utf-8")

    if (input.query) {
      const query = input.query.toLowerCase()
      const lines = content.split("\n")
      const header = lines.filter((l) => !l.startsWith("- "))
      const entries = lines.filter((l) => l.startsWith("- ") && l.toLowerCase().includes(query))
      content = [...header, "", ...entries.slice(0, limit)].join("\n")
      return { content, entryCount: Math.min(entries.length, limit), found: true, path }
    }

    const entryLines = content.split("\n").filter((l) => l.trim().startsWith("- "))
    return { content, entryCount: entryLines.length, found: true, path }
  } catch (err) {
    return { content: `Error reading memory: ${(err as Error).message}`, entryCount: 0, found: false, path }
  }
}

// ── Tool definitions ────────────────────────────────────────────────

export const REMEMBER_TOOL_DEFINITION = {
  name: "ds:remember",
  description:
    "Save a durable note to user memory. Use when the user asks you to remember something, or when you discover a preference, convention, or pattern worth persisting across sessions. Content is appended with a timestamp.",
  inputSchema: {
    type: "object",
    properties: {
      content: { type: "string", description: "The note content to save." },
      tag: { type: "string", description: "Optional category tag." },
    },
    required: ["content"],
  },
}

export const RECALL_TOOL_DEFINITION = {
  name: "ds:recall",
  description:
    "Read back user memory entries. Optionally filter by a search query.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query (case-insensitive)." },
      limit: { type: "number", description: "Max entries (default 50)." },
    },
  },
}

export function executeRememberTool(toolName: string, args: Record<string, unknown>): string {
  if (toolName === "ds:remember") {
    const result = rememberNote({
      content: String(args.content ?? ""),
      tag: args.tag ? String(args.tag) : undefined,
    })
    return `[${result.status === "saved" ? "OK" : "ERR"}] ${result.message}`
  }

  if (toolName === "ds:recall") {
    const result = recallMemory({
      query: args.query ? String(args.query) : undefined,
      limit: args.limit ? Number(args.limit) : undefined,
    })
    if (!result.found) return "No memory file found. Use codewhale:remember to create your first note."
    if (result.content.trim().length === 0) return "Memory file exists but is empty."
    return result.content
  }

  return `Unknown tool: ${toolName}`
}
