/**
 * DeepSeek V4 model family definitions.
 *
 * Each entry maps a canonical model id to its aliases and capability flags.
 * These are registered via the catalog hook to enhance the existing `deepseek`
 * provider or register extended providers.
 */

export interface DeepSeekModelEntry {
  /** Canonical model identifier (wire id). */
  id: string
  /** User-facing aliases (case-insensitive). */
  aliases: string[]
  /** Whether the model supports tool/function calling. */
  supportsTools: boolean
  /** Whether the model supports extended reasoning. */
  supportsReasoning: boolean
  /** The interleaved field name for reasoning content. */
  interleavedField?: "reasoning_content" | "reasoning_details"
  isFaster: boolean
}

/**
 * Core DeepSeek V4 model family.
 * Mirrors CodeWhale's ModelRegistry (crates/agent/src/lib.rs).
 */
export const DEEPSEEK_V4_MODELS: DeepSeekModelEntry[] = [
  {
    id: "deepseek-v4-pro",
    aliases: [],
    supportsTools: true,
    supportsReasoning: true,
    interleavedField: "reasoning_content",
    isFaster: false,
  },
  {
    id: "deepseek-v4-flash",
    aliases: [
      "deepseek-chat",
      "deepseek-reasoner",
      "deepseek-r1",
      "deepseek-v3",
      "deepseek-v3.2",
    ],
    supportsTools: true,
    supportsReasoning: true,
    interleavedField: "reasoning_content",
    isFaster: true,
  },
]

/**
 * Extended providers that serve DeepSeek models.
 * Endpoints verified from CodeWhale's provider registry.
 */
export interface ExtendedProviderEntry {
  /** Provider identifier (will be prefixed with `codewhale:`). */
  id: string
  /** Human-readable display name. */
  displayName: string
  /** Base URL for OpenAI-compatible chat. */
  baseURL: string
  /** Default model for this provider. */
  defaultModel: string
  /** Flash/faster model for this provider. */
  flashModel?: string
  /** Environment variable candidates for API key. */
  envVars: string[]
  /** Known model aliases on this provider. */
  models: { id: string; aliases: string[]; supportsReasoning: boolean }[]
}

