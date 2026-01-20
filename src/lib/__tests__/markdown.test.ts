import { describe, expect, it } from "bun:test"
import { Cause, Chunk, Effect, Exit } from "effect"
import { MissingCodeBlockLanguage, UnsupportedLanguage } from "../errors"
import { normalizeLanguage, parseMarkdownCodeBlocks } from "../markdown"

describe("normalizeLanguage", () => {
  it("should trim and lowercase language tags", () => {
    expect(normalizeLanguage("  TS  ")).toBe("ts")
  })

  it("should handle empty language", () => {
    expect(normalizeLanguage("  ")).toBe("")
  })
})

describe("parseMarkdownCodeBlocks", () => {
  it("should extract fenced blocks with languages", () => {
    const markdown = [
      "```ts",
      "const value = 1",
      "```",
      "",
      "```js",
      "console.log(value)",
      "```",
      "",
    ].join("\n")

    const blocks = Effect.runSync(parseMarkdownCodeBlocks(markdown))

    expect(blocks).toHaveLength(2)
    expect(blocks.map((block) => block.language)).toEqual(["ts", "js"])
    expect(blocks[0]?.code).toContain("const value")
  })

  it("should fail when language is missing", () => {
    const markdown = ["```", "console.log('nope')", "```"].join("\n")

    const exit = Effect.runSyncExit(parseMarkdownCodeBlocks(markdown))

    expect(exit._tag).toBe("Failure")
    if (Exit.isFailure(exit)) {
      const errors = Chunk.toArray(Cause.failures(exit.cause))
      expect(errors[0]).toBeInstanceOf(MissingCodeBlockLanguage)
    }
  })

  it("should fail when language is unsupported", () => {
    const markdown = ["```nope", "console.log('nope')", "```"].join("\n")

    const exit = Effect.runSyncExit(parseMarkdownCodeBlocks(markdown))

    expect(exit._tag).toBe("Failure")
    if (Exit.isFailure(exit)) {
      const errors = Chunk.toArray(Cause.failures(exit.cause))
      expect(errors[0]).toBeInstanceOf(UnsupportedLanguage)
    }
  })
})
