import { describe, expect, it } from "bun:test"
import type { RenderConfig } from "../types"
import { layoutScene, resolveFrameSize, type MeasuredScene } from "../scene"

const renderConfig: RenderConfig = {
  background: "#0b0b0b",
  blockDuration: 2,
  fontFamily:
    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  fontSize: 24,
  foreground: "#e6e6e6",
  fps: 60,
  height: 0,
  lineHeight: 34,
  padding: 64,
  tabReplacement: "  ",
  transitionDrift: 8,
  transitionDurationMs: 800,
  width: 0,
}

describe("resolveFrameSize", () => {
  it("expands when content exceeds minimum size", () => {
    const measuredScenes: MeasuredScene[] = [
      {
        background: "#000",
        blockHeight: 900,
        blockWidth: 1400,
        contentHeight: 800,
        contentWidth: 1200,
        foreground: "#fff",
        lines: [],
        tokens: [],
      },
    ]

    const result = resolveFrameSize(renderConfig, measuredScenes)

    expect(result).toEqual({ height: 900, width: 1400 })
  })

  it("keeps minimum size when content is smaller", () => {
    const measuredScenes: MeasuredScene[] = [
      {
        background: "#000",
        blockHeight: 500,
        blockWidth: 700,
        contentHeight: 400,
        contentWidth: 600,
        foreground: "#fff",
        lines: [],
        tokens: [],
      },
    ]

    const result = resolveFrameSize(renderConfig, measuredScenes)

    expect(result).toEqual({ height: 500, width: 700 })
  })

  it("handles empty scenes", () => {
    const result = resolveFrameSize(renderConfig, [])

    expect(result).toEqual({ height: 0, width: 0 })
  })
})

describe("layoutScene", () => {
  it("rounds token positions to whole pixels", () => {
    const measured: MeasuredScene = {
      background: "#000",
      blockHeight: 200,
      blockWidth: 300,
      contentHeight: 100,
      contentWidth: 200,
      foreground: "#fff",
      lines: [
        {
          tokens: [
            { category: "keyword", color: "#f00", content: "const", fontStyle: 0, width: 45.7 },
            { category: "identifier", color: "#0f0", content: "x", fontStyle: 0, width: 12.3 },
          ],
          width: 58,
        },
      ],
      tokens: [],
    }

    const scene = layoutScene(renderConfig, measured, 1280, 720)
    const tokens = scene.layout.lines[0]?.tokens ?? []

    for (const token of tokens) {
      expect(Number.isInteger(token.x)).toBe(true)
      expect(Number.isInteger(token.y)).toBe(true)
    }
  })

  it("maintains relative token ordering despite rounding", () => {
    const measured: MeasuredScene = {
      background: "#000",
      blockHeight: 200,
      blockWidth: 300,
      contentHeight: 100,
      contentWidth: 200,
      foreground: "#fff",
      lines: [
        {
          tokens: [
            { category: "keyword", color: "#f00", content: "a", fontStyle: 0, width: 10.4 },
            { category: "keyword", color: "#f00", content: "b", fontStyle: 0, width: 10.4 },
            { category: "keyword", color: "#f00", content: "c", fontStyle: 0, width: 10.4 },
          ],
          width: 31.2,
        },
      ],
      tokens: [],
    }

    const scene = layoutScene(renderConfig, measured, 1280, 720)
    const tokens = scene.layout.lines[0]?.tokens ?? []

    for (let i = 1; i < tokens.length; i += 1) {
      const current = tokens[i]
      const previous = tokens[i - 1]
      if (current && previous) {
        expect(current.x).toBeGreaterThanOrEqual(previous.x)
      }
    }
  })
})
