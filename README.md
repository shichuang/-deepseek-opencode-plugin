<p align="center">
  <img src="https://raw.githubusercontent.com/Hmbown/CodeWhale/main/assets/screenshot.png" alt="DeepSeek OpenCode" width="640" />
</p>

<p align="center">
  <strong>DeepSeek V4 Adaptation Plugin for OpenCode</strong><br>
  <em>First-class DeepSeek support — transplanted from CodeWhale to OpenCode.</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@deepseek/opencode-plugin"><img alt="npm" src="https://img.shields.io/npm/v/@deepseek/opencode-plugin?style=flat-square&color=cb3837&label=npm" /></a>
  <a href="https://github.com/Hmbown/CodeWhale/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" /></a>
  <a href="https://opencode.ai"><img alt="OpenCode" src="https://img.shields.io/badge/OpenCode-%3E%3D1.17-369eff?style=flat-square" /></a>
  <a href="#"><img alt="DeepSeek" src="https://img.shields.io/badge/DeepSeek-V4-00a86b?style=flat-square" /></a>
</p>

---

## Why

OpenCode already supports DeepSeek through its OpenAI-compatible provider. But DeepSeek V4 deserves more than a default configuration. CodeWhale spent a year evolving the optimal DeepSeek coding harness — this plugin transplants that adaptation layer into OpenCode.

**You get:**
- A **Constitution** that governs agent behavior — 8 articles of production-verified discipline
- **V4 self-management** — prefix-cache awareness, thinking-token strategy, parallel execution
- **15 Chinese/Asian provider endpoints** with verified configurations
- **Bilingual reasoning** — automatic Chinese/English language matching in thinking tokens
- **Protocol hardening** — schema canonicalization, reasoning sanitizer, retry with backoff

## Install

```bash
npm install @deepseek/opencode-plugin
```

Add to `opencode.json`:

```jsonc
{
  "plugin": ["@deepseek/opencode-plugin"]
}
```

Set your key:

```bash
export DEEPSEEK_API_KEY=sk-...
```

That's it. The plugin activates automatically — Constitution, V4 optimization, and all providers are live.

## What It Does

<table>
<tr>
<td width="50%">

### Constitution System Prompt

```
CONSTITUTION OF CODEWHALE

I. Ground Truth
  Report what tools return — never invent facts.

II. Verification
  Check before claiming completion.

III. Momentum
  Parallelize. A turn ending with a promise
  is a turn that could have shipped.

IV. Legacy
  Leave the workspace cleaner than you found it.

V. Help — VI. Priority — VII. Domain Context
VIII. Inquiry
```

The same 8-article framework that powers CodeWhale agents. Injected as byte-stable system prompt prefix — cache-friendly, turn-over-turn stable.

</td>
<td width="50%">

### V4 Model Self-Management

```
Your V4 Characteristics

Degradation curve — quality holds through 1M window.
Prefix cache — 128-token granularity, ~90% discount.
Thinking tokens — skip/light/deep strategy.
Parallel execution — batch independent operations.
```

Automatically detects DeepSeek V4 models and injects architecture-specific guidance. Non-V4 models get provider-neutral cache hygiene advice.

</td>
</tr>
</table>

### Extended Provider Registry

| Provider | Endpoint | Default Model |
|----------|----------|--------------|
| **SiliconFlow** | api.siliconflow.cn | DeepSeek-V4-Pro |
| **Volcengine Ark** | ark.cn-beijing.volces.com | DeepSeek-V4-Pro |
| **NVIDIA NIM** | integrate.api.nvidia.com | deepseek-v4-pro |
| **Novita AI** | api.novita.ai | deepseek-v4-pro |
| **Fireworks AI** | api.fireworks.ai | deepseek-v4-pro |
| **Moonshot AI** | api.moonshot.ai | kimi-k2.7-code |
| **DeepInfra** | api.deepinfra.com | DeepSeek-V4-Pro |
| **Hugging Face** | router.huggingface.co | DeepSeek-V4-Pro |
| **Together AI** | api.together.xyz | DeepSeek-V4-Pro |
| **Arcee AI** | api.arcee.ai | trinity-large-thinking |
| **Z.AI (GLM)** | api.z.ai | GLM-5.2 |
| **StepFun** | api.stepfun.ai | step-3.7-flash |
| **MiniMax** | api.minimax.io | MiniMax-M3 |
| **Wanjie Ark** | maas-openapi.wanjiedata.com | deepseek-reasoner |
| **Xiaomi MiMo** | token-plan-sgp.xiaomimimo.com | mimo-v2.5-pro |

