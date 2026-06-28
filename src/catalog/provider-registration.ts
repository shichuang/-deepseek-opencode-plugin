/**
 * Provider Catalog Registration
 *
 * Uses OpenCode's plugin catalog hooks to register DeepSeek models
 * and extended providers. This is the actual integration point that
 * makes providers visible in OpenCode's provider/model picker.
 *
 * Two registration modes:
 * 1. Enhance existing `deepseek` provider — add model aliases, metadata
 * 2. Register new extended providers — SiliconFlow, Volcengine, etc.
 */

import { EXTENDED_PROVIDERS, DEEPSEEK_V4_MODELS } from "../catalog/deepseek-models.js"
import type { DeepSeekModelEntry, ExtendedProviderEntry } from "../catalog/deepseek-models.js"

// ── Existing DeepSeek provider enhancement ─────────────────────────

/**
 * Build the set of model metadata to inject into the existing `deepseek` provider.
 * This enhances rather than replaces — we only add fields that aren't already set.
 */
export interface DeepSeekEnhancement {
  /** Model ID → metadata mapping. */
  models: Record<string, {
    aliases?: string[]
    reasoning?: boolean
    tools?: boolean
    interleaved?: { field: string }
    faster?: boolean
  }>
  /** Provider-level metadata. */
  provider: {
    metadata?: Record<string, unknown>
  }
}

export function buildDeepSeekEnhancement(): DeepSeekEnhancement {
  const models: DeepSeekEnhancement["models"] = {}

  for (const entry of DEEPSEEK_V4_MODELS) {
    const modelMeta: DeepSeekEnhancement["models"][string] = {}

    if (entry.aliases.length > 0) {
      modelMeta.aliases = entry.aliases
    }
    if (entry.supportsReasoning) {
      modelMeta.reasoning = true
    }
    if (entry.supportsTools) {
      modelMeta.tools = true
    }
    if (entry.interleavedField) {
      modelMeta.interleaved = { field: entry.interleavedField }
    }
    if (entry.isFaster) {
      modelMeta.faster = true
    }

    models[entry.id] = modelMeta
  }

  return {
    models,
    provider: {
      metadata: {
        codewhaleEnhanced: true,
        codewhaleVersion: "0.1.0",
        codewhaleBaseURLs: [
          "https://api.deepseek.com/beta",
          "https://api.deepseek.com/v1",
        ],
      },
    },
  }
}

// ── Extended provider registration ─────────────────────────────────

/**
 * Convert an ExtendedProviderEntry to the shape expected by OpenCode's
 * openai-compatible provider configuration.
 */
export interface ProviderRegistration {
  provider: string
  baseURL: string
  defaultModel: string
  flashModel?: string
  envVars: string[]
  models: Record<string, {
    name?: string
    aliases?: string[]
    reasoning?: boolean
  }>
}

export function buildExtendedProviderRegistration(
  entry: ExtendedProviderEntry,
): ProviderRegistration {
  const models: Record<string, Record<string, unknown>> = {}

  // Register the default model
  models[entry.defaultModel] = {
    aliases: [],
  }

  // Register flash model if different
  if (entry.flashModel && entry.flashModel !== entry.defaultModel) {
    models[entry.flashModel] = {
      aliases: ["flash"],
    }
  }

  // Register additional models
  for (const model of entry.models) {
    if (model.id !== entry.defaultModel && model.id !== entry.flashModel) {
      models[model.id] = {
        aliases: model.aliases,
        reasoning: model.supportsReasoning,
      }
    }
  }

  return {
    provider: `codewhale:${entry.id}`,
    baseURL: entry.baseURL,
    defaultModel: entry.defaultModel,
    flashModel: entry.flashModel,
    envVars: entry.envVars,
    models: models as Record<string, Record<string, unknown>>,
  }
}

/**
 * Build registrations for all extended providers.
 */
export function buildAllExtendedRegistrations(): ProviderRegistration[] {
  return EXTENDED_PROVIDERS.map(buildExtendedProviderRegistration)
}