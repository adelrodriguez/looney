import { Effect } from "effect"
import { bundledThemes, type BundledTheme } from "shiki"
import { UnknownTheme } from "./errors"

export const resolveTheme = (theme: string) =>
  Effect.gen(function* () {
    const trimmed = theme.trim()
    if (!Object.hasOwn(bundledThemes, trimmed)) {
      return yield* Effect.fail(new UnknownTheme({ theme }))
    }

    return trimmed as BundledTheme
  })
