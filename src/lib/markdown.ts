import { Effect } from "effect"
import { marked } from "marked"
import { bundledLanguages, type BundledLanguage } from "shiki"
import type { CodeBlock } from "./types"
import { MissingCodeBlockLanguage, UnsupportedLanguage } from "./errors.js"

export const normalizeLanguage = (rawLanguage: string) => {
  const trimmed = rawLanguage.trim()
  if (!trimmed) {
    return ""
  }

  const primary = trimmed.split(/\s+/)[0] ?? ""
  return primary.toLowerCase()
}

const isSupportedLanguage = (language: string): language is BundledLanguage =>
  Object.hasOwn(bundledLanguages, language)

export const parseMarkdownCodeBlocks = (markdown: string) =>
  Effect.gen(function* () {
    const tokens = yield* Effect.try({
      catch: () => new MissingCodeBlockLanguage({ reason: "Unable to parse markdown." }),
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
          reason: "Every fenced code block needs a language (for example: ```ts).",
        })
      }

      if (!isSupportedLanguage(language)) {
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
