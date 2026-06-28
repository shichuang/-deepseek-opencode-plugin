/**
 * Project Instruction Reader
 *
 * Reads deepseek-compatible project instruction files and injects them
 * into the system prompt. Mirrors deepseek's project context loading.
 *
 * Files read (in priority order):
 * - .deepseek/constitution.json  (repo authority policy)
 * - AGENTS.md                      (cross-agent project instructions)
 * - CLAUDE.md                      (legacy fallback)
 * - .claude/instructions.md        (legacy fallback)
 */

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

export interface ProjectInstructions {
  /** Constitution/authority policy from .deepseek/constitution.json */
  constitution: Record<string, unknown> | null
  /** AGENTS.md content */
  agentsMd: string | null
  /** Legacy CLAUDE.md content */
  claudeMd: string | null
  /** All loaded files (for diagnostics) */
  loadedFiles: string[]
  /** Files that were not found */
  missingFiles: string[]
}

/**
 * Read project instructions from the workspace directory.
 */
export function readProjectInstructions(workspaceDir: string): ProjectInstructions {
  const result: ProjectInstructions = {
    constitution: null,
    agentsMd: null,
    claudeMd: null,
    loadedFiles: [],
    missingFiles: [],
  }

  function safeRead(path: string): string | null {
    try {
      if (existsSync(path)) {
        const content = readFileSync(path, "utf-8")
        result.loadedFiles.push(path)
        return content
      }
    } catch (_) {
      // File exists but can't be read â€?skip
    }
    result.missingFiles.push(path)
    return null
  }

  function safeReadJson(path: string): Record<string, unknown> | null {
    try {
      if (!existsSync(path)) return null
      result.loadedFiles.push(path)
      return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>
    } catch {
      return null
    }
  }

  result.constitution = safeReadJson(join(workspaceDir, ".deepseek", "constitution.json"))
  if (!result.constitution) result.missingFiles.push(join(workspaceDir, ".deepseek", "constitution.json"))

  result.agentsMd = safeRead(join(workspaceDir, "AGENTS.md"))
  result.claudeMd = safeRead(join(workspaceDir, "CLAUDE.md"))

  const claudeInst = safeRead(join(workspaceDir, ".claude", "instructions.md"))
  if (claudeInst && !result.claudeMd) {
    result.claudeMd = claudeInst
  }

  return result
}

/**
 * Render constitution policy as a model-visible system prompt block.
 */
function pushListSection(lines: string[], title: string, items: unknown): void {
  if (!Array.isArray(items)) return
  lines.push(title)
  for (const item of items) lines.push(`- ${item}`)
  lines.push("")
}

export function renderConstitutionBlock(constitution: Record<string, unknown> | null): string | null {
  if (!constitution) return null
  const lines = ["## Repository Authority Policy", ""]
  pushListSection(lines, "**Authority order:**", constitution.authority)
  pushListSection(lines, "**Protected invariants (do not break):**", constitution.protected_invariants)
  const vp = constitution.verification_policy
  if (vp && typeof vp === "object") {
    pushListSection(lines, "**Before claiming done, always:**", (vp as Record<string, unknown>).before_claiming_done)
  }
  return lines.join("\n")
}

/**
 * Render project instructions as a model-visible system prompt block.
 */
export function renderInstructionsBlock(instructions: ProjectInstructions): string | null {
  const parts: string[] = []

  // Constitution policy
  const constBlock = renderConstitutionBlock(instructions.constitution)
  if (constBlock) parts.push(constBlock)

  // AGENTS.md
  if (instructions.agentsMd) {
    parts.push(
      "## Project Instructions (AGENTS.md)",
      "",
      instructions.agentsMd,
    )
  } else if (instructions.claudeMd) {
    parts.push(
      "## Project Instructions (CLAUDE.md â€?legacy)",
      "",
      instructions.claudeMd,
    )
  }

  if (parts.length === 0) return null
  return parts.join("\n\n")
}