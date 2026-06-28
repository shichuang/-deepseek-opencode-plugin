/**
 * Sub-Agent Role Taxonomy
 *
 * Mirrors CodeWhale's sub-agent role system (docs/SUBAGENTS.md).
 * Each role defines a stance toward the work — not just a different label.
 *
 * These are injected into the system prompt and also referenced by
 * the chat.message hook for auto-agent suggestion.
 */

export interface AgentRole {
  /** Role identifier (used in agent.type field). */
  id: string
  /** Short display label. */
  label: string
  /** Stance description — what this role is for. */
  stance: string
  /** Whether this role can write files. */
  writes: boolean
  /** Shell execution posture. */
  shell: "yes" | "no" | "read-only" | "test-focused"
  /** Typical use case. */
  useCase: string
  /** Estimated tool-call budget. */
  toolBudget: string
}

export const AGENT_ROLES: AgentRole[] = [
  {
    id: "general",
    label: "General",
    stance: "Flexible; do whatever the parent says",
    writes: true,
    shell: "yes",
    useCase: "The default; multi-step tasks",
    toolBudget: "unlimited",
  },
  {
    id: "explore",
    label: "Explore",
    stance: "Read-only; map the relevant code fast",
    writes: false,
    shell: "read-only",
    useCase: 'Find every call site of a function; audit a module structure',
    toolBudget: "3-5 tool calls",
  },
  {
    id: "plan",
    label: "Plan",
    stance: "Analyze and produce a strategy",
    writes: false,
    shell: "no",
    useCase: "Design the migration approach; don't execute",
    toolBudget: "5-10 tool calls",
  },
  {
    id: "review",
    label: "Review",
    stance: "Read-and-grade with severity scores",
    writes: false,
    shell: "read-only",
    useCase: "Audit a PR for bugs; review security posture",
    toolBudget: "5-10 tool calls",
  },
  {
    id: "implementer",
    label: "Implementer",
    stance: "Land a specific change with minimal edits",
    writes: true,
    shell: "yes",
    useCase: "Rewrite one function; apply a targeted patch",
    toolBudget: "10-20 tool calls",
  },
  {
    id: "verifier",
    label: "Verifier",
    stance: "Run tests / validation, report outcome",
    writes: false,
    shell: "test-focused",
    useCase: "Run the test suite and report failures",
    toolBudget: "5-15 tool calls",
  },
]

/**
 * Structured brief template — the format for sub-agent task descriptions.
 * This is the same QUESTION/SCOPE/ALREADY_KNOWN/EFFORT/STOP_CONDITION/OUTPUT
 * format that CodeWhale uses.
 */
export const STRUCTURED_BRIEF_TEMPLATE = `## Subagent Brief Format

When delegating to a sub-agent, use this structured format:

\`\`\`
QUESTION: <one-line question the sub-agent must answer>
SCOPE: <what files/modules to look at, what NOT to touch>
ALREADY_KNOWN: <facts already established, to avoid re-checking>
EFFORT: <quick | medium | thorough>
STOP_CONDITION: <when to stop and report back>
OUTPUT: VERDICT: <conclusion> | EVIDENCE: <key findings> | GAPS: <what's still unknown> | NEXT: <recommended next step>
\`\`\`

Each field helps the sub-agent know exactly what's expected and when to stop.
Explore roles default to EFFORT=quick (3-5 calls); implementer roles may need
EFFORT=thorough with explicit checkpoints.`

/**
 * Render the role taxonomy as a model-visible system prompt section.
 */
export function renderRoleTaxonomyPrompt(): string {
  const lines = [
    "## Sub-Agent Roles",
    "",
    "When using sub-agents, select the right role for the task:",
    "",
    "| Role | Stance | Writes | Shell | Use Case |",
    "|------|--------|--------|-------|----------|",
  ]

  for (const role of AGENT_ROLES) {
    const writes = role.writes ? "yes" : "no"
    lines.push(`| ${role.label} | ${role.stance} | ${writes} | ${role.shell} | ${role.useCase} |`)
  }

  lines.push("")
  lines.push(
    "Explore/Review/Verify roles are read-only. Implementer is for landing changes.",
    "Plan is for strategy before execution. General is the flexible default.",
  )

  return lines.join("\n")
}

/**
 * Full role taxonomy + brief template as a single system prompt section.
 */
export const ROLE_TAXONOMY_PROMPT = `${renderRoleTaxonomyPrompt()}

${STRUCTURED_BRIEF_TEMPLATE}`
