/**
 * deepseek Skill Bridge
 *
 * Scans deepseek-compatible skill directories and makes SKILL.md files
 * available to OpenCode's skill system. Handles the `$skill-name` invocation
 * syntax and the skill discovery conventions from deepseek.
 *
 * Skill directories scanned:
 * - ~/.deepseek/skills/       (user-global)
 * - .deepseek/skills/          (project-local)
 * - Custom paths from config
 */

import { readdirSync, statSync, readFileSync, existsSync } from "node:fs"
import { join, resolve as resolvePath } from "node:path"
import { homedir } from "node:os"

export interface DiscoveredSkill {
  /** Skill identifier (from SKILL.md frontmatter or filename). */
  id: string
  /** Human-readable name. */
  name: string
  /** Short description. */
  description: string
  /** Absolute path to the skill directory. */
  path: string
  /** The SKILL.md content, if read. */
  content?: string
  /** Source of the discovery. */
  source: "global" | "project" | "custom"
}

export interface SkillDiscoveryResult {
  skills: DiscoveredSkill[]
  errors: string[]
  pathsSearched: string[]
}

/**
 * Expand a path with home directory expansion.
 * On Windows, also handles %USERPROFILE%.
 */
function expandPath(p: string): string {
  if (p.startsWith("~")) {
    const home = process.env.USERPROFILE || process.env.HOME || homedir()
    return join(home, p.slice(1))
  }
  if (p.includes("%") && process.platform === "win32") {
    return p.replace(/%([^%]+)%/g, (_, name) => process.env[name] || `%${name}%`)
  }
  return resolvePath(p)
}

/**
 * Parse SKILL.md frontmatter to extract the skill name and description.
 * deepseek format uses `name:` in frontmatter, or the first `# Heading`.
 */
function parseSkillMarkdown(content: string): { name: string; description: string } {
  const lines = content.split("\n")
  let name = ""
  let description = ""

  for (const line of lines) {
    // Try YAML frontmatter `name:` field
    const nameMatch = line.match(/^name:\s*(.+)/i)
    if (nameMatch && !name) {
      name = nameMatch[1].trim()
      continue
    }

    // Try YAML frontmatter `description:` field
    const descMatch = line.match(/^description:\s*(.+)/i)
    if (descMatch && !description) {
      description = descMatch[1].trim()
      continue
    }

    // Fallback: first markdown heading
    const headingMatch = line.match(/^#\s+(.+)/)
    if (headingMatch && !name) {
      name = headingMatch[1].trim()
      continue
    }
  }

  return { name, description }
}

/**
 * Scan a directory for SKILL.md files following deepseek conventions.
 * Each subdirectory containing a SKILL.md is treated as one skill.
 */
function scanDirectory(dirPath: string, source: DiscoveredSkill["source"]): { skills: DiscoveredSkill[]; errors: string[] } {
  const skills: DiscoveredSkill[] = []
  const errors: string[] = []

  try {
    if (!existsSync(dirPath)) return { skills, errors }

    const entries = readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const skillDir = join(dirPath, entry.name)
      const skillFile = join(skillDir, "SKILL.md")

      // Skip .git and other hidden dirs
      if (entry.name.startsWith(".") && entry.name !== ".deepseek") continue

      try {
        if (!existsSync(skillFile)) continue

        const content = readFileSync(skillFile, "utf-8")
        const { name, description } = parseSkillMarkdown(content)

        skills.push({
          id: entry.name,
          name: name || entry.name,
          description: description || `Skill: ${entry.name}`,
          path: skillDir,
          content,
          source,
        })
      } catch (err) {
        errors.push(`Failed to read skill at ${skillFile}: ${(err as Error).message}`)
      }
    }
  } catch (err) {
    errors.push(`Failed to scan directory ${dirPath}: ${(err as Error).message}`)
  }

  return { skills, errors }
}

/**
 * Discover deepseek skills from configured scan paths.
 * Merges results from all paths, deduplicating by skill id.
 */
export function discoverCodewhaleSkills(scanPaths: string[]): SkillDiscoveryResult {
  const allSkills: DiscoveredSkill[] = []
  const allErrors: string[] = []
  const searchedPaths: string[] = []

  // Determine source for each path
  const globalPrefix = expandPath("~/.deepseek/skills")
  const projectPrefix = expandPath(".deepseek/skills")

  for (const rawPath of scanPaths) {
    const expanded = expandPath(rawPath)
    searchedPaths.push(expanded)

    let source: DiscoveredSkill["source"] = "custom"
    if (expanded.startsWith(globalPrefix) || rawPath.startsWith("~/.deepseek")) {
      source = "global"
    } else if (expanded.startsWith(projectPrefix) || rawPath.startsWith(".deepseek")) {
      source = "project"
    }

    const result = scanDirectory(expanded, source)
    allSkills.push(...result.skills)
    allErrors.push(...result.errors)
  }

  // Deduplicate by id (first discovered wins)
  const seen = new Set<string>()
  const deduped: DiscoveredSkill[] = []
  for (const skill of allSkills) {
    if (!seen.has(skill.id)) {
      seen.add(skill.id)
      deduped.push(skill)
    }
  }

  return {
    skills: deduped,
    errors: allErrors,
    pathsSearched: searchedPaths,
  }
}

/**
 * Render discovered skills as a model-visible system prompt section.
 * Mirrors deepseek's skills block in the system prompt.
 */
export function renderSkillsPrompt(skills: DiscoveredSkill[]): string | null {
  if (skills.length === 0) return null

  const lines = [
    "## Skills",
    "",
    "The following deepseek skills are available. Use `$skill-name` to activate a skill.",
    "",
  ]

  for (const skill of skills) {
    const sourceLabel = skill.source === "global" ? "global" : skill.source === "project" ? "project" : "custom"
    lines.push(`- **$${skill.id}** (${sourceLabel}): ${skill.description}`)
  }

  lines.push(
    "",
    "To activate: type `$skill-name` followed by your request.",
    "The skill's SKILL.md body will be loaded as active guidance.",
  )

  return lines.join("\n")
}