export const EXTENDED_PROVIDERS: ExtendedProviderEntry[] = [
  {
    id: "siliconflow",
    displayName: "SiliconFlow (硅基流动)",
    baseURL: "https://api.siliconflow.cn/v1",
    defaultModel: "deepseek-ai/DeepSeek-V4-Pro",
    flashModel: "deepseek-ai/DeepSeek-V4-Flash",
    envVars: ["SILICONFLOW_API_KEY"],
    models: [
      {
        id: "deepseek-ai/DeepSeek-V4-Pro",
        aliases: ["deepseek-v4-pro"],
        supportsReasoning: true,
      },
      {
        id: "deepseek-ai/DeepSeek-V4-Flash",
        aliases: ["deepseek-v4-flash", "deepseek-chat"],
        supportsReasoning: true,
      },
    ],
  },
  {
    id: "volcengine",
    displayName: "Volcengine Ark (火山方舟)",
    baseURL: "https://ark.cn-beijing.volces.com/api/coding/v3",
    defaultModel: "DeepSeek-V4-Pro",
    flashModel: "DeepSeek-V4-Flash",
    envVars: ["VOLCENGINE_API_KEY", "VOLCENGINE_ARK_API_KEY", "ARK_API_KEY"],
    models: [
      {
        id: "DeepSeek-V4-Pro",
        aliases: ["deepseek-v4-pro"],
        supportsReasoning: true,
      },
      {
        id: "DeepSeek-V4-Flash",
        aliases: ["deepseek-v4-flash", "deepseek-chat"],
        supportsReasoning: true,
      },
    ],
  },
  {
    id: "nvidia-nim",
    displayName: "NVIDIA NIM",
    baseURL: "https://integrate.api.nvidia.com/v1",
    defaultModel: "deepseek-ai/deepseek-v4-pro",
    flashModel: "deepseek-ai/deepseek-v4-flash",
    envVars: ["NVIDIA_API_KEY", "NVIDIA_NIM_API_KEY", "DEEPSEEK_API_KEY"],
    models: [
      {
        id: "deepseek-ai/deepseek-v4-pro",
        aliases: ["deepseek-v4-pro", "nvidia-deepseek-v4-pro"],
        supportsReasoning: true,
      },
      {
        id: "deepseek-ai/deepseek-v4-flash",
        aliases: ["deepseek-v4-flash", "deepseek-chat", "nvidia-deepseek-v4-flash"],
        supportsReasoning: true,
      },
    ],
  },
  {
    id: "novita",
    displayName: "Novita AI",
    baseURL: "https://api.novita.ai/openai/v1",
    defaultModel: "deepseek/deepseek-v4-pro",
    flashModel: "deepseek/deepseek-v4-flash",
    envVars: ["NOVITA_API_KEY"],
    models: [
      {
        id: "deepseek/deepseek-v4-pro",
        aliases: ["deepseek-v4-pro"],
        supportsReasoning: true,
      },
      {
        id: "deepseek/deepseek-v4-flash",
        aliases: ["deepseek-v4-flash", "deepseek-chat"],
        supportsReasoning: true,
      },
    ],
  },
  {
    id: "fireworks",
    displayName: "Fireworks AI",
    baseURL: "https://api.fireworks.ai/inference/v1",
    defaultModel: "accounts/fireworks/models/deepseek-v4-pro",
    envVars: ["FIREWORKS_API_KEY"],
    models: [
      {
        id: "accounts/fireworks/models/deepseek-v4-pro",
        aliases: ["deepseek-v4-pro"],
        supportsReasoning: true,
      },
    ],
  },
  {
    id: "moonshot",
    displayName: "Moonshot AI (月之暗面)",
    baseURL: "https://api.moonshot.ai/v1",
    defaultModel: "kimi-k2.7-code",
    envVars: ["MOONSHOT_API_KEY", "KIMI_API_KEY"],
    models: [
      {
        id: "kimi-k2.7-code",
        aliases: ["kimi", "moonshot-kimi"],
        supportsReasoning: true,
      },
      {
        id: "kimi-k2.6",
        aliases: [],
        supportsReasoning: true,
      },
    ],
  },
  {
    id: "deepinfra",
    displayName: "DeepInfra",
    baseURL: "https://api.deepinfra.com/v1/openai",
    defaultModel: "deepseek-ai/DeepSeek-V4-Pro",
    flashModel: "deepseek-ai/DeepSeek-V4-Flash",
    envVars: ["DEEPINFRA_API_KEY"],
    models: [
      {
        id: "deepseek-ai/DeepSeek-V4-Pro",
        aliases: ["deepseek-v4-pro"],
        supportsReasoning: true,
      },
      {
        id: "deepseek-ai/DeepSeek-V4-Flash",
        aliases: ["deepseek-v4-flash", "deepseek-chat"],
        supportsReasoning: true,
      },
    ],
  },
  {
    id: "huggingface",
    displayName: "Hugging Face Inference",
    baseURL: "https://router.huggingface.co/v1",
    defaultModel: "deepseek-ai/DeepSeek-V4-Pro",
    flashModel: "deepseek-ai/DeepSeek-V4-Flash",
    envVars: ["HUGGINGFACE_API_KEY", "HF_TOKEN"],
    models: [
      {
        id: "deepseek-ai/DeepSeek-V4-Pro",
        aliases: ["deepseek-v4-pro"],
        supportsReasoning: true,
      },
      {
        id: "deepseek-ai/DeepSeek-V4-Flash",
        aliases: ["deepseek-v4-flash", "deepseek-chat"],
        supportsReasoning: true,
      },
    ],
  },
  {
    id: "together",
    displayName: "Together AI",
    baseURL: "https://api.together.xyz/v1",
    defaultModel: "deepseek-ai/DeepSeek-V4-Pro",
    flashModel: "deepseek-ai/DeepSeek-V4-Flash",
    envVars: ["TOGETHER_API_KEY"],
    models: [
      {
        id: "deepseek-ai/DeepSeek-V4-Pro",
        aliases: ["deepseek-v4-pro"],
        supportsReasoning: true,
      },
      {
        id: "deepseek-ai/DeepSeek-V4-Flash",
        aliases: ["deepseek-v4-flash", "deepseek-chat"],
        supportsReasoning: true,
      },
    ],
  },
  {
    id: "arcee",
    displayName: "Arcee AI",
    baseURL: "https://api.arcee.ai/api/v1",
    defaultModel: "trinity-large-thinking",
    envVars: ["ARCEE_API_KEY"],
    models: [
      {
        id: "trinity-large-thinking",
        aliases: ["trinity", "arcee-trinity"],
        supportsReasoning: true,
      },
    ],
  },
  {
    id: "zai",
    displayName: "Z.AI (智谱 GLM)",
    baseURL: "https://api.z.ai/api/coding/paas/v4",
    defaultModel: "GLM-5.2",
    flashModel: "GLM-5-Turbo",
    envVars: ["ZAI_API_KEY", "ZHIPUAI_API_KEY"],
    models: [
      {
        id: "GLM-5.2",
        aliases: ["glm-5.2", "glm5.2"],
        supportsReasoning: true,
      },
      {
        id: "GLM-5.1",
        aliases: ["glm-5.1", "glm5.1"],
        supportsReasoning: true,
      },
      {
        id: "GLM-5-Turbo",
        aliases: ["glm-5-turbo", "glm5-turbo"],
        supportsReasoning: true,
      },
    ],
  },
  {
    id: "stepfun",
    displayName: "StepFun (阶跃星辰)",
    baseURL: "https://api.stepfun.ai/v1",
    defaultModel: "step-3.7-flash",
    envVars: ["STEPFUN_API_KEY"],
    models: [
      {
        id: "step-3.7-flash",
        aliases: ["stepfun", "step-flash"],
        supportsReasoning: true,
      },
    ],
  },
  {
    id: "minimax",
    displayName: "MiniMax (稀宇科技)",
    baseURL: "https://api.minimax.io/v1",
    defaultModel: "MiniMax-M3",
    envVars: ["MINIMAX_API_KEY"],
    models: [
      {
        id: "MiniMax-M3",
        aliases: ["minimax-m3"],
        supportsReasoning: true,
      },
      {
        id: "MiniMax-M2.7",
        aliases: ["minimax-m2.7"],
        supportsReasoning: true,
      },
    ],
  },
  {
    id: "wanjie-ark",
    displayName: "Wanjie Ark (万界方舟)",
    baseURL: "https://maas-openapi.wanjiedata.com/api/v1",
    defaultModel: "deepseek-reasoner",
    envVars: ["WANJIE_ARK_API_KEY", "WANJIE_API_KEY", "WANJIE_MAAS_API_KEY"],
    models: [
      {
        id: "deepseek-reasoner",
        aliases: ["deepseek-v4-pro", "wanjie-deepseek"],
        supportsReasoning: true,
      },
    ],
  },
  {
    id: "xiaomi-mimo",
    displayName: "Xiaomi MiMo (小米米墨)",
    baseURL: "https://token-plan-sgp.xiaomimimo.com/v1",
    defaultModel: "mimo-v2.5-pro",
    envVars: ["XIAOMI_MIMO_API_KEY", "MIMO_API_KEY", "XIAOMI_API_KEY"],
    models: [
      {
        id: "mimo-v2.5-pro",
        aliases: ["mimo-pro", "xiaomi-mimo"],
        supportsReasoning: true,
      },
      {
        id: "mimo-v2.5",
        aliases: ["mimo"],
        supportsReasoning: true,
      },
    ],
  },
]