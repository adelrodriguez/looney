import { describe, expect, it } from "bun:test"
import type { TokenCategory } from "../types"
import { categorizeToken } from "../token"
import { buildTransitionTokens, diffLayoutTokens, easeInOutCubic } from "../transition"

const buildToken = (category: TokenCategory, content: string, x: number) => ({
  category,
  color: "#fff",
  content,
  fontStyle: 0,
  width: 10,
  x,
  y: 0,
})

describe("diffLayoutTokens", () => {
  it("should match identical tokens and detect changes", () => {
    const fromTokens = [
      { ...buildToken("keyword", "const", 0), width: 40 },
      { ...buildToken("identifier", "value", 40), width: 50 },
    ]

    const toTokens = [
      { ...buildToken("keyword", "const", 0), width: 40 },
      { ...buildToken("number", "42", 40), width: 20 },
    ]

    const diff = diffLayoutTokens(fromTokens, toTokens)

    expect(diff.matched).toHaveLength(1)
    expect(diff.matched[0]?.from.content).toBe("const")
    expect(diff.added).toHaveLength(1)
    expect(diff.added[0]?.content).toBe("42")
    expect(diff.removed).toHaveLength(1)
    expect(diff.removed[0]?.content).toBe("value")
  })

  it("should handle no matches", () => {
    const diff = diffLayoutTokens(
      [buildToken("identifier", "a", 0), buildToken("identifier", "b", 10)],
      [buildToken("comment", "c", 0)]
    )

    expect(diff.matched).toHaveLength(0)
    expect(diff.added).toHaveLength(1)
    expect(diff.removed).toHaveLength(2)
  })

  it("should match by category when content differs", () => {
    const diff = diffLayoutTokens(
      [buildToken("keyword", "int", 0), buildToken("function", "main", 40)],
      [buildToken("keyword", "void", 0), buildToken("function", "Main", 40)]
    )

    expect(diff.matched).toHaveLength(2)
    expect(diff.added).toHaveLength(0)
    expect(diff.removed).toHaveLength(0)
  })

  it("should prefer exact content matches after LCS", () => {
    const fromTokens = [buildToken("string", "<iostream>", 0), buildToken("string", '"sakuga"', 40)]
    const toTokens = [buildToken("string", '"sakuga"', 0)]

    const diff = diffLayoutTokens(fromTokens, toTokens)

    expect(diff.matched).toHaveLength(1)
    expect(diff.matched[0]?.from.content).toBe('"sakuga"')
    expect(diff.matched[0]?.to.content).toBe('"sakuga"')
    expect(diff.removed).toHaveLength(1)
    expect(diff.removed[0]?.content).toBe("<iostream>")
  })

  it("should crossfade mismatched matches", () => {
    const diff = diffLayoutTokens(
      [buildToken("keyword", "int", 0), buildToken("function", "main", 40)],
      [buildToken("keyword", "void", 0), buildToken("function", "Main", 40)]
    )

    const tokens = buildTransitionTokens(diff, 0.5)
    const contents = tokens.map((token) => token.content)

    expect(contents).toContain("int")
    expect(contents).toContain("void")
    expect(contents).toContain("main")
    expect(contents).toContain("Main")
  })

  it("should prioritize string scopes over punctuation", () => {
    const category = categorizeToken([
      "source.cpp",
      "string.quoted.double.cpp",
      "punctuation.definition.string.begin.cpp",
    ])

    expect(category).toBe("string")
  })
})

describe("easeInOutCubic", () => {
  it("should clamp to range", () => {
    expect(easeInOutCubic(-1)).toBe(0)
    expect(easeInOutCubic(2)).toBe(1)
  })

  it("should be symmetric around 0.5", () => {
    const value = easeInOutCubic(0.5)

    expect(value).toBeCloseTo(0.5)
  })
})
