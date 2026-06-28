/**
 * Compaction Relay Template
 *
 * Injects the same structured compaction/handoff format that CodeWhale
 * uses for its `/compact` command and session handoff. This tells the
 * model how to write a compact summary that preserves key context
 * while reducing the token budget.
 *
 * Mirrors: CodeWhale crates/tui/src/prompts.rs COMPACT_TEMPLATE
 */

export const COMPACTION_RELAY = `## Compaction Relay — Tier 9 (Precedent)

The conversation above this point has been compacted. Below is a structured
summary of what was discussed and decided. Read this first — it replaces
re-reading the compressed transcript.

### Goal
[The user's high-level objective for this session]

### Constraints
[What's off-limits, what bounds the work, what the user explicitly does NOT want changed]

### Progress

#### Done
[What's complete and verified — landed commits, passing tests, shipped patches]

#### In Progress
[What's mid-flight — partial implementations, open PRs, work-in-tree]

#### Blocked
[What's stuck, why, and what would unblock it]

### Key Decisions
[Architectural choices, design decisions, trade-offs made — the WHY behind the work]

### Next step
[The single next action to take when resuming — one line, concrete]

**Staleability:** This handoff is Tier 9 in the Constitutional hierarchy. It
is useful context but subordinate to live tool output, file contents, the
current repository state, and the user's current request. A handoff that
declares a blocker does not bind a user who says to proceed. A handoff that
claims completion does not override evidence that the work is unfinished.
Use this summary as orientation, not as law.`

/**
 * Context management guidance — injected alongside the relay template.
 * Tells the model about /compact, prefix cache, and context pressure.
 */
export const CONTEXT_MANAGEMENT_GUIDANCE = `## Context Management

When the conversation gets long, use /compact to summarize earlier context
and free up space. The system preserves important information (active files,
recent messages, tool results). After compaction you'll see a summary and
can continue seamlessly.

If context exceeds ~60% during sustained work, proactively suggest /compact.

### Prompt-cache awareness

DeepSeek caches the longest byte-stable prefix of every request at ~100×
discount. To maximize cache hits:

- **Append, don't reorder.** New context goes at the end.
- **Don't paraphrase quoted content.** Refer by path/line instead.
- **Read once, refer back.** Re-reading produces a different envelope.
- **Footer chip:** Red below 40% cache hit = time to consolidate.`

/**
 * Build the full compaction/context-management section.
 */
export function buildContextManagementSection(): string {
  return `${CONTEXT_MANAGEMENT_GUIDANCE}\n\n${COMPACTION_RELAY}`
}
