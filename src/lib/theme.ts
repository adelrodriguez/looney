import { Effect } from "effect"
import { bundledThemes, type BundledTheme } from "shiki"
import { UnknownTheme } from "./errors"

function isBundledTheme(theme: string): theme is BundledTheme {
  return Object.hasOwn(bundledThemes, theme)
}

export const resolveTheme = (theme: string) =>
  Effect.gen(function* () {
    const trimmed = theme.trim()
    if (!isBundledTheme(trimmed)) {
      return yield* new UnknownTheme({ theme })
    }

    return trimmed
  })