All endpoints verified from CodeWhale's production provider registry. Set the corresponding API key environment variable — the plugin handles the rest.

### Protocol Hardening

| Layer | What | Why |
|-------|------|-----|
| **Schema Canonicalization** | Sorts JSON Schema keys, normalizes `required` arrays | Prevents DeepSeek 400 errors from schema ordering differences |
| **Reasoning Sanitizer** | Injects `reasoning_content` placeholder on tool-call messages | Prevents DeepSeek 400 errors in thinking mode |
| **Retry with Backoff** | 10-retry exponential backoff with jitter | Handles transient 429/5xx without failing the turn |
| **Flash-First Routing** | Recommends `deepseek-v4-flash` for simple lookups | Saves ~67% on lightweight operations |

### Commands

| Command | Description |
|---------|-------------|
| `ds:status` | Plugin status — hooks, providers, config |
| `ds:providers` | List all 15 extended providers |
| `ds:doctor` | Diagnostics — API key, network, config, hooks |
| `ds:cost` | Token pricing for DeepSeek models |
| `ds:cache-info` | Prefix cache mechanics and best practices |
| `ds:strict-tools` | Toggle strict tool mode on DeepSeek beta endpoint |
| `ds:language` | Toggle bilingual language policy |
| `ds:remember` | Save durable notes to user memory |
| `ds:recall` | Read back user memory entries |

## Configuration

```typescript
{
  "prompts": {
    "constitution": true,       // 8 articles of agent discipline
    "v4Characteristics": "auto", // V4 model self-management
    "languagePolicy": "auto",   // Bilingual Chinese/English
    "thinkingBudget": true      // Task-stratified thinking depth
  },
  "providers": {
    "enhanceDeepSeek": true,    // Enhance existing deepseek provider
    "extendedProviders": true,  // Register 15 extended endpoints
    "strictToolMode": true,     // Beta endpoint strict function schemas
    "reasoningSanitizer": true  // Placeholder injection for thinking mode
  }
}
```

Full schema: [`schema.json`](./schema.json)

## Architecture

```
src/
├── index.ts           # 8 hooks, model detection, prompt assembly
├── prompts/           # Constitution, V4 characteristics, language policy
├── transform/         # Sanitizer, reasoning chain, retry, schema canonicalize
├── catalog/           # 15 providers, model registry, catalog integration
├── commands/          # 9 slash commands + doctor diagnostics
├── pricing/           # 22-model pricing, flash-first cost routing
├── tools/             # remember/recall persistent memory
├── memory/            # memory.md injection
├── agents/            # 6 sub-agent roles, Structured Brief template
├── skills/            # CodeWhale skill directory bridge
├── instructions/      # AGENTS.md + constitution.json reader
├── config/            # Schema, TOML migration, legacy compat
├── types/             # Strict TypeScript types, input guards
├── compatibility/     # Duplicate/conflict detection
└── discovery/         # Plugin manifest, command docs
```

## Compatibility

Designed to coexist with `oh-my-opencode` and other OpenCode plugins:
- Duplicate detection — gracefully skips if another instance loaded
- Idempotent injection — never duplicates system prompt sections
- Non-destructive — enhances rather than overrides other plugins

## Acknowledgments

Built from the combined DNA of three projects:

- [**CodeWhale**](https://github.com/Hmbown/CodeWhale) — the Constitution, model registry, and agent discipline
- [**DeepSeek-Reasonix**](https://github.com/esengine/DeepSeek-Reasonix) — schema canonicalization, retry backoff, flash-first routing
- [**oh-my-opencode**](https://github.com/code-yeongyu/oh-my-openagent) — engineering conventions and OpenCode plugin patterns

## License

MIT — same as CodeWhale, Reasonix, and OpenCode.
