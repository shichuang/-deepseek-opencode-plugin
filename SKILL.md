# deepseek DeepSeek Adaptation

> First-class DeepSeek support for OpenCode â€?transplanted from deepseek.

## What this skill does

Activates the deepseek DeepSeek Adaptation plugin, injecting:
- **Constitution** â€?the 8-article governance framework that powers deepseek agents
- **V4 Model Characteristics** â€?DeepSeek V4 self-management (prefix cache, thinking tokens, parallel execution)
- **Language Policy** â€?bilingual reasoning (Chinese/English) matching the user's language
- **Thinking Budget** â€?task-stratified thinking depth guidance
- **Extended Provider Registry** â€?15+ Chinese/Asian provider endpoints with verified configurations

## When to use

This skill is automatically active when the plugin is loaded. Use it when you:
- Are coding with DeepSeek V4 models (`deepseek-v4-pro`, `deepseek-v4-flash`)
- Want deepseek-level behavioral discipline in OpenCode
- Need access to Chinese ecosystem providers (SiliconFlow, Volcengine, Moonshot, etc.)
- Want prefix-cache-optimized system prompt layering

## Configuration

In `opencode.json`:

```jsonc
{
  "plugin": [
    ["@deepseek/opencode-plugin", {
      "prompts": {
        "constitution": true,
        "v4Characteristics": "auto",
        "languagePolicy": "auto"
      },
      "providers": {
        "enhanceDeepSeek": true,
        "extendedProviders": true
      }
    }]
  ]
}
```

## Extended Providers

| Provider | Base URL | Default Model |
|----------|----------|--------------|
| SiliconFlow | api.siliconflow.cn | DeepSeek-V4-Pro |
| Volcengine Ark | ark.cn-beijing.volces.com | DeepSeek-V4-Pro |
| NVIDIA NIM | integrate.api.nvidia.com | deepseek-v4-pro |
| Novita AI | api.novita.ai | deepseek-v4-pro |
| Moonshot AI | api.moonshot.ai | kimi-k2.7-code |
| DeepInfra | api.deepinfra.com | DeepSeek-V4-Pro |
| Hugging Face | router.huggingface.co | DeepSeek-V4-Pro |
| Together AI | api.together.xyz | DeepSeek-V4-Pro |
| Z.AI (GLM) | api.z.ai | GLM-5.2 |
| StepFun | api.stepfun.ai | step-3.7-flash |
| MiniMax | api.minimax.io | MiniMax-M3 |
| Fireworks | api.fireworks.ai | deepseek-v4-pro |
| Arcee AI | api.arcee.ai | trinity-large-thinking |
| Wanjie Ark | maas-openapi.wanjiedata.com | deepseek-reasoner |
| Xiaomi MiMo | token-plan-sgp.xiaomimimo.com | mimo-v2.5-pro |

## Author

deepseek Contributors â€?MIT License
Source: https://github.com/Hmbown/deepseek
