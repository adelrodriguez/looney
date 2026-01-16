import { describe, expect, it } from "bun:test"
import { Effect } from "effect"
import { parseMarkdownCodeBlocks } from "../lib/markdown"
import { diffLayoutTokens } from "../lib/transition"

describe("parseMarkdownCodeBlocks", () => {
  it("extracts fenced blocks with languages", () => {
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

  it("throws when language is missing", () => {
    const markdown = ["```", "console.log('nope')", "```"].join("\n")

    expect(() => Effect.runSync(parseMarkdownCodeBlocks(markdown))).toThrow()
  })
})

describe("diffLayoutTokens", () => {
  it("matches identical tokens and detects changes", () => {
    const fromTokens = [
      {
        color: "#fff",
        content: "const",
        fontStyle: 0,
        width: 40,
        x: 0,
        y: 0,
      },
      {
        color: "#fff",
        content: "value",
        fontStyle: 0,
        width: 50,
        x: 40,
        y: 0,
      },
    ]

    const toTokens = [
      {
        color: "#fff",
        content: "const",
        fontStyle: 0,
        width: 40,
        x: 0,
        y: 0,
      },
      {
        color: "#fff",
        content: "answer",
        fontStyle: 0,
        width: 60,
        x: 40,
        y: 0,
      },
    ]

    const diff = diffLayoutTokens(fromTokens, toTokens)

    expect(diff.matched).toHaveLength(1)
    expect(diff.matched[0]?.from.content).toBe("const")
    expect(diff.added).toHaveLength(1)
    expect(diff.added[0]?.content).toBe("answer")
    expect(diff.removed).toHaveLength(1)
    expect(diff.removed[0]?.content).toBe("value")
  })
})
