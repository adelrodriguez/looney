import { Effect } from "effect"
import { bundledThemes, type BundledTheme } from "shiki"
import { UnknownTheme } from "./errors"

export const resolveTheme = Effect.fn(function* resolveTheme(theme: string) {
  const trimmed = theme.trim()
  if (!Object.hasOwn(bundledThemes, trimmed)) {
    return yield* new UnknownTheme({ theme })
  }

  return trimmed as BundledTheme
})
