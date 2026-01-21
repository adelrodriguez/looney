import { describe, expect, it } from "bun:test"
import type { RenderConfig } from "../types"
import { resolveFrameSize, type MeasuredScene } from "../scene"

const renderConfig: RenderConfig = {
  background: "#0b0b0b",
  blockDuration: 2,
  fontFamily:
    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  fontSize: 24,
  foreground: "#e6e6e6",
  fps: 60,
  height: 720,
  lineHeight: 34,
  padding: 64,
  tabReplacement: "  ",
  transitionDrift: 8,
  transitionDurationMs: 800,
  width: 1280,
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

    expect(result).toEqual({ height: 720, width: 1280 })
  })

  it("handles empty scenes", () => {
    const result = resolveFrameSize(renderConfig, [])

    expect(result).toEqual({ height: 720, width: 1280 })
  })
})
