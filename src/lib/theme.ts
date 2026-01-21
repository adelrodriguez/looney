import { Effect } from "effect"
import { bundledThemes, type BundledTheme } from "shiki"
import { UnknownTheme } from "./errors"

function checkIsSupportedTheme(theme: string): theme is BundledTheme {
  return Object.hasOwn(bundledThemes, theme)
}

export const resolveTheme = Effect.fn(function* resolveTheme(theme: string) {
  const trimmed = theme.trim()
  if (!checkIsSupportedTheme(trimmed)) {
    return yield* new UnknownTheme({ theme })
  }

  return trimmed
})
