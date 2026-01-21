import { Effect } from "effect"
import { bundledThemes, type BundledTheme } from "shiki"
import { UnknownTheme } from "./errors"

const checkIsSupportedTheme = (theme: string): theme is BundledTheme =>
  Object.hasOwn(bundledThemes, theme)

export const resolveTheme = Effect.fn(function* resolveTheme(theme: string) {
  const trimmed = theme.trim()
  if (!checkIsSupportedTheme(trimmed)) {
    return yield* new UnknownTheme({ theme })
  }

  return trimmed
})
