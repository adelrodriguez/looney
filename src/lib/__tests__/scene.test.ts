import { describe, expect, it } from "bun:test"
import { resolveFrameSize, type MeasuredScene } from "../scene"

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

    const result = resolveFrameSize(measuredScenes, 1280, 720)

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

    const result = resolveFrameSize(measuredScenes, 1280, 720)

    expect(result).toEqual({ height: 720, width: 1280 })
  })

  it("handles empty scenes", () => {
    const result = resolveFrameSize([], 1280, 720)

    expect(result).toEqual({ height: 720, width: 1280 })
  })
})
