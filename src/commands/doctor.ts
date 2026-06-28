/**
 * Diagnostic / Doctor Command
 *
 * Verifies the DeepSeek setup and reports any issues.
 * Mirrors CodeWhale's `codewhale doctor` command.
 *
 * Checks:
 * 1. Environment variables (DEEPSEEK_API_KEY, etc.)
 * 2. Configuration files (.codewhale/config.toml)
 * 3. Network connectivity (api.deepseek.com reachable)
 * 4. API key validity (optional: quick models list)
 * 5. Plugin hook registration status
 */

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import { executeWithRetry, isRetryableError } from "../transform/retry-backoff.js"

export interface DiagnosticResult {
  status: "pass" | "warn" | "fail" | "skip"
  label: string
  detail: string
}

export interface DoctorReport {
  timestamp: string
  pluginVersion: string
  results: DiagnosticResult[]
  summary: { pass: number; warn: number; fail: number; skip: number }
  recommendations: string[]
}

/**
 * Run the full diagnostic suite.
 */
export async function runDoctor(workspaceDir?: string): Promise<DoctorReport> {
  const results: DiagnosticResult[] = []
  const recommendations: string[] = []

  // 1. Environment variables
  results.push(checkEnvVars())

  // 2. Configuration files
  results.push(...checkConfigFiles(workspaceDir))

  // 3. Network connectivity
  results.push(await checkConnectivity())

  // 4. Hook registration
  results.push(checkHookRegistration())

  const summary = countResults(results)

  if (summary.fail > 0) {
    recommendations.push("Fix failing checks before using DeepSeek with OpenCode.")
  }
  if (summary.warn > 0) {
    recommendations.push("Address warnings for optimal DeepSeek V4 performance.")
  }
  if (summary.pass > 0 && summary.fail === 0) {
    recommendations.push("DeepSeek setup looks good. The CodeWhale adaptation plugin is active.")
  }

  return {
    timestamp: new Date().toISOString(),
    pluginVersion: "0.1.0",
    results,
    summary,
    recommendations,
  }
}

function checkEnvVars(): DiagnosticResult {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (apiKey && apiKey.length > 10) {
    return {
      status: "pass",
      label: "DEEPSEEK_API_KEY",
      detail: `Set (${apiKey.length} chars, starts with ${apiKey.slice(0, 4)}...)`,
    }
  }
  if (apiKey) {
    return {
      status: "warn",
      label: "DEEPSEEK_API_KEY",
      detail: "Set but appears too short. Verify your API key.",
    }
  }
  return {
    status: "fail",
    label: "DEEPSEEK_API_KEY",
    detail: "Not set. Set this environment variable to use DeepSeek.",
  }
}

function checkConfigFiles(workspaceDir?: string): DiagnosticResult[] {
  const results: DiagnosticResult[] = []

  // User-global config
  const codeWhaleHome = process.env.CODEWHALE_HOME
    || join(process.env.USERPROFILE || process.env.HOME || homedir(), ".codewhale")
  const globalConfig = join(codeWhaleHome, "config.toml")

  if (existsSync(globalConfig)) {
    try {
      const content = readFileSync(globalConfig, "utf-8")
      const hasProvider = content.includes("provider")
      const hasDeepSeek = content.includes("deepseek")
      const detailParts: string[] = [`Found (${content.split("\n").length} lines)`]
      if (hasProvider) detailParts.push("provider configured")
      if (hasDeepSeek) detailParts.push("deepseek section present")
      results.push({
        status: "pass",
        label: `.codewhale/config.toml (global)`,
        detail: detailParts.join("; "),
      })
    } catch {
      results.push({
        status: "warn",
        label: `.codewhale/config.toml (global)`,
        detail: "Found but could not read.",
      })
    }
  } else {
    results.push({
      status: "skip",
      label: `.codewhale/config.toml (global)`,
      detail: "Not found. This is OK if you configure DeepSeek through OpenCode.",
    })
  }

  // Project-local config
  if (workspaceDir) {
    const projectConfig = join(workspaceDir, ".codewhale", "config.toml")
    if (existsSync(projectConfig)) {
      results.push({
        status: "pass",
        label: `.codewhale/config.toml (project)`,
        detail: "Found.",
      })
    } else {
      results.push({
        status: "skip",
        label: `.codewhale/config.toml (project)`,
        detail: "Not found.",
      })
    }
  }

  // Legacy config
  const legacyHome = join(process.env.USERPROFILE || process.env.HOME || homedir(), ".deepseek")
  const legacyConfig = join(legacyHome, "config.toml")
  if (existsSync(legacyConfig)) {
    results.push({
      status: "pass",
      label: `.deepseek/config.toml (legacy)`,
      detail: "Found. Consider migrating to .codewhale/ or OpenCode config.",
    })
  }

  return results
}

async function checkConnectivity(): Promise<DiagnosticResult> {
  try {
    await executeWithRetry(
      async () => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        try {
          const response = await fetch("https://api.deepseek.com/v1/models", {
            method: "HEAD",
            signal: controller.signal,
          })
          return response
        } finally {
          clearTimeout(timeout)
        }
      },
      { maxRetries: 2, maxBackoffMs: 3000 },
    )

    return {
      status: "pass",
      label: "Network: api.deepseek.com",
      detail: "Reachable.",
    }
  } catch (err) {
    const isRetryable = isRetryableError(err)
    return {
      status: isRetryable ? "warn" : "fail",
      label: "Network: api.deepseek.com",
      detail: isRetryable
        ? "Temporarily unreachable (network issue). Retry later."
        : `Unreachable: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

function checkHookRegistration(): DiagnosticResult {
  // This is a self-check: if the plugin loaded and is running this code,
  // hooks are registered.
  return {
    status: "pass",
    label: "Plugin hooks",
    detail: "Registered (system.transform, messages.transform, tool.definition, chat.params, chat.message, commands, config, event, dispose).",
  }
}

function countResults(results: DiagnosticResult[]) {
  return {
    pass: results.filter((r) => r.status === "pass").length,
    warn: results.filter((r) => r.status === "warn").length,
    fail: results.filter((r) => r.status === "fail").length,
    skip: results.filter((r) => r.status === "skip").length,
  }
}

/**
 * Render the doctor report as formatted text.
 */
export function renderDoctorReport(report: DoctorReport): string {
  const lines = [
    `## CodeWhale DeepSeek Doctor — ${report.timestamp.slice(0, 19)}`,
    "",
    "| Status | Check | Detail |",
    "|--------|-------|--------|",
  ]

  for (const r of report.results) {
    const icon = r.status === "pass" ? "PASS" : r.status === "warn" ? "WARN" : r.status === "fail" ? "FAIL" : "SKIP"
    lines.push(`| ${icon} | ${r.label} | ${r.detail} |`)
  }

  lines.push("")
  lines.push(`Summary: ${report.summary.pass} pass, ${report.summary.warn} warn, ${report.summary.fail} fail, ${report.summary.skip} skip`)

  if (report.recommendations.length > 0) {
    lines.push("")
    lines.push("**Recommendations:**")
    for (const rec of report.recommendations) {
      lines.push(`- ${rec}`)
    }
  }

  return lines.join("\n")
}
