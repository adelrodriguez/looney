import { describe, expect, it } from "bun:test"
import { ensureEvenDimensions } from "../ffmpeg"

describe("ensureEvenDimensions", () => {
  it("does not modify dimensions for mp4 (yuv444p)", () => {
    const result = ensureEvenDimensions("mp4", 1281, 721)
    expect(result).toEqual({ height: 721, width: 1281 })
  })

  it("rounds odd dimensions to even for webm (yuv420p)", () => {
    const result = ensureEvenDimensions("webm", 1281, 721)
    expect(result).toEqual({ height: 722, width: 1282 })
  })

  it("keeps even dimensions unchanged for webm", () => {
    const result = ensureEvenDimensions("webm", 1280, 720)
    expect(result).toEqual({ height: 720, width: 1280 })
  })
})
