import { describe, expect, it } from "bun:test"
import { diffLayoutTokens, easeInOutCubic } from "../transition"

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

  it("handles no matches", () => {
    const diff = diffLayoutTokens(
      [
        { color: "#fff", content: "a", fontStyle: 0, width: 10, x: 0, y: 0 },
        { color: "#fff", content: "b", fontStyle: 0, width: 10, x: 10, y: 0 },
      ],
      [{ color: "#fff", content: "c", fontStyle: 0, width: 10, x: 0, y: 0 }]
    )

    expect(diff.matched).toHaveLength(0)
    expect(diff.added).toHaveLength(1)
    expect(diff.removed).toHaveLength(2)
  })
})

describe("easeInOutCubic", () => {
  it("clamps to range", () => {
    expect(easeInOutCubic(-1)).toBe(0)
    expect(easeInOutCubic(2)).toBe(1)
  })

  it("is symmetric around 0.5", () => {
    const value = easeInOutCubic(0.5)

    expect(value).toBeCloseTo(0.5)
  })
})
