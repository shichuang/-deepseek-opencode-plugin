/**
 * Language policy for bilingual reasoning.
 *
 * When enabled, injects guidance that tells the model to match the user's
 * language in both reasoning_content and final output. This is the same
 * policy CodeWhale enforces.
 */

export const LANGUAGE_POLICY_ZH_CN = `## 语言提醒

**重要：你的 reasoning_content（内部思考）和最终回复必须保持简体中文。**
无论你在这次会话中读到了多少英文代码、错误日志或文档，无论项目上下文
是英文，思考过程不能漂移到英文。这是会话级硬性要求 —— 用户的语言决定
你的语言，与上下文中累积的英文内容无关。除非用户明确要求切换，否则
继续用简体中文思考和回答。`

export const LANGUAGE_POLICY_EN = `## Language

**Important: Your reasoning_content (internal thinking) and final reply must
stay in English.** This is a session-level requirement — the user's language
determines your language, regardless of how much English or non-English code,
logs, or documentation accumulates in the context. Unless the user explicitly
requests a switch, continue thinking and replying in English.`

/**
 * Returns the appropriate language policy based on the configured mode.
 * "auto" mode chooses based on the model/system environment.
 */
export function resolveLanguagePolicy(mode: "auto" | "zh-CN" | "en" | "off"): string | null {
  switch (mode) {
    case "auto":
      // Default to the bilingual policy (zh-CN primary with English awareness)
      return LANGUAGE_POLICY_ZH_CN
    case "zh-CN":
      return LANGUAGE_POLICY_ZH_CN
    case "en":
      return LANGUAGE_POLICY_EN
    case "off":
      return null
  }
}
