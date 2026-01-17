import { describe, expect, it } from "bun:test"
import { Cause, Chunk, Effect, Exit } from "effect"
import { UnknownTheme } from "../errors"
import { resolveTheme } from "../theme"

describe("resolveTheme", () => {
  it("returns theme when supported", () => {
    const result = Effect.runSync(resolveTheme("github-dark"))

    expect(result).toBe("github-dark")
  })

  it("fails when theme is unknown", () => {
    const exit = Effect.runSyncExit(resolveTheme("not-a-theme"))

    expect(exit._tag).toBe("Failure")
    if (Exit.isFailure(exit)) {
      const errors = Chunk.toArray(Cause.failures(exit.cause))
      expect(errors[0]).toBeInstanceOf(UnknownTheme)
    }
  })
})
