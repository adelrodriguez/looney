import { Effect } from "effect"
import { marked } from "marked"
import { bundledLanguages, type BundledLanguage } from "shiki"
import type { CodeBlock } from "./types"
import { MissingCodeBlockLanguage, UnsupportedLanguage } from "./errors.js"

export function normalizeLanguage(rawLanguage: string) {
  const trimmed = rawLanguage.trim()
  if (!trimmed) {
    return ""
  }

  const primary = trimmed.split(/\s+/)[0] ?? ""
  return primary.toLowerCase()
}

function checkIsSupportedLanguage(language: string): language is BundledLanguage {
  return Object.hasOwn(bundledLanguages, language)
}

export const parseMarkdownCodeBlocks = Effect.fn(function* parseMarkdownCodeBlocks(
  markdown: string
) {
  const tokens = yield* Effect.try({
    catch: () =>
      new MissingCodeBlockLanguage({ context: "parse", detail: "Unable to parse markdown." }),
    try: () => marked.lexer(markdown),
  })
  const blocks: CodeBlock[] = []

  for (const token of tokens) {
    if (token.type !== "code") {
      continue
    }

    const rawLanguage = typeof token.lang === "string" ? token.lang.trim() : ""
    const language = normalizeLanguage(rawLanguage)

    if (!language) {
      return yield* new MissingCodeBlockLanguage({
        context: "codeBlock",
        detail: "Every fenced code block needs a language (for example: ```ts).",
      })
    }

    if (!checkIsSupportedLanguage(language)) {
      return yield* new UnsupportedLanguage({
        language: rawLanguage,
      })
    }

    blocks.push({
      code: token.text,
      language,
    })
  }

  return blocks
})
